import { Bolt, AudioLines, Sparkles, CircleMinus, Share2, Unlink, Link } from "lucide-react";
import { useState, useRef, useCallback } from "react";

import HeaderContent from "../HeaderContent";
import HeaderTitlebar from "../HeaderTitlebar";
import HeaderDivider from "../HeaderDivider";
import HeaderCategory from "../HeaderCategory";

import FloatingSelectionBox from "../../common/FloatingSelectionBox";
import Button from "../../common/Button";

import { listAvailableEffects, attachEffectOnChannel, detachEffectOnChannel } from "../../../services/effectorService";
import {
    attachChannelToMaster,
    detachChannelFromMaster,
    getChannels,
    isChannelAttachedToMaster,
    sendChannelToChannel,
    unsendChannelFromChannel
} from "../../../services/mixerChannelService";

import { Channel, InputChannel, AudioClip, Effector } from "@fluex/fluexgl-dsp";
import { showEffectWindow } from "../../../services/effectWindowService";
import useWindow from "../../../hooks/useWindow";
import useTranslation from "../../../hooks/useTranslations";

export interface ChannelSettingsProperties {
    channel: Channel;
    onAudioClipSelect?(clip: AudioClip): void;
}

export default function ChannelSettingsHeader({ channel, onAudioClipSelect }: ChannelSettingsProperties) {
    const translate = useTranslation();

    const [isShowingEffectSelection, setIsShowingEffectSelection] = useState<boolean>(false);
    const [isShowingEffectDetachList, setIsShowingEffectDetachList] = useState<boolean>(false);

    const [effectSelectionAnchor, setEffectSelectionAnchor] = useState<HTMLElement | undefined>(undefined);
    const [effectDetachAnchor, setEffectDetachAnchor] = useState<HTMLElement | undefined>(undefined);

    const selectEffectButtonRef = useRef<HTMLDivElement>(null);
    const removeEffectButtonRef = useRef<HTMLDivElement>(null);

    const [isShowingSendSelection, setIsShowingSendSelection] = useState<boolean>(false);
    const [isShowingSendRemoval, setIsShowingSendRemoval] = useState<boolean>(false);

    const [sendSelectionAnchor, setSendSelectionAnchor] = useState<HTMLElement | undefined>(undefined);
    const [sendRemovalAnchor, setSendRemovalAnchor] = useState<HTMLElement | undefined>(undefined);

    const [, forceSendsUpdate] = useState<number>(0);

    const selectSendButtonRef = useRef<HTMLDivElement>(null);
    const removeSendButtonRef = useRef<HTMLDivElement>(null);

    const useWindowHookValues = useWindow();

    const onEffectSelectCallback = useCallback(function (effectName: string) {
        setIsShowingEffectSelection(false);
        attachEffectOnChannel(effectName, channel);
    }, [channel]);

    const onDetachEffectCallback = useCallback(function (effect: Effector) {
        setIsShowingEffectDetachList(false);
        detachEffectOnChannel(effect, channel);
    }, [channel]);

    const onShowEffectWindowCallback = useCallback(function (effect: Effector) {
        showEffectWindow(effect, useWindowHookValues);
    }, [useWindowHookValues]);

    const onSendSelectCallback = useCallback(function (targetChannel: Channel) {
        setIsShowingSendSelection(false);
        sendChannelToChannel(channel, targetChannel);
        forceSendsUpdate(value => value + 1);
    }, [channel]);

    const onSendRemoveCallback = useCallback(function (targetChannel: Channel) {
        setIsShowingSendRemoval(false);
        unsendChannelFromChannel(channel, targetChannel);
        forceSendsUpdate(value => value + 1);
    }, [channel]);

    if (!channel.audioClipPlayer) {
        return (
            <>
                <HeaderContent>
                    <p>{translate("channel_settings.no_audio_clip_player")}</p>
                </HeaderContent>
            </>
        );
    }

    const channelTitle = channel.label ?? translate("audio_clip_settings.channel_fallback");
    const isAttachedToMaster: boolean = isChannelAttachedToMaster(channel);

    return (
        <>
            <HeaderContent>
                <HeaderTitlebar icon={<Bolt size={20} />} title={channelTitle} />
                <HeaderDivider />

                <HeaderCategory label={translate("audio_clip_settings.details_category_title")}>
                    <p>{translate("channel_settings.label", [channel.label ?? ""])}</p>
                    <p>
                        {translate("channel_settings.id", [""])} <code>{channel.id}</code>
                    </p>
                    {channel instanceof InputChannel && (
                        <p>{translate("channel_settings.input_device", [channel.deviceInfo?.label || translate("mixer.default_input_device")])}</p>
                    )}
                </HeaderCategory>

                <HeaderCategory label={translate("channel_settings.master_category_title")}>
                    <p>{translate(isAttachedToMaster ? "channel_settings.attached_to_master" : "channel_settings.detached_from_master")}</p>
                    {isAttachedToMaster ? (
                        <Button
                            icon={<Unlink size={16} />}
                            title={translate("channel_settings.detach_from_master")}
                            text={translate("channel_settings.detach_from_master")}
                            style="red"
                            onClick={() => detachChannelFromMaster(channel)}
                        />
                    ) : (
                        <Button
                            icon={<Link size={16} />}
                            title={translate("channel_settings.attach_to_master")}
                            text={translate("channel_settings.attach_to_master")}
                            onClick={() => attachChannelToMaster(channel)}
                        />
                    )}
                </HeaderCategory>

                <HeaderCategory label={translate("channel_settings.audio_clips_category_title")}>
                    {channel.audioClipPlayer.audioClips.length !== 0 ? (
                        channel.audioClipPlayer.audioClips.map(function (clip: AudioClip, index: number) {
                            const clipLabel = clip.label ?? translate("channel_settings.audio_clip_fallback");

                            return (
                                <Button
                                    icon={<AudioLines size={16} />}
                                    title={clipLabel}
                                    text={clipLabel}
                                    key={index}
                                    onClick={function () {
                                        if (onAudioClipSelect) onAudioClipSelect(clip);
                                    }}
                                />
                            );
                        })
                    ) : (
                        <p>{translate("channel_settings.no_audio_clips_attached")}</p>
                    )}
                </HeaderCategory>

                <HeaderCategory label={translate("channel_settings.attached_effects_category_title")}>
                    {channel.effects.length !== 0 ? (
                        channel.effects.map(function (effect: Effector, index: number) {
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

                <HeaderCategory label={translate("channel_settings.channel_sends_category_title")}>
                    {channel.sends.length !== 0 ? (
                        channel.sends.map(function (sendTarget: Channel, index: number) {
                            const sendLabel = sendTarget.label ?? translate("channel_settings.channel_fallback");

                            return (
                                <Button
                                    icon={<Share2 size={16} />}
                                    title={sendLabel}
                                    text={sendLabel}
                                    key={index}
                                />
                            );
                        })
                    ) : (
                        <p>{translate("channel_settings.no_sends")}</p>
                    )}
                </HeaderCategory>

                <HeaderDivider />

                <HeaderCategory label={translate("channel_settings.send_controls_category_title")}>
                    <Button
                        icon={<Share2 size={16} />}
                        title={translate("channel_settings.add_send")}
                        text={translate("channel_settings.add_send")}
                        onClick={function () {
                            setSendSelectionAnchor(selectSendButtonRef.current ?? undefined);
                            setIsShowingSendSelection(true);
                        }}
                        ref={selectSendButtonRef}
                    />
                    {channel.sends.length !== 0 && (
                        <Button
                            icon={<Unlink size={16} />}
                            title={translate("channel_settings.remove_send")}
                            text={translate("channel_settings.remove_send")}
                            style="red"
                            disabled={channel.sends.length === 0}
                            onClick={function () {
                                setSendRemovalAnchor(removeSendButtonRef.current ?? undefined);
                                setIsShowingSendRemoval(true);
                            }}
                            ref={removeSendButtonRef}
                        />
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
                    items={channel.effects.map(function (effect: Effector) {
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

            {isShowingSendSelection && (
                <FloatingSelectionBox<Channel>
                    title={translate("channel_settings.select_send_target_title")}
                    items={getChannels()
                        .filter(function (candidate: Channel) {
                            return candidate.id !== channel.id && !channel.sends.includes(candidate);
                        })
                        .map(function (candidate: Channel) {
                            return {
                                item: candidate,
                                label: candidate.label ?? translate("channel_settings.channel_fallback"),
                                icon: <Share2 size={16} />,
                                data: candidate,
                            };
                        })}
                    onSelect={onSendSelectCallback}
                    onCancel={function () {
                        setIsShowingSendSelection(false);
                    }}
                    anchor={sendSelectionAnchor}
                />
            )}

            {isShowingSendRemoval && (
                <FloatingSelectionBox<Channel>
                    title={translate("channel_settings.select_send_removal_title")}
                    items={channel.sends.map(function (sendTarget: Channel) {
                        return {
                            item: sendTarget,
                            label: sendTarget.label ?? translate("channel_settings.channel_fallback"),
                            icon: <Unlink size={16} />,
                            data: sendTarget,
                        };
                    })}
                    onSelect={onSendRemoveCallback}
                    onCancel={function () {
                        setIsShowingSendRemoval(false);
                    }}
                    anchor={sendRemovalAnchor}
                />
            )}
        </>
    );
}
