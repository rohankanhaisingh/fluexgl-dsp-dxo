import { AudioDevice, Master, Channel, InputChannel, Analyser, listAudioInputDevices } from "@fluex/fluexgl-dsp"

import { MIXER_CHANNEL_FFTSIZE, MIXER_CHANNEL_SMOOTHNING_TIME_CONSTANT, MIXER_CHANNEL_MAX_DEXIBELS, MIXER_CHANNEL_MIN_DECIBELS } from "../utilities/constants";

export let audioDevice: AudioDevice | null = null;

// Every channel shown in the mixer. Kept separately from master.channels, because a
// channel that is detached from the master channel should still be visible in the mixer.
const mixerChannels: Channel[] = [];

const changeListeners: Set<() => void> = new Set();

/**
 * Calls the listener every time a channel is added, or attached to or detached from the master channel.
 * @returns A function that removes the listener.
 */
export function subscribeToMixerChanges(listener: () => void): () => void {

    changeListeners.add(listener);

    return () => changeListeners.delete(listener);
}

function notifyMixerChanged() {
    changeListeners.forEach(listener => listener());
}

function addChannelPostAnalyser(channel: Channel) {

    const analyser = new Analyser({
        fftSize: MIXER_CHANNEL_FFTSIZE,
        smoothingTimeConstant: MIXER_CHANNEL_SMOOTHNING_TIME_CONSTANT,
        maxDecibels: MIXER_CHANNEL_MAX_DEXIBELS,
        minDecibels: MIXER_CHANNEL_MIN_DECIBELS
    });

    analyser.label = "ChannelPostAnalyser";

    channel.addEffect(analyser);
    channel.moveEffectToIndex(analyser, "end");
}

export function initializeMixerChannelService(_audioDevice: AudioDevice) {

    audioDevice = _audioDevice;

    const masterChannel: Master = _audioDevice.getMasterChannel();

    const masterAnalyser: Analyser = new Analyser({
        fftSize: 16384,
        smoothingTimeConstant: MIXER_CHANNEL_SMOOTHNING_TIME_CONSTANT,
        maxDecibels: MIXER_CHANNEL_MAX_DEXIBELS,
        minDecibels: MIXER_CHANNEL_MIN_DECIBELS
    });

    masterAnalyser.label = "MasterPostAnalyser";

    masterChannel.attachEffect(masterAnalyser);

    for (let i = 0; i < 20; i++) {

        const channel: Channel = _audioDevice.createChannel();
        channel.label = `Channel ${i + 1}`;

        addChannelPostAnalyser(channel);
        masterChannel.attachChannel(channel);
        mixerChannels.push(channel);
    }
}

export function createNewChannel(): Channel | null {

    if (!audioDevice) return null;

    const masterChannel = audioDevice.getMasterChannel(),
        channel: Channel = audioDevice.createChannel(`Channel ${mixerChannels.length + 1}`);

    addChannelPostAnalyser(channel);
    channel.send(masterChannel);
    mixerChannels.push(channel);

    notifyMixerChanged();

    return channel;
}

export async function getAudioInputDevices(): Promise<MediaDeviceInfo[]> {

    try {
        return await listAudioInputDevices();
    } catch {
        return [];
    }
}

/**
 * Creates a channel that receives its signal from an audio input device, such as a microphone.
 * Passing nothing or `null` uses the system's default input device.
 *
 * The input channel is not sent to the master channel, because monitoring a microphone
 * through speakers can cause feedback. Use attachChannelToMaster() to monitor it.
 *
 * @returns `null` when the input device could not be opened, for example when microphone access is denied.
 */
export async function createNewInputChannel(device: MediaDeviceInfo | null = null): Promise<InputChannel | null> {

    if (!audioDevice) return null;

    const inputCount: number = mixerChannels.filter(channel => channel instanceof InputChannel).length,
        inputChannel: InputChannel = await audioDevice.createInputChannel(device, `Input ${inputCount + 1}`);

    if (!inputChannel.isOpen) {
        audioDevice.removeInputChannel(inputChannel);
        return null;
    }

    addChannelPostAnalyser(inputChannel);
    mixerChannels.push(inputChannel);

    notifyMixerChanged();

    return inputChannel;
}

export function isChannelAttachedToMaster(channel: Channel): boolean {

    if (!audioDevice) return false;

    return channel.isSentTo(audioDevice.getMasterChannel());
}

export function attachChannelToMaster(channel: Channel) {

    if (!audioDevice || isChannelAttachedToMaster(channel)) return;

    channel.send(audioDevice.getMasterChannel());
    notifyMixerChanged();
}

export function detachChannelFromMaster(channel: Channel) {

    if (!audioDevice) return;

    if (channel.unsend(audioDevice.getMasterChannel()))
        notifyMixerChanged();
}

export function getMasterChannel(): Master | null {

    if (!audioDevice) return null;

    return audioDevice.getMasterChannel();
}

export function getChannelById(id: string): Channel | undefined {
    return mixerChannels.find(channel => channel.id === id);
}

export function getChannels(): Channel[] {
    return mixerChannels;
}

export function sendChannelToChannel(sourceChannel: Channel, targetChannel: Channel) {
    sourceChannel.send(targetChannel);
}

export function unsendChannelFromChannel(sourceChannel: Channel, targetChannel: Channel) {
    sourceChannel.unsend(targetChannel);
}
