import { Bolt, Sparkles, CircleMinus } from "lucide-react";
import { useState, useRef, useCallback } from "react";

import HeaderContent from "../HeaderContent";
import HeaderTitlebar from "../HeaderTitlebar";
import HeaderDivider from "../HeaderDivider";
import HeaderCategory from "../HeaderCategory";

import FloatingSelectionBox from "../../common/FloatingSelectionBox";
import Button from "../../common/Button";

import { listAvailableEffects, attachEffectOnMaster, detachEffectOnMaster } from "../../../services/effectorService";

import { Master, Effector } from "@fluex/fluexgl-dsp";
import { showEffectWindow } from "../../../services/effectWindowService";
import useWindow from "../../../hooks/useWindow";
import useTranslation from "../../../hooks/useTranslations";

export interface MasterSettingsProperties {
    master: Master;
}

export default function MasterSettingsHeader({ master }: MasterSettingsProperties) {
    const translate = useTranslation();

    const [isShowingEffectSelection, setIsShowingEffectSelection] = useState<boolean>(false);
    const [isShowingEffectDetachList, setIsShowingEffectDetachList] = useState<boolean>(false);

    const [effectSelectionAnchor, setEffectSelectionAnchor] = useState<HTMLElement | undefined>(undefined);
    const [effectDetachAnchor, setEffectDetachAnchor] = useState<HTMLElement | undefined>(undefined);

    const selectEffectButtonRef = useRef<HTMLDivElement>(null);
    const removeEffectButtonRef = useRef<HTMLDivElement>(null);

    const useWindowHookValues = useWindow();

    const onEffectSelectCallback = useCallback(function (effectName: string) {
        setIsShowingEffectSelection(false);
        attachEffectOnMaster(effectName, master);
    }, [master]);

    const onDetachEffectCallback = useCallback(function (effect: Effector) {
        setIsShowingEffectDetachList(false);
        detachEffectOnMaster(effect, master);
    }, [master]);

    const onShowEffectWindowCallback = useCallback(function (effect: Effector) {
        showEffectWindow(effect, useWindowHookValues);
    }, [useWindowHookValues]);

    return (
        <>
            <HeaderContent>
                <HeaderTitlebar icon={<Bolt size={20} />} title={translate("channel_settings.master_channel_label")} />
                <HeaderDivider />

                <HeaderCategory label={translate("audio_clip_settings.details_category_title")}>
                    <p>
                        {translate("channel_settings.id", [""])} <code>{master.id}</code>
                    </p>
                </HeaderCategory>

                <HeaderCategory label={translate("channel_settings.attached_effects_category_title")}>
                    {master.effects.length !== 0 ? (
                        master.effects.map(function (effect: Effector, index: number) {
                            const effectLabel = effect.label ?? translate("channel_settings.effect_fallback");

                            return (
                                <Button
                                    icon={<Sparkles size={16} />}
                                    title={effectLabel}
                                    text={effectLabel}
                                    key={index}
                                    onClick={function () {
                                        onShowEffectWindowCallback(effect);
                                    }}
                                />
                            );
                        })
                    ) : (
                        <p>{translate("channel_settings.no_effects_applied")}</p>
                    )}
                </HeaderCategory>

                <HeaderDivider />

                <HeaderCategory label={translate("channel_settings.effect_controls_category_title")}>
                    <Button
                        icon={<Sparkles size={16} />}
                        title={translate("channel_settings.add_effect")}
                        text={translate("channel_settings.add_effect")}
                        onClick={function () {
                            setEffectSelectionAnchor(selectEffectButtonRef.current ?? undefined);
                            setIsShowingEffectSelection(true);
                        }}
                        ref={selectEffectButtonRef}
                    />
                    <Button
                        icon={<CircleMinus size={16} />}
                        title={translate("channel_settings.remove_effect")}
                        text={translate("channel_settings.remove_effect")}
                        style="red"
                        onClick={function () {
                            setEffectDetachAnchor(removeEffectButtonRef.current ?? undefined);
                            setIsShowingEffectDetachList(true);
                        }}
                        ref={removeEffectButtonRef}
                    />
                </HeaderCategory>
            </HeaderContent>

            {isShowingEffectSelection && (
                <FloatingSelectionBox<string>
                    title={translate("channel_settings.select_effect_title")}
                    items={listAvailableEffects().map(function (effectName: string) {
                        return {
                            item: effectName,
                            label: effectName,
                            icon: <Sparkles size={16} />,
                            data: effectName,
                        };
                    })}
                    onSelect={onEffectSelectCallback}
                    onCancel={function () {
                        setIsShowingEffectSelection(false);
                    }}
                    anchor={effectSelectionAnchor}
                />
            )}

            {isShowingEffectDetachList && (
                <FloatingSelectionBox<Effector>
                    title={translate("channel_settings.select_effect_title")}
                    items={master.effects.map(function (effect: Effector) {
                        return {
                            item: effect,
                            label: effect.label ?? translate("channel_settings.effect_fallback"),
                            icon: <Sparkles size={16} />,
                            data: effect,
                        };
                    })}
                    onSelect={onDetachEffectCallback}
                    onCancel={function () {
                        setIsShowingEffectDetachList(false);
                    }}
                    anchor={effectDetachAnchor}
                />
            )}
        </>
    );
}
