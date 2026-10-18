import { AudioLines, Plus, Link, Bolt, Unlink } from "lucide-react";
import { format } from "bytes";
import { useCallback, useEffect, useState, useRef } from "react";
import { AudioClip, AudioClipPlayer, Channel } from "@fluex/fluexgl-dsp";

import { type AudioLibraryFile } from "../../../services/audioLibraryService";
import { createAudioClipAssociatedToLibrary, getAudioClipById, subscribeToAudioClips } from "../../../services/audioClipService";
import { getChannels } from "../../../services/mixerChannelService";

import HeaderContent from "../HeaderContent";
import HeaderTitlebar from "../HeaderTitlebar";
import HeaderDivider from "../HeaderDivider";
import HeaderCategory from "../HeaderCategory";

import AudioClipPlayerHeader from "./AudioClipPlayerHeader";

import Button from "../../common/Button";

import FloatingSelectionBox from "../../common/FloatingSelectionBox";
import useTranslation from "../../../hooks/useTranslations";

export interface AudioFileDataProperties {
    audioFile: AudioLibraryFile;
}

export default function AudioClipSettingsHeader({ audioFile }: AudioFileDataProperties) {
    const translate = useTranslation();

    const selectChannelButtonRef = useRef<HTMLDivElement>(null);

    const [associatedAudioClip, setAssociatedAudioClip] = useState<AudioClip | null>(getAudioClipById(audioFile.id));
    const [isShowingChannelSelection, setIsShowingChannelSelection] = useState<boolean>(false);
    const [channelSelectionAnchor, setChannelSelectionAnchor] = useState<HTMLElement | undefined>(undefined);
    const [selectedAudioClipPlayer, setSelectedAudioClipPlayer] = useState<AudioClipPlayer | null>(associatedAudioClip?.audioClipPlayer ?? null);
    const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

    useEffect(function () {
        const handleChange = function () {
            setAssociatedAudioClip(getAudioClipById(audioFile.id));
        };

        const unsubscribe = subscribeToAudioClips(handleChange);

        handleChange();
        return unsubscribe;
    }, [audioFile.id]);

    useEffect(function () {
        if (!associatedAudioClip || !selectedAudioClipPlayer || associatedAudioClip.audioClipPlayer === selectedAudioClipPlayer) return;

        if (associatedAudioClip.context) {
            associatedAudioClip.audioClipPlayer?.detachAudioClip(associatedAudioClip);
        }

        selectedAudioClipPlayer?.attachAudioClip(associatedAudioClip);
    }, [selectedAudioClipPlayer, associatedAudioClip, selectedChannel]);

    const createAudioClipCallback = useCallback(function () {
        const clip: AudioClip | null = createAudioClipAssociatedToLibrary(audioFile);

        if (clip) setAssociatedAudioClip(clip);
    }, [audioFile]);

    const onSelectChannelCallback = useCallback(function (channel: Channel) {
        if (!channel.audioClipPlayer) {
            return alert(translate("audio_clip_settings.cannot_attach_no_player"));
        }

        setIsShowingChannelSelection(false);
        setSelectedChannel(channel);
        setSelectedAudioClipPlayer(channel.audioClipPlayer);
    }, [translate]);

    const sampleRateText = translate("audio_clip_settings.sample_rate", [String(audioFile.audioSourceData.audioBuffer.sampleRate)]);
    const channelCountText = translate("audio_clip_settings.amount_of_channels", [String(audioFile.audioSourceData.audioBuffer.numberOfChannels)]);

    const attachedChannelLabel =
        (selectedAudioClipPlayer?.channel as Channel)?.label ??
        translate("audio_clip_settings.channel_fallback");

    return (
        <>
            <HeaderContent>
                <HeaderTitlebar icon={<AudioLines size={20} />} title={audioFile.fileName} />
                <HeaderDivider />

                <HeaderCategory label={translate("audio_clip_settings.details_category_title")}>
                    <p>{translate("audio_clip_settings.file_name", [audioFile.fileName])}</p>
                    <p>{translate("audio_clip_settings.file_size", [format(audioFile.fileSize) ?? ""])}</p>
                    <p>{translate("audio_clip_settings.duration", [audioFile.audioSourceData.audioBuffer.duration.toFixed(2)])}</p>

                    <p>{sampleRateText}</p>
                    <p>{channelCountText}</p>

                    <p>
                        {translate("audio_clip_settings.id", [""])} <code>{audioFile.id}</code>
                    </p>
                </HeaderCategory>

                <HeaderDivider />

                <HeaderCategory label={translate("audio_clip_settings.dsp_audio_clip_category_title")}>
                    {!associatedAudioClip && (
                        <Button
                            icon={<Plus size={16} />}
                            title={translate("audio_clip_settings.create_audio_clip")}
                            text={translate("audio_clip_settings.create_audio_clip")}
                            onClick={createAudioClipCallback}
                        />
                    )}

                    {associatedAudioClip && <AudioClipPlayerHeader audioClip={associatedAudioClip} />}
                </HeaderCategory>

                <HeaderDivider />

                <HeaderCategory label={translate("audio_clip_settings.dsp_channels_category_title")}>
                    {associatedAudioClip && (
                        <>
                            {!selectedAudioClipPlayer && (
                                <p>{translate("audio_clip_settings.not_attached_yet")}</p>
                            )}

                            {selectedAudioClipPlayer && (
                                <>
                                    <p>{translate("audio_clip_settings.attached_to", [attachedChannelLabel])}</p>
                                    <Button icon={<Unlink size={16} />} text={translate("audio_clip_settings.detach_from_channel")} style="red" />
                                </>
                            )}

                            <Button
                                icon={<Link size={16} />}
                                text={translate("audio_clip_settings.attach_to_channel")}
                                onClick={function () {
                                    setChannelSelectionAnchor(selectChannelButtonRef.current ?? undefined);
                                    setIsShowingChannelSelection(true);
                                }}
                                ref={selectChannelButtonRef}
                            />
                        </>
                    )}

                    {!associatedAudioClip && (
                        <p>{translate("audio_clip_settings.cannot_attach_yet_no_dsp_clip")}</p>
                    )}
                </HeaderCategory>
            </HeaderContent>

            {isShowingChannelSelection && (
                <FloatingSelectionBox<Channel>
                    title={translate("audio_clip_settings.channels_selection_title")}
                    onCancel={function () {
                        setIsShowingChannelSelection(false);
                    }}
                    onSelect={onSelectChannelCallback}
                    anchor={channelSelectionAnchor}
                    items={getChannels().map(function (channel: Channel) {
                        return {
                            icon: <Bolt size={16} />,
                            label: channel.label ?? translate("audio_clip_settings.channel_fallback"),
                            data: channel,
                        };
                    })}
                />
            )}
        </>
    );
}
