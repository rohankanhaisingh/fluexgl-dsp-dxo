import "../window/prebuilt/EffectControls.scss";
import "./DxoWindows.scss";

import { useEffect, useRef } from "react";

import { EffectKnob, FrequencyKnob, GainReductionMeter } from "../window/prebuilt/EffectControls";
import { formatDecibels, formatFrequency, formatRatio } from "../../utilities/scripts/effect-value-formatters";
import {
    type GraphRange, type GraphSize,
    decibelsToY, drawFrequencyGrid, frequencyToX, prepareGraphCanvas, readGraphColors, xToFrequency
} from "../../utilities/scripts/frequency-graph";

import { CROSSOVER_SHAPES, INPUTS, PARAMS, type DxoChannel, type ParameterDefinition } from "../../device/parameters";
import { readMeters, useChannelLayout, useDxoValue, writeValue } from "../../device/deviceStore";
import { crossoverMagnitude } from "./responseMath";

interface ChannelWindowProperties {
    channel: DxoChannel;
}

function useParam(parameter: ParameterDefinition, channel: DxoChannel, index: number = 0): [number, (value: number) => void] {
    const value = useDxoValue(parameter, channel.id, index);
    return [value ?? parameter.defaultValue, (next: number) => { writeValue(parameter, channel.id, index, next); }];
}

