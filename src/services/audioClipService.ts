import { AudioClip } from "@fluex/fluexgl-dsp";
import { type AudioLibraryFile } from "./audioLibraryService";

export const audioClips: AudioClip[] = [];

type Listener = () => void;

const listeners: Listener[] = [];

function notify() {
    for (const listener of listeners)
        listener();
}

export function subscribeToAudioClips(listener: Listener) {

    listeners.push(listener);

    return function unsubscribe() {
        const index = listeners.indexOf(listener);

        if (index !== -1)
            listeners.splice(index, 1);
    };
}

export function createAudioClipAssociatedToLibrary(file: AudioLibraryFile): AudioClip | null {

    for (let i = 0; i < audioClips.length; i++) {

        const clip = audioClips[i];

        if (clip.id === file.id) return null;
    }

    const audioSourceData = file.audioSourceData;

    const newClip = new AudioClip(audioSourceData);
    newClip.id = file.id;
    newClip.label = file.fileName;

    audioClips.push(newClip);
    notify();

    return newClip;
}

export function getAudioClipById(id: string): null | AudioClip {

    for (let i = 0; i < audioClips.length; i++) {

        const clip = audioClips[i];

        if (clip.id === id)
            return clip;
    }

    return null;
}

export function playAllAudioClips() {
    audioClips.forEach(function(clip: AudioClip) {
        clip.play();
    });
}

// @ts-expect-error - exposed for manual testing from the browser console
window["playAllAudioClips"] = playAllAudioClips;