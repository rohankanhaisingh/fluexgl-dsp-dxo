// Read only: prints the hardware status flags a few times (0x200 = preset changed).
const { DxoLink } = require("../electron/dxo-link.cjs");
const link = new DxoLink(); const seen = [];
link.on("values", vs => vs.forEach(v => { if (v.key.join() === "13,35,0,0") seen.push("0x" + (v.value >>> 0).toString(16)); }));
link.connect(process.argv[2] ?? "COM6").then(async () => {
    for (let i = 0; i < 4; i++) { link.requestValues([[13, 35, 0, 0], [9, 18, 0, 0]]); await new Promise(r => setTimeout(r, 1500)); }
    console.log("flags:", [...new Set(seen)].join(" "), "-> preset changed:", seen.length ? ((parseInt(seen.at(-1)) & 0x200) !== 0) : "?");
    await link.disconnect(); process.exit(0);
});
