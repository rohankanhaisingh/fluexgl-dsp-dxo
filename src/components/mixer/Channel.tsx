import { useState, useEffect, useCallback, useRef } from "react";
import { Settings, Link, Unlink, Mic } from "lucide-react";
import { v4 } from "uuid";
import { Analyser, Channel as DspChannel, Master, Effector } from "@fluex/fluexgl-dsp";

import Fader from "./Fader";
import Knob from "./Knob";

import { attachChannelToMaster, detachChannelFromMaster, getChannelById, getMasterChannel } from "../../services/mixerChannelService";
import useTranslation from "../../hooks/useTranslations";
import { addPeakMeterDataToRegistry, removePeakMeterDataFromRegistryById } from "../../services/mixerPeakMeterService";

import "./Channel.scss";

export interface ChannelProperties {
    label?: string;
    channelCount?: string;
    isMaster?: boolean;
    internalChannelId: string;
    /** Whether the channel receives its signal from an audio input device. */
    isInput?: boolean;
    /** Whether the channel is sent to the master channel. Not used for the master channel itself. */
    isAttachedToMaster?: boolean;
    onSettingsButtonClick?: (channel: DspChannel | Master) => void;
}

export default function Channel({ label, channelCount, isMaster, internalChannelId, isInput, isAttachedToMaster, onSettingsButtonClick }: ChannelProperties) {

    const translate = useTranslation();

    const [channelVolume, setChannelVolume] = useState<number>(100);
    const [channelLabel, setChannelLabel] = useState<string>(label ?? "Channel");
    const [channelCountColor, setChannelCountColor] = useState<string>("var(--color-surface-light)");
    const [channelPanning, setChannelPanning] = useState<number>(0);
    const [channelClipMix, setChannelClipMix] = useState<number>(1);

    const canvasRef = useRef<HTMLCanvasElement>(null);

    const channelCountColorOnClick = useCallback(function () {

        const tempInput = document.createElement("input");
        tempInput.type = "color";

        tempInput.addEventListener("change", function () {

            setChannelCountColor(tempInput.value);
            tempInput.remove();
        });

        tempInput.click();
    }, []);

    const settingsButtonClickCallback = useCallback(function () {

        const associatedChannel = isMaster ? getMasterChannel() : getChannelById(internalChannelId);

        if (associatedChannel) onSettingsButtonClick?.(associatedChannel);
    }, [internalChannelId, isMaster, onSettingsButtonClick]);

    const masterRoutingButtonClickCallback = useCallback(function () {

        const associatedChannel = getChannelById(internalChannelId);

        if (!associatedChannel) return;

        if (isAttachedToMaster)
            detachChannelFromMaster(associatedChannel);
        else
            attachChannelToMaster(associatedChannel);
    }, [internalChannelId, isAttachedToMaster]);

    useEffect(function () {

        const associatedChannel = getChannelById(internalChannelId);

        if (!associatedChannel) return;
        associatedChannel.label = channelLabel;
        associatedChannel.volume(1 / 100 * channelVolume);
        associatedChannel.pan(channelPanning);

        if(!associatedChannel.audioClipPlayer) return;
        associatedChannel.audioClipPlayer.setVolume(channelClipMix);

    }, [internalChannelId, channelLabel, channelVolume, channelPanning, channelClipMix]);

    useEffect(function () {

        const canvas: HTMLCanvasElement | null = canvasRef.current,
            context: CanvasRenderingContext2D | null | undefined = canvas?.getContext("2d");

        if (!canvas || !context) return;

        // The master bus is not part of the regular channel list, and it uses its own
        // analyser label since it isn't a DspChannel but a Master instance.
        const channel = isMaster ? getMasterChannel() : getChannelById(internalChannelId);

        if (!channel) return;

        const analyser: Effector | null = isMaster
            ? (channel.effects.find(effect => effect.label === "MasterPostAnalyser") ?? null)
            : (channel as DspChannel).getFirstEffectByLabel("ChannelPostAnalyser");

        if(!analyser)
            throw new Error("Could not add channel to peak meter registry, because the channel has no post analyser effector.");

        const dataId: string = v4();

        addPeakMeterDataToRegistry({
            canvas, context, channel,
            id: dataId,
            analyser: analyser as Analyser
        });

        return function() {
            removePeakMeterDataFromRegistryById(dataId);
        }
    }, [internalChannelId, isMaster]);

    return (
        <div className={`mixer-channel ${!isMaster && !isAttachedToMaster ? "detached" : ""}`}>
            <div className="mixer-channel__container">
                <div className="mixer-channel__channel-count" style={{
                    background: channelCountColor
                }} onClick={channelCountColorOnClick}>
                    {isInput && <Mic size={12} />}
                    <span>{channelCount ?? "?"}</span>
                </div>

                <div className="mixer-channel__channel-label">
                    <input contentEditable spellCheck="false" value={channelLabel} onInput={event => setChannelLabel((event.target as HTMLInputElement).value)} placeholder="Channel" />
                </div>

                <div className="mixer-channel__peak-meter">
                    <canvas className="mixer-channel__peak-meter__canvas" id={`channel-${internalChannelId}`} ref={canvasRef}></canvas>
                </div>

                <Fader initialValue={100} onChange={(value: number) => setChannelVolume(value)} />

                <div className="mixer-channel__buttons">
                    <div className="mixer-channel__buttons__button" onClick={settingsButtonClickCallback}>
                        <Settings size={20} />
                    </div>
                    {!isMaster && (
                        <div
                            className={`mixer-channel__buttons__button ${isAttachedToMaster ? "" : "active"}`}
                            title={translate(isAttachedToMaster ? "channel_settings.detach_from_master" : "channel_settings.attach_to_master")}
                            onClick={masterRoutingButtonClickCallback}
                        >
                            {isAttachedToMaster ? <Link size={20} /> : <Unlink size={20} />}
                        </div>
                    )}
                </div>

                <div className="mixer-channel__knobs">
                    <p className="mixer-channel__knobs__label">Panning</p>
                    <Knob min={-1} max={1} step={0.1} defaultValue={0} onChange={value => setChannelPanning(value)} />
                    <p className="mixer-channel__knobs__label">Clip Mix</p>
                    <Knob min={0} max={1} step={0.01} defaultValue={1} onChange={value => setChannelClipMix(value)} />
                </div>
            </div>
        </div>
    )
}