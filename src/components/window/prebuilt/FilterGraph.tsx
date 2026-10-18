import "./FilterGraph.scss";

import type { Effector } from "@fluex/fluexgl-dsp";
import React, { useEffect, useRef } from "react";

import { formatFrequency } from "../../../utilities/scripts/effect-value-formatters";
import { biquadMagnitudeDecibels, computeBiquadCoefficients } from "../../../utilities/scripts/equalizer-response";
import { EffectOutputTap } from "../../../utilities/scripts/effect-output-tap";
import {
    type GraphColors,
    type GraphRange,
    type GraphSize,
    GRAPH_MIN_FREQUENCY,
    GRAPH_MAX_FREQUENCY,
    SPECTRUM_MAX_DECIBELS,
    SPECTRUM_MIN_DECIBELS,
    clamp,
    decibelsToY,
    drawFrequencyGrid,
    drawGraphTooltip,
    drawSpectrum,
    frequencyToX,
    prepareGraphCanvas,
    readGraphColors,
    xToFrequency,
    yToDecibels
} from "../../../utilities/scripts/frequency-graph";

export type FilterGraphType = "lowpass" | "highpass" | "notch";

export interface FilterGraphChanges {
    cutoff?: number;
    q?: number;
}

export interface FilterGraphProperties {
    /** The filter effect, used for the sample rate and the spectrum of its output. */
    effect: Effector;
    type: FilterGraphType;
    cutoff: number;
    q: number;
    minCutoff: number;
    maxCutoff: number;
    minQ: number;
    maxQ: number;
    defaultCutoff: number;
    defaultQ: number;
    onChange: (changes: FilterGraphChanges) => void;
}

interface DragState {
    offsetX: number;
    offsetY: number;
    /** Used by the notch, whose node does not move vertically: Q follows the vertical distance dragged. */
    startY: number;
    startQ: number;
}

const GRAPH_RANGE: GraphRange = {
    minDecibels: -48,
    maxDecibels: 18,
    grid: [-36, -24, -12, 0, 12]
};

const NODE_RADIUS: number = 8;
const NODE_HIT_RADIUS: number = 14;
const FALLBACK_SAMPLE_RATE: number = 48000;

/** Pixels of vertical drag that double (or halve) the Q of the notch. */
const NOTCH_PIXELS_PER_OCTAVE: number = 50;

/**
 * Lowpass and highpass filters peak at exactly Q (linear) at their cutoff, so their node sits on
 * that peak. The notch node stays on the 0 dB line.
 */
function getNodePosition(type: FilterGraphType, cutoff: number, q: number, size: GraphSize): { x: number; y: number } {
    return {
        x: clamp(frequencyToX(clamp(cutoff, GRAPH_MIN_FREQUENCY, GRAPH_MAX_FREQUENCY), size), 0, size.width),
        y: decibelsToY(type === "notch" ? 0 : 20 * Math.log10(q), size, GRAPH_RANGE)
    };
}

function describeFilter(type: FilterGraphType, cutoff: number, q: number): string {

    const parts: string[] = [formatFrequency(cutoff), `Q ${q.toFixed(2)}`];

    if (type !== "notch") {
        const peak: number = 20 * Math.log10(q);
        parts.push(`${peak > 0 ? "+" : ""}${peak.toFixed(1)} dB`);
    }

    return parts.join("  ·  ");
}

/**
 * An interactive frequency response graph of a single filter, with the spectrum of its output behind it.
 */
