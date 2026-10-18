import type { HighPassFilter } from "@fluex/fluexgl-dsp";
import { useState, useEffect } from "react";

import { EffectKnob, FrequencyKnob } from "./EffectControls";
import FilterGraph, { type FilterGraphChanges } from "./FilterGraph";

export interface HighPassFilterWindowProperties {
    highPassFilter: HighPassFilter;
}

export default function HighPassFilterWindow({ highPassFilter }: HighPassFilterWindowProperties) {

    const [cutoff, setCutoff] = useState<number>(highPassFilter.cutoff);
    const [q, setQ] = useState<number>(highPassFilter.q ?? 0.7);

    useEffect(function () {
        highPassFilter.setCutoff(cutoff);
        highPassFilter.setQ(q);
    }, [cutoff, q, highPassFilter]);

    const maxCutoff: number = Math.min(highPassFilter.maxFrequency, (highPassFilter.context?.sampleRate ?? 48000) / 2);

    function onGraphChange(changes: FilterGraphChanges) {
        if (changes.cutoff !== undefined) setCutoff(changes.cutoff);
        if (changes.q !== undefined) setQ(changes.q);
    }

    return (
        <div className="filter-window-content">
            <FilterGraph
                effect={highPassFilter}
                type="highpass"
                cutoff={cutoff}
                q={q}
                minCutoff={10}
                maxCutoff={maxCutoff}
                minQ={0.1}
                maxQ={4}
                defaultCutoff={1000}
                defaultQ={0.7}
                onChange={onGraphChange}
            />
            <div className="grid grid-cols-4 gap-4">
                <FrequencyKnob label="Cutoff" value={cutoff} min={10} max={maxCutoff} defaultValue={1000} onChange={setCutoff} />
                <EffectKnob label="Q" value={q} min={0.1} max={4} step={0.01} defaultValue={0.7} format={v => v.toFixed(2)} onChange={setQ} />
            </div>
        </div>
    );
}
