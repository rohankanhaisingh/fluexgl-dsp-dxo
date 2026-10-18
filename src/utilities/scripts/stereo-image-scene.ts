import type { StereoMonoMode } from "@fluex/fluexgl-dsp";

export type StereoSide = "left" | "right";

export interface StereoImageParameters {
    mode: StereoMonoMode;
    delayLeftMs: number;
    delayRightMs: number;
    invertLeft: boolean;
    invertRight: boolean;
}

/** A snapshot of the signal around the effect. */
export interface StereoImageSignalFrame {
    /** Time domain samples of the left and right output. */
    output: [Float32Array, Float32Array];
    /** RMS level (linear) of the left and right input. */
    inputLevels: [number, number];
}

export type StereoImageSignalReader = () => StereoImageSignalFrame | null;

export interface StereoImageColors {
    accent: string;
    muted: string;
    text: string;
    panel: string;
}

export interface StereoImageInteractions {
    /** Called while an output node is dragged sideways. */
    onDelayChange?: (side: StereoSide, ms: number) => void;
    /** Called when an output node is clicked without dragging. */
    onInvertToggle?: (side: StereoSide) => void;
}

/**
 * Matrix gains per mode, as used by the FluexGL DSP StereoMono effect:
 * [left-to-left, right-to-left, left-to-right, right-to-right].
 */
export const STEREO_MONO_MATRIX: Record<StereoMonoMode, [number, number, number, number]> = {
    "stereo": [1, 0, 0, 1],
    "mono": [0.5, 0.5, 0.5, 0.5],
    "swap": [0, 1, 1, 0],
    "left": [1, 0, 0, 0],
    "right": [0, 0, 0, 1],
    "left-to-both": [1, 0, 1, 0],
    "right-to-both": [0, 1, 0, 1],
    "mid": [0.5, 0.5, 0.5, 0.5],
    "side": [0.5, -0.5, -0.5, 0.5]
};

export const STEREO_MONO_MAX_DELAY_MS: number = 100;

/** Color of paths and outputs with an inverted polarity. Fixed, so it always contrasts with the accent color. */
const INVERTED_COLOR: string = "#5AB8FF";

/** Input channel (0 = left, 1 = right) and output channel of each matrix path, in matrix order. */
const PATH_FROM: number[] = [0, 1, 0, 1];
const PATH_TO: number[] = [0, 0, 1, 1];

const BEZIER_SEGMENTS: number = 24;
/** Particles per second on a path at full gain and full level. */
const PARTICLE_RATE: number = 45;
const MAX_PARTICLES: number = 500;
/** After this much silence (seconds), a synthetic signal is shown so the scene is never empty. */
const PREVIEW_AFTER_SILENCE: number = 1;
const SILENCE_LEVEL: number = 0.0015;
const PREVIEW_SAMPLE_RATE: number = 48000;
const PREVIEW_SAMPLES: number = 1024;
const NODE_RADIUS: number = 16;
/** Pointer movement (px) before a press on an output node counts as a drag instead of a click. */
const DRAG_THRESHOLD: number = 3;

interface Point {
    x: number;
    y: number;
}

interface Polyline {
    points: Point[];
    /** Distance from the start to every point. */
    distances: number[];
    length: number;
}

interface Particle {
    path: number;
    distance: number;
    speed: number;
    inverted: boolean;
}

interface Layout {
    width: number;
    height: number;
    inputX: number;
    matrixX: number;
    outputBaseX: number;
    maxShift: number;
    rowY: [number, number];
    scopeLeft: number;
    scopeTop: number;
    scopeSize: number;
    meterY: number;
}

interface DragState {
    side: StereoSide;
    startX: number;
    startDelay: number;
    moved: boolean;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function sideIndex(side: StereoSide): number {
    return side === "left" ? 0 : 1;
}

function pointOnPolyline(polyline: Polyline, distance: number): Point {

    const { points, distances } = polyline;

    for (let i = 1; i < points.length; i++) {

        if (distance > distances[i]) continue;

        const span: number = distances[i] - distances[i - 1],
            t: number = span > 0 ? (distance - distances[i - 1]) / span : 0;

        return {
            x: points[i - 1].x + (points[i].x - points[i - 1].x) * t,
            y: points[i - 1].y + (points[i].y - points[i - 1].y) * t
        };
    }

    return points[points.length - 1];
}

/**
 * A 2D visualisation of the StereoMono effect, driven by the signal.
 *
 * The left half shows the routing: both inputs flow through the 2x2 matrix into the outputs. The thickness of a
 * path follows its gain, inverted paths are drawn in blue, and particles flow along with the level of their input.
 * An output node can be dragged sideways to delay it, or clicked to invert its polarity.
 *
 * The right half is a goniometer (vectorscope) of the output with a correlation meter: a mono signal draws a
 * vertical line, a signal with only the side component a horizontal line, and a wide signal a cloud.
 */
export class StereoImageScene {

