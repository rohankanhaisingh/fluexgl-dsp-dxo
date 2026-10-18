import type { Limiter } from "@fluex/fluexgl-dsp";
import { useState, useEffect } from "react";

import { EffectKnob, GainReductionMeter } from "./EffectControls";
import { formatDecibels } from "../../../utilities/scripts/effect-value-formatters";

export interface LimiterWindowProperties {
    limiter: Limiter;
}

export default function LimiterWindow({ limiter }: LimiterWindowProperties) {

    const [ceiling, setCeiling] = useState<number>(limiter.ceiling);
    const [releaseMs, setReleaseMs] = useState<number>(limiter.release * 1000);
    const [inputGain, setInputGain] = useState<number>(limiter.inputGain);

    useEffect(function () {
        limiter.setCeiling(ceiling);
        limiter.setRelease(releaseMs / 1000);
        limiter.setInputGain(inputGain);
    }, [ceiling, releaseMs, inputGain, limiter]);

    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-4">
                <EffectKnob label="Input gain" value={inputGain} min={-24} max={24} step={0.1} defaultValue={0} format={formatDecibels} onChange={setInputGain} />
                <EffectKnob label="Ceiling" value={ceiling} min={-24} max={0} step={0.1} defaultValue={-1} format={formatDecibels} onChange={setCeiling} />
                <EffectKnob label="Release" value={releaseMs} min={10} max={1000} step={1} defaultValue={100} format={v => `${v.toFixed(0)} ms`} onChange={setReleaseMs} />
            </div>
            <GainReductionMeter readReduction={() => limiter.reduction} />
        </div>
    );
}
