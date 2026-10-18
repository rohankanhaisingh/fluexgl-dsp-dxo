import "./EqualizerWindow.scss";

import type { Equalizer, EqualizerBand, EqualizerBandType } from "@fluex/fluexgl-dsp";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Activity, Plus, Power, RotateCcw, Trash2 } from "lucide-react";

import Button from "../../common/Button";
import { EffectKnob, FrequencyKnob } from "./EffectControls";
import { formatDecibels, formatFrequency } from "../../../utilities/scripts/effect-value-formatters";
import { EffectOutputTap } from "../../../utilities/scripts/effect-output-tap";
import { bandUsesGain, biquadMagnitudeDecibels, computeBiquadCoefficients } from "../../../utilities/scripts/equalizer-response";
import {
    type GraphColors,
    type GraphRange,
    type GraphSize,
    GRAPH_MIN_FREQUENCY,
    SPECTRUM_MAX_DECIBELS,
    SPECTRUM_MIN_DECIBELS,
    clamp,
    decibelsToY as graphDecibelsToY,
    drawFrequencyGrid,
    drawGraphTooltip,
    drawSpectrum,
    frequencyToX,
    prepareGraphCanvas,
    readGraphColors,
    xToFrequency,
    yToDecibels as graphYToDecibels
} from "../../../utilities/scripts/frequency-graph";

export interface EqualizerWindowProperties {
    equalizer: Equalizer;
}

interface DragState {
    index: number;
    /** Distance between the pointer and the center of the node, so the node does not jump when grabbed. */
    offsetX: number;
    offsetY: number;
}

// Equalizer.MAX_BANDS is a static on the class, which is only imported as a type here.
const MAX_BANDS: number = 8;

const MIN_BAND_FREQUENCY: number = 10;
const MAX_BAND_FREQUENCY: number = 24000;

/** The graph shows -DECIBEL_RANGE to +DECIBEL_RANGE, the full gain range of a band. */
const DECIBEL_RANGE: number = 24;

const GRAPH_RANGE: GraphRange = {
    minDecibels: -DECIBEL_RANGE,
    maxDecibels: DECIBEL_RANGE,
    grid: [-18, -12, -6, 0, 6, 12, 18]
};

const NODE_RADIUS: number = 8;
const NODE_HIT_RADIUS: number = 12;

const FALLBACK_SAMPLE_RATE: number = 48000;

const BAND_COLORS: string[] = ["#f87171", "#fb923c", "#facc15", "#4ade80", "#22d3ee", "#60a5fa", "#a78bfa", "#f472b6"];

const BAND_TYPES: { value: EqualizerBandType; label: string }[] = [
    { value: "peaking", label: "Bell" },
    { value: "lowshelf", label: "Low shelf" },
    { value: "highshelf", label: "High shelf" },
    { value: "lowpass", label: "Low pass" },
    { value: "highpass", label: "High pass" },
    { value: "notch", label: "Notch" },
    { value: "bandpass", label: "Band pass" }
];

function decibelsToY(decibels: number, size: GraphSize): number {
    return graphDecibelsToY(decibels, size, GRAPH_RANGE);
}

function yToDecibels(y: number, size: GraphSize): number {
    return graphYToDecibels(y, size, GRAPH_RANGE);
}

function bandColor(index: number): string {
    return BAND_COLORS[index % BAND_COLORS.length];
}

/** Bands that use gain sit at their gain, the others on the 0 dB line. */
function getNodePosition(band: EqualizerBand, size: GraphSize): { x: number; y: number } {
    return {
        x: clamp(frequencyToX(Math.max(band.frequency, GRAPH_MIN_FREQUENCY), size), 0, size.width),
        y: decibelsToY(bandUsesGain(band.type) ? band.gain : 0, size)
    };
}

