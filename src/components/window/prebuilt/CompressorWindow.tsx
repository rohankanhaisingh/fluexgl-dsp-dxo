import type { Compressor } from "@fluex/fluexgl-dsp";
import { useState, useEffect } from "react";

import { EffectKnob, GainReductionMeter } from "./EffectControls";
import { formatDecibels, formatRatio } from "../../../utilities/scripts/effect-value-formatters";

export interface CompressorWindowProperties {
    compressor: Compressor;
}

export default function CompressorWindow({ compressor }: CompressorWindowProperties) {

    const [threshold, setThreshold] = useState<number>(compressor.threshold);
    const [knee, setKnee] = useState<number>(compressor.knee);
    const [ratio, setRatio] = useState<number>(compressor.ratio);
    const [attackMs, setAttackMs] = useState<number>(compressor.attack * 1000);
    const [releaseMs, setReleaseMs] = useState<number>(compressor.release * 1000);
    const [makeupGain, setMakeupGain] = useState<number>(compressor.makeupGain);

    useEffect(function () {
        compressor.setThreshold(threshold);
        compressor.setKnee(knee);
        compressor.setRatio(ratio);
        compressor.setAttack(attackMs / 1000);
        compressor.setRelease(releaseMs / 1000);
        compressor.setMakeupGain(makeupGain);
    }, [threshold, knee, ratio, attackMs, releaseMs, makeupGain, compressor]);

    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-4">
                <EffectKnob label="Threshold" value={threshold} min={-100} max={0} step={0.5} defaultValue={-24} format={formatDecibels} onChange={setThreshold} />
                <EffectKnob label="Ratio" value={ratio} min={1} max={20} step={0.1} defaultValue={4} format={formatRatio} onChange={setRatio} />
                <EffectKnob label="Knee" value={knee} min={0} max={40} step={0.5} defaultValue={30} format={formatDecibels} onChange={setKnee} />
                <EffectKnob label="Attack" value={attackMs} min={0} max={1000} step={0.5} defaultValue={3} format={v => `${v.toFixed(1)} ms`} onChange={setAttackMs} />
                <EffectKnob label="Release" value={releaseMs} min={0} max={1000} step={1} defaultValue={250} format={v => `${v.toFixed(0)} ms`} onChange={setReleaseMs} />
                <EffectKnob label="Makeup" value={makeupGain} min={-24} max={24} step={0.1} defaultValue={0} format={formatDecibels} onChange={setMakeupGain} />
            </div>
            <GainReductionMeter readReduction={() => compressor.reduction} />
        </div>
    );
}
