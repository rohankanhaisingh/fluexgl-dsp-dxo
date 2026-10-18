const { EventEmitter } = require("node:events");
const { SerialPort } = require("serialport");

const { buildCommand, PacketReader, STRUCT, MEMBER } = require("./dxo-protocol.cjs");

const CMD_LOAD_PRESET = 1;
const CMD_SAVE_PRESET = 2;

/** USB vendor id of the DXO processors (shows up as a CDC serial port). */
const DXO_VENDOR_ID = "0684";

const BAUD_RATE = 115200;
const RESEND_AFTER_MS = 100;
const DISCONNECT_AFTER_MS = 3000;
const IDLE_DELAY_MS = 40;
const ANNOUNCEMENT_TIMEOUT_MS = 2000;

/** The unit rejects commands (DDN) that follow its answer too quickly. */
const COMMAND_GAP_MS = 25;

/** DXOControl keeps classic commands around 16 bytes: two GETs, or one SET plus its confirming GET. */
const MAX_GETS_PER_COMMAND = 2;

/** A SET is repeated (with a GET of the same key) until the unit reports the new value, for at most this long. */
const SET_CONFIRM_TIMEOUT_MS = 3000;

/** Commands cannot be read back; they are sent this many times instead. */
const COMMAND_REPEATS = 3;

/** A key the unit does not answer (e.g. a channel it does not have) is given up after this many tries. */
const MAX_GET_ATTEMPTS = 12;

const keyId = key => key.join(",");

async function listPorts() {

    const ports = await SerialPort.list();

    return ports.map(port => ({
        path: port.path,
        manufacturer: port.manufacturer ?? "",
        vendorId: (port.vendorId ?? "").toLowerCase(),
        productId: (port.productId ?? "").toLowerCase(),
        isDxo: (port.vendorId ?? "").toLowerCase() === DXO_VENDOR_ID
    }));
}

/**
 * One connection to a processor. Works like DXOControl's usb_process loop:
 * send a command, wait for the answer, resend after 100 ms, give up after 3 s.
 *
 * Events: status, announcement, values, meters, log
 */
class DxoLink extends EventEmitter {

    constructor() {
        super();
        this.port = null;
        this.reader = new PacketReader();
        this.state = "disconnected";
        this.writeEnabled = false;
        this.mk2 = false;
        this.hwId = 0;
        this.myId = 1;
        this.getQueue = [];
        this.pendingSets = new Map();
        this.getAttempts = new Map();
        this.skippedKeys = 0;
        this.waiter = null;
        this.loopRunning = false;
    }

    setState(state, detail) {
        this.state = state;
        this.emit("status", { state, detail: detail ?? null, mk2: this.mk2, writeEnabled: this.writeEnabled });
    }

    log(message) {
        this.emit("log", message);
    }

    async connect(path) {

        if (this.port) await this.disconnect();

        this.setState("connecting", path);

        this.port = new SerialPort({ path, baudRate: BAUD_RATE, autoOpen: false });

        await new Promise((resolve, reject) => this.port.open(error => error ? reject(error) : resolve()))
            .catch(error => {
                this.port = null;
                this.setState("error", error.message.includes("Access denied") || error.message.includes("Toegang")
                    ? `${path} is in use. Close DXOControl and try again.`
                    : error.message);
                throw error;
            });

        this.reader = new PacketReader();
        this.debugPackets = 8;
        this.debugCommands = 4;
        this.port.on("data", chunk => this.onData(chunk));
        this.port.on("close", () => this.onClosed());
        this.port.on("error", error => this.log("serial error: " + error.message));

        const announcement = await this.waitFor(packet => packet.type === "announcement", ANNOUNCEMENT_TIMEOUT_MS);

        if (announcement) {
            this.hwId = announcement.hwPacketId;
            this.emit("announcement", announcement);
            this.log(`announcement: type ${announcement.unitType}, serial ${announcement.serial}, HW ${announcement.hardwareVersion}`);
        } else {
            this.log("no announcement received, trying to talk anyway");
        }

        this.mk2 = false;
        this.myId = 1;
        this.setState("connected", path);
        this.runLoop();
    }

    async disconnect() {

        this.loopRunning = false;

        const port = this.port;
        this.port = null;

        if (port?.isOpen) await new Promise(resolve => port.close(() => resolve()));

        this.setState("disconnected");
    }

