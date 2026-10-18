export function formatFrequency(frequency: number): string {

    if (frequency <= 0) return "Off";

    return frequency >= 1000 ? `${(frequency / 1000).toFixed(2)} kHz` : `${Math.round(frequency)} Hz`;
}

export function formatDecibels(decibels: number): string {
    return `${decibels > 0 ? "+" : ""}${decibels.toFixed(1)} dB`;
}

export function formatMilliseconds(milliseconds: number): string {
    return milliseconds >= 1000 ? `${(milliseconds / 1000).toFixed(2)} s` : `${milliseconds.toFixed(0)} ms`;
}

export function formatPercentage(value: number): string {
    return `${Math.round(value * 100)}%`;
}

export function formatRatio(ratio: number): string {
    return `${ratio.toFixed(1)}:1`;
}
