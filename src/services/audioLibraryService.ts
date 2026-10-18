import { v4 } from "uuid";
import { type AudioSourceData, loadAudioSourceFromBlob, loadAudioSource } from "@fluex/fluexgl-dsp";

import localAudioFilesStructure from "../assets/local-audio-files.json";
import { createAudioClipAssociatedToLibrary, getAudioClipById } from "./audioClipService";

const baseUrl = import.meta.env.BASE_URL;

interface FileStructure {
    [key: string]: string | {
        [key: string]: string;
    };
}

export const audioLibraryFiles: AudioLibraryFile[] = [];

export interface AudioLibraryFile {
    id: string;
    fileName: string;
    fileSize: number;
    audioSourceData: AudioSourceData;
}

export interface AudioLibraryFileData {
    fileName: string;
    fileSize: number;
    fileType: string;
    file: Blob;
}

export interface AudioLibraryFileDataRelativePath {
    fileName: string;
    fileSize: number;
    fileType: string;
    filePath: string;
}

export async function addAudioLibraryFileToMemory(data: AudioLibraryFileData): Promise<AudioLibraryFile | null> {

    const audioSourceData = await loadAudioSourceFromBlob(data.file);
    if (!audioSourceData) return null;

    const { fileName, fileSize } = data;

    const item: AudioLibraryFile = {
        fileName,
        fileSize,
        audioSourceData,
        id: v4()
    };

    const associatedAudioClip = getAudioClipById(item.id);

    if (!associatedAudioClip)
        createAudioClipAssociatedToLibrary(item);

    audioLibraryFiles.push(item);
    return item;
}

export async function addAudioLibraryFileToMemoryUsingRelativePath(data: AudioLibraryFileDataRelativePath): Promise<AudioLibraryFile | null> {

    const audioSourceData = await loadAudioSource(baseUrl + data.filePath);
    if (!audioSourceData) return null;

    const { fileName, fileSize } = data;

    const item: AudioLibraryFile = {
        fileName,
        fileSize,
        audioSourceData,
        id: v4()
    }

    const associatedAudioClip = getAudioClipById(item.id);

    if(!associatedAudioClip)
        createAudioClipAssociatedToLibrary(item);

    audioLibraryFiles.push(item);
    return item;
}

export function getAudioLibraryFileById(id: string): AudioLibraryFile | null {

    const foundItem = audioLibraryFiles.find(function (item) {
        return item.id === id;
    });

    return foundItem ?? null;
}

export function getAudioLibraryFileByName(name: string): AudioLibraryFile | null {
    
    const foundItem = audioLibraryFiles.find(function(item: AudioLibraryFile) {
        return item.fileName.trim() === name.trim();
    });

    return foundItem ?? null;
}

export async function loadLocalAudioFiles() {

    const basePath: string = "sounds/database/";

    for (const name in localAudioFilesStructure as FileStructure) {

        const item = (localAudioFilesStructure as FileStructure)[name],
            isFile: boolean = typeof item === "string";

        if (isFile) await addAudioLibraryFileToMemoryUsingRelativePath({
            fileName: name,
            filePath: basePath + item,
            fileType: "unknown",
            fileSize: 0
        });

        if (!isFile) for (const inDirectoryItem in item as { [key: string]: string }) {

            const itemPath: string = name + "/" + (item as { [key: string]: string })[inDirectoryItem];

            await addAudioLibraryFileToMemoryUsingRelativePath({
                fileName: inDirectoryItem,
                filePath: basePath + itemPath,
                fileType: "unknown",
                fileSize: 0
            });
        }
    }
}