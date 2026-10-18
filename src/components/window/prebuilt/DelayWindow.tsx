import type { MonoDelay, PingPongDelay } from "@fluex/fluexgl-dsp";
import { useState, useEffect } from "react";

import { EffectKnob } from "./EffectControls";
import { formatMilliseconds, formatPercentage } from "../../../utilities/scripts/effect-value-formatters";

export interface DelayWindowProperties {
    /** MonoDelay and PingPongDelay share the same controls. */
    delay: MonoDelay | PingPongDelay;
}

export default function DelayWindow({ delay }: DelayWindowProperties) {

    const [delayMs, setDelayMs] = useState<number>(delay.delayMs);
    const [feedback, setFeedback] = useState<number>(delay.feedback);
    const [mix, setMix] = useState<number>(delay.mix);

    useEffect(function () {
        delay.setDelayMs(delayMs);
        delay.setFeedback(feedback);
        delay.setMix(mix);
    }, [delayMs, feedback, mix, delay]);

    return (
        <div className="grid grid-cols-4 gap-4">
            <EffectKnob label="Time" value={delayMs} min={1} max={4000} step={1} defaultValue={300} format={formatMilliseconds} onChange={setDelayMs} />
            <EffectKnob label="Feedback" value={feedback} min={0} max={0.98} step={0.01} defaultValue={0.35} format={formatPercentage} onChange={setFeedback} />
            <EffectKnob label="Mix" value={mix} min={0} max={1} step={0.01} defaultValue={0.35} format={formatPercentage} onChange={setMix} />
        </div>
    );
}