    private container: HTMLElement;
    private canvas: HTMLCanvasElement = document.createElement("canvas");
    private context: CanvasRenderingContext2D;
    private scopeCanvas: HTMLCanvasElement = document.createElement("canvas");
    private scopeContext: CanvasRenderingContext2D;
    private resizeObserver: ResizeObserver;
    private frameId: number = 0;
    private lastFrameTime: number = performance.now();
    private pixelRatio: number = 1;
    private layout: Layout | null = null;

    private parameters: StereoImageParameters;
    private interactions: StereoImageInteractions;
    private signalReader: StereoImageSignalReader | null = null;
    private colors: StereoImageColors = { accent: "#FFA646", muted: "#A3A4A6", text: "#E6E7E8", panel: "#3A3B3D" };

    /** Displayed (smoothed) matrix gains, including the polarity of the outputs. */
    private gains: number[];
    /** Displayed (smoothed) delays in ms. */
    private delays: [number, number];
    private particles: Particle[] = [];
    private spawnAccumulators: number[] = [0, 0, 0, 0];
    private inputPulse: [number, number] = [0, 0];
    private outputPulse: [number, number] = [0, 0];
    private correlation: number = 1;
    private scopePeak: number = 0.05;

    private silentFor: number = Infinity;
    private previewTime: number = 0;
    private previewLeft: Float32Array = new Float32Array(PREVIEW_SAMPLES);
    private previewRight: Float32Array = new Float32Array(PREVIEW_SAMPLES);

    private hovered: StereoSide | null = null;
    private drag: DragState | null = null;

    constructor(container: HTMLElement, parameters: StereoImageParameters, interactions: StereoImageInteractions = {}) {

        this.container = container;
        this.parameters = { ...parameters };
        this.interactions = interactions;
        this.gains = this.targetGains();
        this.delays = [parameters.delayLeftMs, parameters.delayRightMs];

        this.context = this.canvas.getContext("2d")!;
        this.scopeContext = this.scopeCanvas.getContext("2d")!;

        container.appendChild(this.canvas);

        this.canvas.addEventListener("pointerdown", this.onPointerDown);
        this.canvas.addEventListener("pointermove", this.onPointerMove);
        this.canvas.addEventListener("pointerup", this.onPointerUp);
        this.canvas.addEventListener("pointercancel", this.onPointerUp);
        this.canvas.addEventListener("pointerleave", this.onPointerLeave);

        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(container);
        this.resize();

        this.frameId = window.requestAnimationFrame(this.render);
    }

    setParameters(parameters: StereoImageParameters) {
        this.parameters = { ...parameters };
    }

    setSignalReader(reader: StereoImageSignalReader | null) {
        this.signalReader = reader;
    }

    setInteractions(interactions: StereoImageInteractions) {
        this.interactions = interactions;
    }

    /** True while the signal drives the scene, false while the synthetic preview plays. */
    get hasSignal(): boolean {
        return this.silentFor < PREVIEW_AFTER_SILENCE;
    }

    setColors(colors: StereoImageColors) {
        this.colors = { ...colors };
    }

    dispose() {

        window.cancelAnimationFrame(this.frameId);
        this.resizeObserver.disconnect();

        this.canvas.removeEventListener("pointerdown", this.onPointerDown);
        this.canvas.removeEventListener("pointermove", this.onPointerMove);
        this.canvas.removeEventListener("pointerup", this.onPointerUp);
        this.canvas.removeEventListener("pointercancel", this.onPointerUp);
        this.canvas.removeEventListener("pointerleave", this.onPointerLeave);

        this.canvas.remove();
    }

