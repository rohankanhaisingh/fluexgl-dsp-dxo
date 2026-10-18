// Read only: lists the presets stored in the unit.
const { DxoLink } = require("../electron/dxo-link.cjs");
const link = new DxoLink(); const values = new Map();
link.on("values", vs => vs.forEach(v => values.set(v.key.join(), v.value)));
(async () => {
    await link.connect(process.argv[2] ?? "COM6");
    const keys = [[9, 18, 0, 0], [9, 16, 0, 0], [13, 43, 0, 0], [13, 35, 0, 0]];
    for (let n = 1; n <= 50; n++) keys.push([9, 16, n, 0]);
    link.requestValues(keys);
    await new Promise(r => setTimeout(r, 12000));
    console.log("current preset:", values.get("9,18,0,0"), JSON.stringify(values.get("9,16,0,0")));
    const startup = values.get("13,43,0,0");
    console.log("startup preset raw:", startup, "-> read only up to", (startup & 0xff00) >> 8, "; status flags 0x" + (values.get("13,35,0,0") >>> 0).toString(16));
    const list = [];
    for (let n = 1; n <= 50; n++) if (values.has(`9,16,${n},0`)) list.push(`${n}:${values.get(`9,16,${n},0`)}`);
    console.log(list.length, "names:", list.join(" | "));
    await link.disconnect(); process.exit(0);
})();
