import { Chorus } from "@fluex/fluexgl-dsp";
import { useState, useEffect } from "react";

import Knob from "../../mixer/Knob";

export interface ChorusWindowProperties {
    chorus: Chorus;
}

export default function ChorusWindow({ chorus }: ChorusWindowProperties) {

    const [baseDelayMs, setBaseDelayMs] = useState<number>(chorus.baseDelayMs);
    const [depthMs, setDepthMs] = useState<number>(chorus.depthMs);
    const [rateHz, setRateHz] = useState<number>(chorus.rateHz);
    const [mix, setMix] = useState<number>(chorus.mix);
    const [feedback, setFeedback] = useState<number>(chorus.feedback);

    useEffect(function() {

        chorus.setBaseDelayMs(baseDelayMs);
        chorus.setDepthMs(depthMs);
        chorus.setRateHz(rateHz);
        chorus.setMix(mix);
        chorus.setFeedback(feedback);
    }, [baseDelayMs, depthMs, rateHz, mix, feedback, chorus]);

    return (
        <div className="grid grid-cols-4 gap-4">
            <div className="flex flex-col gap-[10px] items-center text-center justify-end">
                <p>Base delay (ms): {baseDelayMs.toFixed(1)}</p>
                <Knob defaultValue={0} value={baseDelayMs} min={0} max={1000} step={1} onChange={_baseDelayMs => setBaseDelayMs(_baseDelayMs)} />
            </div>
            <div className="flex flex-col gap-[10px] items-center text-center justify-end">
                <p>Depth (ms): {depthMs.toFixed(1)}</p>
                <Knob defaultValue={0} value={depthMs} min={0} max={1000} step={1} onChange={_depthMs => setDepthMs(_depthMs)} />
            </div>
            <div className="flex flex-col gap-[10px] items-center text-center justify-end">
                <p>Rate (hz): {rateHz.toFixed(1)}</p>
                <Knob defaultValue={0} value={rateHz} min={0} max={10} step={0.1} onChange={_rateHz => setRateHz(_rateHz)} />
            </div>
            <div className="flex flex-col gap-[10px] items-center text-center justify-end">
                <p>Mix: {mix.toFixed(2)}%</p>
                <Knob defaultValue={0} value={mix} min={0} max={1} step={0.01} onChange={_mix => setMix(_mix)} />
            </div>
            <div className="flex flex-col gap-[10px] items-center text-center justify-end">
                <p>Feedback: {feedback.toFixed(1)}</p>
                <Knob defaultValue={0} value={feedback} min={0} max={10} step={0.1} onChange={_feedback => setFeedback(_feedback)} />
            </div>
        </div>
    )
}