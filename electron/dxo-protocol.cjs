/**
 * Wire protocol of the AllDSP based Omnitronic DXO processors (USB / serial).
 *
 * Reconstructed from DXOControl 4.0.1 (d_protocol.py / protocol.py). Every
 * parameter is addressed by a key: [structId, memberId, channel, index].
 *
 * PC -> unit ("J" command):
 *   classic: 0x05 'D' 'D' 'J' <body> 0xFD hwId 0xFF myId checksum
 *   MK2:     lenHi lenLo 'D' 'J' <body> 0xFD hwId 0xFF myId checksum
 *   body fragments, XOR-ed with CODE_TABLE[i % 32]:
 *     GET  03 07 struct member channel index 'j'
 *     SET  04 (6+n) struct member channel index <value, n bytes, big endian>
 *   checksum = 0xAA ^ every preceding byte. MK2 length = 4 + body length.
 *
 * Unit -> PC:
 *   'DDB' announcement (42 bytes, ends with 'Q')
 *   'DDW' MK2 data: 10 byte header (pcId @7, hwId @8, length @8..9),
 *         payload XOR-ed with CODE_TABLE[i % 34]
 *   'DDA' classic data (42 bytes), payload XOR-ed with CODE_TABLE[i % 32]
 *   payload fragments: opcode, size (incl. opcode+size), data. Opcode 9 is a
 *   checksum (0xD5 ^ payload bytes before it), opcode 0 ends the payload.
 */

const CODE_TABLE = [
    233, 45, 98, 215, 123, 42, 99, 23, 178, 132, 200, 150, 100, 50, 77, 43, 54,
    90, 31, 43, 123, 234, 211, 177, 65, 133, 3, 64, 23, 83, 251, 1, 54, 34
];

const OPCODE = {
    DATA_END: 0,
    VU_IN: 1,
    VU_OUT: 2,
    GET: 3,
    SET: 4,
    RSP: 5,
    ERR: 6,
    GR_IN: 7,
    GR_OUT: 8,
    CHECKSUM: 9,
    RAW_VU_IN: 11,
    ACTIVITY_LOG: 15,
    TEST_RESULT: 16,
    ADC: 18
};

const STRUCT = {
    GAIN: 0, MIXER: 1, DELAY: 2, LPF: 3, HPF: 4, PEQ: 5, LIMITER: 6, MUTE: 7,
    INVERT: 8, PRESET_GLOBAL: 9, LINK: 10, COMMAND: 11, COMPRESSOR: 12,
    GLOBAL: 13, CHANNEL: 14, FIR: 15, FIR_BLOCK: 16
};

const MEMBER = {
    GAIN: 0, FREQ: 1, Q: 2, TYPE: 3, THRESHOLD: 4, ATTACK: 5, RELEASE: 6,
    HOLD: 7, DELAY: 8, STATUS: 9, MUTE: 14, INVERT: 15, SHORT_NAME: 16,
    PRESET_NUMBER: 18, ON: 24, LINK: 25, COMMAND: 26, RATIO: 27,
    SW_VERSION: 33, CURRENT_USER: 38, MODEL_NAME: 50
};

/** Binary layout per member, as in protocol.MEMBER_FORMATS. Anything else is '>l'. */
const MEMBER_FORMATS = {
    [MEMBER.GAIN]: "int16", [MEMBER.FREQ]: "uint16", [MEMBER.Q]: "uint16",
    [MEMBER.TYPE]: "uint8", [MEMBER.THRESHOLD]: "int16", [MEMBER.ATTACK]: "int16",
    [MEMBER.RELEASE]: "int16", [MEMBER.HOLD]: "int16", [MEMBER.RATIO]: "int16",
    [MEMBER.DELAY]: "uint32", [MEMBER.PRESET_NUMBER]: "uint32",
    [MEMBER.SHORT_NAME]: "string16", [MEMBER.STATUS]: "uint8", [MEMBER.MUTE]: "uint8",
    [MEMBER.COMMAND]: "uint8", [MEMBER.INVERT]: "uint8", [MEMBER.ON]: "uint8",
    [MEMBER.LINK]: "uint8"
};

function memberFormat(memberId) {
    return MEMBER_FORMATS[memberId] ?? "int32";
}

