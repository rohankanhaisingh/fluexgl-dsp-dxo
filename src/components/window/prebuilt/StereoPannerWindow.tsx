import type { StereoPanner } from "@fluex/fluexgl-dsp";
import { useState, useEffect } from "react";

import { EffectKnob } from "./EffectControls";

export interface StereoPannerWindowProperties {
    stereoPanner: StereoPanner;
}

function formatPan(pan: number): string {

    const percentage: number = Math.round(Math.abs(pan) * 100);

    if (percentage === 0) return "C";

    return pan < 0 ? `${percentage}% L` : `${percentage}% R`;
}

export default function StereoPannerWindow({ stereoPanner }: StereoPannerWindowProperties) {

    const [pan, setPan] = useState<number>(stereoPanner.pan);
    const [width, setWidth] = useState<number>(stereoPanner.width);

    useEffect(function () {
        stereoPanner.setPan(pan);
        stereoPanner.setWidth(width);
    }, [pan, width, stereoPanner]);

    return (
        <div className="grid grid-cols-4 gap-4">
            <EffectKnob label="Pan" value={pan} min={-1} max={1} step={0.01} defaultValue={0} format={formatPan} onChange={setPan} />
            <EffectKnob label="Width" value={width} min={0} max={2} step={0.01} defaultValue={1} format={v => `${Math.round(v * 100)}%`} onChange={setWidth} />
        </div>
    );
}
