/**
 * Parameters of the Omnitronic DXO-48PRO MK2 (unit type 2_10_31), taken from the
 * DXOControl skin files (skins/2_10_31_d/default.cfg). A key is
 * [structId, memberId, channel, index]; raw values are display values * scale.
 */

export type DxoKey = [number, number, number, number];

export const STRUCT = {
    GAIN: 0, MIXER: 1, DELAY: 2, LPF: 3, HPF: 4, PEQ: 5, LIMITER: 6, MUTE: 7,
    INVERT: 8, PRESET_GLOBAL: 9, LINK: 10, COMPRESSOR: 12, GLOBAL: 13, CHANNEL: 14
} as const;

export const MEMBER = {
    GAIN: 0, FREQ: 1, Q: 2, TYPE: 3, THRESHOLD: 4, ATTACK: 5, RELEASE: 6,
    DELAY: 8, MUTE: 14, INVERT: 15, SHORT_NAME: 16, PRESET_NUMBER: 18, ON: 24, RATIO: 27,
    HARDWARE_STATUS_FLAGS: 35, STARTUP_PRESET: 43
} as const;

export interface DxoChannel {
    id: number;
    kind: "input" | "output";
    /** "A".."D" for inputs, "1".."8" for outputs. */
    label: string;
}

export const INPUTS: DxoChannel[] = ["A", "B", "C", "D"].map((label, i) => ({ id: i, kind: "input", label }));
export const OUTPUTS: DxoChannel[] = Array.from({ length: 8 }, (_, i) => ({ id: 0x80 + i, kind: "output", label: String(i + 1) }));
export const ALL_CHANNELS: DxoChannel[] = [...INPUTS, ...OUTPUTS];

export interface Choice {
    value: number;
    label: string;
}

export interface ParameterDefinition {
    struct: number;
    member: number;
    min: number;
    max: number;
    scale: number;
    defaultValue: number;
    unit?: string;
    choices?: Choice[];
}

function define(struct: number, member: number, min: number, max: number, scale: number, defaultValue: number, unit?: string, choices?: Choice[]): ParameterDefinition {
    return { struct, member, min, max, scale, defaultValue, unit, choices };
}

export const PEQ_BAND_COUNT = 10;

export const PEQ_TYPES: Choice[] = [
    { value: 128, label: "Bell" },
    { value: 129, label: "Notch" },
    { value: 130, label: "All pass" },
    { value: 131, label: "Low shelf" },
    { value: 132, label: "High shelf" },
    { value: 133, label: "Band pass" },
    { value: 134, label: "High pass" },
    { value: 136, label: "Low pass" }
];

export const CROSSOVER_SHAPES: Choice[] = [
    { value: 0x00, label: "Butterworth 6 dB" },
    { value: 0x10, label: "Bessel 6 dB" },
    { value: 0x01, label: "Butterworth 12 dB" },
    { value: 0x11, label: "Bessel 12 dB" },
    { value: 0x21, label: "Linkwitz-Riley 12 dB" },
    { value: 0x02, label: "Butterworth 18 dB" },
    { value: 0x12, label: "Bessel 18 dB" },
    { value: 0x03, label: "Butterworth 24 dB" },
    { value: 0x13, label: "Bessel 24 dB" },
    { value: 0x23, label: "Linkwitz-Riley 24 dB" },
    { value: 0x27, label: "Linkwitz-Riley 48 dB" }
];

export const PARAMS = {
    gain: define(STRUCT.GAIN, MEMBER.GAIN, -48, 12, 100, 0, "dB"),
    mute: define(STRUCT.MUTE, MEMBER.MUTE, 0, 1, 1, 0),
    invert: define(STRUCT.INVERT, MEMBER.INVERT, 0, 1, 1, 0),
    name: define(STRUCT.CHANNEL, MEMBER.SHORT_NAME, 0, 0, 1, 0),

    inputDelay: define(STRUCT.DELAY, MEMBER.DELAY, 0, 2000, 1000, 0, "ms"),
    outputDelay: define(STRUCT.DELAY, MEMBER.DELAY, 0, 50, 1000, 0, "ms"),

    hpfFrequency: define(STRUCT.HPF, MEMBER.FREQ, 19, 20000, 1, 19, "Hz"),
    hpfShape: define(STRUCT.HPF, MEMBER.TYPE, 0, 0x27, 1, 0, undefined, CROSSOVER_SHAPES),
    hpfOn: define(STRUCT.HPF, MEMBER.ON, 0, 1, 1, 0),
    lpfFrequency: define(STRUCT.LPF, MEMBER.FREQ, 20, 20001, 1, 20001, "Hz"),
    lpfShape: define(STRUCT.LPF, MEMBER.TYPE, 0, 0x27, 1, 0, undefined, CROSSOVER_SHAPES),
    lpfOn: define(STRUCT.LPF, MEMBER.ON, 0, 1, 1, 0),

    peqType: define(STRUCT.PEQ, MEMBER.TYPE, 128, 136, 1, 128, undefined, PEQ_TYPES),
    peqFrequency: define(STRUCT.PEQ, MEMBER.FREQ, 20, 20000, 1, 1000, "Hz"),
    peqQ: define(STRUCT.PEQ, MEMBER.Q, 0.2, 25, 10, 1, ""),
    peqGain: define(STRUCT.PEQ, MEMBER.GAIN, -12, 12, 100, 0, "dB"),
    peqOn: define(STRUCT.PEQ, MEMBER.ON, 0, 1, 1, 1),

    inputLimiterThreshold: define(STRUCT.LIMITER, MEMBER.THRESHOLD, -48, 24, 100, 24, "dB"),
    outputLimiterThreshold: define(STRUCT.LIMITER, MEMBER.THRESHOLD, -48, 12, 100, 12, "dB"),
    limiterRelease: define(STRUCT.LIMITER, MEMBER.RELEASE, 10, 10000, 1, 50, "ms"),

    compressorThreshold: define(STRUCT.COMPRESSOR, MEMBER.THRESHOLD, -48, 24, 100, 24, "dB"),
    compressorRatio: define(STRUCT.COMPRESSOR, MEMBER.RATIO, 1.2, 25, 10, 2, ":1"),
    compressorAttack: define(STRUCT.COMPRESSOR, MEMBER.ATTACK, 4, 10000, 1, 10, "ms"),
    compressorRelease: define(STRUCT.COMPRESSOR, MEMBER.RELEASE, 10, 10000, 1, 100, "ms"),

    /** Output routing: index 0..3 is the level of input A..D in this output. */
    mixerGain: define(STRUCT.MIXER, MEMBER.GAIN, -48, 0, 100, -48, "dB"),

    unitName: define(STRUCT.GLOBAL, MEMBER.SHORT_NAME, 0, 0, 1, 0),
    /** Channel 0: name of the current settings. Channel n: name stored in preset n. */
    presetName: define(STRUCT.PRESET_GLOBAL, MEMBER.SHORT_NAME, 0, 0, 1, 0),
    presetNumber: define(STRUCT.PRESET_GLOBAL, MEMBER.PRESET_NUMBER, 0, 255, 1, 1),
    /** Upper byte: presets 1..n are read only. */
    startupPreset: define(STRUCT.GLOBAL, MEMBER.STARTUP_PRESET, 0, 0xffff, 1, 0),
    statusFlags: define(STRUCT.GLOBAL, MEMBER.HARDWARE_STATUS_FLAGS, 0, 0xffffffff, 1, 0)
} satisfies Record<string, ParameterDefinition>;

