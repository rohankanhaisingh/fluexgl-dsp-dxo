import "./AudioClipWindow.scss";

import { useState, useRef, type RefObject, useCallback, useEffect } from "react";
import { AudioClip, Channel, type AudioClipOnProgressEvent } from "@fluex/fluexgl-dsp";
import { Play, Square, Repeat1, Repeat, Plug, Unplug, Bolt } from "lucide-react";

import { type AudioLibraryFile } from "../../../services/audioLibraryService";
import { getAudioClipById } from "../../../services/audioClipService";

import ProgressBar, { type ProgressBarOnChangeEvent } from "../../common/ProgressBar";

import useTranslation from "../../../hooks/useTranslations";
import FloatingSelectionBox, { type FloatingSelectionBoxItem } from "../../common/FloatingSelectionBox";
import { getChannels } from "../../../services/mixerChannelService";

interface AudioClipControlsProperties {
    audioClip: AudioClip;
}

function AudioClipControls({ audioClip }: AudioClipControlsProperties) {

    const translate = useTranslation();

    const progressBarContainerRef = useRef<HTMLDivElement>(null);
    const attachToChannelButtonRef = useRef<HTMLDivElement>(null);
    const detachFromChannelButtonRef = useRef<HTMLDivElement>(null);

    const [isLooping, setIsLooping] = useState<boolean>(audioClip.loop);
    const [currentTime, setCurrentTime] = useState<number>(audioClip.currentPlaybackTime);
    const [formattedCurrentTime, setFormattedCurrentTime] = useState<string>("00:00");
    const [isShowingAttachToChannelSelectionBox, setIsShowingAttachToChannelSelectionBox] = useState<boolean>(false);
    const [attachToChannelAnchor, setAttachToChannelAnchor] = useState<HTMLElement | undefined>(undefined);

    const [availableChannelItems, setAvailableChannelItems] = useState<FloatingSelectionBoxItem<Channel>[]>([]);

    const loopButtonCallback = useCallback(function () {
        const nextLoop = !isLooping;
        setIsLooping(nextLoop);
        audioClip.setLoop(nextLoop);
    }, [isLooping, audioClip]);

    const progressBarOnChangeCallback = useCallback(function (event: ProgressBarOnChangeEvent) {
        audioClip.seek(event.time);
    }, [audioClip]);

    const stopButtonCallback = useCallback(function () {
        audioClip.stop();
    }, [audioClip]);

    const playButtonCallback = useCallback(function () {
        if (!audioClip.context) return;
        audioClip.play();
    }, [audioClip]);

    const attachToChannelButtonCallback = useCallback(function () {

        const channels = getChannels();

        const availableChannels = channels.filter(function (channel: Channel) {

            if (!channel.audioClipPlayer) return null;

            let hasAudioClip: boolean = false;

            for (const _audioClip of channel.audioClipPlayer.audioClips)
                if (_audioClip.id === audioClip.id)
                    hasAudioClip = true;

            return !hasAudioClip ? channel : null;
        });

        setAttachToChannelAnchor(attachToChannelButtonRef.current ?? undefined);
        setIsShowingAttachToChannelSelectionBox(true);
        setAvailableChannelItems(availableChannels.map(function (channel: Channel) {
            return {
                icon: <Bolt size={16} />,
                label: channel.label ?? translate("audio_clip_settings.channel_fallback"),
                data: channel,
            }
        }));
    }, [audioClip, translate]);

    const selectAvailableChannelCallback = useCallback(function(channel: Channel) {
        
        channel.attachAudioClip(audioClip);

        if(audioClip.isPlaying) {

            const currentAudioClipTime: number = audioClip.startTime;

            console.log(audioClip);

            audioClip.stop();
            audioClip.play(currentAudioClipTime);
        }

        setIsShowingAttachToChannelSelectionBox(false);
    }, [audioClip]);

    useEffect(function () {
        function onProgress(progress: AudioClipOnProgressEvent) {
            setCurrentTime(progress.current);
            setFormattedCurrentTime(progress.formatted);
        }

        audioClip.addEventListener("progress", onProgress);

        return function () {
            audioClip.removeEventListener("progress", onProgress);
        };
    }, [audioClip]);

    return (
        <>
            <div className="audio-clip-controls">
                <div className="audio-clip-controls__buttons">
                    <div className="audio-clip-controls__buttons__button" onClick={playButtonCallback}>
                        <Play size={20} />
                    </div>
                    <div className="audio-clip-controls__buttons__button" onClick={stopButtonCallback}>
                        <Square size={20} />
                    </div>
                    <div className="audio-clip-controls__buttons__button" onClick={loopButtonCallback}>
                        {isLooping ? <Repeat1 size={20} /> : <Repeat size={20} />}
                    </div>
                    <div className="audio-clip-controls__buttons__button" onClick={attachToChannelButtonCallback} ref={attachToChannelButtonRef}>
                        <Plug size={20} />
                    </div>
                    <div className="audio-clip-controls__buttons__button" ref={detachFromChannelButtonRef}>
                        <Unplug size={20} />
                    </div>
                </div>
                <div className="audio-clip-controls__progress-bar" ref={progressBarContainerRef}>
                    <span>{formattedCurrentTime}</span>
                    <ProgressBar
                        audioClipDuration={audioClip.duration}
                        parentialContainer={progressBarContainerRef as RefObject<HTMLDivElement>}
                        audioBuffer={audioClip.data.audioBuffer}
                        currentTime={currentTime}
                        onChange={progressBarOnChangeCallback}
                    />
                    <span>{audioClip.formattedDuration}</span>
                </div>
            </div>

            {isShowingAttachToChannelSelectionBox && (
                <FloatingSelectionBox<Channel>
                    title={translate("audio_clip_settings.channels_selection_title")}
                    anchor={attachToChannelAnchor}
                    onSelect={selectAvailableChannelCallback}
                    onCancel={() => {setIsShowingAttachToChannelSelectionBox(false)}}
                    items={availableChannelItems}
                />
            )}
        </>
    )
}

export interface AudioClipWindowProperties {
    audioLibraryFile: AudioLibraryFile;
}

export default function AudioClipWindow({ audioLibraryFile }: AudioClipWindowProperties) {

    const [associatedAudioClip] = useState<AudioClip | null>(getAudioClipById(audioLibraryFile.id));

    if (!associatedAudioClip)
        return <p>Error: No associated audio clip has been found.</p>

    return (
        <div className="audio-clip-window-content">
            <h1>{audioLibraryFile.fileName}</h1>

            {associatedAudioClip && (
                <AudioClipControls audioClip={associatedAudioClip} />
            )}
        </div>
    )
}