    private targetGains(): number[] {

        const matrix = STEREO_MONO_MATRIX[this.parameters.mode] ?? STEREO_MONO_MATRIX.stereo,
            polarity: number[] = [this.parameters.invertLeft ? -1 : 1, this.parameters.invertRight ? -1 : 1];

        return matrix.map((gain, i) => gain * polarity[PATH_TO[i]]);
    }

    private targetDelays(): [number, number] {
        return [this.parameters.delayLeftMs, this.parameters.delayRightMs];
    }

    private resize() {

        const width: number = this.container.clientWidth,
            height: number = this.container.clientHeight;

        if (width === 0 || height === 0) return;

        this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

        this.canvas.width = Math.round(width * this.pixelRatio);
        this.canvas.height = Math.round(height * this.pixelRatio);
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;

        this.layout = this.computeLayout(width, height);

        const scopePixels: number = Math.round(this.layout.scopeSize * this.pixelRatio);

        this.scopeCanvas.width = scopePixels;
        this.scopeCanvas.height = scopePixels;
    }

    private computeLayout(width: number, height: number): Layout {

        const padding: number = 16,
            // Room for the HUD in the top left corner, and the hint at the bottom.
            diagramTop: number = 96,
            diagramBottom: number = height - 26;

        const scopeSize: number = Math.max(80, Math.min(height - padding * 2 - 46, width * 0.42)),
            scopeLeft: number = width - padding - scopeSize,
            scopeTop: number = padding;

        const diagramLeft: number = padding,
            diagramRight: number = scopeLeft - padding * 2;

        const inputX: number = diagramLeft + 22,
            matrixX: number = diagramLeft + (diagramRight - diagramLeft) * 0.48,
            outputBaseX: number = matrixX + 30;

        return {
            width, height, inputX, matrixX, outputBaseX,
            maxShift: Math.max(20, diagramRight - 20 - outputBaseX),
            rowY: [
                diagramTop + (diagramBottom - diagramTop) * 0.22,
                diagramTop + (diagramBottom - diagramTop) * 0.78
            ],
            scopeLeft, scopeTop, scopeSize,
            meterY: scopeTop + scopeSize + 12
        };
    }

    private outputX(layout: Layout, channel: number): number {
        return layout.outputBaseX + this.delays[channel] / STEREO_MONO_MAX_DELAY_MS * layout.maxShift;
    }

    private buildPaths(layout: Layout): Polyline[] {

        const curveX: number = (layout.inputX + layout.matrixX) / 2;

        return PATH_FROM.map((from, i) => {

            const to: number = PATH_TO[i],
                startY: number = layout.rowY[from],
                endY: number = layout.rowY[to],
                startX: number = layout.inputX + NODE_RADIUS;

            const points: Point[] = [];

            for (let s = 0; s <= BEZIER_SEGMENTS; s++) {

                const t: number = s / BEZIER_SEGMENTS,
                    u: number = 1 - t;

                // Cubic bezier with horizontal tangents at both ends.
                points.push({
                    x: u * u * u * startX + 3 * u * u * t * curveX + 3 * u * t * t * curveX + t * t * t * layout.matrixX,
                    y: u * u * u * startY + 3 * u * u * t * startY + 3 * u * t * t * endY + t * t * t * endY
                });
            }

            // The delay line, up to the edge of the output node.
            points.push({ x: this.outputX(layout, to) - NODE_RADIUS, y: endY });

            const distances: number[] = [0];

            for (let p = 1; p < points.length; p++)
                distances.push(distances[p - 1] + Math.hypot(points[p].x - points[p - 1].x, points[p].y - points[p - 1].y));

            return { points, distances, length: distances[distances.length - 1] };
        });
    }

    private hitTest(x: number, y: number): StereoSide | null {

        const layout = this.layout;

        if (!layout) return null;

        for (let channel = 0; channel < 2; channel++) {
            if (Math.hypot(x - this.outputX(layout, channel), y - layout.rowY[channel]) <= NODE_RADIUS + 6)
                return channel === 0 ? "left" : "right";
        }

        return null;
    }

    private onPointerDown = (e: PointerEvent) => {

        const side: StereoSide | null = this.hitTest(e.offsetX, e.offsetY);

        if (!side) return;

        this.drag = {
            side,
            startX: e.offsetX,
            startDelay: side === "left" ? this.parameters.delayLeftMs : this.parameters.delayRightMs,
            moved: false
        };

        this.canvas.setPointerCapture(e.pointerId);
    };