const formatMs = (value: number) => value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${value.toFixed(value < 10 ? 2 : 0)} ms`;

const CROSSOVER_RANGE: GraphRange = { minDecibels: -48, maxDecibels: 6, grid: [-42, -36, -30, -24, -18, -12, -6, 0] };

function CrossoverGraph({ hpf, hpfShape, lpf, lpfShape }: { hpf: number; hpfShape: number; lpf: number; lpfShape: number }) {

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const stateRef = useRef({ hpf, hpfShape, lpf, lpfShape });
    stateRef.current = { hpf, hpfShape, lpf, lpfShape };

    useEffect(function () {

        let frameId = 0;

        function draw() {

            frameId = requestAnimationFrame(draw);

            const canvas = canvasRef.current, wrapper = wrapperRef.current, ctx = canvas?.getContext("2d");
            if (!canvas || !wrapper || !ctx) return;

            const size: GraphSize = { width: wrapper.clientWidth, height: wrapper.clientHeight };
            if (!prepareGraphCanvas(canvas, ctx, size)) return;

            const colors = readGraphColors(wrapper);
            const { hpf, hpfShape, lpf, lpfShape } = stateRef.current;

            drawFrequencyGrid(ctx, size, CROSSOVER_RANGE, colors);

            ctx.save();
            ctx.strokeStyle = colors.accent;
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let x = 0; x <= size.width; x += 2) {
                const f = xToFrequency(x, size);
                const db = crossoverMagnitude("hpf", hpfShape, hpf, f) + (lpf < 20001 ? crossoverMagnitude("lpf", lpfShape, lpf, f) : 0);
                const y = decibelsToY(Math.max(CROSSOVER_RANGE.minDecibels - 2, db), size, CROSSOVER_RANGE);
                if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.restore();

            ctx.save();
            ctx.fillStyle = colors.muted;
            ctx.font = "10px Poppins, sans-serif";
            for (const [label, f] of [["HPF", hpf], ["LPF", lpf]] as const) {
                if (label === "LPF" && f >= 20001) continue;
                const x = frequencyToX(Math.max(20, Math.min(20000, f)), size);
                ctx.fillRect(x, 0, 1, size.height);
                ctx.fillText(`${label} ${formatFrequency(f)}`, Math.min(size.width - 70, x + 4), 12);
            }
            ctx.restore();
        }

        frameId = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(frameId);
    }, []);

    return (
        <div className="dxo-window__graph" ref={wrapperRef}>
            <canvas ref={canvasRef} />
        </div>
    );
}

function ShapeSelect({ value, onChange }: { value: number; onChange: (value: number) => void }) {
    return (
        <select value={value} onChange={event => onChange(Number(event.target.value))}>
            {CROSSOVER_SHAPES.map(shape => <option key={shape.value} value={shape.value}>{shape.label}</option>)}
        </select>
    );
}

export function DxoFiltersWindow({ channel }: ChannelWindowProperties) {

    const [hpf, setHpf] = useParam(PARAMS.hpfFrequency, channel);
    const [hpfShape, setHpfShape] = useParam(PARAMS.hpfShape, channel);
    const [lpf, setLpf] = useParam(PARAMS.lpfFrequency, channel);
    const [lpfShape, setLpfShape] = useParam(PARAMS.lpfShape, channel);
    const delayParameter = channel.kind === "input" ? PARAMS.inputDelay : PARAMS.outputDelay;
    const [delay, setDelay] = useParam(delayParameter, channel);

    return (
        <div className="dxo-window flex flex-col gap-4">
            <CrossoverGraph hpf={hpf} hpfShape={hpfShape} lpf={lpf} lpfShape={lpfShape} />

            <div className="grid grid-cols-2 gap-4">
                <div className="dxo-window__section">
                    <p className="effect-section-title">High pass</p>
                    <ShapeSelect value={hpfShape} onChange={setHpfShape} />
                    <FrequencyKnob label="Frequency" value={hpf} min={PARAMS.hpfFrequency.min} max={PARAMS.hpfFrequency.max} defaultValue={PARAMS.hpfFrequency.min} onChange={setHpf} />
                </div>
                <div className="dxo-window__section">
                    <p className="effect-section-title">Low pass</p>
                    <ShapeSelect value={lpfShape} onChange={setLpfShape} />
                    <FrequencyKnob label="Frequency" value={lpf >= 20001 ? 20000 : lpf} min={PARAMS.lpfFrequency.min} max={20000} defaultValue={20000} onChange={value => setLpf(value >= 20000 ? 20001 : value)} />
                </div>
            </div>

            <div className="dxo-window__section dxo-window__section--row">
                <p className="effect-section-title">Delay</p>
                <EffectKnob label="Delay" value={delay} min={delayParameter.min} max={delayParameter.max} step={channel.kind === "input" ? 0.5 : 0.01} defaultValue={0} format={value => `${formatMs(value)} · ${(value * 0.343).toFixed(2)} m`} onChange={setDelay} />
            </div>
        </div>
    );
}

export function DxoDynamicsWindow({ channel }: ChannelWindowProperties) {

    const limiterThresholdParameter = channel.kind === "input" ? PARAMS.inputLimiterThreshold : PARAMS.outputLimiterThreshold;

    const [limiterThreshold, setLimiterThreshold] = useParam(limiterThresholdParameter, channel);
    const [limiterRelease, setLimiterRelease] = useParam(PARAMS.limiterRelease, channel);
    const [threshold, setThreshold] = useParam(PARAMS.compressorThreshold, channel);
    const [ratio, setRatio] = useParam(PARAMS.compressorRatio, channel);
    const [attack, setAttack] = useParam(PARAMS.compressorAttack, channel);
    const [release, setRelease] = useParam(PARAMS.compressorRelease, channel);

    function readReduction(): number {
        const meters = readMeters(),
            values = channel.kind === "input" ? meters.gr.in : meters.gr.out,
            index = channel.kind === "input" ? channel.id : channel.id - 0x80;
        return -(values?.[index] ?? 0);
    }

    return (
        <div className="dxo-window flex flex-col gap-4">
            <div className="dxo-window__section">
                <p className="effect-section-title">Limiter</p>
                <div className="grid grid-cols-2 gap-4">
                    <EffectKnob label="Threshold" value={limiterThreshold} min={limiterThresholdParameter.min} max={limiterThresholdParameter.max} step={0.5} defaultValue={limiterThresholdParameter.max} format={formatDecibels} onChange={setLimiterThreshold} />
                    <EffectKnob label="Release" value={limiterRelease} min={PARAMS.limiterRelease.min} max={PARAMS.limiterRelease.max} step={10} defaultValue={50} format={formatMs} onChange={setLimiterRelease} />
                </div>
            </div>

            <div className="dxo-window__section">
                <p className="effect-section-title">Compressor</p>
                <div className="grid grid-cols-4 gap-4">
                    <EffectKnob label="Threshold" value={threshold} min={PARAMS.compressorThreshold.min} max={PARAMS.compressorThreshold.max} step={0.5} defaultValue={24} format={formatDecibels} onChange={setThreshold} />
                    <EffectKnob label="Ratio" value={ratio} min={PARAMS.compressorRatio.min} max={PARAMS.compressorRatio.max} step={0.1} defaultValue={2} format={formatRatio} onChange={setRatio} />
                    <EffectKnob label="Attack" value={attack} min={PARAMS.compressorAttack.min} max={1000} step={1} defaultValue={10} format={formatMs} onChange={setAttack} />
                    <EffectKnob label="Release" value={release} min={PARAMS.compressorRelease.min} max={PARAMS.compressorRelease.max} step={10} defaultValue={100} format={formatMs} onChange={setRelease} />
                </div>
            </div>

            <GainReductionMeter readReduction={readReduction} />
        </div>
    );
}

function RoutingRow({ output, inputIndex }: { output: DxoChannel; inputIndex: number }) {

    const [level, setLevel] = useParam(PARAMS.mixerGain, output, inputIndex);
    const isOff = level <= PARAMS.mixerGain.min;

    return (
        <div className={`dxo-routing__row ${isOff ? "off" : ""}`}>
            <span className="dxo-routing__row__input">Input {INPUTS[inputIndex].label}</span>
            <input
                type="range"
                min={PARAMS.mixerGain.min}
                max={PARAMS.mixerGain.max}
                step={0.5}
                value={level}
                onChange={event => setLevel(Number(event.target.value))}
            />
            <span className="dxo-routing__row__value">{isOff ? "Off" : formatDecibels(level)}</span>
            <button className={isOff ? "" : "active"} onClick={() => setLevel(isOff ? 0 : PARAMS.mixerGain.min)}>{isOff ? "Add" : "Remove"}</button>
        </div>
    );
}

export function DxoRoutingWindow({ channel }: ChannelWindowProperties) {

    const layout = useChannelLayout();

    return (
        <div className="dxo-window dxo-routing flex flex-col gap-2">
            <p className="equalizer-window-content__hint">Which inputs feed output {channel.label}, and at what level.</p>
            {INPUTS.slice(0, layout.inputs).map((_, inputIndex) => <RoutingRow key={inputIndex} output={channel} inputIndex={inputIndex} />)}
        </div>
    );
}