    onClosed() {
        if (this.port) {
            this.port = null;
            this.loopRunning = false;
            this.setState("disconnected", "port closed");
        }
    }

    onData(chunk) {
        for (const packet of this.reader.push(chunk)) {
            // The first packets of a session are logged raw, to compare against DXOControl.
            if (this.debugPackets > 0) {
                this.debugPackets--;
                this.log(`rx ${packet.type}: ${packet.rawHex}`);
            }
            if (this.waiter && this.waiter.match(packet)) {
                const { resolve } = this.waiter;
                this.waiter = null;
                resolve(packet);
            }
        }
    }

    waitFor(match, timeoutMs) {
        return new Promise(resolve => {
            const timer = setTimeout(() => { this.waiter = null; resolve(null); }, timeoutMs);
            this.waiter = { match, resolve: packet => { clearTimeout(timer); resolve(packet); } };
        });
    }

    /** Queue keys to read. Keys already queued are skipped. */
    requestValues(keys) {
        const queued = new Set(this.getQueue.map(keyId));
        for (const key of keys) if (!queued.has(keyId(key))) this.getQueue.push(key);
    }

    /** Writes are refused unless live control is switched on, or `force` is set (preset loading). */
    setValue(key, rawValue, { confirm = true, force = false } = {}) {
        if (!this.writeEnabled && !force) return false;
        this.pendingSets.delete(keyId(key));
        this.pendingSets.set(keyId(key), { key, value: rawValue, confirm, sends: 0, since: Date.now() });
        return true;
    }

    async whenKeyWritten(key, timeoutMs = 4000) {
        const start = Date.now();
        while (this.pendingSets.has(keyId(key)) && Date.now() - start < timeoutMs) await new Promise(r => setTimeout(r, 40));
        return !this.pendingSets.has(keyId(key));
    }

    /** A command is a 0 -> 1 -> 0 pulse on [COMMAND, COMMAND, 0, cmd], as DXOControl sends it. */
    async pulseCommand(command, force = false) {
        const key = [STRUCT.COMMAND, MEMBER.COMMAND, 0, command];
        for (const value of [0, 1]) {
            this.setValue(key, value, { confirm: false, force });
            await this.whenKeyWritten(key);
        }
        await new Promise(r => setTimeout(r, 1000));
        this.setValue(key, 0, { confirm: false, force });
        await this.whenKeyWritten(key);
    }

    async loadPreset(number) {
        // Switching presets is allowed without live control: it is a deliberate, whole-unit action.
        const numberKey = [STRUCT.PRESET_GLOBAL, MEMBER.PRESET_NUMBER, 0, 0];
        this.setValue(numberKey, number, { force: true });
        if (!await this.whenKeyWritten(numberKey)) { this.log(`could not select preset ${number}`); return false; }
        await this.pulseCommand(CMD_LOAD_PRESET, true);
        this.log(`loaded preset ${number}`);
        return true;
    }

    /** Stores the current settings in preset `number` under `name`. */
    async savePreset(number, name) {
        if (!this.writeEnabled) return false;
        const nameKey = [STRUCT.PRESET_GLOBAL, MEMBER.SHORT_NAME, 0, 0];
        const numberKey = [STRUCT.PRESET_GLOBAL, MEMBER.PRESET_NUMBER, 0, 0];
        const cleanName = String(name).replace(/[^\x20-\x7e]/g, "").slice(0, 16).trim() || `Preset ${number}`;

        this.setValue(nameKey, cleanName);
        this.setValue(numberKey, number);
        if (!await this.whenWritten()) { this.log(`could not prepare saving preset ${number}`); return false; }

        await this.pulseCommand(CMD_SAVE_PRESET);
        this.requestValues([[STRUCT.PRESET_GLOBAL, MEMBER.SHORT_NAME, number, 0], nameKey, numberKey]);
        this.log(`saved preset ${number} as "${cleanName}"`);
        return true;
    }

    /** Resolves once no write is waiting for confirmation any more (or after timeoutMs). */
    async whenWritten(timeoutMs = 6000) {
        const start = Date.now();
        while (this.pendingSets.size && Date.now() - start < timeoutMs) await new Promise(r => setTimeout(r, 40));
        return this.pendingSets.size === 0;
    }

    setWriteEnabled(enabled) {
        this.writeEnabled = !!enabled;
        if (!this.writeEnabled) this.pendingSets.clear();
        this.setState(this.state);
    }