function encodeValue(memberId, value) {

    const format = memberFormat(memberId);

    switch (format) {
        case "uint8": { const b = Buffer.alloc(1); b.writeUInt8(value & 0xff); return b; }
        case "int16": { const b = Buffer.alloc(2); b.writeInt16BE(Math.round(value)); return b; }
        case "uint16": { const b = Buffer.alloc(2); b.writeUInt16BE(Math.round(value)); return b; }
        case "uint32": { const b = Buffer.alloc(4); b.writeUInt32BE(Math.round(value) >>> 0); return b; }
        case "string16": { const b = Buffer.alloc(16); b.write(String(value).slice(0, 16), "latin1"); return b; }
        default: { const b = Buffer.alloc(4); b.writeInt32BE(Math.round(value)); return b; }
    }
}

function decodeValue(memberId, data) {

    const format = memberFormat(memberId);

    try {
        switch (format) {
            case "uint8": return data.readUInt8(0);
            case "int16": return data.readInt16BE(0);
            case "uint16": return data.readUInt16BE(0);
            case "uint32": return data.readUInt32BE(0);
            case "string16": return data.subarray(0, 16).toString("latin1").replace(/\0.*$/s, "").trim();
            default: return data.readInt32BE(0);
        }
    } catch {
        return null;
    }
}

function checksum(buffer, start = 0xaa) {

    let cs = start;

    for (const byte of buffer) cs ^= byte;

    return cs;
}

/**
 * Builds one "J" command.
 * @param {{ gets: number[][], sets: { key: number[], value: number|string }[], hwId: number, myId: number, mk2: boolean }} options
 */
function buildCommand({ gets = [], sets = [], hwId = 0, myId = 1, mk2 = false }) {

    const fragments = [];

    for (const { key, value } of sets) {
        const [structId, memberId, channel, index] = key;
        const encoded = encodeValue(memberId, value);
        fragments.push(Buffer.from([OPCODE.SET, 6 + encoded.length, structId, memberId, channel, index]), encoded);
    }

    for (const [structId, memberId, channel, index] of gets)
        fragments.push(Buffer.from([OPCODE.GET, 7, structId, memberId, channel, index, 0x6a]));

    const body = Buffer.concat(fragments);

    for (let i = 0; i < body.length; i++) body[i] ^= CODE_TABLE[i % 32];

    const packetLength = 4 + body.length;

    const head = mk2
        ? Buffer.from([packetLength >> 8, packetLength & 0xff, 0x44, 0x4a])
        : Buffer.from([0x05, 0x44, 0x44, 0x4a]);

    const withoutChecksum = Buffer.concat([head, body, Buffer.from([0xfd, hwId & 0xff, 0xff, myId & 0xff])]);

    return Buffer.concat([withoutChecksum, Buffer.from([checksum(withoutChecksum)])]);
}

function parseAnnouncement(packet) {
    return {
        type: "announcement",
        unitType: `${packet[33]}_${packet[34]}_${packet[35]}`,
        hardwareVersion: `${packet[22]}.${packet[23]}.${packet[24]}`,
        picVersion: `${packet[25]}.${packet[26]}.${packet[27]}`,
        serial: packet[28] * 65536 + packet[29] * 256 + packet[30],
        productionDate: `${packet[36]}-${packet[32]}-${2000 + packet[31]}`,
        pcPacketId: packet[39],
        hwPacketId: packet[40]
    };
}

/** Splits a decoded payload into fragments. Returns null when the checksum does not match. */
function parseFragments(data, start, verifyChecksum) {

    const fragments = [];
    let pos = start,
        checksumOk = !verifyChecksum;

    while (pos + 2 < data.length) {

        const opcode = data[pos++];

        if (opcode === OPCODE.DATA_END) break;

        if (opcode === OPCODE.CHECKSUM) {
            let cs = 0xd5;
            for (let i = start; i < pos - 1; i++) cs ^= data[i];
            if (verifyChecksum && cs !== data[pos]) return null;
            pos++;
            checksumOk = true;
            continue;
        }

        if (opcode === OPCODE.ACTIVITY_LOG) {
            fragments.push({ opcode, data: data.subarray(pos, pos + 513) });
            pos += 513;
            continue;
        }

        const size = data[pos++] - 2;

        if (size < 1 || pos + size > data.length) return null;

        fragments.push({ opcode, data: data.subarray(pos, pos + size) });
        pos += size;
    }

    return checksumOk ? fragments : null;
}