export type ParameterName = keyof typeof PARAMS;

export function keyFor(parameter: ParameterDefinition, channel: number, index: number = 0): DxoKey {
    return [parameter.struct, parameter.member, channel, index];
}

export function keyId(key: DxoKey): string {
    return key.join(",");
}

export function toRaw(parameter: ParameterDefinition, value: number): number {
    return Math.round(value * parameter.scale);
}

export function fromRaw(parameter: ParameterDefinition, raw: number): number {
    return raw / parameter.scale;
}

/** All keys the UI shows for one channel, used to read the full channel state. */
export function channelKeys(channel: DxoChannel): DxoKey[] {

    const keys: DxoKey[] = [
        keyFor(PARAMS.gain, channel.id),
        keyFor(PARAMS.mute, channel.id),
        keyFor(PARAMS.name, channel.id),
        keyFor(channel.kind === "input" ? PARAMS.inputDelay : PARAMS.outputDelay, channel.id),
        keyFor(PARAMS.hpfFrequency, channel.id), keyFor(PARAMS.hpfShape, channel.id),
        keyFor(PARAMS.lpfFrequency, channel.id), keyFor(PARAMS.lpfShape, channel.id),
        keyFor(channel.kind === "input" ? PARAMS.inputLimiterThreshold : PARAMS.outputLimiterThreshold, channel.id),
        keyFor(PARAMS.limiterRelease, channel.id),
        keyFor(PARAMS.compressorThreshold, channel.id), keyFor(PARAMS.compressorRatio, channel.id),
        keyFor(PARAMS.compressorAttack, channel.id), keyFor(PARAMS.compressorRelease, channel.id)
    ];

    for (let band = 0; band < PEQ_BAND_COUNT; band++)
        keys.push(
            keyFor(PARAMS.peqType, channel.id, band), keyFor(PARAMS.peqFrequency, channel.id, band),
            keyFor(PARAMS.peqQ, channel.id, band), keyFor(PARAMS.peqGain, channel.id, band),
            keyFor(PARAMS.peqOn, channel.id, band)
        );

    if (channel.kind === "output") {
        keys.push(keyFor(PARAMS.invert, channel.id));
        for (let input = 0; input < INPUTS.length; input++) keys.push(keyFor(PARAMS.mixerGain, channel.id, input));
    }

    return keys;
}

/** Looks up the definition that belongs to a key, so raw values from the unit can be scaled. */
export function definitionForKey(key: DxoKey): ParameterDefinition | null {

    const [struct, member, channel] = key;

    if (struct === STRUCT.DELAY) return channel >= 0x80 ? PARAMS.outputDelay : PARAMS.inputDelay;
    if (struct === STRUCT.LIMITER && member === MEMBER.THRESHOLD) return channel >= 0x80 ? PARAMS.outputLimiterThreshold : PARAMS.inputLimiterThreshold;

    for (const parameter of Object.values(PARAMS))
        if (parameter.struct === struct && parameter.member === member) return parameter;

    return null;
}

/** The 2_1_x units offer presets 1..50. Names of slots the unit does not have are simply never answered. */
export const PRESET_COUNT = 50;

/** Hardware status flag: the current settings differ from the loaded preset. */
export const FLAG_PRESET_CHANGED = 0x200;

export function presetKeys(): DxoKey[] {
    const keys: DxoKey[] = [keyFor(PARAMS.presetNumber, 0), keyFor(PARAMS.presetName, 0), keyFor(PARAMS.startupPreset, 0), keyFor(PARAMS.statusFlags, 0)];
    for (let n = 1; n <= PRESET_COUNT; n++) keys.push(keyFor(PARAMS.presetName, n));
    return keys;
}
