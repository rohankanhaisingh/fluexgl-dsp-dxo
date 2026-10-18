import "../window/prebuilt/EqualizerWindow.scss";
import "../window/prebuilt/EffectControls.scss";
import "./DxoWindows.scss";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Power } from "lucide-react";

import { EffectKnob, FrequencyKnob } from "../window/prebuilt/EffectControls";
import { formatDecibels, formatFrequency } from "../../utilities/scripts/effect-value-formatters";
import {
    type GraphRange, type GraphSize,
    GRAPH_MIN_FREQUENCY, GRAPH_MAX_FREQUENCY,
    clamp, decibelsToY, drawFrequencyGrid, drawGraphTooltip, frequencyToX,
    prepareGraphCanvas, readGraphColors, xToFrequency, yToDecibels
} from "../../utilities/scripts/frequency-graph";

import { PARAMS, PEQ_BAND_COUNT, PEQ_TYPES, type DxoChannel } from "../../device/parameters";
import { useDxoValues, writeValue } from "../../device/deviceStore";
import { bandMagnitude, bandUsesGain, crossoverMagnitude, type DxoBand } from "./responseMath";

const RANGE: GraphRange = { minDecibels: -18, maxDecibels: 18, grid: [-12, -6, 0, 6, 12] };
const BAND_COLORS = ["#f87171", "#fb923c", "#facc15", "#4ade80", "#22d3ee", "#60a5fa", "#a78bfa", "#f472b6", "#94a3b8", "#fde68a"];
const NODE_RADIUS = 7;
const NODE_HIT_RADIUS = 12;

export interface DxoEqualizerWindowProperties {
    channel: DxoChannel;
}

const bandColor = (index: number) => BAND_COLORS[index % BAND_COLORS.length];

function nodePosition(band: DxoBand, size: GraphSize) {
    return {
        x: clamp(frequencyToX(clamp(band.frequency, GRAPH_MIN_FREQUENCY, GRAPH_MAX_FREQUENCY), size), 0, size.width),
        y: decibelsToY(bandUsesGain(band.type) ? band.gain : 0, size, RANGE)
    };
}

