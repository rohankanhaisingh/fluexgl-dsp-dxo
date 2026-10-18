// Read only: current user level, access rights and status flags.
const { SerialPort } = require("serialport");
const { buildCommand, PacketReader } = require("../electron/dxo-protocol.cjs");
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
    const port = new SerialPort({ path: "COM6", baudRate: 115200 });
    const reader = new PacketReader(); let hwId = 0, myId = 1; const values = new Map();
    port.on("data", c => { for (const p of reader.push(c)) { if (p.hwPacketId !== undefined) hwId = p.hwPacketId; for (const v of p.values ?? []) values.set(v.key.join(), v.value); } });
    await sleep(1200);
    const keys = [[13, 38, 0, 0], [13, 30, 0, 0], [13, 31, 0, 2], [13, 31, 0, 3], [13, 31, 0, 4], [13, 31, 0, 5], [13, 33, 0, 0], [13, 35, 0, 0], [13, 52, 0, 0], [13, 51, 0, 0]];
    for (let round = 0; round < 6; round++) for (const k of keys) {
        if (values.has(k.join())) continue;
        port.write(buildCommand({ gets: [k], hwId, myId })); myId = myId >= 254 ? 1 : myId + 1; await sleep(60);
        port.write(buildCommand({ hwId, myId })); myId = myId >= 254 ? 1 : myId + 1; await sleep(60);
    }
    for (const k of keys) { const v = values.get(k.join()); console.log(k.join(","), "=", v, typeof v === "number" ? "0x" + (v >>> 0).toString(16) : ""); }
    port.close(); process.exit(0);
})();
