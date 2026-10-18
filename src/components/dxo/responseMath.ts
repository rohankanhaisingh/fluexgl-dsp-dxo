import type { EqualizerBand, EqualizerBandType } from "@fluex/fluexgl-dsp";

import { biquadMagnitudeDecibels, computeBiquadCoefficients } from "../../utilities/scripts/equalizer-response";

/** The DXO DSP runs at 48 kHz. */
export const SAMPLE_RATE = 48000;

/** DXO PEQ type -> biquad type of the existing EQ math. All pass is flat in magnitude. */
const PEQ_TYPE_TO_BAND: Record<number, EqualizerBandType | "allpass"> = {
    128: "peaking", 129: "notch", 130: "allpass", 131: "lowshelf",
    132: "highshelf", 133: "bandpass", 134: "highpass", 136: "lowpass"
};

export interface DxoBand {
    type: number;
    frequency: number;
    q: number;
    gain: number;
    on: boolean;
}

export function bandUsesGain(type: number): boolean {
    return type === 128 || type === 131 || type === 132;
}

export function bandMagnitude(band: DxoBand, frequency: number): number {

    if (!band.on) return 0;

    const type = PEQ_TYPE_TO_BAND[band.type] ?? "peaking";

    if (type === "allpass") return 0;

    const asBand: EqualizerBand = { type, frequency: band.frequency, q: Math.max(0.1, band.q), gain: band.gain, enabled: true };

    return biquadMagnitudeDecibels(computeBiquadCoefficients(asBand, SAMPLE_RATE), frequency, SAMPLE_RATE);
}

/**
 * Magnitude of a crossover filter. The low nibble of the shape is the order - 1,
 * the high nibble the family (0 Butterworth, 1 Bessel, 2 Linkwitz-Riley).
 * Bessel is drawn as Butterworth; the curve is meant as a guide, not a measurement.
 */
export function crossoverMagnitude(kind: "hpf" | "lpf", shape: number, cutoff: number, frequency: number): number {

    const family = shape >> 4;
    let order = (shape & 0x0f) + 1;

    if (shape === 0x27) order = 8;

    const ratio = kind === "lpf" ? frequency / cutoff : cutoff / frequency;

    if (family === 2) {
        // Linkwitz-Riley: two cascaded Butterworth filters of half the order.
        const half = order / 2;
        return 2 * (-10 * Math.log10(1 + Math.pow(ratio, 2 * half)));
    }

    return -10 * Math.log10(1 + Math.pow(ratio, 2 * order));
}
