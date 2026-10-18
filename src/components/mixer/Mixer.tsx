import { AudioDevice, Channel, InputChannel, Master } from "@fluex/fluexgl-dsp";

import { useCallback, useEffect, useState, useRef } from "react";
import { Ease } from "@babahgee/easings";
import { Mic } from "lucide-react";

import MixerChannel from "./Channel";
import CreateChannelButton from "./CreateChannelButton";

import "./Mixer.scss";
import {
    createNewChannel,
    createNewInputChannel,
    getAudioInputDevices,
    getChannels,
    isChannelAttachedToMaster,
    subscribeToMixerChanges
} from "../../services/mixerChannelService";
import ChannelSettingsHeader from "../header/prebuilt/ChannelSettingsHeader";
import MasterSettingsHeader from "../header/prebuilt/MasterSettingsHeader";
import Header from "../header/Header";
import FloatingSelectionBox from "../common/FloatingSelectionBox";
import useTranslation from "../../hooks/useTranslations";

export interface MixerProperties {
    audioDevice: AudioDevice;
}

export default function Mixer({ audioDevice }: MixerProperties) {

    const translate = useTranslation();

    const masterChannel = audioDevice.getMasterChannel();

    const [channels, setChannels] = useState<Channel[]>(function () {
        return getChannels().slice();
    });

    // Bumped on every routing change, so the channel strips re-read whether they are attached to the master channel.
    const [, setMixerVersion] = useState<number>(0);

    const [selectedChannel, setSelectedChannel] = useState<Channel | Master | null>(null);

    const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[] | null>(null);
    const [inputDeviceSelectionAnchor, setInputDeviceSelectionAnchor] = useState<HTMLElement | undefined>(undefined);
    const createInputChannelButtonRef = useRef<HTMLDivElement>(null);

    const mixerScrollerRef = useRef<HTMLDivElement | null>(null);
    const previousChannelCountRef = useRef<number>(channels.length);

    useEffect(function () {
        return subscribeToMixerChanges(function () {
            setChannels(getChannels().slice());
            setMixerVersion(version => version + 1);
        });
    }, []);

    useEffect(function () {

        const previousCount = previousChannelCountRef.current,
            currentCount = channels.length;

        if (currentCount > previousCount) {

            const mixerScroller = mixerScrollerRef.current;

            if (mixerScroller) {

                const start = mixerScroller.scrollLeft;
                let end = mixerScroller.scrollWidth - mixerScroller.clientWidth;

                if (end < 0) end = 0;

                Ease(start, end, "easeOutExpo", 1000, function (scrollX: number) {
                    if (mixerScroller) {
                        mixerScroller.scroll({ left: scrollX });
                    }
                });
            }
        }

        previousChannelCountRef.current = currentCount;
    }, [channels.length]);

    useEffect(function () {

        const current = mixerScrollerRef.current;

        if (!current) return;

        current.addEventListener("wheel", function (event: WheelEvent) {

            const direction: string = (event.deltaY < 0) ? "up" : "down";

            switch (direction) {
                case "up":
                    current.scroll({ left: current.scrollLeft + 20 });
                    return;
                case "down":
                    current.scroll({ left: current.scrollLeft - 20 });
                    return;
            }
        });

    }, [mixerScrollerRef]);

    const createChannelButtonOnClick = useCallback(function () {
        createNewChannel();
    }, []);

    const createInputChannelButtonOnClick = useCallback(async function () {
        setInputDeviceSelectionAnchor(createInputChannelButtonRef.current ?? undefined);
        setInputDevices(await getAudioInputDevices());
    }, []);

    const onInputDeviceSelect = useCallback(async function (device: MediaDeviceInfo | null) {

        setInputDevices(null);

        const inputChannel: InputChannel | null = await createNewInputChannel(device);

        if (!inputChannel)
            alert(translate("mixer.input_device_unavailable"));
    }, [translate]);

    const settingsButtonClickCallback = useCallback(function (channel: Channel | Master) {
        setSelectedChannel(channel);
    }, []);

    return (
        <div className="app-mixer">
            <div className="app-mixer__container">
                <div className="app-mixer__container__channels" ref={mixerScrollerRef}>
                    <MixerChannel
                        channelCount="M"
                        label="Master channel"
                        internalChannelId={masterChannel.id}
                        onSettingsButtonClick={settingsButtonClickCallback}
                        isMaster
                    />

                    {channels.map(function (channel: Channel, index: number) {
                        return (
                            <MixerChannel
                                key={index}
                                label={channel.label ?? "Channel"}
                                channelCount={(index + 1).toString() ?? "0"}
                                internalChannelId={channel.id}
                                isInput={channel instanceof InputChannel}
                                isAttachedToMaster={isChannelAttachedToMaster(channel)}
                                onSettingsButtonClick={settingsButtonClickCallback}
                            />
                        );
                    })}

                    <CreateChannelButton title={translate("mixer.create_channel")} onClick={createChannelButtonOnClick} />
                    <CreateChannelButton
                        icon={<Mic size={20} />}
                        title={translate("mixer.create_input_channel")}
                        onClick={createInputChannelButtonOnClick}
                        ref={createInputChannelButtonRef}
                    />
                </div>
                <Header>
                    {selectedChannel && (
                        selectedChannel instanceof Master
                            ? <MasterSettingsHeader master={selectedChannel} />
                            : <ChannelSettingsHeader channel={selectedChannel} onAudioClipSelect={() => null} />
                    )}
                </Header>
            </div>

            {inputDevices && (
                <FloatingSelectionBox<MediaDeviceInfo | null>
                    title={translate("mixer.select_input_device_title")}
                    items={[
                        { icon: <Mic size={16} />, label: translate("mixer.default_input_device"), data: null },
                        ...inputDevices
                            // The "default" entry is already covered by the first item.
                            .filter(device => device.deviceId !== "default")
                            .map(function (device: MediaDeviceInfo, index: number) {
                                return {
                                    icon: <Mic size={16} />,
                                    // Browsers hide device labels until microphone access has been granted once.
                                    label: device.label || translate("mixer.input_device_fallback", [index + 1]),
                                    data: device
                                };
                            })
                    ]}
                    onSelect={onInputDeviceSelect}
                    onCancel={() => setInputDevices(null)}
                    anchor={inputDeviceSelectionAnchor}
                />
            )}
        </div>
    );
}