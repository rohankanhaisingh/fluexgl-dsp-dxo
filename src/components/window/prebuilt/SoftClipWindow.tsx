import { SoftClip } from "@fluex/fluexgl-dsp";
import { useState, useEffect } from "react";

import Knob from "../../mixer/Knob";

export interface SoftClipWindowProperties {
    softClip: SoftClip;
}

export default function SoftClipWindow({ softClip }: SoftClipWindowProperties) {

    const [initialDrive, setInitialDrive] = useState<number>(softClip.drive);
    const [initialGain, setInitialGain] = useState<number>(softClip.gain);

    const [drive, setDrive] = useState<number>(initialDrive);
    const [gain, setGain] = useState<number>(initialGain);

    useEffect(() => {
        setInitialDrive(softClip.drive);
        setInitialGain(softClip.gain);
    }, [softClip]);

    useEffect(function () {
        softClip.setDrive(drive);
        softClip.setGain(gain);
    }, [drive, gain, softClip]);

    return (
        <div className="grid grid-cols-4 gap-4">
            <div className="flex flex-col gap-[10px] items-center">
                <p>Drive: {drive.toFixed(1)}</p>
                <Knob defaultValue={0} value={drive} min={0} max={10} step={0.1} onChange={_drive => setDrive(_drive)} />
            </div>
            <div className="flex flex-col gap-[10px] items-center">
                <p>Gain: {gain.toFixed(1)}</p>
                <Knob defaultValue={1} value={gain} min={0} max={10} step={0.01} onChange={_gain => setGain(_gain)} />
            </div>
        </div>
    )
}