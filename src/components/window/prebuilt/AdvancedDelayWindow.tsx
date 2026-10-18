import type { AdvancedDelay } from "@fluex/fluexgl-dsp";
import { useState, useEffect } from "react";

import { EffectKnob, FrequencyKnob } from "./EffectControls";
import { formatMilliseconds, formatPercentage } from "../../../utilities/scripts/effect-value-formatters";

export interface AdvancedDelayWindowProperties {
    advancedDelay: AdvancedDelay;
}

export default function AdvancedDelayWindow({ advancedDelay }: AdvancedDelayWindowProperties) {

    const [delayLeftMs, setDelayLeftMs] = useState<number>(advancedDelay.delayLeftMs);
    const [delayRightMs, setDelayRightMs] = useState<number>(advancedDelay.delayRightMs);
    const [feedback, setFeedback] = useState<number>(advancedDelay.feedback);
    const [crossFeedback, setCrossFeedback] = useState<number>(advancedDelay.crossFeedback);
    const [mix, setMix] = useState<number>(advancedDelay.mix);
    const [lowCut, setLowCut] = useState<number>(advancedDelay.lowCut);
    const [highCut, setHighCut] = useState<number>(advancedDelay.highCut);
    const [modulationRate, setModulationRate] = useState<number>(advancedDelay.modulationRate);
    const [modulationDepth, setModulationDepth] = useState<number>(advancedDelay.modulationDepth);
    const [drive, setDrive] = useState<number>(advancedDelay.drive);

    useEffect(function () {
        advancedDelay.setDelayLeftMs(delayLeftMs);
        advancedDelay.setDelayRightMs(delayRightMs);
        advancedDelay.setFeedback(feedback);
        advancedDelay.setCrossFeedback(crossFeedback);
        advancedDelay.setMix(mix);
        advancedDelay.setLowCut(lowCut);
        advancedDelay.setHighCut(highCut);
        advancedDelay.setModulationRate(modulationRate);
        advancedDelay.setModulationDepth(modulationDepth);
        advancedDelay.setDrive(drive);
    }, [delayLeftMs, delayRightMs, feedback, crossFeedback, mix, lowCut, highCut, modulationRate, modulationDepth, drive, advancedDelay]);

    return (
        <div className="flex flex-col gap-4">
            <p className="effect-section-title">Delay</p>
            <div className="grid grid-cols-5 gap-4">
                <EffectKnob label="Left" value={delayLeftMs} min={1} max={4000} step={1} defaultValue={375} format={formatMilliseconds} onChange={setDelayLeftMs} />
                <EffectKnob label="Right" value={delayRightMs} min={1} max={4000} step={1} defaultValue={500} format={formatMilliseconds} onChange={setDelayRightMs} />
                <EffectKnob label="Feedback" value={feedback} min={0} max={0.98} step={0.01} defaultValue={0.45} format={formatPercentage} onChange={setFeedback} />
                <EffectKnob label="Cross" value={crossFeedback} min={0} max={1} step={0.01} defaultValue={0.2} format={formatPercentage} onChange={setCrossFeedback} />
                <EffectKnob label="Mix" value={mix} min={0} max={1} step={0.01} defaultValue={0.35} format={formatPercentage} onChange={setMix} />
            </div>
            <p className="effect-section-title">Feedback path</p>
            <div className="grid grid-cols-5 gap-4">
                <FrequencyKnob label="Low cut" value={lowCut} min={20} max={2000} defaultValue={120} off="min" onChange={setLowCut} />
                <FrequencyKnob label="High cut" value={highCut} min={500} max={20000} defaultValue={6000} off="max" onChange={setHighCut} />
                <EffectKnob label="Mod rate" value={modulationRate} min={0} max={10} step={0.01} defaultValue={0.5} format={v => `${v.toFixed(2)} Hz`} onChange={setModulationRate} />
                <EffectKnob label="Mod depth" value={modulationDepth} min={0} max={20} step={0.1} defaultValue={0} format={v => `${v.toFixed(1)} ms`} onChange={setModulationDepth} />
                <EffectKnob label="Drive" value={drive} min={0} max={1} step={0.01} defaultValue={0.2} format={formatPercentage} onChange={setDrive} />
            </div>
        </div>
    );
}