    private onPointerMove = (e: PointerEvent) => {

        const layout = this.layout;

        if (!this.drag || !layout) {
            this.hovered = this.hitTest(e.offsetX, e.offsetY);
            this.canvas.style.cursor = this.hovered ? "pointer" : "";
            return;
        }

        const deltaX: number = e.offsetX - this.drag.startX;

        if (Math.abs(deltaX) > DRAG_THRESHOLD) this.drag.moved = true;
        if (!this.drag.moved) return;

        this.canvas.style.cursor = "ew-resize";

        const ms: number = Math.round(clamp(this.drag.startDelay + deltaX / layout.maxShift * STEREO_MONO_MAX_DELAY_MS, 0, STEREO_MONO_MAX_DELAY_MS));

        // Applied right away, so the node follows the pointer without waiting for React.
        if (this.drag.side === "left") this.parameters.delayLeftMs = ms;
        else this.parameters.delayRightMs = ms;

        this.delays[sideIndex(this.drag.side)] = ms;
        this.interactions.onDelayChange?.(this.drag.side, ms);
    };

    private onPointerUp = (e: PointerEvent) => {

        if (!this.drag) return;

        if (!this.drag.moved)
            this.interactions.onInvertToggle?.(this.drag.side);

        if (this.canvas.hasPointerCapture(e.pointerId))
            this.canvas.releasePointerCapture(e.pointerId);

        this.drag = null;
        this.hovered = this.hitTest(e.offsetX, e.offsetY);
        this.canvas.style.cursor = this.hovered ? "pointer" : "";
    };

    private onPointerLeave = () => {

        if (this.drag) return;

        this.hovered = null;
        this.canvas.style.cursor = "";
    };

    /**
     * Runs a synthetic stereo signal through the displayed matrix and delays: a shared tone in the center,
     * plus a different tone on each side, so every mode and delay visibly changes the scope.
     */
    private renderPreview(deltaTime: number): StereoImageSignalFrame {

        this.previewTime += deltaTime;

        const envelope: number = 0.7 + 0.3 * Math.sin(this.previewTime * Math.PI),
            [ll, rl, lr, rr] = this.gains,
            delayLeft: number = this.delays[0] / 1000,
            delayRight: number = this.delays[1] / 1000;

        function input(t: number): [number, number] {

            const center: number = 0.45 * Math.sin(2 * Math.PI * 196 * t) + 0.2 * Math.sin(2 * Math.PI * 392 * t + 0.7),
                wide: number = 0.3 * Math.sin(2 * Math.PI * 293.66 * t + 1.3);

            return [
                envelope * (center + wide + 0.15 * Math.sin(2 * Math.PI * 587.33 * t)),
                envelope * (center - 0.6 * wide + 0.15 * Math.sin(2 * Math.PI * 523.25 * t))
            ];
        }

        for (let i = 0; i < PREVIEW_SAMPLES; i++) {

            const t: number = this.previewTime + i / PREVIEW_SAMPLE_RATE;

            const [leftForLeft, rightForLeft] = input(t - delayLeft),
                [leftForRight, rightForRight] = input(t - delayRight);

            this.previewLeft[i] = ll * leftForLeft + rl * rightForLeft;
            this.previewRight[i] = lr * leftForRight + rr * rightForRight;
        }

        return { output: [this.previewLeft, this.previewRight], inputLevels: [envelope * 0.25, envelope * 0.22] };
    }

    private readSignal(deltaTime: number): StereoImageSignalFrame {

        const frame: StereoImageSignalFrame | null = this.signalReader?.() ?? null;

        if (frame) {

            const [left, right] = frame.output;

            let peak: number = Math.max(frame.inputLevels[0], frame.inputLevels[1]);

            for (let i = 0; i < left.length; i++)
                peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));

            this.silentFor = peak > SILENCE_LEVEL ? 0 : this.silentFor + deltaTime;

            if (this.hasSignal) return frame;
        }

