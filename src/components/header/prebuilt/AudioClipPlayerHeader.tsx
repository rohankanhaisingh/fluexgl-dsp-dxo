import { useState, useRef, type RefObject, useCallback, useEffect } from "react";
import { Play, Square, Repeat, Repeat1, X } from "lucide-react";
import { AudioClip, type AudioClipOnProgressEvent } from "@fluex/fluexgl-dsp";

import ProgressBar from "../../common/ProgressBar";
import Button from "../../common/Button";
import { type ProgressBarOnChangeEvent } from "../../common/ProgressBar";
import useTranslation from "../../../hooks/useTranslations";

export interface AudioClipPlayerProperties {
    audioClip: AudioClip;
}

export default function AudioClipPlayerHeader({ audioClip }: AudioClipPlayerProperties) {

    const translate = useTranslation();

    const audioClipPlayerRef = useRef<HTMLDivElement>(null);

    const [isLooping, setIsLooping] = useState<boolean>(audioClip.loop);
    const [currentTime, setCurrentTime] = useState<number>(audioClip.currentPlaybackTime);
    const [formattedCurrentTime, setFormattedCurrentTime] = useState<string>(audioClip.formattedDuration ?? "00:00");

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
        <div className="relative h-auto flex flex-col gap-2.5" ref={audioClipPlayerRef}>
            <ProgressBar
                audioClipDuration={audioClip.duration}
                parentialContainer={audioClipPlayerRef as RefObject<HTMLDivElement>}
                audioBuffer={audioClip.data.audioBuffer}
                currentTime={currentTime}
                onChange={progressBarOnChangeCallback}
            />

            <div className="flex flex-row justify-between items-center gap-5">
                <span>{formattedCurrentTime}</span>
                <div className="h-px w-full bg-[var(--color-shadow-grey-500)]"></div>
                <span>{audioClip.formattedDuration}</span>
            </div>

            <Button icon={<Play size={16} />} title={translate("audio_clip_settings.play_audio_clip")} text={translate("audio_clip_settings.play_audio_clip")} onClick={playButtonCallback} />
            <Button icon={<Square size={16} />} title={translate("audio_clip_settings.stop_audio_clip")} text={translate("audio_clip_settings.stop_audio_clip")} onClick={stopButtonCallback} />

            <Button
                icon={isLooping ? <Repeat1 size={16} /> : <Repeat size={16} />}
                text={isLooping
                    ? translate("audio_clip_settings.loop_audio_clip", [translate("audio_clip_settings.loop_audio_clip_enabled")])
                    : translate("audio_clip_settings.loop_audio_clip", [translate("audio_clip_settings.loop_audio_clip_disabled")])
                }
                onClick={loopButtonCallback}
            />

            <Button icon={<X size={16} />} title={translate("audio_clip_settings.destroy_audio_clip")} text={translate("audio_clip_settings.destroy_audio_clip")} style="red" />
        </div>
    );
}
