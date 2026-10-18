// Read-only probe: connects, reads a few parameters, prints what comes back. Never writes.
const { DxoLink } = require("../electron/dxo-link.cjs");

const port = process.argv[2] ?? "COM6";
const seconds = Number(process.argv[3] ?? 6);
const link = new DxoLink();
let packets = 0, values = [];

link.on("log", m => console.log("[log]", m));
link.on("status", s => console.log("[status]", s.state, s.detail ?? "", s.mk2 ? "MK2" : ""));
link.on("values", v => { values.push(...v); });
link.on("meters", () => packets++);

(async () => {
    await link.connect(port);
    link.setWriteEnabled(false);
    link.requestValues([
        [13, 16, 0, 0],      // unit name
        [9, 16, 0, 0],       // preset name
        [0, 0, 0, 0],        // gain in A
        [0, 0, 0x80, 0],     // gain out 1
        [7, 14, 0x80, 0],    // mute out 1
        [5, 1, 0x80, 0],     // PEQ freq out 1 band 1
        [4, 1, 0x80, 0],     // HPF freq out 1
        [14, 16, 0x80, 0]    // name out 1
    ]);
    await new Promise(r => setTimeout(r, seconds * 1000));
    console.log("meter packets:", packets);
    console.log("values:", JSON.stringify(values));
    await link.disconnect();
    process.exit(0);
})().catch(e => { console.error("ERR", e.message); process.exit(1); });
