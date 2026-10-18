import type { NotchFilter } from "@fluex/fluexgl-dsp";
import { useState, useEffect } from "react";

import { EffectKnob, FrequencyKnob } from "./EffectControls";
import FilterGraph, { type FilterGraphChanges } from "./FilterGraph";

export interface NotchFilterWindowProperties {
    notchFilter: NotchFilter;
}

export default function NotchFilterWindow({ notchFilter }: NotchFilterWindowProperties) {

    const [cutoff, setCutoff] = useState<number>(notchFilter.cutoff);
    const [q, setQ] = useState<number>(notchFilter.q ?? 0.7);

    useEffect(function () {
        notchFilter.setCutoff(cutoff);
        notchFilter.setQ(q);
    }, [cutoff, q, notchFilter]);

    const minCutoff: number = Math.max(10, notchFilter.minFrequency),
        maxCutoff: number = (notchFilter.context?.sampleRate ?? 48000) / 2;

    function onGraphChange(changes: FilterGraphChanges) {
        if (changes.cutoff !== undefined) setCutoff(changes.cutoff);
        if (changes.q !== undefined) setQ(changes.q);
    }

    return (
        <div className="filter-window-content">
            <FilterGraph
                effect={notchFilter}
                type="notch"
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
                <FrequencyKnob label="Frequency" value={cutoff} min={minCutoff} max={maxCutoff} defaultValue={1000} onChange={setCutoff} />
                <EffectKnob label="Q" value={q} min={0.1} max={4} step={0.01} defaultValue={0.7} format={v => v.toFixed(2)} onChange={setQ} />
            </div>
        </div>
    );
}