export default function DxoEqualizerWindow({ channel }: DxoEqualizerWindowProperties) {

    const requests = useMemo(function () {
        const list = [];
        for (let band = 0; band < PEQ_BAND_COUNT; band++)
            list.push(
                { parameter: PARAMS.peqType, channel: channel.id, index: band },
                { parameter: PARAMS.peqFrequency, channel: channel.id, index: band },
                { parameter: PARAMS.peqQ, channel: channel.id, index: band },
                { parameter: PARAMS.peqGain, channel: channel.id, index: band },
                { parameter: PARAMS.peqOn, channel: channel.id, index: band }
            );
        list.push(
            { parameter: PARAMS.hpfFrequency, channel: channel.id, index: 0 },
            { parameter: PARAMS.hpfShape, channel: channel.id, index: 0 },
            { parameter: PARAMS.lpfFrequency, channel: channel.id, index: 0 },
            { parameter: PARAMS.lpfShape, channel: channel.id, index: 0 }
        );
        return list;
    }, [channel.id]);

    const raw = useDxoValues(requests);

    const bands: DxoBand[] = useMemo(function () {
        return Array.from({ length: PEQ_BAND_COUNT }, (_, i) => ({
            type: raw[i * 5] ?? PARAMS.peqType.defaultValue,
            frequency: raw[i * 5 + 1] ?? PARAMS.peqFrequency.defaultValue,
            q: raw[i * 5 + 2] ?? PARAMS.peqQ.defaultValue,
            gain: raw[i * 5 + 3] ?? 0,
            on: (raw[i * 5 + 4] ?? 1) === 1
        }));
    }, [raw]);

    const crossover = {
        hpf: raw[PEQ_BAND_COUNT * 5] ?? PARAMS.hpfFrequency.min,
        hpfShape: raw[PEQ_BAND_COUNT * 5 + 1] ?? 0,
        lpf: raw[PEQ_BAND_COUNT * 5 + 2] ?? PARAMS.lpfFrequency.max,
        lpfShape: raw[PEQ_BAND_COUNT * 5 + 3] ?? 0
    };

    const isLoaded = raw.slice(0, 5).some(value => value !== null);

    const [selected, setSelected] = useState<number>(0);
    const [hovered, setHovered] = useState<number | null>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<{ index: number } | null>(null);

    const stateRef = useRef({ bands, crossover, selected, hovered });
    stateRef.current = { bands, crossover, selected, hovered };

    function setBand(index: number, field: "type" | "frequency" | "q" | "gain" | "on", value: number) {
        const parameter = { type: PARAMS.peqType, frequency: PARAMS.peqFrequency, q: PARAMS.peqQ, gain: PARAMS.peqGain, on: PARAMS.peqOn }[field];
        writeValue(parameter, channel.id, index, value);
    }

    // Draw loop.
    useEffect(function () {

        let frameId = 0;

        function draw() {

            const canvas = canvasRef.current,
                wrapper = wrapperRef.current,
                ctx = canvas?.getContext("2d");

            frameId = requestAnimationFrame(draw);

            if (!canvas || !wrapper || !ctx) return;

            const size: GraphSize = { width: wrapper.clientWidth, height: wrapper.clientHeight };

            if (!prepareGraphCanvas(canvas, ctx, size)) return;

            const colors = readGraphColors(wrapper);
            const { bands, crossover, selected, hovered } = stateRef.current;

            drawFrequencyGrid(ctx, size, RANGE, colors);

            // Crossover (dashed), so the EQ can be judged in context.
            ctx.save();
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = colors.muted;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            for (let x = 0; x <= size.width; x += 2) {
                const f = xToFrequency(x, size);
                const db = crossoverMagnitude("hpf", crossover.hpfShape, crossover.hpf, f) + (crossover.lpf < 20001 ? crossoverMagnitude("lpf", crossover.lpfShape, crossover.lpf, f) : 0);
                const y = decibelsToY(Math.max(RANGE.minDecibels - 6, db), size, RANGE);
                if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.restore();

            // Individual bands, faint.
            bands.forEach(function (band, index) {
                if (!band.on) return;
                ctx.save();
                ctx.strokeStyle = bandColor(index);
                ctx.globalAlpha = index === selected ? 0.55 : 0.18;
                ctx.beginPath();
                for (let x = 0; x <= size.width; x += 3) {
                    const y = decibelsToY(bandMagnitude(band, xToFrequency(x, size)), size, RANGE);
                    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.stroke();
                ctx.restore();
            });

            // Sum of all bands.
            ctx.save();
            ctx.strokeStyle = colors.accent;
            ctx.lineWidth = 2;
            ctx.beginPath();
            const zeroY = decibelsToY(0, size, RANGE);
            for (let x = 0; x <= size.width; x += 2) {
                const f = xToFrequency(x, size);
                const db = bands.reduce((sum, band) => sum + bandMagnitude(band, f), 0);
                const y = decibelsToY(clamp(db, RANGE.minDecibels - 3, RANGE.maxDecibels + 3), size, RANGE);
                if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.lineTo(size.width, zeroY);
            ctx.lineTo(0, zeroY);
            ctx.closePath();
            ctx.globalAlpha = 0.08;
            ctx.fillStyle = colors.accent;
            ctx.fill();
            ctx.restore();

            // Nodes.
            bands.forEach(function (band, index) {
                const { x, y } = nodePosition(band, size);
                ctx.save();
                ctx.globalAlpha = band.on ? 1 : 0.35;
                ctx.fillStyle = bandColor(index);
                ctx.beginPath();
                ctx.arc(x, y, index === selected ? NODE_RADIUS + 2 : NODE_RADIUS, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#1B1C1D";
                ctx.font = "bold 9px Poppins, sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(String(index + 1), x, y + 0.5);
                ctx.restore();
            });

            const tooltipIndex = dragRef.current?.index ?? hovered;
            if (tooltipIndex !== null && tooltipIndex !== undefined) {
                const band = bands[tooltipIndex];
                const { x, y } = nodePosition(band, size);
                const parts = [formatFrequency(band.frequency)];
                if (bandUsesGain(band.type)) parts.push(formatDecibels(band.gain));
                parts.push(`Q ${band.q.toFixed(1)}`);
                drawGraphTooltip(ctx, size, x, y, parts.join("  ·  "), bandColor(tooltipIndex), NODE_RADIUS);
            }
        }

        frameId = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(frameId);
    }, []);

    function findBand(x: number, y: number): number | null {
        const wrapper = wrapperRef.current;
        if (!wrapper) return null;
        const size = { width: wrapper.clientWidth, height: wrapper.clientHeight };
        for (let i = PEQ_BAND_COUNT - 1; i >= 0; i--) {
            const position = nodePosition(stateRef.current.bands[i], size);
            if (Math.hypot(position.x - x, position.y - y) <= NODE_HIT_RADIUS) return i;
        }
        return null;
    }

    function localPosition(event: React.PointerEvent | WheelEvent) {
        const rect = canvasRef.current!.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top, size: { width: rect.width, height: rect.height } };
    }

    function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
        const { x, y } = localPosition(event);
        const index = findBand(x, y);
        if (index === null) return;
        setSelected(index);
        dragRef.current = { index };
        canvasRef.current!.setPointerCapture(event.pointerId);
    }

    function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {

        const { x, y, size } = localPosition(event);

        if (!dragRef.current) {
            setHovered(findBand(x, y));
            return;
        }

        const index = dragRef.current.index,
            band = stateRef.current.bands[index];

        setBand(index, "frequency", Math.round(clamp(xToFrequency(x, size), PARAMS.peqFrequency.min, PARAMS.peqFrequency.max)));

        if (bandUsesGain(band.type))
            setBand(index, "gain", Math.round(clamp(yToDecibels(y, size, RANGE), PARAMS.peqGain.min, PARAMS.peqGain.max) * 2) / 2);
    }

    function onPointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
        dragRef.current = null;
        canvasRef.current?.releasePointerCapture(event.pointerId);
    }

    // Scrolling over a node changes its Q. Native listener, so the page does not scroll.
    useEffect(function () {

        const canvas = canvasRef.current;
        if (!canvas) return;

        function onWheel(event: WheelEvent) {
            const { x, y } = localPosition(event);
            const index = findBand(x, y) ?? (dragRef.current?.index ?? null);
            if (index === null) return;
            event.preventDefault();
            const band = stateRef.current.bands[index];
            const next = clamp(band.q * (event.deltaY < 0 ? 1.1 : 1 / 1.1), PARAMS.peqQ.min, PARAMS.peqQ.max);
            writeValue(PARAMS.peqQ, channel.id, index, Math.round(next * 10) / 10);
        }

        canvas.addEventListener("wheel", onWheel, { passive: false });
        return () => canvas.removeEventListener("wheel", onWheel);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- reads live state through refs
    }, [channel.id]);

    const band = bands[selected];

    return (
        <div className="equalizer-window-content dxo-window">
            <div className="equalizer-window-content__toolbar">
                <div className="equalizer-window-content__toolbar__bands">
                    {bands.map((b, index) => (
                        <button
                            key={index}
                            className={`${index === selected ? "active" : ""} ${b.on ? "" : "disabled"}`}
                            style={{ "--band-color": bandColor(index) } as React.CSSProperties}
                            onClick={() => setSelected(index)}
                        >
                            {index + 1}
                        </button>
                    ))}
                </div>
                {!isLoaded && <span className="dxo-window__loading">Reading from processor…</span>}
            </div>

            <div className="equalizer-window-content__graph" ref={wrapperRef}>
                <canvas
                    ref={canvasRef}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerLeave={() => setHovered(null)}
                />
            </div>

            <div className="dxo-window__band" style={{ "--band-color": bandColor(selected) } as React.CSSProperties}>
                <div className="dxo-window__band__header">
                    <span className="dxo-window__band__title">Band {selected + 1}</span>
                    <select value={band.type} onChange={event => setBand(selected, "type", Number(event.target.value))}>
                        {PEQ_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                    </select>
                    <button className={band.on ? "active" : ""} title={band.on ? "Bypass band" : "Enable band"} onClick={() => setBand(selected, "on", band.on ? 0 : 1)}>
                        <Power size={14} />
                    </button>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <FrequencyKnob label="Freq" value={band.frequency} min={PARAMS.peqFrequency.min} max={PARAMS.peqFrequency.max} defaultValue={1000} onChange={value => setBand(selected, "frequency", value)} />
                    <EffectKnob label="Gain" value={band.gain} min={PARAMS.peqGain.min} max={PARAMS.peqGain.max} step={0.5} defaultValue={0} format={formatDecibels} onChange={value => setBand(selected, "gain", value)} />
                    <EffectKnob label="Q" value={band.q} min={PARAMS.peqQ.min} max={PARAMS.peqQ.max} step={0.1} defaultValue={1} format={value => value.toFixed(1)} onChange={value => setBand(selected, "q", value)} />
                </div>
            </div>

            <p className="equalizer-window-content__hint">Drag a node to set frequency and gain, scroll over it to change Q. The dashed line is the crossover.</p>
        </div>
    );
}
