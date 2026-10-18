import type { StereoDelay } from "@fluex/fluexgl-dsp";
import { useState, useEffect } from "react";

import { EffectKnob } from "./EffectControls";
import { formatMilliseconds, formatPercentage } from "../../../utilities/scripts/effect-value-formatters";

export interface StereoDelayWindowProperties {
    stereoDelay: StereoDelay;
}

export default function StereoDelayWindow({ stereoDelay }: StereoDelayWindowProperties) {

    const [delayLeftMs, setDelayLeftMs] = useState<number>(stereoDelay.delayLeftMs);
    const [delayRightMs, setDelayRightMs] = useState<number>(stereoDelay.delayRightMs);
    const [feedback, setFeedback] = useState<number>(stereoDelay.feedback);
    const [mix, setMix] = useState<number>(stereoDelay.mix);

    useEffect(function () {
        stereoDelay.setDelayLeftMs(delayLeftMs);
        stereoDelay.setDelayRightMs(delayRightMs);
        stereoDelay.setFeedback(feedback);
        stereoDelay.setMix(mix);
    }, [delayLeftMs, delayRightMs, feedback, mix, stereoDelay]);

    return (
        <div className="grid grid-cols-4 gap-4">
            <EffectKnob label="Left" value={delayLeftMs} min={1} max={4000} step={1} defaultValue={300} format={formatMilliseconds} onChange={setDelayLeftMs} />
            <EffectKnob label="Right" value={delayRightMs} min={1} max={4000} step={1} defaultValue={450} format={formatMilliseconds} onChange={setDelayRightMs} />
            <EffectKnob label="Feedback" value={feedback} min={0} max={0.98} step={0.01} defaultValue={0.35} format={formatPercentage} onChange={setFeedback} />
            <EffectKnob label="Mix" value={mix} min={0} max={1} step={0.01} defaultValue={0.35} format={formatPercentage} onChange={setMix} />
        </div>
    );
}
