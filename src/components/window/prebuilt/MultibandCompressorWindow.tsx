import type { MultibandCompressor, MultibandCompressorBandName, MultibandCompressorBandOptions } from "@fluex/fluexgl-dsp";
import { useState } from "react";

import { EffectKnob, FrequencyKnob, GainReductionMeter, OptionToggle } from "./EffectControls";
import { formatDecibels, formatRatio } from "../../../utilities/scripts/effect-value-formatters";

export interface MultibandCompressorWindowProperties {
    multibandCompressor: MultibandCompressor;
}

const BAND_NAMES: MultibandCompressorBandName[] = ["low", "mid", "high"];

const BAND_LABELS: Record<MultibandCompressorBandName, string> = {
    low: "Low",
    mid: "Mid",
    high: "High"
};

// Mirrors the defaults of the MultibandCompressor, used when resetting a knob with the middle mouse button.
const DEFAULT_BAND_TIMES_MS: Record<MultibandCompressorBandName, { attack: number; release: number }> = {
    low: { attack: 10, release: 200 },
    mid: { attack: 5, release: 150 },
    high: { attack: 2, release: 100 }
};

export default function MultibandCompressorWindow({ multibandCompressor }: MultibandCompressorWindowProperties) {

    const [selectedBand, setSelectedBand] = useState<MultibandCompressorBandName>("low");
    const [bands, setBands] = useState<Record<MultibandCompressorBandName, MultibandCompressorBandOptions>>(() => ({ ...multibandCompressor.bands }));
    const [lowCrossover, setLowCrossover] = useState<number>(multibandCompressor.lowCrossover);
    const [highCrossover, setHighCrossover] = useState<number>(multibandCompressor.highCrossover);
    const [outputGain, setOutputGain] = useState<number>(multibandCompressor.outputGain);

    const band: MultibandCompressorBandOptions = bands[selectedBand];

    function updateBand(options: Partial<MultibandCompressorBandOptions>) {
        multibandCompressor.setBand(selectedBand, options);
        // The effect clamps the values, so its own state is the source of truth.
        setBands({ ...multibandCompressor.bands });
    }

    function updateCrossovers(low: number, high: number) {
        // The high crossover is kept at least 1.5x above the low crossover, so both are read back.
        multibandCompressor.setCrossovers(low, high);
        setLowCrossover(multibandCompressor.lowCrossover);
        setHighCrossover(multibandCompressor.highCrossover);
    }

    function updateOutputGain(value: number) {
        multibandCompressor.setOutputGain(value);
        setOutputGain(value);
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-4">
                <FrequencyKnob label="Low/mid" value={lowCrossover} min={20} max={2000} defaultValue={200} onChange={value => updateCrossovers(value, highCrossover)} />
                <FrequencyKnob label="Mid/high" value={highCrossover} min={30} max={20000} defaultValue={2500} onChange={value => updateCrossovers(lowCrossover, value)} />
                <EffectKnob label="Output" value={outputGain} min={-24} max={24} step={0.1} defaultValue={0} format={formatDecibels} onChange={updateOutputGain} />
            </div>

            <div className="flex flex-col gap-2">
                {BAND_NAMES.map(function (name) {
                    return <GainReductionMeter key={name} label={`${BAND_LABELS[name]} band`} readReduction={() => multibandCompressor.reduction[name]} />;
                })}
            </div>

            <OptionToggle<MultibandCompressorBandName>
                options={BAND_NAMES.map(name => ({ value: name, label: BAND_LABELS[name] }))}
                value={selectedBand}
                onChange={setSelectedBand}
            />

            <div className="grid grid-cols-3 gap-4">
                <EffectKnob label="Threshold" value={band.threshold} min={-100} max={0} step={0.5} defaultValue={-24} format={formatDecibels} onChange={threshold => updateBand({ threshold })} />
                <EffectKnob label="Ratio" value={band.ratio} min={1} max={20} step={0.1} defaultValue={3} format={formatRatio} onChange={ratio => updateBand({ ratio })} />
                <EffectKnob label="Knee" value={band.knee} min={0} max={40} step={0.5} defaultValue={6} format={formatDecibels} onChange={knee => updateBand({ knee })} />
                <EffectKnob label="Attack" value={band.attack * 1000} min={0} max={1000} step={0.5} defaultValue={DEFAULT_BAND_TIMES_MS[selectedBand].attack} format={v => `${v.toFixed(1)} ms`} onChange={attack => updateBand({ attack: attack / 1000 })} />
                <EffectKnob label="Release" value={band.release * 1000} min={0} max={1000} step={1} defaultValue={DEFAULT_BAND_TIMES_MS[selectedBand].release} format={v => `${v.toFixed(0)} ms`} onChange={release => updateBand({ release: release / 1000 })} />
                <EffectKnob label="Makeup" value={band.makeupGain} min={-24} max={24} step={0.1} defaultValue={0} format={formatDecibels} onChange={makeupGain => updateBand({ makeupGain })} />
            </div>
        </div>
    );
}
