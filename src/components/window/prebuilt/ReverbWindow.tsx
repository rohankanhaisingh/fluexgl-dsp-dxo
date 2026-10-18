import "./ReverbWindow.scss";

import type { Reverb } from "@fluex/fluexgl-dsp";
import { useState, useEffect, useRef } from "react";

import { EffectKnob } from "./EffectControls";
import { formatPercentage } from "../../../utilities/scripts/effect-value-formatters";
import { ReverbRoomScene, estimateReverbDecay } from "../../../utilities/scripts/reverb-room-scene";
import { EffectOutputTap, measureHighFrequencyRatio } from "../../../utilities/scripts/effect-output-tap";

/** Frequency above which the signal counts as "bright" for the particle color. */
const BRIGHTNESS_FROM_FREQUENCY: number = 3000;

export interface ReverbWindowProperties {
    reverb: Reverb;
}

// The WASM reverb clamps both to 0..1; anything above 1 behaves exactly like 1.
function clampUnit(value: number): number {
    return Math.min(1, Math.max(0, value));
}

function describeRoom(roomSize: number): string {

    if (roomSize < 0.25) return "Booth";
    if (roomSize < 0.5) return "Room";
    if (roomSize < 0.75) return "Hall";
    if (roomSize < 0.92) return "Cathedral";

    return "Infinite";
}

export default function ReverbWindow({ reverb }: ReverbWindowProperties) {

    const [roomSize, setRoomSize] = useState<number>(clampUnit(reverb.roomSize));
    const [damping, setDamping] = useState<number>(clampUnit(reverb.damping));
    const [stereoSpreadMs, setStereoSpreadMs] = useState<number>(reverb.stereoSpreadMs);
    const [mix, setMix] = useState<number>(reverb.mix);
    const [isLive, setIsLive] = useState<boolean>(false);

    const sceneContainerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<ReverbRoomScene | null>(null);

    useEffect(function () {
        reverb.setRoomSize(roomSize);
        reverb.setDamping(damping);
        reverb.setStereoSpreadMs(stereoSpreadMs);
        reverb.setMix(mix);

        sceneRef.current?.setParameters({ roomSize, damping, stereoSpreadMs, mix });
    }, [roomSize, damping, stereoSpreadMs, mix, reverb]);

    // The scene is created once; parameter changes are passed on above.
    useEffect(function () {

        const container = sceneContainerRef.current;

        if (!container) return;

        const scene = new ReverbRoomScene(container, {
            roomSize: clampUnit(reverb.roomSize),
            damping: clampUnit(reverb.damping),
            stereoSpreadMs: reverb.stereoSpreadMs,
            mix: reverb.mix
        });

        sceneRef.current = scene;

        // Only the output of the reverb can be tapped, so the particles follow the processed signal.
        // Its transients still come from the dry part, and the tail is quieter than the source.
        const tap: EffectOutputTap | null = EffectOutputTap.create(reverb, { channels: 2, fftSize: 2048, smoothingTimeConstant: 0.5 });

        if (tap) {

            const frequencyData = new Float32Array(tap.analysers[0].frequencyBinCount);

            scene.setSignalReader(function () {

                const ratio: number = measureHighFrequencyRatio(tap.analysers[0], frequencyData, BRIGHTNESS_FROM_FREQUENCY);

                // Music usually has 1 to 20% of its energy above 3 kHz; the square root spreads that out.
                return { levels: tap.readLevels(), brightness: Math.min(1, Math.sqrt(ratio) * 2) };
            });
        }

        const signalInterval: number = window.setInterval(() => setIsLive(scene.hasSignal), 250);

        function applyThemeColors() {

            const style: CSSStyleDeclaration = getComputedStyle(container!);

            scene.setColors({
                accent: style.getPropertyValue("--color-accent").trim() || "#FFA646",
                muted: style.getPropertyValue("--color-panel-text-muted").trim() || "#A3A4A6"
            });
        }

        applyThemeColors();

        // Follows theme and accent changes without a dependency on the theme provider.
        const interval: number = window.setInterval(applyThemeColors, 1000);

        // Scrolling in the scene resizes the room. Added natively, because React's wheel listener is passive.
        function onWheel(e: WheelEvent) {
            e.preventDefault();
            setRoomSize(value => Math.round(clampUnit(value + (e.deltaY < 0 ? 0.02 : -0.02)) * 100) / 100);
        }

        container.addEventListener("wheel", onWheel, { passive: false });

        return function () {
            window.clearInterval(interval);
            container.removeEventListener("wheel", onWheel);
            window.clearInterval(signalInterval);
            tap?.dispose();
            scene.dispose();
            sceneRef.current = null;
        };
    }, [reverb]);

    const decay: number = estimateReverbDecay(roomSize, damping);

    return (
        <div className="reverb-window-content">
            <div className="reverb-window-content__scene" ref={sceneContainerRef}>
                <div className="reverb-window-content__scene__hud">
                    <span className="reverb-window-content__scene__hud__title">{describeRoom(roomSize)}</span>
                    <span>Decay ≈ {decay.toFixed(2)} s</span>
                    <span className={`reverb-window-content__scene__hud__signal ${isLive ? "live" : ""}`}>
                        {isLive ? "Live signal" : "No signal · preview"}
                    </span>
                </div>
                <p className="reverb-window-content__scene__hint">Drag to orbit · Scroll to resize the room</p>
            </div>

            <div className="grid grid-cols-4 gap-4">
                <EffectKnob label="Room size" value={roomSize} min={0} max={1} step={0.01} defaultValue={0.3} format={formatPercentage} onChange={setRoomSize} />
                <EffectKnob label="Damping" value={damping} min={0} max={1} step={0.01} defaultValue={0.5} format={formatPercentage} onChange={setDamping} />
                <EffectKnob label="Stereo spread" value={stereoSpreadMs} min={0} max={100} step={1} defaultValue={0} format={v => `${v.toFixed(0)} ms`} onChange={setStereoSpreadMs} />
                <EffectKnob label="Mix" value={mix} min={0} max={1} step={0.01} defaultValue={0.3} format={formatPercentage} onChange={setMix} />
            </div>
        </div>
    );
}