    nextCommand() {

        // The oldest pending write goes first; it stays pending until the unit confirms it.
        for (const [id, set] of this.pendingSets) {

            if (set.confirm && Date.now() - set.since > SET_CONFIRM_TIMEOUT_MS) {
                this.pendingSets.delete(id);
                this.log(`write to ${id} not confirmed by the unit within 3 s`);
                // Read it again, so the UI shows what the unit really has.
                this.requestValues([set.key]);
                continue;
            }

            if (!set.confirm) {
                if (++set.sends >= COMMAND_REPEATS) this.pendingSets.delete(id);
                return { sets: [set], gets: [] };
            }

            // Round robin, so one slow key does not block the others.
            this.pendingSets.delete(id);
            this.pendingSets.set(id, set);

            return { sets: [set], gets: [set.key] };
        }

        return { sets: [], gets: this.getQueue.splice(0, MAX_GETS_PER_COMMAND) };
    }

    async runLoop() {

        this.loopRunning = true;

        while (this.loopRunning && this.port?.isOpen) {

            const { sets, gets } = this.nextCommand();
            const command = buildCommand({ sets, gets, hwId: this.hwId, myId: this.myId, mk2: this.mk2 });

            if (this.debugCommands > 0) {
                this.debugCommands--;
                this.log(`tx: ${command.toString("hex")}`);
            }

            let answer = null;
            const sentAt = Date.now();

            while (this.loopRunning && this.port?.isOpen && !answer) {

                this.port.write(command);
                answer = await this.waitFor(packet => packet.type === "data" || packet.type === "nack" || packet.type === "invalid", RESEND_AFTER_MS);

                if (!answer && Date.now() - sentAt > DISCONNECT_AFTER_MS) {
                    this.log("no response for 3 seconds");
                    this.requeue(sets.length ? [] : gets);
                    this.setState("error", "The processor does not respond.");
                    await this.disconnect();
                    return;
                }
            }

            if (!answer) break;

            if (answer.type !== "data") {
                this.log(`${answer.type} for packet ${this.myId}`);
                this.requeue(sets.length ? [] : gets);
            } else {

                if (answer.mk2 && !this.mk2) {
                    this.mk2 = true;
                    this.log("unit answers in MK2 format");
                    this.setState(this.state);
                }

                this.hwId = answer.hwPacketId;
                this.emit("packet", answer);

                if (answer.values.length) {
                    // While a write is unconfirmed, the old value would make the control jump back.
                    const visible = answer.values.filter(({ key, value }) => {
                        const pending = this.pendingSets.get(keyId(key));
                        return !pending || pending.value === value;
                    });
                    if (visible.length) this.emit("values", visible);
                    // The unit also sends values on its own; anything received no longer needs asking.
                    const received = new Set(answer.values.map(v => keyId(v.key)));
                    this.getQueue = this.getQueue.filter(key => !received.has(keyId(key)));
                    for (const id of received) this.getAttempts.delete(id);

                    // A write is done once the unit reports the value that was sent.
                    for (const { key, value } of answer.values) {
                        const pending = this.pendingSets.get(keyId(key));
                        if (pending && pending.value === value) this.pendingSets.delete(keyId(key));
                    }
                }
                if (answer.vu.in || answer.vu.out || answer.gr.in || answer.gr.out)
                    this.emit("meters", { vu: answer.vu, gr: answer.gr });

                // Keys that were asked but not answered go back in the queue.
                if (!sets.length) {
                    const answered = new Set(answer.values.map(v => keyId(v.key)));
                    this.requeue(gets.filter(key => !answered.has(keyId(key))));
                }
            }

            this.myId = this.myId >= 254 ? 1 : this.myId + 1;

            const idle = !this.pendingSets.size && !this.getQueue.length;
            await new Promise(resolve => setTimeout(resolve, idle ? IDLE_DELAY_MS : COMMAND_GAP_MS));

        }
    }

    requeue(gets) {
        const retry = gets.filter(key => {
            const attempts = (this.getAttempts.get(keyId(key)) ?? 0) + 1;
            this.getAttempts.set(keyId(key), attempts);
            if (attempts <= MAX_GET_ATTEMPTS) return true;
            this.skippedKeys++;
            return false;
        });

        this.getQueue.push(...retry);
    }
}

module.exports = { DxoLink, listPorts, DXO_VENDOR_ID };
