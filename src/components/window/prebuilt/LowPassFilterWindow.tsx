import { LowPassFilter } from "@fluex/fluexgl-dsp";
import { useState, useEffect } from "react";

import { EffectKnob, FrequencyKnob } from "./EffectControls";
import FilterGraph, { type FilterGraphChanges } from "./FilterGraph";

export interface LowPassFilterWindowProperties {
    lowPassFilter: LowPassFilter;
}

export default function LowPassFilterWindow({ lowPassFilter }: LowPassFilterWindowProperties) {

    const [cutoff, setCutoff] = useState<number>(lowPassFilter.cutoff);
    const [q, setQ] = useState<number>(lowPassFilter.q ?? 0.7);

    useEffect(function () {
        lowPassFilter.setCutoff(cutoff);
        lowPassFilter.setQ(q);
    }, [cutoff, q, lowPassFilter]);

    const minCutoff: number = Math.max(10, lowPassFilter.minFrequency),
        maxCutoff: number = (lowPassFilter.context?.sampleRate ?? 48000) / 2;

    function onGraphChange(changes: FilterGraphChanges) {
        if (changes.cutoff !== undefined) setCutoff(changes.cutoff);
        if (changes.q !== undefined) setQ(changes.q);
    }

    return (
        <div className="filter-window-content">
            <FilterGraph
                effect={lowPassFilter}
                type="lowpass"
                cutoff={cutoff}
                q={q}
                minCutoff={minCutoff}
                maxCutoff={maxCutoff}
                minQ={0.1}
                maxQ={4}
                defaultCutoff={1000}
                defaultQ={0.7}
                onChange={onGraphChange}
            />
            <div className="grid grid-cols-4 gap-4">
                <FrequencyKnob label="Cutoff" value={cutoff} min={minCutoff} max={maxCutoff} defaultValue={1000} onChange={setCutoff} />
                <EffectKnob label="Q" value={q} min={0.1} max={4} step={0.01} defaultValue={0.7} format={v => v.toFixed(2)} onChange={setQ} />
            </div>
        </div>
    );
}
