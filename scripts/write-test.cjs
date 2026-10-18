// One careful write: output 1 gain -1 dB, read back, then restore the original value.
const { DxoLink } = require("../electron/dxo-link.cjs");

const KEY = [0, 0, 0x80, 0];          // gain, output 1, raw = dB * 100
const link = new DxoLink();
const sleep = ms => new Promise(r => setTimeout(r, ms));
let lastGain = null, outLevel = null;

link.on("values", values => { for (const v of values) if (v.key.join() === KEY.join()) lastGain = v.value; });
link.on("meters", m => { if (m.vu.out) outLevel = m.vu.out[0]; });
link.on("log", m => { if (!m.startsWith("rx") && !m.startsWith("tx")) console.log("[log]", m); });

async function readGain() {
    lastGain = null;
    link.requestValues([KEY]);
    for (let i = 0; i < 160 && lastGain === null; i++) { if (i % 20 === 19) link.requestValues([KEY]); await sleep(50); }
    return lastGain;
}

(async () => {
    await link.connect(process.argv[2] ?? "COM6");

    const original = await readGain();
    if (original === null) throw new Error("could not read the gain of output 1");
    await sleep(500);
    console.log(`original gain out 1: ${original / 100} dB, meter ${outLevel} dB`);

    const target = Math.max(-4800, original - 100);
    link.setWriteEnabled(true);
    link.setValue(KEY, target);
    await sleep(800);

    const after = await readGain();
    await sleep(500);
    console.log(`after write:          ${after / 100} dB, meter ${outLevel} dB  ->  ${after === target ? "OK" : "MISMATCH"}`);

    link.setValue(KEY, original);
    await sleep(800);
    const restored = await readGain();
    link.setWriteEnabled(false);
    console.log(`restored:             ${restored / 100} dB  ->  ${restored === original ? "OK" : "MISMATCH"}`);

    await link.disconnect();
    process.exit(0);
})().catch(async e => {
    console.error("ERR", e.message);
    link.setWriteEnabled(false);
    await link.disconnect();
    process.exit(1);
});
