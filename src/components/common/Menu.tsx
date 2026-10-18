import "./Menu.scss";
import { X, ChevronRight, Check } from "lucide-react";
import fluexLogo from "../../../public/images/fluex-logo.png";

import useTranslation, { useLocale } from "../../hooks/useTranslations";
import useTheme from "../../hooks/useTheme";
import type { ThemeName, AccentName } from "../../providers/ThemeContext";

export interface MenuProperties {
    onClose?: () => void;
}

const supportedLocales: Array<{ code: string; label: string }> = [
    { code: "en", label: "English" },
    { code: "nl", label: "Nederlands" }
];

const supportedThemes: Array<{ code: ThemeName; labelKey: string }> = [
    { code: "dark", labelKey: "menu.theme_dark" },
    { code: "light", labelKey: "menu.theme_light" }
];

// Swatch colors are the dark-mode shade of each accent, purely to identify
// the hue in this list; the actual applied shade adapts to the active theme.
const supportedAccents: Array<{ code: AccentName; labelKey: string; swatch: string }> = [
    { code: "orange", labelKey: "menu.accent_orange", swatch: "#FFA646" },
    { code: "blue", labelKey: "menu.accent_blue", swatch: "#4C9AFF" },
    { code: "purple", labelKey: "menu.accent_purple", swatch: "#B287F0" },
    { code: "green", labelKey: "menu.accent_green", swatch: "#5FD897" },
    { code: "pink", labelKey: "menu.accent_pink", swatch: "#F2678F" }
];

export default function Menu({ onClose }: MenuProperties) {

    const translate = useTranslation();
    const { locale, setLocale } = useLocale();
    const { theme, setTheme, accent, setAccent } = useTheme();

    return (
        <>
            <div className="app-menu-backdrop" onClick={onClose}>
                <div className="app-menu-backdrop__container"></div>
            </div>
            <div className="app-menu">
                <div className="app-menu__container">
                    <div className="app-menu__titlebar">
                        <a href="https://www.fluex.org" style={{
                            textDecoration: "none",
                            color: "inherit",
                            flexGrow: 1
                        }}>
                            <div className="app-menu__titlebar__logo">
                                <img src={fluexLogo} alt="Fluex" />
                                <span>fluex.org</span>
                            </div>
                        </a>
                        <div className="app-menu__titlebar__button" onClick={onClose}>
                            <X size={20} />
                        </div>
                    </div>
                    <div className="app-menu__divider"></div>
                    <div className="app-menu__category">
                        <a className="app-menu__category__item" href="https://www.fluexgl.dev/dsp/mixer">
                            <span>Visit live (maintained) demo</span>
                            <ChevronRight size={16} />
                        </a>
                    </div>
                    <div className="app-menu__divider"></div>
                    <div className="app-menu__category">
                        <span className="app-menu__category__title">{translate("menu.language_category_title")}</span>
                        {supportedLocales.map(function (supportedLocale) {
                            return (
                                <div
                                    key={supportedLocale.code}
                                    className="app-menu__category__item"
                                    onClick={() => setLocale(supportedLocale.code)}
                                >
                                    <span>{supportedLocale.label}</span>
                                    {locale === supportedLocale.code && <Check size={16} />}
                                </div>
                            );
                        })}
                    </div>
                    <div className="app-menu__divider"></div>
                    <div className="app-menu__category">
                        <span className="app-menu__category__title">{translate("menu.theme_category_title")}</span>
                        {supportedThemes.map(function (supportedTheme) {
                            return (
                                <div
                                    key={supportedTheme.code}
                                    className="app-menu__category__item"
                                    onClick={() => setTheme(supportedTheme.code)}
                                >
                                    <span>{translate(supportedTheme.labelKey)}</span>
                                    {theme === supportedTheme.code && <Check size={16} />}
                                </div>
                            );
                        })}
                    </div>
                    <div className="app-menu__divider"></div>
                    <div className="app-menu__category">
                        <span className="app-menu__category__title">{translate("menu.accent_category_title")}</span>
                        {supportedAccents.map(function (supportedAccent) {
                            return (
                                <div
                                    key={supportedAccent.code}
                                    className="app-menu__category__item"
                                    onClick={() => setAccent(supportedAccent.code)}
                                >
                                    <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <span
                                            className="app-menu__category__item__swatch"
                                            style={{ background: supportedAccent.swatch }}
                                        ></span>
                                        {translate(supportedAccent.labelKey)}
                                    </span>
                                    {accent === supportedAccent.code && <Check size={16} />}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    )
}