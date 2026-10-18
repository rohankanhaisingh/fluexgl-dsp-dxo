import "./AudioSourceLibraryHeader.scss";
import "../../common/FileExplorer.scss";
import localAudioFilesStructure from "../../../assets/local-audio-files.json";

import { FileMusic, Upload } from "lucide-react";
import { useState, useCallback } from "react";

import Button from "../../common/Button";
import FileExplorer from "../../common/FileExplorer";

import HeaderCategory from "../HeaderCategory";

import { addAudioLibraryFileToMemory, type AudioLibraryFile } from "../../../services/audioLibraryService";
import useTranslation from "../../../hooks/useTranslations";

export interface AudioSourceLibraryHeaderProperties {
	onFileClick?: (file: AudioLibraryFile) => void;
}

export default function AudioSourceLibraryHeader({ onFileClick }: AudioSourceLibraryHeaderProperties) {
	const translate = useTranslation();

	const [isUploading, setIsUploading] = useState<boolean>(false);
	const [files, setFiles] = useState<AudioLibraryFile[]>([]);

	const uploadButtonOnClick = useCallback(function () {
		if (isUploading) return;

		setIsUploading(true);

		(function () {
			const tempInput = document.createElement("input");
			tempInput.type = "file";
			tempInput.accept = "audio/*";

			// Fires when the file picker dialog is closed without selecting a file
			// (e.g. the user clicks "Cancel"). "change" never fires in that case,
			// so without this the spinner would stay visible indefinitely.
			tempInput.addEventListener("cancel", function () {
				setIsUploading(false);
				tempInput.remove();
			});

			tempInput.addEventListener("change", function (event: Event) {
				const target = event.target as HTMLInputElement;

				if (!target.files || target.files.length === 0) {
					setIsUploading(false);
					return;
				}

				const file = target.files[0];

				const fileName: string = file.name,
					fileSize: number = file.size,
					fileType: string = file.type;

				addAudioLibraryFileToMemory({ fileName, fileSize, fileType, file }).then(function (item: AudioLibraryFile | null) {
					if (item) {
						setFiles(function (prev: AudioLibraryFile[]) {
							return prev.concat(item);
						});
					}
				});

				target.remove();
				setIsUploading(false);
			});

			tempInput.click();
		})();
	}, [isUploading]);

	const uploadedAudioFileOnClickHandler = useCallback(function (file: AudioLibraryFile) {
		if (onFileClick) onFileClick(file);
	}, [onFileClick]);

	return (
		<>
			<HeaderCategory label={translate("audio_library_header.audio_files_from_database")}>
				<FileExplorer fileStructure={localAudioFilesStructure}/>
			</HeaderCategory>

			<HeaderCategory label={translate("audio_library_header.uploaded_audio_files")}>
				{files.map(function (file: AudioLibraryFile, index: number) {
					return (
						<div
							className="file-explorer__file"
							title={file.fileName}
							key={index}
							onClick={function () {
								uploadedAudioFileOnClickHandler(file);
							}}
						>
							<FileMusic size={14} />
							<span>{file.fileName}</span>
						</div>
					);
				})}

				<Button
					icon={<Upload size={16} />}
					text={translate("audio_library_header.update_file")}
					title={translate("audio_library_header.update_file")}
					disabled={isUploading}
					onClick={uploadButtonOnClick}
				/>
			</HeaderCategory>
		</>
	);
}
