import "./FileExplorer.scss";

import { FileMusic, Folder, FolderOpen } from "lucide-react";
import { useState, useCallback } from "react";

import { getAudioLibraryFileByName, type AudioLibraryFile } from "../../services/audioLibraryService";

import useWindow from "../../hooks/useWindow";
import AudioClipWindow from "../window/prebuilt/AudioClipWindow";

interface FileComponentProperties {
    name: string;
    path: string;
}

interface DirectoryComponentProperties {
    name: string;
    files: { [key: string]: string };
}

function FileComponent({ name, path }: FileComponentProperties) {

    const useWindowHookValues = useWindow();

    const onClickCallback = useCallback(function() {

        const associatedAudioLibraryFile: AudioLibraryFile | null = getAudioLibraryFileByName(name);
        if(!associatedAudioLibraryFile) return;

        useWindowHookValues.setContent(<AudioClipWindow audioLibraryFile={associatedAudioLibraryFile} />);
        useWindowHookValues.setTitle(name);
        useWindowHookValues.setIcon(<FileMusic size={14} />);
        useWindowHookValues.showWindow();
    }, [name, useWindowHookValues]);

    return (
        <div className="file-explorer__file" title={path} onClick={onClickCallback}>
            <FileMusic size={14} />
            <span>{name}</span>
        </div>
    )
}

function DirectoryComponent({ name, files }: DirectoryComponentProperties) {

    const [isShowingFiles, setIsShowingFiles] = useState<boolean>(false);

    return (
        <div className="file-explorer__directory">
            <div className="file-explorer__directory__directory-name" onClick={() => setIsShowingFiles(!isShowingFiles)}>
                {(function () {
                    return isShowingFiles
                        ? <FolderOpen size={14} />
                        : <Folder size={14} />
                })()}
                {name}
            </div>
            {isShowingFiles && (
                <div className="file-explorer__directory__files">
                    {Object.keys(files).map(function (name: string, index: number) {
                        return <FileComponent name={name} path={files[name]} key={index} />;
                    })}
                </div>
            )}
        </div>
    )
}

export interface FileStructure {
    [key: string]: string | {
        [key: string]: string;
    };
}

export interface FileExplorerProperties {
    fileStructure: FileStructure;
}


export default function FileExplorer({ fileStructure }: FileExplorerProperties) {

    return (
        <div className="file-explorer">
            {Object.keys(fileStructure).map(function (name: string, index: number) {

                const isFile: boolean = typeof fileStructure[name] === "string",
                    directoryItems = fileStructure[name] as { [key: string]: string };

                return isFile
                    ? <FileComponent name={name} path={fileStructure[name] as string} key={index} />
                    : <DirectoryComponent name={name} files={directoryItems} key={index} />;
            })}
        </div>
    );
}