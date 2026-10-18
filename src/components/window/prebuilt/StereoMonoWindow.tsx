import "./StereoMonoWindow.scss";

import type { StereoMono, StereoMonoMode } from "@fluex/fluexgl-dsp";
import { useState, useEffect, useRef } from "react";

import { EffectKnob, OptionToggle } from "./EffectControls";
import { formatMilliseconds } from "../../../utilities/scripts/effect-value-formatters";
import { StereoImageScene, STEREO_MONO_MAX_DELAY_MS, type StereoSide } from "../../../utilities/scripts/stereo-image-scene";
import { EffectOutputTap } from "../../../utilities/scripts/effect-output-tap";

export interface StereoMonoWindowProperties {
    stereoMono: StereoMono;
}

const ROUTING_MODES: { value: StereoMonoMode; label: string }[] = [
    { value: "stereo", label: "Stereo" },
    { value: "mono", label: "Mono" },
    { value: "swap", label: "Swap" },
    { value: "side", label: "Side" }
];

const SIDE_MODES: { value: StereoMonoMode; label: string }[] = [
    { value: "left", label: "L only" },
    { value: "right", label: "R only" },
    { value: "left-to-both", label: "L → both" },
    { value: "right-to-both", label: "R → both" }
];

const MODE_DESCRIPTIONS: Record<StereoMonoMode, [string, string]> = {
    "stereo": ["Stereo", "Left and right unchanged"],
    "mono": ["Mono", "(L + R) / 2 on both sides"],
    "mid": ["Mono", "(L + R) / 2 on both sides"],
    "swap": ["Swap", "Left and right exchanged"],
    "side": ["Side", "(L − R) / 2, only the stereo difference"],
    "left": ["Left only", "Right side silenced"],
    "right": ["Right only", "Left side silenced"],
    "left-to-both": ["Left → both", "Left channel on both sides"],
    "right-to-both": ["Right → both", "Right channel on both sides"]
};

function describeTreatment(delayLeftMs: number, delayRightMs: number, invertLeft: boolean, invertRight: boolean): string | null {

    const difference: number = Math.abs(delayLeftMs - delayRightMs);

    if (invertLeft !== invertRight)
        return "One side inverted · diffuse, cancels in mono";

    if (difference >= 1 && difference <= 30)
        return `Haas widening · ${delayLeftMs > delayRightMs ? "R" : "L"} first by ${Math.round(difference)} ms`;

    if (difference > 30)
        return `Slapback · ${Math.round(difference)} ms apart`;

    if (invertLeft && invertRight)
        return "Both sides inverted";

    return null;
}