export default function FilterGraph(properties: FilterGraphProperties) {

    const { effect } = properties;

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // The draw loop and the native wheel listener read these refs, so they never need to restart.
    const propertiesRef = useRef<FilterGraphProperties>(properties);
    const hoverRef = useRef<boolean>(false);
    const dragRef = useRef<DragState | null>(null);
    const sizeRef = useRef<GraphSize>({ width: 0, height: 0 });
    const analyserRef = useRef<AnalyserNode | null>(null);
    const spectrumDataRef = useRef<Float32Array<ArrayBuffer> | null>(null);

    useEffect(function () {
        propertiesRef.current = properties;
    });

    useEffect(function () {

        const wrapper = wrapperRef.current;

        if (!wrapper) return;

        const observer = new ResizeObserver(function (entries) {
            const rect = entries[0].contentRect;
            sizeRef.current = { width: rect.width, height: rect.height };
        });

        observer.observe(wrapper);

        return () => observer.disconnect();
    }, []);

    useEffect(function () {

        const tap: EffectOutputTap | null = EffectOutputTap.create(effect, {
            fftSize: 8192,
            smoothingTimeConstant: 0.8,
            minDecibels: SPECTRUM_MIN_DECIBELS,
            maxDecibels: SPECTRUM_MAX_DECIBELS
        });

        if (!tap) return;

        analyserRef.current = tap.analysers[0];
        spectrumDataRef.current = new Float32Array(tap.analysers[0].frequencyBinCount);

        return function () {
            tap.dispose();
            analyserRef.current = null;
            spectrumDataRef.current = null;
        };
    }, [effect]);

    // Draw loop.
    useEffect(function () {

        let frameId: number = 0,
            frameCount: number = 0,
            colors: GraphColors | null = null;

        function drawResponse(ctx: CanvasRenderingContext2D, size: GraphSize, sampleRate: number, palette: GraphColors) {

            const { type, cutoff, q } = propertiesRef.current,
                coefficients = computeBiquadCoefficients({ type, frequency: cutoff, gain: 0, q, enabled: true }, sampleRate),
                zeroY: number = decibelsToY(0, size, GRAPH_RANGE);

            const points: number[] = [];

            for (let x = 0; x <= size.width; x++) {
                const decibels: number = biquadMagnitudeDecibels(coefficients, xToFrequency(x, size), sampleRate);
                points.push(clamp(decibelsToY(decibels, size, GRAPH_RANGE), -10, size.height + 10));
            }

            // What the filter removes: the area between the 0 dB line and the curve.
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(0, zeroY);
            points.forEach((y, x) => ctx.lineTo(x, Math.max(y, zeroY)));
            ctx.lineTo(size.width, zeroY);
            ctx.closePath();
            ctx.fillStyle = palette.muted;
            ctx.globalAlpha = 0.08;
            ctx.fill();
            ctx.restore();

            // What passes: the area under the curve.
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(0, size.height);
            points.forEach((y, x) => ctx.lineTo(x, y));
            ctx.lineTo(size.width, size.height);
            ctx.closePath();

            const gradient = ctx.createLinearGradient(0, 0, 0, size.height);
            gradient.addColorStop(0, palette.accent);
            gradient.addColorStop(1, "transparent");

            ctx.fillStyle = gradient;
            ctx.globalAlpha = 0.22;
            ctx.fill();
            ctx.restore();

            ctx.save();
            ctx.beginPath();
            points.forEach((y, x) => x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
            ctx.strokeStyle = palette.accent;
            ctx.lineWidth = 2;
            ctx.lineJoin = "round";
            ctx.shadowColor = palette.accent;
            ctx.shadowBlur = 6;
            ctx.stroke();
            ctx.restore();
        }

        function drawNode(ctx: CanvasRenderingContext2D, size: GraphSize, palette: GraphColors) {

            const { type, cutoff, q } = propertiesRef.current,
                { x, y } = getNodePosition(type, cutoff, q, size),
                isActive: boolean = hoverRef.current || dragRef.current !== null;

            // Cutoff marker.
            ctx.save();
            ctx.strokeStyle = palette.accent;
            ctx.globalAlpha = 0.35;
            ctx.setLineDash([3, 4]);
            ctx.beginPath();
            ctx.moveTo(Math.round(x) + 0.5, y);
            ctx.lineTo(Math.round(x) + 0.5, size.height);
            ctx.stroke();
            ctx.restore();

            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, (isActive ? NODE_RADIUS + 1.5 : NODE_RADIUS) + 4, 0, Math.PI * 2);
            ctx.strokeStyle = palette.accent;
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = isActive ? 0.9 : 0.5;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(x, y, isActive ? NODE_RADIUS + 1.5 : NODE_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = palette.accent;
            ctx.globalAlpha = 1;
            ctx.fill();
            ctx.restore();

            if (isActive)
                drawGraphTooltip(ctx, size, x, y, describeFilter(type, cutoff, q), palette.accent, NODE_RADIUS);
        }

        function render() {

            frameId = window.requestAnimationFrame(render);

            const canvas = canvasRef.current,
                size: GraphSize = sizeRef.current,
                ctx = canvas?.getContext("2d");

            if (!canvas || !ctx || !prepareGraphCanvas(canvas, ctx, size)) return;

            // Theme colors rarely change, so they are only read about once per second.
            if (!colors || frameCount++ % 60 === 0)
                colors = readGraphColors(canvas);

            const sampleRate: number = effect.context?.sampleRate ?? FALLBACK_SAMPLE_RATE;

            drawFrequencyGrid(ctx, size, GRAPH_RANGE, colors);

            if (analyserRef.current && spectrumDataRef.current)
                drawSpectrum(ctx, size, analyserRef.current, spectrumDataRef.current, colors);

            drawResponse(ctx, size, sampleRate, colors);
            drawNode(ctx, size, colors);
        }

        frameId = window.requestAnimationFrame(render);

        return () => window.cancelAnimationFrame(frameId);
    }, [effect]);

    // Scrolling anywhere on the graph changes the Q. Added natively, because React's wheel listener is passive.
    useEffect(function () {

        const canvas = canvasRef.current;

        if (!canvas) return;

        function onWheel(e: WheelEvent) {

            e.preventDefault();

            const { q, minQ, maxQ, onChange } = propertiesRef.current;

            onChange({ q: clamp(q * (e.deltaY < 0 ? 1.1 : 1 / 1.1), minQ, maxQ) });
        }

        canvas.addEventListener("wheel", onWheel, { passive: false });

        return () => canvas.removeEventListener("wheel", onWheel);
    }, []);

    function getPointerPosition(e: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } {
        const rect: DOMRect = e.currentTarget.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function isOverNode(x: number, y: number): boolean {
        const { type, cutoff, q } = propertiesRef.current,
            node = getNodePosition(type, cutoff, q, sizeRef.current);
        return Math.hypot(node.x - x, node.y - y) <= NODE_HIT_RADIUS;
    }

    /** Applies a drag position: horizontal is the cutoff, vertical the Q. */
    function applyDrag(x: number, y: number, drag: DragState) {

        const { type, minCutoff, maxCutoff, minQ, maxQ, onChange } = propertiesRef.current,
            size: GraphSize = sizeRef.current,
            cutoff: number = Math.round(clamp(xToFrequency(x + drag.offsetX, size), minCutoff, maxCutoff));

        const q: number = type === "notch"
            ? drag.startQ * Math.pow(2, (drag.startY - y) / NOTCH_PIXELS_PER_OCTAVE)
            : Math.pow(10, yToDecibels(y + drag.offsetY, size, GRAPH_RANGE) / 20);

        onChange({ cutoff, q: Math.round(clamp(q, minQ, maxQ) * 100) / 100 });
    }

    function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {

        if (e.button !== 0) return;

        const { x, y } = getPointerPosition(e),
            { type, cutoff, q } = propertiesRef.current,
            node = getNodePosition(type, cutoff, q, sizeRef.current),
            grabbedNode: boolean = isOverNode(x, y);

        // Grabbing the node keeps it under the pointer; clicking elsewhere moves the node to the pointer.
        const drag: DragState = {
            offsetX: grabbedNode ? node.x - x : 0,
            offsetY: grabbedNode ? node.y - y : 0,
            startY: y,
            startQ: q
        };

        dragRef.current = drag;
        e.currentTarget.setPointerCapture(e.pointerId);
        e.currentTarget.style.cursor = "grabbing";

        if (!grabbedNode) applyDrag(x, y, drag);
    }

    function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {

        const { x, y } = getPointerPosition(e),
            drag: DragState | null = dragRef.current;

        if (!drag) {
            hoverRef.current = isOverNode(x, y);
            e.currentTarget.style.cursor = hoverRef.current ? "grab" : "crosshair";
            return;
        }

        applyDrag(x, y, drag);
    }

    function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {

        if (!dragRef.current) return;

        dragRef.current = null;
        e.currentTarget.releasePointerCapture(e.pointerId);
        e.currentTarget.style.cursor = "grab";
    }

    function onDoubleClick() {
        const { defaultCutoff, defaultQ, onChange } = propertiesRef.current;
        onChange({ cutoff: defaultCutoff, q: defaultQ });
    }

    return (
        <div className="filter-graph" ref={wrapperRef}>
            <canvas
                ref={canvasRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onPointerLeave={() => { hoverRef.current = false; }}
                onDoubleClick={onDoubleClick}
            />
            <p className="filter-graph__hint">Drag to set cutoff and resonance · Scroll for Q · Double-click to reset</p>
        </div>
    );
}
