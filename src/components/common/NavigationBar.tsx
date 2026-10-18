import "./NavigationBar.scss";

import { Grip, SlidersVertical, Folder, CircleQuestionMark, Play, Square, Pause, Activity, AudioWaveform, BarChart3 } from "lucide-react";
import { useState } from "react";

import Menu from "./Menu";
import fluexLogo from "../../../public/images/fluex-logo.png";
import useTranslation from "../../hooks/useTranslations";
import { getMixerMeterViewMode, setMixerMeterViewMode } from "../../services/mixerPeakMeterService";
import type { MixerMeterViewMode } from "../../services/mixerPeakMeterService";

export interface NavigationBarProperties {
    title?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- title is part of the public API but not rendered yet
export default function NavigationBar(_props: NavigationBarProperties) {

    const t = useTranslation();

    const [isShowingMenu, setIsShowingMenu] = useState<boolean>(false);
    const [meterViewMode, setMeterViewMode] = useState<MixerMeterViewMode>(getMixerMeterViewMode());

    const meterViewModeOnClick = function (mode: MixerMeterViewMode) {
        setMixerMeterViewMode(mode);
        setMeterViewMode(mode);
    };

    return (
        <>
            <div className="app-navbar">
                <div className="app-navbar__container">
                    <a href="https://www.fluex.org?from=https://www.fluexgl.dev" className="link-wrapper">
                        <div className="app-navbar__logo">
                            <img src={fluexLogo} alt="Fluex" />
                            <span>fluexgl.dev</span>
                        </div>
                    </a>
                    <div className="app-navbar__controls">
                        <div className="app-navbar__controls__button">
                            <SlidersVertical size={20} />
                        </div>
                        <div className="app-navbar__controls__button">
                            <Folder size={20} />
                        </div>
                        <div className="app-navbar__controls__button">
                            <CircleQuestionMark size={20} />
                        </div>
                        <div className="app-navbar__controls__vl"></div>
                        <div
                            className={`app-navbar__controls__button${meterViewMode === "peak" ? " app-navbar__controls__button--active" : ""}`}
                            title={t("mixer.meter_view_peak")}
                            onClick={() => meterViewModeOnClick("peak")}
                        >
                            <Activity size={20} />
                        </div>
                        <div
                            className={`app-navbar__controls__button${meterViewMode === "waveform" ? " app-navbar__controls__button--active" : ""}`}
                            title={t("mixer.meter_view_waveform")}
                            onClick={() => meterViewModeOnClick("waveform")}
                        >
                            <AudioWaveform size={20} />
                        </div>
                        <div
                            className={`app-navbar__controls__button${meterViewMode === "spectrum" ? " app-navbar__controls__button--active" : ""}`}
                            title={t("mixer.meter_view_spectrum")}
                            onClick={() => meterViewModeOnClick("spectrum")}
                        >
                            <BarChart3 size={20} />
                        </div>
                        <div className="app-navbar__controls__vl"></div>
                        <div className="app-navbar__controls__button">
                            <Play size={20} />
                        </div>
                        <div className="app-navbar__controls__button">
                            <Square size={20} />
                        </div>
                        <div className="app-navbar__controls__button">
                            <Pause size={20} />
                        </div>
                    </div>
                    <div className="app-navbar__menu-button" onClick={() => setIsShowingMenu(true)} >
                        <Grip size={20} />
                    </div>
                </div>
            </div>

            {isShowingMenu && <Menu onClose={() => setIsShowingMenu(false)} />}
        </>
    )
}