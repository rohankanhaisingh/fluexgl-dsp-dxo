/**
 * Shared drawing helpers for frequency response graphs (the equalizer and the filters):
 * a logarithmic frequency axis, a decibel axis, the grid and a spectrum behind the curve.
 */

export interface GraphSize {
    width: number;
    height: number;
}

/** The decibel range shown on the vertical axis. */
export interface GraphRange {
    minDecibels: number;
    maxDecibels: number;
    /** Decibel values that get a horizontal grid line and label. */
    grid: number[];
}

export interface GraphColors {
    accent: string;
    muted: string;
}

export const GRAPH_MIN_FREQUENCY: number = 20;
export const GRAPH_MAX_FREQUENCY: number = 20000;
export const GRAPH_PADDING: number = 14;

export const SPECTRUM_MIN_DECIBELS: number = -100;
export const SPECTRUM_MAX_DECIBELS: number = -10;

const FREQUENCY_GRID: number[] = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
const MINOR_FREQUENCY_GRID: number[] = [30, 40, 60, 70, 80, 90, 300, 400, 600, 700, 800, 900, 3000, 4000, 6000, 7000, 8000, 9000];

const LOG_MIN_FREQUENCY: number = Math.log10(GRAPH_MIN_FREQUENCY);
const LOG_FREQUENCY_RANGE: number = Math.log10(GRAPH_MAX_FREQUENCY) - LOG_MIN_FREQUENCY;

export function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

export function frequencyToX(frequency: number, size: GraphSize): number {
    return (Math.log10(frequency) - LOG_MIN_FREQUENCY) / LOG_FREQUENCY_RANGE * size.width;
}

export function xToFrequency(x: number, size: GraphSize): number {
    return Math.pow(10, LOG_MIN_FREQUENCY + (x / size.width) * LOG_FREQUENCY_RANGE);
}

export function decibelsToY(decibels: number, size: GraphSize, range: GraphRange): number {
    return GRAPH_PADDING + (range.maxDecibels - decibels) / (range.maxDecibels - range.minDecibels) * (size.height - 2 * GRAPH_PADDING);
}

export function yToDecibels(y: number, size: GraphSize, range: GraphRange): number {
    return range.maxDecibels - (y - GRAPH_PADDING) / (size.height - 2 * GRAPH_PADDING) * (range.maxDecibels - range.minDecibels);
}

function formatGridFrequency(frequency: number): string {
    return frequency >= 1000 ? `${frequency / 1000}k` : `${frequency}`;
}

export function readGraphColors(element: HTMLElement): GraphColors {

    const style: CSSStyleDeclaration = getComputedStyle(element);

    return {
        accent: style.getPropertyValue("--color-accent").trim() || "#FFA646",
        muted: style.getPropertyValue("--color-panel-text-muted").trim() || "#A3A4A6"
    };
}

/**
 * Matches the canvas resolution to its on-screen size and device pixel ratio, and clears it.
 * Returns false when there is nothing to draw on yet.
 */
export function prepareGraphCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, size: GraphSize): boolean {

    if (size.width === 0 || size.height === 0) return false;

    const pixelRatio: number = window.devicePixelRatio || 1,
        pixelWidth: number = Math.round(size.width * pixelRatio),
        pixelHeight: number = Math.round(size.height * pixelRatio);

    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
    }

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);

    return true;
}

export function drawFrequencyGrid(ctx: CanvasRenderingContext2D, size: GraphSize, range: GraphRange, colors: GraphColors) {

    ctx.save();
    ctx.lineWidth = 1;
    ctx.font = "10px Poppins, sans-serif";
    ctx.fillStyle = colors.muted;
    ctx.strokeStyle = colors.muted;

    function verticalLine(frequency: number) {
        const x = Math.round(frequencyToX(frequency, size)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, size.height);
        ctx.stroke();
    }

    ctx.globalAlpha = 0.07;
    MINOR_FREQUENCY_GRID.forEach(verticalLine);

    ctx.globalAlpha = 0.18;
    FREQUENCY_GRID.forEach(verticalLine);

    for (const decibels of range.grid) {
        const y = Math.round(decibelsToY(decibels, size, range)) + 0.5;
        ctx.globalAlpha = decibels === 0 ? 0.4 : 0.18;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size.width, y);
        ctx.stroke();
    }

    ctx.globalAlpha = 0.8;
    ctx.textBaseline = "bottom";

    for (const frequency of FREQUENCY_GRID) {
        if (frequency === GRAPH_MIN_FREQUENCY || frequency === GRAPH_MAX_FREQUENCY) continue;
        ctx.fillText(formatGridFrequency(frequency), frequencyToX(frequency, size) + 3, size.height - 2);
    }

    ctx.textBaseline = "middle";

    for (const decibels of range.grid)
        ctx.fillText(decibels > 0 ? `+${decibels}` : `${decibels}`, 4, decibelsToY(decibels, size, range) - 7);

    ctx.restore();
}

/**
 * Draws the spectrum of an analyser as a soft filled shape. The analyser must use
 * SPECTRUM_MIN_DECIBELS and SPECTRUM_MAX_DECIBELS as its decibel range.
 */
export function drawSpectrum(ctx: CanvasRenderingContext2D, size: GraphSize, analyser: AnalyserNode, data: Float32Array<ArrayBuffer>, colors: GraphColors) {

    analyser.getFloatFrequencyData(data);

    const binWidth: number = analyser.context.sampleRate / analyser.fftSize,
        step: number = 2;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, size.height);

    for (let x = 0; x <= size.width; x += step) {

        const startBin: number = Math.floor(xToFrequency(x, size) / binWidth),
            endBin: number = Math.max(startBin + 1, Math.ceil(xToFrequency(x + step, size) / binWidth));

        let peak: number = -Infinity;

        for (let bin = startBin; bin < endBin && bin < data.length; bin++)
            peak = Math.max(peak, data[bin]);

        const normalized: number = clamp((peak - SPECTRUM_MIN_DECIBELS) / (SPECTRUM_MAX_DECIBELS - SPECTRUM_MIN_DECIBELS), 0, 1);

        ctx.lineTo(x, size.height - normalized * size.height);
    }

    ctx.lineTo(size.width, size.height);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, size.height, 0, 0);
    gradient.addColorStop(0, colors.muted);
    gradient.addColorStop(1, "transparent");

    ctx.globalAlpha = 0.25;
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();
}

/** Draws a tooltip box with a colored marker, kept inside the graph. */
export function drawGraphTooltip(ctx: CanvasRenderingContext2D, size: GraphSize, x: number, y: number, text: string, color: string, nodeRadius: number) {

    ctx.save();
    ctx.font = "11px Poppins, sans-serif";

    const boxWidth: number = ctx.measureText(text).width + 14,
        boxHeight: number = 20,
        boxX: number = clamp(x - boxWidth / 2, 2, size.width - boxWidth - 2),
        boxY: number = y - nodeRadius - boxHeight - 8 < 2 ? y + nodeRadius + 8 : y - nodeRadius - boxHeight - 8;

    ctx.globalAlpha = 0.92;
    ctx.fillStyle = "#1B1C1D";
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 4);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    ctx.fillRect(boxX, boxY + 4, 2, boxHeight - 8);

    // The tooltip is dark in both themes, so the text is always light.
    ctx.fillStyle = "#E6E7E8";
    ctx.textBaseline = "middle";
    ctx.fillText(text, boxX + 8, boxY + boxHeight / 2 + 0.5);
    ctx.restore();
}