function interpretFragments(fragments) {

    const values = [],
        vu = { in: null, out: null },
        gr = { in: null, out: null };

    for (const { opcode, data } of fragments) {

        const signed = () => Array.from(data, b => (b << 24) >> 24);

        if (opcode === OPCODE.RSP && data.length >= 5) {
            const key = [data[0], data[1], data[2], data[3]];
            values.push({ key, value: decodeValue(key[1], data.subarray(4)) });
        }
        else if (opcode === OPCODE.VU_IN) vu.in = signed();
        else if (opcode === OPCODE.VU_OUT) vu.out = signed();
        else if (opcode === OPCODE.GR_IN) gr.in = signed();
        else if (opcode === OPCODE.GR_OUT) gr.out = signed();
    }

    return { values, vu, gr, opcodes: fragments.map(f => f.opcode), errors: fragments.filter(f => f.opcode === OPCODE.ERR).map(f => Array.from(f.data)) };
}

/**
 * Takes bytes from the serial stream and returns complete packets.
 * Unknown bytes before a 'DD' marker are skipped.
 */
class PacketReader {

    constructor() {
        this.buffer = Buffer.alloc(0);
    }

    push(chunk) {

        this.buffer = Buffer.concat([this.buffer, chunk]);

        const packets = [];

        for (; ;) {

            const start = this.buffer.indexOf("DD", 0, "latin1");

            if (start < 0) {
                this.buffer = this.buffer.subarray(Math.max(0, this.buffer.length - 1));
                break;
            }

            if (start > 0) this.buffer = this.buffer.subarray(start);
            if (this.buffer.length < 3) break;

            const kind = String.fromCharCode(this.buffer[2]);

            let length;

            if (kind === "W") {
                if (this.buffer.length < 10) break;
                length = 10 + (this.buffer[8] << 8 | this.buffer[9]);
                if (length < 12 || length > 4096) { this.buffer = this.buffer.subarray(2); continue; }
            }
            else if ("ABCMN".includes(kind)) {
                length = 42;
            }
            else {
                this.buffer = this.buffer.subarray(2);
                continue;
            }

            if (this.buffer.length < length) break;

            const raw = this.buffer.subarray(0, length);
            this.buffer = this.buffer.subarray(length);

            const packet = parsePacket(Buffer.from(raw));
            if (packet) packets.push(Object.assign(packet, { kind: raw.toString("latin1", 0, 3), rawHex: raw.toString("hex") }));
        }

        return packets;
    }
}

function parsePacket(raw) {

    const kind = raw.toString("latin1", 0, 3);

    if (kind === "DDB") {
        if (raw.length < 42 || raw[41] !== 0x51) return null;
        return parseAnnouncement(raw);
    }

    if (kind === "DDW") {
        // DXOControl appends a 'Q' before parsing, which lets the loop reach the last fragment.
        const decoded = Buffer.concat([raw, Buffer.from("Q", "latin1")]);
        for (let i = 10; i < raw.length; i++) decoded[i] ^= CODE_TABLE[(i - 10) % 34];
        const fragments = parseFragments(decoded, 10, true);
        if (!fragments) return { type: "invalid", reason: "checksum", mk2: true };
        return { type: "data", mk2: true, pcPacketId: raw[7], hwPacketId: raw[8], ...interpretFragments(fragments) };
    }

    // DXOControl decodes 'DDN' exactly like 'DDA' (parse_packet); only short DDN packets are errors.
    if (kind === "DDA" || kind === "DDN") {
        if (raw[41] !== 0x51) return { type: "invalid", reason: "terminator", mk2: false };
        const decoded = Buffer.from(raw);
        const empty = decoded[3] === 0 && decoded[4] === 0;
        for (let i = 3; i < 39; i++) decoded[i] = empty ? 0 : decoded[i] ^ CODE_TABLE[(i - 3) % 32];
        const fragments = parseFragments(decoded, 3, false) ?? [];
        return { type: "data", mk2: false, pcPacketId: raw[39], hwPacketId: raw[40], ...interpretFragments(fragments) };
    }

    if (kind === "DDM" || kind === "DDC")
        return { type: "nack", pcPacketId: raw[39], hwPacketId: raw[40] };

    return null;
}

module.exports = {
    CODE_TABLE, OPCODE, STRUCT, MEMBER,
    buildCommand, parsePacket, PacketReader, checksum, encodeValue, decodeValue
};
