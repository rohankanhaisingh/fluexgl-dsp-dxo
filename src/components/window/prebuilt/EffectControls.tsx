import "./EffectControls.scss";

import { useEffect, useRef } from "react";

import Knob from "../../mixer/Knob";
import { formatFrequency } from "../../../utilities/scripts/effect-value-formatters";

export interface EffectKnobProperties {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    defaultValue: number;
    format?: (value: number) => string;
    onChange: (value: number) => void;
}

/**
 * A knob with its label and current value above it, as used by every effect window.
 */
export function EffectKnob({ label, value, min, max, step, defaultValue, format, onChange }: EffectKnobProperties) {

    return (
        <div className="flex flex-col gap-[10px] items-center text-center justify-end">
            <p>{label}: {format ? format(value) : value}</p>
            <Knob defaultValue={defaultValue} value={value} min={min} max={max} step={step} onChange={onChange} />
        </div>
    );
}

export interface FrequencyKnobProperties {
    label: string;
    value: number;
    min: number;
    max: number;
    defaultValue: number;
    /**
     * Some parameters use 0 to disable a filter. With this set, turning the knob fully
     * to that side emits 0 instead of the frequency.
     */
    off?: "min" | "max";
    onChange: (value: number) => void;
}

/**
 * A knob with a logarithmic frequency scale, so every octave takes up the same amount of rotation.
 */
export function FrequencyKnob({ label, value, min, max, defaultValue, off, onChange }: FrequencyKnobProperties) {

    const minPosition: number = Math.log10(min),
        maxPosition: number = Math.log10(max);

    function toPosition(frequency: number): number {

        if (frequency <= 0)
            return off === "max" ? maxPosition : minPosition;

        return Math.min(maxPosition, Math.max(minPosition, Math.log10(frequency)));
    }

    function onPositionChange(position: number) {

        if (off === "min" && position <= minPosition) return onChange(0);
        if (off === "max" && position >= maxPosition) return onChange(0);

        onChange(Math.round(Math.pow(10, position)));
    }

    return (
        <div className="flex flex-col gap-[10px] items-center text-center justify-end">
            <p>{label}: {formatFrequency(value)}</p>
            <Knob defaultValue={toPosition(defaultValue)} value={toPosition(value)} min={minPosition} max={maxPosition} step={0.001} onChange={onPositionChange} />
        </div>
    );
}

export interface OptionToggleItem<T extends string> {
    value: T;
    label: string;
}

export interface OptionToggleProperties<T extends string> {
    options: OptionToggleItem<T>[];
    value: T;
    onChange: (value: T) => void;
}

export function OptionToggle<T extends string>({ options, value, onChange }: OptionToggleProperties<T>) {

    return (
        <div className="effect-option-toggle">
            {options.map(function (option) {
                return (
                    <button key={option.value} className={option.value === value ? "active" : ""} onClick={() => onChange(option.value)}>
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}

export interface GainReductionMeterProperties {
    label?: string;
    /** Returns the current gain reduction in dB (0 or negative). */
    readReduction: () => number;
    /** The reduction (dB) that fills the whole meter. */
    range?: number;
}

/**
 * Polls the gain reduction every frame. The DOM is updated directly, so the meter
 * does not re-render the whole effect window 60 times per second.
 */
export function GainReductionMeter({ label = "Gain reduction", readReduction, range = 24 }: GainReductionMeterProperties) {

    const barRef = useRef<HTMLDivElement>(null);
    const valueRef = useRef<HTMLSpanElement>(null);

    // Kept in a ref, so passing an inline function does not restart the animation loop.
    const readReductionRef = useRef(readReduction);

    useEffect(function () {
        readReductionRef.current = readReduction;
    }, [readReduction]);

    useEffect(function () {

        let frameId: number = 0;

        function render() {

            const reduction: number = Math.min(0, readReductionRef.current() || 0);

            if (barRef.current)
                barRef.current.style.width = `${Math.min(1, -reduction / range) * 100}%`;

            if (valueRef.current)
                valueRef.current.textContent = `${reduction.toFixed(1)} dB`;

            frameId = window.requestAnimationFrame(render);
        }

        frameId = window.requestAnimationFrame(render);

        return () => window.cancelAnimationFrame(frameId);
    }, [range]);

    return (
        <div className="effect-gain-reduction-meter">
            <div className="effect-gain-reduction-meter__header">
                <span>{label}</span>
                <span ref={valueRef}>0.0 dB</span>
            </div>
            <div className="effect-gain-reduction-meter__track">
                <div className="effect-gain-reduction-meter__track__bar" ref={barRef}></div>
            </div>
        </div>
    );
}