function findBandAtPosition(bands: EqualizerBand[], size: GraphSize, x: number, y: number): number | null {

    // Reversed, so the node drawn on top wins when nodes overlap.
    for (let i = bands.length - 1; i >= 0; i--) {

        const position = getNodePosition(bands[i], size);

        if (Math.hypot(position.x - x, position.y - y) <= NODE_HIT_RADIUS)
            return i;
    }

    return null;
}

function describeBand(band: EqualizerBand): string {

    const parts: string[] = [formatFrequency(band.frequency)];

    if (bandUsesGain(band.type)) parts.push(formatDecibels(band.gain));

    parts.push(`Q ${band.q.toFixed(2)}`);

    return parts.join("  ·  ");
}

export default function EqualizerWindow({ equalizer }: EqualizerWindowProperties) {

    const [bands, setBands] = useState<EqualizerBand[]>(() => equalizer.returnOptionsAsObject().bands as EqualizerBand[]);
    const [outputGain, setOutputGain] = useState<number>(equalizer.outputGain);
    const [selectedIndex, setSelectedIndex] = useState<number>(0);
    const [showSpectrum, setShowSpectrum] = useState<boolean>(true);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // The draw loop and the native wheel listener read these refs, so they never need to restart.
    const bandsRef = useRef<EqualizerBand[]>(bands);
    const outputGainRef = useRef<number>(outputGain);
    const selectedIndexRef = useRef<number>(selectedIndex);
    const hoverIndexRef = useRef<number | null>(null);
    const dragRef = useRef<DragState | null>(null);
    const sizeRef = useRef<GraphSize>({ width: 0, height: 0 });
    const analyserRef = useRef<AnalyserNode | null>(null);
    const spectrumDataRef = useRef<Float32Array<ArrayBuffer> | null>(null);

    useEffect(function () {
        selectedIndexRef.current = selectedIndex;
    }, [selectedIndex]);

    useEffect(function () {
        outputGainRef.current = outputGain;
    }, [outputGain]);

    // The equalizer clamps every value, so its own bands are the source of truth after each change.
    const syncBands = useCallback(function () {
        const next = equalizer.returnOptionsAsObject().bands as EqualizerBand[];
        bandsRef.current = next;
        setBands(next);
    }, [equalizer]);

    const updateBand = useCallback(function (index: number, band: Partial<EqualizerBand>) {
        equalizer.setBand(index, band);
        syncBands();
    }, [equalizer, syncBands]);

    function addBand(band: Partial<EqualizerBand>) {

        const index: number = equalizer.addBand({ type: "peaking", frequency: 1000, gain: 0, q: 1, enabled: true, ...band });

        if (index === -1) return;

        syncBands();
        setSelectedIndex(index);
    }

    function removeBand(index: number) {

        equalizer.removeBand(index);
        syncBands();

        setSelectedIndex(current => clamp(current > index ? current - 1 : current, 0, Math.max(0, bandsRef.current.length - 1)));
    }

    function flatten() {
        equalizer.flatten();
        syncBands();
    }

    function updateOutputGain(value: number) {
        equalizer.setOutputGain(value);
        setOutputGain(value);
    }

    // Keeps the canvas resolution in sync with its on-screen size.
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

    // Taps the output of the equalizer for the spectrum behind the curve.
    useEffect(function () {

        if (!showSpectrum) return;

        const tap: EffectOutputTap | null = EffectOutputTap.create(equalizer, {
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
    }, [equalizer, showSpectrum]);

    // Draw loop.
    useEffect(function () {

        let frameId: number = 0,
            frameCount: number = 0,
            colors: GraphColors | null = null;

        function drawCurves(ctx: CanvasRenderingContext2D, size: GraphSize, sampleRate: number, palette: GraphColors) {

            const currentBands: EqualizerBand[] = bandsRef.current,
                selected: number = selectedIndexRef.current,
                zeroY: number = decibelsToY(0, size);

            const coefficients = currentBands.map(band => computeBiquadCoefficients(band, sampleRate));

            // Shape of the selected band on its own, filled towards the 0 dB line.
            const selectedBand: EqualizerBand | undefined = currentBands[selected];

            if (selectedBand) {

                ctx.save();
                ctx.beginPath();
                ctx.moveTo(0, zeroY);

                for (let x = 0; x <= size.width; x++) {
                    const decibels = biquadMagnitudeDecibels(coefficients[selected], xToFrequency(x, size), sampleRate);
                    ctx.lineTo(x, clamp(decibelsToY(decibels, size), -10, size.height + 10));
                }

                ctx.lineTo(size.width, zeroY);
                ctx.closePath();

                ctx.fillStyle = bandColor(selected);
                ctx.globalAlpha = selectedBand.enabled ? 0.18 : 0.06;
                ctx.fill();

                ctx.strokeStyle = bandColor(selected);
                ctx.globalAlpha = selectedBand.enabled ? 0.6 : 0.2;
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.restore();
            }

            // Combined response of every enabled band, plus the output gain.
            ctx.save();
            ctx.beginPath();

            for (let x = 0; x <= size.width; x++) {

                const frequency: number = xToFrequency(x, size);

                let decibels: number = outputGainRef.current;

                for (let i = 0; i < currentBands.length; i++) {
                    if (currentBands[i].enabled)
                        decibels += biquadMagnitudeDecibels(coefficients[i], frequency, sampleRate);
                }

                const y: number = clamp(decibelsToY(decibels, size), -10, size.height + 10);

                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }

            ctx.strokeStyle = palette.accent;
            ctx.lineWidth = 2;
            ctx.lineJoin = "round";
            ctx.shadowColor = palette.accent;
            ctx.shadowBlur = 6;
            ctx.stroke();
            ctx.restore();
        }

        function drawNodes(ctx: CanvasRenderingContext2D, size: GraphSize) {

            const currentBands: EqualizerBand[] = bandsRef.current,
                selected: number = selectedIndexRef.current,
                highlighted: number | null = dragRef.current?.index ?? hoverIndexRef.current;

            ctx.save();
            ctx.font = "bold 10px Poppins, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            currentBands.forEach(function (band, index) {

                const { x, y } = getNodePosition(band, size),
                    isSelected: boolean = index === selected,
                    isHighlighted: boolean = index === highlighted,
                    radius: number = isHighlighted ? NODE_RADIUS + 1.5 : NODE_RADIUS;

                ctx.globalAlpha = band.enabled ? 1 : 0.35;

                if (isSelected) {
                    ctx.beginPath();
                    ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
                    ctx.strokeStyle = bandColor(index);
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                }

                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fillStyle = bandColor(index);
                ctx.fill();

                ctx.fillStyle = "#1B1C1D";
                ctx.fillText(`${index + 1}`, x, y + 0.5);
            });

            ctx.restore();

            // Value tooltip of the dragged or hovered node.
            if (highlighted === null || !currentBands[highlighted]) return;

            const { x, y } = getNodePosition(currentBands[highlighted], size);

            drawGraphTooltip(ctx, size, x, y, describeBand(currentBands[highlighted]), bandColor(highlighted), NODE_RADIUS);
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

            const sampleRate: number = equalizer.context?.sampleRate ?? FALLBACK_SAMPLE_RATE;

            drawFrequencyGrid(ctx, size, GRAPH_RANGE, colors);

            if (analyserRef.current && spectrumDataRef.current)
                drawSpectrum(ctx, size, analyserRef.current, spectrumDataRef.current, colors);

            drawCurves(ctx, size, sampleRate, colors);
            drawNodes(ctx, size);
        }

        frameId = window.requestAnimationFrame(render);

        return () => window.cancelAnimationFrame(frameId);
    }, [equalizer]);

    // Scrolling on a node changes its Q. Added natively, because React's wheel listener is passive.
    useEffect(function () {

        const canvas = canvasRef.current;

        if (!canvas) return;

        function onWheel(e: WheelEvent) {

            const rect: DOMRect = canvas!.getBoundingClientRect(),
                index: number | null = findBandAtPosition(bandsRef.current, sizeRef.current, e.clientX - rect.left, e.clientY - rect.top);

            if (index === null) return;

            e.preventDefault();

            const band: EqualizerBand = bandsRef.current[index],
                factor: number = e.deltaY < 0 ? 1.1 : 1 / 1.1;

            setSelectedIndex(index);
            updateBand(index, { q: clamp(band.q * factor, 0.1, 24) });
        }

        canvas.addEventListener("wheel", onWheel, { passive: false });

        return () => canvas.removeEventListener("wheel", onWheel);
    }, [updateBand]);

    function getPointerPosition(e: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } {
        const rect: DOMRect = e.currentTarget.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {

        if (e.button !== 0) return;

        const { x, y } = getPointerPosition(e),
            index: number | null = findBandAtPosition(bandsRef.current, sizeRef.current, x, y);

        if (index === null) return;

        const node = getNodePosition(bandsRef.current[index], sizeRef.current);

        dragRef.current = { index, offsetX: node.x - x, offsetY: node.y - y };
        setSelectedIndex(index);

        e.currentTarget.setPointerCapture(e.pointerId);
    }

    function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {

        const { x, y } = getPointerPosition(e),
            size: GraphSize = sizeRef.current,
            drag: DragState | null = dragRef.current;

        if (!drag) {
            hoverIndexRef.current = findBandAtPosition(bandsRef.current, size, x, y);
            e.currentTarget.style.cursor = hoverIndexRef.current === null ? "crosshair" : "grab";
            return;
        }

        e.currentTarget.style.cursor = "grabbing";

        const band: EqualizerBand = bandsRef.current[drag.index],
            frequency: number = Math.round(clamp(xToFrequency(x + drag.offsetX, size), MIN_BAND_FREQUENCY, MAX_BAND_FREQUENCY)),
            changes: Partial<EqualizerBand> = { frequency };

        if (bandUsesGain(band.type))
            changes.gain = Math.round(clamp(yToDecibels(y + drag.offsetY, size), -DECIBEL_RANGE, DECIBEL_RANGE) * 10) / 10;

        updateBand(drag.index, changes);
    }

    function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {

        if (!dragRef.current) return;

        dragRef.current = null;
        e.currentTarget.releasePointerCapture(e.pointerId);
        e.currentTarget.style.cursor = "grab";
    }

    function onPointerLeave() {
        if (!dragRef.current) hoverIndexRef.current = null;
    }

    function onDoubleClick(e: React.MouseEvent<HTMLCanvasElement>) {

        const { x, y } = getPointerPosition(e),
            size: GraphSize = sizeRef.current,
            index: number | null = findBandAtPosition(bandsRef.current, size, x, y);

        // Double-clicking a node resets its gain, like most parametric equalizers.
        if (index !== null) {
            if (bandUsesGain(bandsRef.current[index].type)) updateBand(index, { gain: 0 });
            return;
        }

        if (bandsRef.current.length >= MAX_BANDS) return;

        addBand({
            frequency: Math.round(clamp(xToFrequency(x, size), MIN_BAND_FREQUENCY, MAX_BAND_FREQUENCY)),
            gain: Math.round(clamp(yToDecibels(y, size), -DECIBEL_RANGE, DECIBEL_RANGE) * 10) / 10
        });
    }

    function onContextMenu(e: React.MouseEvent<HTMLCanvasElement>) {

        const { x, y } = getPointerPosition(e),
            index: number | null = findBandAtPosition(bandsRef.current, sizeRef.current, x, y);

        if (index === null) return;

        e.preventDefault();
        hoverIndexRef.current = null;
        removeBand(index);
    }

    const selectedBand: EqualizerBand | undefined = bands[selectedIndex];

    return (
        <div className="equalizer-window-content">
            <div className="equalizer-window-content__graph" ref={wrapperRef}>
                <canvas
                    ref={canvasRef}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    onPointerLeave={onPointerLeave}
                    onDoubleClick={onDoubleClick}
                    onContextMenu={onContextMenu}
                />
            </div>

            <p className="equalizer-window-content__hint">
                Drag a point to change frequency and gain · Scroll on a point for Q · Double-click to add a band or reset its gain · Right-click to remove
            </p>

            <div className="equalizer-window-content__toolbar">
                <div className="equalizer-window-content__toolbar__bands">
                    {bands.map(function (band, index) {
                        return (
                            <button
                                key={index}
                                className={`${index === selectedIndex ? "active" : ""} ${band.enabled ? "" : "disabled"}`}
                                style={{ "--band-color": bandColor(index) } as React.CSSProperties}
                                onClick={() => setSelectedIndex(index)}
                                title={`Band ${index + 1}`}
                            >
                                {index + 1}
                            </button>
                        );
                    })}
                    {bands.length < MAX_BANDS && (
                        <button title="Add band" onClick={() => addBand({})}>
                            <Plus size={14} />
                        </button>
                    )}
                </div>

                <div className="equalizer-window-content__toolbar__actions">
                    <button className={showSpectrum ? "active" : ""} title="Show spectrum" onClick={() => setShowSpectrum(value => !value)}>
                        <Activity size={14} />
                        <span>Spectrum</span>
                    </button>
                    <Button icon={<RotateCcw size={16} />} text="Flatten" onClick={flatten} />
                </div>
            </div>

            <div className="equalizer-window-content__controls">
                {selectedBand ? (
                    <div className="equalizer-window-content__controls__band" style={{ "--band-color": bandColor(selectedIndex) } as React.CSSProperties}>
                        <div className="equalizer-window-content__controls__band__settings">
                            <select value={selectedBand.type} onChange={e => updateBand(selectedIndex, { type: e.target.value as EqualizerBandType })}>
                                {BAND_TYPES.map(function (type) {
                                    return <option key={type.value} value={type.value}>{type.label}</option>;
                                })}
                            </select>
                            <div className="flex flex-row gap-1">
                                <button
                                    className={selectedBand.enabled ? "active" : ""}
                                    title={selectedBand.enabled ? "Disable band" : "Enable band"}
                                    onClick={() => updateBand(selectedIndex, { enabled: !selectedBand.enabled })}
                                >
                                    <Power size={14} />
                                </button>
                                <button title="Remove band" onClick={() => removeBand(selectedIndex)}>
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>

                        <FrequencyKnob label="Freq" value={selectedBand.frequency} min={MIN_BAND_FREQUENCY} max={MAX_BAND_FREQUENCY} defaultValue={1000} onChange={frequency => updateBand(selectedIndex, { frequency })} />
                        <div className={bandUsesGain(selectedBand.type) ? "" : "opacity-40 pointer-events-none"}>
                            <EffectKnob label="Gain" value={selectedBand.gain} min={-DECIBEL_RANGE} max={DECIBEL_RANGE} step={0.1} defaultValue={0} format={formatDecibels} onChange={gain => updateBand(selectedIndex, { gain })} />
                        </div>
                        <EffectKnob label="Q" value={selectedBand.q} min={0.1} max={24} step={0.01} defaultValue={1} format={v => v.toFixed(2)} onChange={q => updateBand(selectedIndex, { q })} />
                    </div>
                ) : (
                    <p className="equalizer-window-content__hint">No bands. Double-click the graph to add one.</p>
                )}

                <EffectKnob label="Output" value={outputGain} min={-DECIBEL_RANGE} max={DECIBEL_RANGE} step={0.1} defaultValue={0} format={formatDecibels} onChange={updateOutputGain} />
            </div>
        </div>
    );
}
