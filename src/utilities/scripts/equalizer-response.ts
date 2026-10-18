import type { EqualizerBand, EqualizerBandType } from "@fluex/fluexgl-dsp";

/** Biquad coefficients, normalized so that a0 = 1. */
export interface BiquadCoefficients {
    b0: number;
    b1: number;
    b2: number;
    a1: number;
    a2: number;
}

/** Only these band types use the gain parameter. */
export const GAIN_BAND_TYPES: EqualizerBandType[] = ["peaking", "lowshelf", "highshelf"];

export function bandUsesGain(type: EqualizerBandType): boolean {
    return GAIN_BAND_TYPES.includes(type);
}

/**
 * Computes the coefficients of a band with the formulas from Robert Bristow-Johnson's
 * Audio EQ Cookbook, which is what biquad based equalizers (including the FluexGL DSP one) use.
 */
export function computeBiquadCoefficients(band: EqualizerBand, sampleRate: number): BiquadCoefficients {

    const frequency: number = Math.min(band.frequency, sampleRate * 0.5 - 1),
        w0: number = 2 * Math.PI * frequency / sampleRate,
        cos: number = Math.cos(w0),
        alpha: number = Math.sin(w0) / (2 * band.q),
        A: number = Math.pow(10, band.gain / 40),
        shelfAlpha: number = 2 * Math.sqrt(A) * alpha;

    let b0: number, b1: number, b2: number, a0: number, a1: number, a2: number;

    switch (band.type) {
        case "lowshelf":
            b0 = A * ((A + 1) - (A - 1) * cos + shelfAlpha);
            b1 = 2 * A * ((A - 1) - (A + 1) * cos);
            b2 = A * ((A + 1) - (A - 1) * cos - shelfAlpha);
            a0 = (A + 1) + (A - 1) * cos + shelfAlpha;
            a1 = -2 * ((A - 1) + (A + 1) * cos);
            a2 = (A + 1) + (A - 1) * cos - shelfAlpha;
            break;
        case "highshelf":
            b0 = A * ((A + 1) + (A - 1) * cos + shelfAlpha);
            b1 = -2 * A * ((A - 1) + (A + 1) * cos);
            b2 = A * ((A + 1) + (A - 1) * cos - shelfAlpha);
            a0 = (A + 1) - (A - 1) * cos + shelfAlpha;
            a1 = 2 * ((A - 1) - (A + 1) * cos);
            a2 = (A + 1) - (A - 1) * cos - shelfAlpha;
            break;
        case "lowpass":
            b0 = (1 - cos) / 2;
            b1 = 1 - cos;
            b2 = (1 - cos) / 2;
            a0 = 1 + alpha;
            a1 = -2 * cos;
            a2 = 1 - alpha;
            break;
        case "highpass":
            b0 = (1 + cos) / 2;
            b1 = -(1 + cos);
            b2 = (1 + cos) / 2;
            a0 = 1 + alpha;
            a1 = -2 * cos;
            a2 = 1 - alpha;
            break;
        case "notch":
            b0 = 1;
            b1 = -2 * cos;
            b2 = 1;
            a0 = 1 + alpha;
            a1 = -2 * cos;
            a2 = 1 - alpha;
            break;
        case "bandpass":
            // Constant 0 dB peak gain.
            b0 = alpha;
            b1 = 0;
            b2 = -alpha;
            a0 = 1 + alpha;
            a1 = -2 * cos;
            a2 = 1 - alpha;
            break;
        case "peaking":
        default:
            b0 = 1 + alpha * A;
            b1 = -2 * cos;
            b2 = 1 - alpha * A;
            a0 = 1 + alpha / A;
            a1 = -2 * cos;
            a2 = 1 - alpha / A;
            break;
    }

    return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

/**
 * The magnitude response (dB) of a biquad at the given frequency.
 * Very deep cuts (a notch at its center) are limited to -120 dB.
 */
export function biquadMagnitudeDecibels(c: BiquadCoefficients, frequency: number, sampleRate: number): number {

    const w: number = 2 * Math.PI * frequency / sampleRate,
        cos1: number = Math.cos(w),
        cos2: number = Math.cos(2 * w);

    const numerator: number = c.b0 * c.b0 + c.b1 * c.b1 + c.b2 * c.b2 + 2 * (c.b0 * c.b1 + c.b1 * c.b2) * cos1 + 2 * c.b0 * c.b2 * cos2,
        denominator: number = 1 + c.a1 * c.a1 + c.a2 * c.a2 + 2 * (c.a1 + c.a1 * c.a2) * cos1 + 2 * c.a2 * cos2;

    return Math.max(-120, 10 * Math.log10(Math.max(1e-12, numerator / denominator)));
}
