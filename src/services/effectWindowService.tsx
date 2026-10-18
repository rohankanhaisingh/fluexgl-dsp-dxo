import type {
    AdvancedDelay,
    Analyser,
    Chorus,
    Compressor,
    Effector,
    Equalizer,
    HighPassFilter,
    Limiter,
    LowPassFilter,
    MonoDelay,
    MultibandCompressor,
    NotchFilter,
    PingPongDelay,
    Reverb,
    Saturation,
    SoftClip,
    StereoDelay,
    StereoMono,
    StereoPanner
} from "@fluex/fluexgl-dsp";

import { lazy, Suspense } from "react";

import type { WindowContextValue } from "../providers/WindowContext";

import LoaderIndicator from "../components/common/LoaderIndicator";

import AnalyserWindow from "../components/window/prebuilt/AnalyserWindow";
import ChorusWindow from "../components/window/prebuilt/ChorusWindow";
import LowPassFilterWindow from "../components/window/prebuilt/LowPassFilterWindow";
import HighPassFilterWindow from "../components/window/prebuilt/HighPassFilterWindow";
import NotchFilterWindow from "../components/window/prebuilt/NotchFilterWindow";
import SoftClipWindow from "../components/window/prebuilt/SoftClipWindow";
import CompressorWindow from "../components/window/prebuilt/CompressorWindow";
import MultibandCompressorWindow from "../components/window/prebuilt/MultibandCompressorWindow";
import LimiterWindow from "../components/window/prebuilt/LimiterWindow";
import EqualizerWindow from "../components/window/prebuilt/EqualizerWindow";
import SaturationWindow from "../components/window/prebuilt/SaturationWindow";
import StereoPannerWindow from "../components/window/prebuilt/StereoPannerWindow";
import StereoMonoWindow from "../components/window/prebuilt/StereoMonoWindow";
import DelayWindow from "../components/window/prebuilt/DelayWindow";
import StereoDelayWindow from "../components/window/prebuilt/StereoDelayWindow";
import AdvancedDelayWindow from "../components/window/prebuilt/AdvancedDelayWindow";

// Loaded on demand, because the 3D room pulls in three.js.
const ReverbWindow = lazy(() => import("../components/window/prebuilt/ReverbWindow"));

export function showEffectWindow(effect: Effector, deps: WindowContextValue) {

    deps.setTitle(effect.label ?? "Channel effect");
    deps.showWindow();

    switch (effect.name) {
        case "Analyser":
            // The waveform/spectrum toolbar needs more room than the default window size.
            deps.setSize(560, 440);
            deps.setContent(<AnalyserWindow key={effect.id} analyser={effect as Analyser} />)
            break;
        case "Chorus":
            deps.setContent(<ChorusWindow key={effect.id} chorus={effect as Chorus} />)
            break;
        case "LowPassFilter":
            deps.setSize(560, 420);
            deps.setContent(<LowPassFilterWindow key={effect.id} lowPassFilter={effect as LowPassFilter} />)
            break;
        case "HighPassFilter":
            deps.setSize(560, 420);
            deps.setContent(<HighPassFilterWindow key={effect.id} highPassFilter={effect as HighPassFilter} />)
            break;
        case "NotchFilter":
            deps.setSize(560, 420);
            deps.setContent(<NotchFilterWindow key={effect.id} notchFilter={effect as NotchFilter} />)
            break;
        case "SoftClip":
            deps.setContent(<SoftClipWindow key={effect.id} softClip={effect as SoftClip} />)
            break;
        case "Reverb":
            deps.setSize(640, 520);
            deps.setContent(
                <Suspense fallback={<LoaderIndicator size="small" theme="fluexgl-dsp" />}>
                    <ReverbWindow key={effect.id} reverb={effect as Reverb} />
                </Suspense>
            );
            break;
        case "Compressor":
            deps.setSize(420, 330);
            deps.setContent(<CompressorWindow key={effect.id} compressor={effect as Compressor} />);
            break;
        case "MultibandCompressor":
            deps.setSize(460, 560);
            deps.setContent(<MultibandCompressorWindow key={effect.id} multibandCompressor={effect as MultibandCompressor} />);
            break;
        case "Limiter":
            deps.setSize(420, 250);
            deps.setContent(<LimiterWindow key={effect.id} limiter={effect as Limiter} />);
            break;
        case "Equalizer":
            deps.setSize(760, 560);
            deps.setContent(<EqualizerWindow key={effect.id} equalizer={effect as Equalizer} />);
            break;
        case "Saturation":
            deps.setSize(460, 250);
            deps.setContent(<SaturationWindow key={effect.id} saturation={effect as Saturation} />);
            break;
        case "StereoPanner":
            deps.setContent(<StereoPannerWindow key={effect.id} stereoPanner={effect as StereoPanner} />);
            break;
        case "StereoMono":
            deps.setSize(700, 620);
            deps.setContent(<StereoMonoWindow key={effect.id} stereoMono={effect as StereoMono} />);
            break;
        case "MonoDelay":
        case "PingPongDelay":
            deps.setContent(<DelayWindow key={effect.id} delay={effect as MonoDelay | PingPongDelay} />);
            break;
        case "StereoDelay":
            deps.setSize(460, 230);
            deps.setContent(<StereoDelayWindow key={effect.id} stereoDelay={effect as StereoDelay} />);
            break;
        case "AdvancedDelay":
            deps.setSize(560, 380);
            deps.setContent(<AdvancedDelayWindow key={effect.id} advancedDelay={effect as AdvancedDelay} />);
            break;
    }
}
