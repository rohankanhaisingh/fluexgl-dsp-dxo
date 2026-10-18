import type { Saturation, SaturationMode } from "@fluex/fluexgl-dsp";
import { useState, useEffect } from "react";

import { EffectKnob, FrequencyKnob, OptionToggle } from "./EffectControls";
import { formatDecibels } from "../../../utilities/scripts/effect-value-formatters";

export interface SaturationWindowProperties {
    saturation: Saturation;
}

const SATURATION_MODES: { value: SaturationMode; label: string }[] = [
    { value: "soft", label: "Soft" },
    { value: "tube", label: "Tube" },
    { value: "tape", label: "Tape" }
];

export default function SaturationWindow({ saturation }: SaturationWindowProperties) {

    const [mode, setMode] = useState<SaturationMode>(saturation.mode);
    const [drive, setDrive] = useState<number>(saturation.drive);
    const [tone, setTone] = useState<number>(saturation.tone);
    const [mix, setMix] = useState<number>(saturation.mix);
    const [outputGain, setOutputGain] = useState<number>(saturation.outputGain);

    useEffect(function () {
        saturation.setMode(mode);
        saturation.setDrive(drive);
        saturation.setTone(tone);
        saturation.setMix(mix);
        saturation.setOutputGain(outputGain);
    }, [mode, drive, tone, mix, outputGain, saturation]);

    return (
        <div className="flex flex-col gap-4">
            <OptionToggle<SaturationMode> options={SATURATION_MODES} value={mode} onChange={setMode} />
            <div className="grid grid-cols-4 gap-4">
                <EffectKnob label="Drive" value={drive} min={0} max={48} step={0.1} defaultValue={12} format={formatDecibels} onChange={setDrive} />
                <FrequencyKnob label="Tone" value={tone} min={500} max={20000} defaultValue={0} off="max" onChange={setTone} />
                <EffectKnob label="Mix" value={mix} min={0} max={1} step={0.01} defaultValue={1} format={v => `${Math.round(v * 100)}%`} onChange={setMix} />
                <EffectKnob label="Output" value={outputGain} min={-24} max={24} step={0.1} defaultValue={0} format={formatDecibels} onChange={setOutputGain} />
            </div>
        </div>
    );
}
