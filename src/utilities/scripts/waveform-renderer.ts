export interface WaveformCanvasOptions {
    barWidth?: number;
    barGap?: number;
    color?: string;
    backgroundColor?: string;
    mirrored?: boolean;
}

export function drawWaveformBarsOnCanvas(canvas: HTMLCanvasElement, bars: Float32Array, options?: WaveformCanvasOptions): void {

    const ctx: CanvasRenderingContext2D | null = canvas.getContext("2d");

    if (!ctx) return;

    const width = canvas.width,
        height = canvas.height;

    const barWidth = options && options.barWidth != null ? options.barWidth : 2,
        barGap = options && options.barGap != null ? options.barGap : 1,
        color = options && options.color ? options.color : "#38bdf8",
        backgroundColor = options && options.backgroundColor ? options.backgroundColor : null,
        mirrored = options && options.mirrored !== undefined ? options.mirrored : true;

    ctx.clearRect(0, 0, width, height);
    ctx.save();

    if (backgroundColor) {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
    }

    ctx.fillStyle = color;

    const totalBarSpace = barWidth + barGap,
        maxBars = Math.floor(width / totalBarSpace),
        count = Math.min(maxBars, bars.length);

    const totalWidth = count * totalBarSpace - barGap,
        startX = Math.floor((width - totalWidth) / 2);

    for (let i = 0; i < count; i++) {
        let v = bars[i];
        if (v < 0) v = -v;
        if (v > 1) v = 1;

        const barHeight = v * height;

        const x = startX + i * totalBarSpace;

        if (mirrored) {

            const midY = height * 0.5;
            const half = barHeight * 0.5;
            const y = midY - half;

            ctx.fillRect(x, y, barWidth, barHeight);
        } else {

            const yBottom = height - barHeight;
            ctx.fillRect(x, yBottom, barWidth, barHeight);
        }
    }
    ctx.restore();
}