        return this.renderPreview(deltaTime);
    }

    private render = (now: number) => {

        this.frameId = window.requestAnimationFrame(this.render);

        const deltaTime: number = Math.min(0.1, (now - this.lastFrameTime) / 1000);
        this.lastFrameTime = now;

        const layout = this.layout;

        if (!layout) return;

        // Smoothly follow parameter changes, so a mode switch morphs instead of jumping.
        const targetGains: number[] = this.targetGains(),
            targetDelays: [number, number] = this.targetDelays(),
            follow: number = 1 - Math.exp(-deltaTime * 10);

        for (let i = 0; i < 4; i++)
            this.gains[i] += (targetGains[i] - this.gains[i]) * follow;

        for (let i = 0; i < 2; i++)
            this.delays[i] += (targetDelays[i] - this.delays[i]) * follow;

        const frame: StereoImageSignalFrame = this.readSignal(deltaTime),
            paths: Polyline[] = this.buildPaths(layout);

        this.updateParticles(frame, paths, deltaTime);

        const ctx = this.context;

        ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
        ctx.clearRect(0, 0, layout.width, layout.height);

        this.drawRouting(ctx, layout, paths);
        this.drawScope(ctx, layout, frame, deltaTime);
    };

    private updateParticles(frame: StereoImageSignalFrame, paths: Polyline[], deltaTime: number) {

        const activity: number[] = frame.inputLevels.map(level => clamp(level * 5, 0, 1));

        for (let channel = 0; channel < 2; channel++) {
            this.inputPulse[channel] += (activity[channel] - this.inputPulse[channel]) * (1 - Math.exp(-deltaTime * 12));
            this.outputPulse[channel] *= Math.exp(-deltaTime * 6);
        }

        for (let i = 0; i < 4; i++) {

            const strength: number = Math.abs(this.gains[i]);

            if (strength < 0.02) {
                this.spawnAccumulators[i] = 0;
                continue;
            }

            this.spawnAccumulators[i] += PARTICLE_RATE * strength * activity[PATH_FROM[i]] * deltaTime;

            while (this.spawnAccumulators[i] >= 1 && this.particles.length < MAX_PARTICLES) {
                this.spawnAccumulators[i] -= 1;
                this.particles.push({ path: i, distance: 0, speed: 120 + Math.random() * 50, inverted: this.gains[i] < 0 });
            }

            this.spawnAccumulators[i] = Math.min(this.spawnAccumulators[i], 1);
        }

        this.particles = this.particles.filter(particle => {

            particle.distance += particle.speed * deltaTime;

            if (particle.distance < paths[particle.path].length) return true;

            const to: number = PATH_TO[particle.path];
            this.outputPulse[to] = Math.min(1, this.outputPulse[to] + 0.12);

            return false;
        });
    }

    private drawRouting(ctx: CanvasRenderingContext2D, layout: Layout, paths: Polyline[]) {

        const { accent, muted, text, panel } = this.colors;

        // Delay lines, with a tick every 10 ms.
        for (let channel = 0; channel < 2; channel++) {

            const y: number = layout.rowY[channel],
                endX: number = this.outputX(layout, channel) - NODE_RADIUS;

            ctx.globalAlpha = 0.18;
            ctx.strokeStyle = muted;
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 4]);
            ctx.beginPath();
            ctx.moveTo(layout.matrixX, y);
            ctx.lineTo(layout.outputBaseX + layout.maxShift, y);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.globalAlpha = 0.5;

            for (let ms = 10; ms <= this.delays[channel] + 0.01; ms += 10) {
                const tickX: number = layout.outputBaseX + ms / STEREO_MONO_MAX_DELAY_MS * layout.maxShift - NODE_RADIUS;

                if (tickX > endX) break;

                ctx.beginPath();
                ctx.moveTo(tickX, y - 4);
                ctx.lineTo(tickX, y + 4);
                ctx.stroke();
            }
        }

        // Matrix paths, thickest for the strongest gain.
        paths.forEach((path, i) => {

            const gain: number = this.gains[i],
                strength: number = Math.abs(gain);

            ctx.beginPath();
            path.points.forEach((point, p) => p === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y));

            if (strength < 0.02) {
                ctx.globalAlpha = 0.18;
                ctx.strokeStyle = muted;
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 5]);
                ctx.stroke();
                ctx.setLineDash([]);
                return;
            }

            ctx.globalAlpha = 0.25 + strength * 0.6;
            ctx.strokeStyle = gain < 0 ? INVERTED_COLOR : accent;
            ctx.lineWidth = 1 + strength * 3;
            ctx.lineCap = "round";
            ctx.stroke();
        });

        // Particles flowing from the inputs to the outputs.
        for (const particle of this.particles) {

            const point: Point = pointOnPolyline(paths[particle.path], particle.distance);

            ctx.fillStyle = particle.inverted ? INVERTED_COLOR : accent;

            ctx.globalAlpha = 0.22;
            ctx.beginPath();
            ctx.arc(point.x, point.y, 4.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = 0.95;
            ctx.beginPath();
            ctx.arc(point.x, point.y, 1.7, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.font = "600 10px Poppins, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.globalAlpha = 0.7;
        ctx.fillStyle = muted;
        ctx.fillText("IN", layout.inputX, layout.rowY[0] - NODE_RADIUS - 14);
        ctx.fillText("MATRIX", layout.matrixX - 8, layout.rowY[0] - NODE_RADIUS - 14);
        ctx.fillText("OUT", layout.outputBaseX, layout.rowY[0] - NODE_RADIUS - 14);

        for (let channel = 0; channel < 2; channel++) {

            const label: string = channel === 0 ? "L" : "R",
                y: number = layout.rowY[channel];

            // Input node, pulsing with its level.
            this.drawNode(ctx, layout.inputX, y, NODE_RADIUS - 2, label, muted, this.inputPulse[channel], false);

            // Output node: draggable for the delay, clickable for the polarity.
            const inverted: boolean = channel === 0 ? this.parameters.invertLeft : this.parameters.invertRight,
                side: StereoSide = channel === 0 ? "left" : "right",
                isActive: boolean = this.hovered === side || this.drag?.side === side,
                x: number = this.outputX(layout, channel);

            this.drawNode(ctx, x, y, NODE_RADIUS, label, inverted ? INVERTED_COLOR : accent, this.outputPulse[channel], isActive);

            if (inverted) {
                ctx.globalAlpha = 1;
                ctx.fillStyle = INVERTED_COLOR;
                ctx.beginPath();
                ctx.arc(x + NODE_RADIUS * 0.75, y - NODE_RADIUS * 0.75, 7, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = panel;
                ctx.font = "700 9px Poppins, sans-serif";
                ctx.fillText("Ø", x + NODE_RADIUS * 0.75, y - NODE_RADIUS * 0.75 + 0.5);
            }

            const delay: number = channel === 0 ? this.parameters.delayLeftMs : this.parameters.delayRightMs;

            if (delay >= 1) {
                ctx.globalAlpha = 0.85;
                ctx.fillStyle = text;
                ctx.font = "500 10px Poppins, sans-serif";
                ctx.fillText(`+${Math.round(delay)} ms`, x, y + NODE_RADIUS + 12);
            }
        }

        ctx.globalAlpha = 1;
    }

    private drawNode(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, label: string, color: string, pulse: number, isActive: boolean) {

        if (pulse > 0.01) {
            ctx.globalAlpha = 0.35 * pulse;
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, radius + 3 + pulse * 7, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
        ctx.fillStyle = this.colors.panel;
        ctx.strokeStyle = color;
        ctx.lineWidth = isActive ? 3 : 1.5;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = this.colors.text;
        ctx.font = "600 12px Poppins, sans-serif";
        ctx.fillText(label, x, y + 0.5);
    }

    private drawScope(ctx: CanvasRenderingContext2D, layout: Layout, frame: StereoImageSignalFrame, deltaTime: number) {

        const { accent, muted, text } = this.colors,
            { scopeLeft, scopeTop, scopeSize } = layout,
            radius: number = scopeSize / 2,
            centerX: number = scopeLeft + radius,
            centerY: number = scopeTop + radius;

        const [left, right] = frame.output;

        let peak: number = 0,
            sumLR: number = 0,
            sumLL: number = 0,
            sumRR: number = 0;

        for (let i = 0; i < left.length; i++) {
            peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
            sumLR += left[i] * right[i];
            sumLL += left[i] * left[i];
            sumRR += right[i] * right[i];
        }

        // Auto gain: follows a louder signal right away, and a quieter one slowly.
        this.scopePeak = Math.max(0.02, peak, this.scopePeak * Math.pow(0.5, deltaTime));

        if (sumLL * sumRR > 1e-12)
            this.correlation += (sumLR / Math.sqrt(sumLL * sumRR) - this.correlation) * (1 - Math.exp(-deltaTime * 6));

        // The trace is drawn on its own canvas that fades out, which leaves a phosphor like trail.
        const scope = this.scopeContext,
            scopePixels: number = this.scopeCanvas.width,
            scale: number = scopePixels / 2 * 0.62 / (this.scopePeak * Math.SQRT2);

        scope.globalCompositeOperation = "destination-out";
        scope.fillStyle = `rgba(0, 0, 0, ${1 - Math.pow(0.8, deltaTime * 60)})`;
        scope.fillRect(0, 0, scopePixels, scopePixels);
        scope.globalCompositeOperation = "source-over";

        scope.strokeStyle = accent;
        scope.globalAlpha = 0.6;
        scope.lineWidth = this.pixelRatio;
        scope.beginPath();

        for (let i = 0; i < left.length; i++) {

            // Rotated 45 degrees: mid points up, side points sideways, left to the upper left.
            const x: number = scopePixels / 2 + (right[i] - left[i]) * scale,
                y: number = scopePixels / 2 - (left[i] + right[i]) * scale;

            if (i === 0) scope.moveTo(x, y);
            else scope.lineTo(x, y);
        }

        scope.stroke();
        scope.globalAlpha = 1;

        // Grid
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = muted;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius - 1, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = 0.14;
        ctx.beginPath();
        ctx.moveTo(centerX, scopeTop + 6);
        ctx.lineTo(centerX, scopeTop + scopeSize - 6);
        ctx.moveTo(scopeLeft + 6, centerY);
        ctx.lineTo(scopeLeft + scopeSize - 6, centerY);

        const diagonal: number = (radius - 6) * Math.SQRT1_2;

        ctx.moveTo(centerX - diagonal, centerY - diagonal);
        ctx.lineTo(centerX + diagonal, centerY + diagonal);
        ctx.moveTo(centerX + diagonal, centerY - diagonal);
        ctx.lineTo(centerX - diagonal, centerY + diagonal);
        ctx.stroke();

        ctx.globalAlpha = 0.7;
        ctx.fillStyle = muted;
        ctx.font = "600 10px Poppins, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const labelDistance: number = radius - 14,
            labelDiagonal: number = labelDistance * Math.SQRT1_2;

        ctx.fillText("M", centerX, centerY - labelDistance);
        ctx.fillText("S", centerX - labelDistance, centerY);
        ctx.fillText("S", centerX + labelDistance, centerY);
        ctx.fillText("L", centerX - labelDiagonal, centerY - labelDiagonal);
        ctx.fillText("R", centerX + labelDiagonal, centerY - labelDiagonal);

        ctx.globalAlpha = 1;
        ctx.drawImage(this.scopeCanvas, scopeLeft, scopeTop, scopeSize, scopeSize);

        // Correlation meter: +1 is mono, 0 is fully decorrelated, -1 cancels out when summed to mono.
        const meterY: number = layout.meterY,
            barY: number = meterY + 14,
            barCenterX: number = scopeLeft + radius,
            valueX: number = barCenterX + clamp(this.correlation, -1, 1) * radius;

        ctx.font = "500 10px Poppins, sans-serif";
        ctx.textBaseline = "middle";
        ctx.fillStyle = muted;
        ctx.textAlign = "left";
        ctx.fillText("Correlation", scopeLeft, meterY);
        ctx.textAlign = "right";
        ctx.fillStyle = text;
        ctx.fillText(`${this.correlation >= 0 ? "+" : "−"}${Math.abs(this.correlation).toFixed(2)}`, scopeLeft + scopeSize, meterY);

        ctx.globalAlpha = 0.35;
        ctx.fillStyle = muted;
        ctx.fillRect(scopeLeft, barY - 2, scopeSize, 4);

        ctx.globalAlpha = 1;
        ctx.fillStyle = this.correlation < 0 ? INVERTED_COLOR : accent;
        ctx.fillRect(Math.min(barCenterX, valueX), barY - 2, Math.abs(valueX - barCenterX), 4);

        ctx.fillStyle = text;
        ctx.fillRect(barCenterX - 0.5, barY - 5, 1, 10);
        ctx.beginPath();
        ctx.arc(valueX, barY, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;
    }
}
