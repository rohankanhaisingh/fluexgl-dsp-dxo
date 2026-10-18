// Run with: npm run test:protocol
const assert = require("node:assert/strict");
const { test } = require("node:test");

const { CODE_TABLE, buildCommand, PacketReader, checksum } = require("./dxo-protocol.cjs");

/** Builds a unit -> PC MK2 packet the way the firmware does, for the parser tests. */
function fakeMk2Answer(fragments, { pcId = 7 } = {}) {

    const body = Buffer.concat([...fragments, Buffer.alloc(0)]);
    let cs = 0xd5;
    for (const byte of body) cs ^= byte;
    const payload = Buffer.concat([body, Buffer.from([9, cs])]);

    const header = Buffer.from([0x44, 0x44, 0x57, 0, 0, 0, 0, pcId, 0, 0]);
    header[8] = payload.length >> 8;
    header[9] = payload.length & 0xff;

    const encoded = Buffer.from(payload);
    for (let i = 0; i < encoded.length; i++) encoded[i] ^= CODE_TABLE[i % 34];

    return Buffer.concat([header, encoded]);
}

test("classic GET command matches DXOControl's layout", () => {

    const command = buildCommand({ gets: [[0, 0, 0x80, 0]], hwId: 3, myId: 9, mk2: false });

    assert.deepEqual([...command.subarray(0, 4)], [0x05, 0x44, 0x44, 0x4a]);

    const body = Buffer.from(command.subarray(4, 11));
    for (let i = 0; i < body.length; i++) body[i] ^= CODE_TABLE[i];
    assert.deepEqual([...body], [3, 7, 0, 0, 0x80, 0, 0x6a]);

    assert.deepEqual([...command.subarray(11, 15)], [0xfd, 3, 0xff, 9]);
    assert.equal(command[15], checksum(command.subarray(0, 15)));
});

test("MK2 SET command starts with its length and encodes big endian values", () => {

    // Gain of output 1 to -6.5 dB -> raw -650 as int16.
    const command = buildCommand({ sets: [{ key: [0, 0, 0x80, 0], value: -650 }], mk2: true });

    const bodyLength = 8;
    assert.deepEqual([...command.subarray(0, 4)], [0, 4 + bodyLength, 0x44, 0x4a]);

    const body = Buffer.from(command.subarray(4, 4 + bodyLength));
    for (let i = 0; i < body.length; i++) body[i] ^= CODE_TABLE[i];
    assert.deepEqual([...body], [4, 8, 0, 0, 0x80, 0, 0xfd, 0x76]);
});

test("reader decodes an MK2 answer with a value and meters", () => {

    const rsp = Buffer.from([5, 2 + 6, 5, 1, 0x81, 3, 0x03, 0xe8]);       // PEQ freq out 2 band 3 = 1000 Hz
    const vuIn = Buffer.from([1, 2 + 4, 0xf6, 0xec, 0xd0, 0xd0]);         // -10, -20, -48, -48
    const packet = fakeMk2Answer([rsp, vuIn]);

    const reader = new PacketReader();
    const [answer] = reader.push(Buffer.concat([Buffer.from("noise"), packet.subarray(0, 5)]))
        .concat(reader.push(packet.subarray(5)));

    assert.equal(answer.type, "data");
    assert.equal(answer.mk2, true);
    assert.deepEqual(answer.values, [{ key: [5, 1, 0x81, 3], value: 1000 }]);
    assert.deepEqual(answer.vu.in, [-10, -20, -48, -48]);
});

test("reader rejects an MK2 answer with a bad checksum", () => {

    const packet = fakeMk2Answer([Buffer.from([5, 7, 0, 0, 0, 0, 0])]);
    packet[packet.length - 1] ^= 0xff;

    const [answer] = new PacketReader().push(packet);
    assert.equal(answer.type, "invalid");
});

test("reader parses an announcement", () => {

    const packet = Buffer.alloc(42);
    packet.write("DDB", 0, "latin1");
    packet[33] = 2; packet[34] = 10; packet[35] = 31;
    packet[28] = 0; packet[29] = 1; packet[30] = 2;
    packet[40] = 17;
    packet[41] = 0x51;

    const [announcement] = new PacketReader().push(packet);
    assert.equal(announcement.type, "announcement");
    assert.equal(announcement.unitType, "2_10_31");
    assert.equal(announcement.serial, 258);
    assert.equal(announcement.hwPacketId, 17);
});
