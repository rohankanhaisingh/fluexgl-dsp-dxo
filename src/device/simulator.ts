import type { Announcement, DxoBackend, LinkStatus, Meters, RawValue, SerialPortInfo } from "./backend";
import { ALL_CHANNELS, FLAG_PRESET_CHANGED, INPUTS, OUTPUTS, PARAMS, PEQ_BAND_COUNT, PRESET_COUNT, channelKeys, definitionForKey, keyId, toRaw, type DxoKey } from "./parameters";

type Listener<T> = (payload: T) => void;

/**
 * A pretend DXO-48PRO MK2 for working on the UI without the hardware.
 * It answers like the real link: values arrive asynchronously and meters move.
 */
export function createSimulatorBackend(): DxoBackend {

    const listeners = {
        status: new Set<Listener<LinkStatus>>(),
        announcement: new Set<Listener<Announcement>>(),
        values: new Set<Listener<RawValue[]>>(),
        meters: new Set<Listener<Meters>>(),
        log: new Set<Listener<string>>()
    };

    const memory = new Map<string, number | string>();
    let status: LinkStatus = { state: "disconnected", detail: null, mk2: true, writeEnabled: true };
    let meterTimer: number | undefined;
    const levels = { in: INPUTS.map(() => -30), out: OUTPUTS.map(() => -30) };

    function emit<T>(set: Set<Listener<T>>, payload: T) {
        for (const listener of set) listener(payload);
    }

    function setStatus(next: Partial<LinkStatus>) {
        status = { ...status, ...next };
        emit(listeners.status, status);
    }

    function seed() {

        for (const channel of ALL_CHANNELS) {
            for (const key of channelKeys(channel)) {
                const definition = definitionForKey(key);
                if (!definition) continue;
                memory.set(keyId(key), definition.member === 16 ? (channel.kind === "input" ? `Input ${channel.label}` : `Output ${channel.label}`) : toRaw(definition, definition.defaultValue));
            }
        }

        // A sensible two-way setup: outputs 1-4 tops, 5-8 subs.
        OUTPUTS.forEach((output, i) => {
            const isSub = i >= 4;
            memory.set(keyId([PARAMS.mixerGain.struct, PARAMS.mixerGain.member, output.id, i % 2]), 0);
            memory.set(keyId([PARAMS.hpfFrequency.struct, PARAMS.hpfFrequency.member, output.id, 0]), isSub ? 30 : 100);
            memory.set(keyId([PARAMS.lpfFrequency.struct, PARAMS.lpfFrequency.member, output.id, 0]), isSub ? 100 : 20001);
            memory.set(keyId([PARAMS.hpfShape.struct, PARAMS.hpfShape.member, output.id, 0]), 0x23);
            memory.set(keyId([PARAMS.lpfShape.struct, PARAMS.lpfShape.member, output.id, 0]), 0x23);
            memory.set(keyId([PARAMS.name.struct, PARAMS.name.member, output.id, 0]), `${isSub ? "Sub" : "Top"} ${i % 2 ? "R" : "L"}${i % 4 >= 2 ? " 2" : ""}`);
        });

        // Spread the PEQ bands over the spectrum, like a fresh preset.
        for (const channel of ALL_CHANNELS)
            for (let band = 0; band < PEQ_BAND_COUNT; band++)
                memory.set(keyId([PARAMS.peqFrequency.struct, PARAMS.peqFrequency.member, channel.id, band]), Math.round(31.25 * Math.pow(2, band)));

        memory.set(keyId([PARAMS.unitName.struct, PARAMS.unitName.member, 0, 0]), "DXO-48PRO MK2");
        memory.set(keyId([PARAMS.presetName.struct, PARAMS.presetName.member, 0, 0]), "Punch");
        memory.set(keyId([PARAMS.presetNumber.struct, PARAMS.presetNumber.member, 0, 0]), 3);
        memory.set(keyId([PARAMS.startupPreset.struct, PARAMS.startupPreset.member, 0, 0]), 2 << 8);
        memory.set(FLAGS_ID, 0);

        const names = ["Factory flat", "Factory 2-way", "Punch", "Speech", "Club night"];
        for (let n = 1; n <= PRESET_COUNT; n++) {
            memory.set(keyId([PARAMS.presetName.struct, PARAMS.presetName.member, n, 0]), names[n - 1] ?? "Empty");
            if (names[n - 1]) presets.set(n, snapshot());
        }
    }

    /** Everything a preset holds: all channel parameters. */
    function snapshot(): Map<string, number | string> {
        const copy = new Map<string, number | string>();
        for (const channel of ALL_CHANNELS) for (const key of channelKeys(channel)) {
            const id = keyId(key);
            if (memory.has(id)) copy.set(id, memory.get(id)!);
        }
        return copy;
    }

    function setFlags(changed: boolean) {
        memory.set(FLAGS_ID, changed ? FLAG_PRESET_CHANGED : 0);
        emit(listeners.values, [{ key: keyFromId(FLAGS_ID), value: memory.get(FLAGS_ID)! }]);
    }

    function tickMeters() {

        const drift = (value: number, target: number) => Math.max(-48, Math.min(12, value + (target - value) * 0.25 + (Math.random() - 0.5) * 6));
        const music = -18 + Math.sin(Date.now() / 700) * 8;

        levels.in = levels.in.map((value, i) => drift(value, i < 2 ? music : -48));
        levels.out = levels.out.map((value, i) => {
            const gain = Number(memory.get(keyId([PARAMS.gain.struct, PARAMS.gain.member, OUTPUTS[i].id, 0])) ?? 0) / 100;
            const muted = Number(memory.get(keyId([PARAMS.mute.struct, PARAMS.mute.member, OUTPUTS[i].id, 0])) ?? 0) === 1;
            return muted ? -48 : drift(value, music + gain - (i >= 4 ? 2 : 4));
        });

        emit(listeners.meters, {
            vu: { in: levels.in.map(Math.round), out: levels.out.map(Math.round) },
            gr: { in: null, out: levels.out.map(level => Math.round(Math.max(0, level - 2))) }
        });
    }

    const FLAGS_ID = keyId([PARAMS.statusFlags.struct, PARAMS.statusFlags.member, 0, 0]);
    const presets = new Map<number, Map<string, number | string>>();
    const keyFromId = (id: string) => id.split(",").map(Number) as DxoKey;

    seed();

    return {
        async listPorts(): Promise<SerialPortInfo[]> {
            return [{ path: "SIMULATOR", manufacturer: "Simulated DXO-48PRO MK2", vendorId: "0684", productId: "0000", isDxo: true }];
        },

        async connect() {
            setStatus({ state: "connecting", detail: "SIMULATOR" });
            await new Promise(resolve => setTimeout(resolve, 400));
            emit(listeners.announcement, { unitType: "2_10_31", hardwareVersion: "1.0.0", picVersion: "3.9.1", serial: 12345, productionDate: "1-1-2025" });
            setStatus({ state: "connected", detail: "SIMULATOR" });
            meterTimer = window.setInterval(tickMeters, 60);
            return true;
        },

        async disconnect() {
            window.clearInterval(meterTimer);
            setStatus({ state: "disconnected", detail: null });
        },

        async requestValues(keys: DxoKey[]) {
            setTimeout(function () {
                emit(listeners.values, keys.map(key => ({ key, value: memory.get(keyId(key)) ?? null })));
            }, 150);
        },

        async setValue(key: DxoKey, rawValue: number | string) {
            if (!status.writeEnabled) return false;
            memory.set(keyId(key), rawValue);
            setTimeout(() => emit(listeners.values, [{ key, value: rawValue }]), 30);
            setFlags(true);
            return true;
        },

        async loadPreset(number: number) {
            await new Promise(resolve => setTimeout(resolve, 600));
            const stored = presets.get(number);
            if (stored) for (const [id, value] of stored) memory.set(id, value);
            const name = memory.get(keyId([PARAMS.presetName.struct, PARAMS.presetName.member, number, 0])) ?? "Empty";
            memory.set(keyId([PARAMS.presetName.struct, PARAMS.presetName.member, 0, 0]), name);
            memory.set(keyId([PARAMS.presetNumber.struct, PARAMS.presetNumber.member, 0, 0]), number);
            setFlags(false);
            emit(listeners.log, `loaded preset ${number}`);
            return true;
        },

        async savePreset(number: number, name: string) {
            if (!status.writeEnabled) return false;
            await new Promise(resolve => setTimeout(resolve, 600));
            presets.set(number, snapshot());
            const updates: RawValue[] = [
                { key: [PARAMS.presetName.struct, PARAMS.presetName.member, number, 0], value: name },
                { key: [PARAMS.presetName.struct, PARAMS.presetName.member, 0, 0], value: name },
                { key: [PARAMS.presetNumber.struct, PARAMS.presetNumber.member, 0, 0], value: number }
            ];
            for (const { key, value } of updates) memory.set(keyId(key), value!);
            emit(listeners.values, updates);
            setFlags(false);
            emit(listeners.log, `saved preset ${number} as "${name}"`);
            return true;
        },

        async setWriteEnabled(enabled: boolean) {
            setStatus({ writeEnabled: enabled });
        },

        onStatus: callback => { listeners.status.add(callback); return () => listeners.status.delete(callback); },
        onAnnouncement: callback => { listeners.announcement.add(callback); return () => listeners.announcement.delete(callback); },
        onValues: callback => { listeners.values.add(callback); return () => listeners.values.delete(callback); },
        onMeters: callback => { listeners.meters.add(callback); return () => listeners.meters.delete(callback); },
        onLog: callback => { listeners.log.add(callback); return () => listeners.log.delete(callback); }
    };
}