export default function StereoMonoWindow({ stereoMono }: StereoMonoWindowProperties) {

    // "mid" routes exactly like "mono", so it is shown as such.
    const [mode, setMode] = useState<StereoMonoMode>(stereoMono.mode === "mid" ? "mono" : stereoMono.mode);
    const [delayLeftMs, setDelayLeftMs] = useState<number>(stereoMono.delayLeftMs);
    const [delayRightMs, setDelayRightMs] = useState<number>(stereoMono.delayRightMs);
    const [invertLeft, setInvertLeft] = useState<boolean>(stereoMono.invertLeft);
    const [invertRight, setInvertRight] = useState<boolean>(stereoMono.invertRight);
    const [isLive, setIsLive] = useState<boolean>(false);

    const sceneContainerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<StereoImageScene | null>(null);

    useEffect(function () {
        stereoMono.setMode(mode);
        stereoMono.setDelayLeft(delayLeftMs);
        stereoMono.setDelayRight(delayRightMs);
        stereoMono.setInvert(invertLeft, invertRight);

        sceneRef.current?.setParameters({ mode, delayLeftMs, delayRightMs, invertLeft, invertRight });
    }, [mode, delayLeftMs, delayRightMs, invertLeft, invertRight, stereoMono]);

    // The scene is created once; parameter changes are passed on above.
    useEffect(function () {

        const container = sceneContainerRef.current;

        if (!container) return;

        const scene = new StereoImageScene(container, {
            mode: stereoMono.mode,
            delayLeftMs: stereoMono.delayLeftMs,
            delayRightMs: stereoMono.delayRightMs,
            invertLeft: stereoMono.invertLeft,
            invertRight: stereoMono.invertRight
        }, {
            onDelayChange(side: StereoSide, ms: number) {
                if (side === "left") setDelayLeftMs(ms);
                else setDelayRightMs(ms);
            },
            onInvertToggle(side: StereoSide) {
                if (side === "left") setInvertLeft(value => !value);
                else setInvertRight(value => !value);
            }
        });

        sceneRef.current = scene;

        const outputTap: EffectOutputTap | null = EffectOutputTap.create(stereoMono, { channels: 2, fftSize: 2048, smoothingTimeConstant: 0 }),
            inputTap: EffectOutputTap | null = EffectOutputTap.create(stereoMono, { channels: 2, fftSize: 1024, smoothingTimeConstant: 0, tap: "input" });

        if (outputTap && inputTap) {

            const left = new Float32Array(outputTap.analysers[0].fftSize),
                right = new Float32Array(outputTap.analysers[1].fftSize);

            scene.setSignalReader(function () {

                outputTap.analysers[0].getFloatTimeDomainData(left);
                outputTap.analysers[1].getFloatTimeDomainData(right);

                const [inputLeft, inputRight = inputLeft] = inputTap.readLevels();

                return { output: [left, right], inputLevels: [inputLeft, inputRight] };
            });
        }

        const signalInterval: number = window.setInterval(() => setIsLive(scene.hasSignal), 250);

        function applyThemeColors() {

            const style: CSSStyleDeclaration = getComputedStyle(container!);

            scene.setColors({
                accent: style.getPropertyValue("--color-accent").trim() || "#FFA646",
                muted: style.getPropertyValue("--color-panel-text-muted").trim() || "#A3A4A6",
                text: style.getPropertyValue("--color-panel-text-active").trim() || "#E6E7E8",
                panel: style.getPropertyValue("--color-panel").trim() || "#3A3B3D"
            });
        }

        applyThemeColors();

        // Follows theme and accent changes without a dependency on the theme provider.
        const themeInterval: number = window.setInterval(applyThemeColors, 1000);

        return function () {
            window.clearInterval(themeInterval);
            window.clearInterval(signalInterval);
            outputTap?.dispose();
            inputTap?.dispose();
            scene.dispose();
            sceneRef.current = null;
        };
    }, [stereoMono]);

    const [title, description] = MODE_DESCRIPTIONS[mode],
        treatment: string | null = describeTreatment(delayLeftMs, delayRightMs, invertLeft, invertRight);

    return (
        <div className="stereo-mono-window-content">
            <div className="stereo-mono-window-content__scene" ref={sceneContainerRef}>
                <div className="stereo-mono-window-content__scene__hud">
                    <span className="stereo-mono-window-content__scene__hud__title">{title}</span>
                    <span>{description}</span>
                    {treatment && <span className="stereo-mono-window-content__scene__hud__treatment">{treatment}</span>}
                    <span className={`stereo-mono-window-content__scene__hud__signal ${isLive ? "live" : ""}`}>
                        {isLive ? "Live signal" : "No signal · preview"}
                    </span>
                </div>
                <p className="stereo-mono-window-content__scene__hint">Drag an output to delay it · Click it to flip polarity</p>
            </div>

            <div className="flex flex-row flex-wrap gap-2">
                <OptionToggle<StereoMonoMode> options={ROUTING_MODES} value={mode} onChange={setMode} />
                <OptionToggle<StereoMonoMode> options={SIDE_MODES} value={mode} onChange={setMode} />
            </div>

            <div className="grid grid-cols-4 gap-4 items-end">
                <EffectKnob label="Left delay" value={delayLeftMs} min={0} max={STEREO_MONO_MAX_DELAY_MS} step={1} defaultValue={0} format={formatMilliseconds} onChange={setDelayLeftMs} />
                <EffectKnob label="Right delay" value={delayRightMs} min={0} max={STEREO_MONO_MAX_DELAY_MS} step={1} defaultValue={0} format={formatMilliseconds} onChange={setDelayRightMs} />
                <div className="col-span-2 flex flex-col gap-[10px] items-center text-center">
                    <p>Polarity</p>
                    <div className="effect-option-toggle">
                        <button className={invertLeft ? "active" : ""} onClick={() => setInvertLeft(value => !value)}>Ø Left</button>
                        <button className={invertRight ? "active" : ""} onClick={() => setInvertRight(value => !value)}>Ø Right</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
