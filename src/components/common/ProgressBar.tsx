import { type RefObject, useState, useRef, useEffect, useCallback } from "react";

import { computeWaveformBars } from "../../utilities/scripts/audio-buffer-computings";
import { drawWaveformBarsOnCanvas } from  "../../utilities/scripts/waveform-renderer";

import "./ProgressBar.scss";


export interface ProgressBarPosition {
    x: number;
    y: number;
}

export interface ProgressBarOnChangeEvent {
    time: number;
    progressBarWidthInPixels: number;
}

export interface ProgressBarProperties {
    audioClipDuration: number;
    parentialContainer: RefObject<HTMLDivElement>;
    audioBuffer?: AudioBuffer;
    currentTime?: number;
    onDrag?: () => void;
    onChange?: (event: ProgressBarOnChangeEvent) => void;
}

export default function ProgressBar(props: ProgressBarProperties) {

    const { audioClipDuration, parentialContainer, currentTime, onDrag, onChange, audioBuffer } = props;

    const [progressBarWidth, setProgressBarWidth] = useState<number>(0);
    const [progressBarFullWidth, setProgressBarFullWidth] = useState<number>(0);

    const isDraggingRef = useRef(false);
    const progressBarBodyRef = useRef<HTMLDivElement | null>(null);
    const progressBarPositionRef = useRef<ProgressBarPosition | null>(null);
    const draggedOffsetRef = useRef<number>(0);
    const waveFormCanvasRef = useRef<HTMLCanvasElement | null>(null);

    const handleStopIsDragging = useCallback(function () {
        if (!isDraggingRef.current || progressBarFullWidth === 0) return;

        isDraggingRef.current = false;

        const seekedTime: number = Number(
            ((audioClipDuration / progressBarFullWidth) * draggedOffsetRef.current).toFixed(2)
        );

        onChange?.({
            time: seekedTime,
            progressBarWidthInPixels: draggedOffsetRef.current
        });

    }, [audioClipDuration, progressBarFullWidth, onChange]);

    const handleThumbMouseDown = useCallback(function () {

        const body = progressBarBodyRef.current;

        if (!body) return;

        const rect = body.getBoundingClientRect();
        progressBarPositionRef.current = { x: rect.x, y: rect.y };

        isDraggingRef.current = true;
    }, []);

    const handleThumbDragging = useCallback(function (event: MouseEvent) {

        if (!isDraggingRef.current || !progressBarPositionRef.current) return;
        if (progressBarFullWidth === 0) return;

        let offset: number = event.clientX - progressBarPositionRef.current.x;

        if (offset < 0) offset = 0;
        if (offset > progressBarFullWidth) offset = progressBarFullWidth;

        draggedOffsetRef.current = offset;

        const trackerWidthInPercentages: number = (100 / progressBarFullWidth) * offset;

        setProgressBarWidth(trackerWidthInPercentages);
        onDrag?.();

    }, [progressBarFullWidth, onDrag]);

    useEffect(function () {

        const body = progressBarBodyRef.current;

        if (!body) return;

        function updateWidth(width: number) {
            setProgressBarFullWidth(width);
        }

        updateWidth(body.getBoundingClientRect().width);

        // The parent window's width can keep animating (opening, maximizing/restoring)
        // well after this component mounts, so a one-off measurement (or one that only
        // reacts to the browser's own resize event) quickly goes stale. A ResizeObserver
        // tracks the actual rendered width regardless of what caused it to change.
        const observer = new ResizeObserver(function (entries) {
            for (const entry of entries)
                updateWidth(entry.contentRect.width);
        });

        observer.observe(body);

        return () => {
            observer.disconnect();
        };

    }, []);

    useEffect(function () {

        const container = parentialContainer.current;

        if (!container) return;

        const onMove = function (event: MouseEvent) { handleThumbDragging(event); };
        const onUp = function () { handleStopIsDragging(); };
        const onLeave = function () { handleStopIsDragging(); };

        container.addEventListener("mousemove", onMove);
        container.addEventListener("mouseup", onUp);
        container.addEventListener("mouseleave", onLeave);

        return () => {
            container.removeEventListener("mousemove", onMove);
            container.removeEventListener("mouseup", onUp);
            container.removeEventListener("mouseleave", onLeave);
        };

    }, [parentialContainer, handleThumbDragging, handleStopIsDragging]);

    useEffect(function () {

        if (progressBarFullWidth === 0) return;
        if (audioClipDuration === 0) return;
        if (isDraggingRef.current) return;

        const safeCurrentTime = Math.max(0, Math.min(currentTime ?? 0, audioClipDuration));

        const offset = (safeCurrentTime / audioClipDuration) * progressBarFullWidth;
        draggedOffsetRef.current = offset;

        const trackerWidthInPercentages: number = (100 / progressBarFullWidth) * offset;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs the thumb position to external playback time, but must be skipped while the user is dragging (a ref, not a render-time value)
        setProgressBarWidth(trackerWidthInPercentages);

    }, [currentTime, audioClipDuration, progressBarFullWidth]);

    useEffect(function() {

        const canvas = waveFormCanvasRef.current;

        if (!canvas || !audioBuffer || progressBarFullWidth === 0) return;

        // A <canvas> keeps its drawing buffer at the HTML default (300x150) until it is
        // set explicitly, so without this the waveform was always drawn at that fixed
        // resolution and then stretched by CSS to fill the actual, differently-sized
        // container - producing a blurry, squashed waveform that never matched the
        // progress bar's own width.
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        canvas.width = Math.max(1, Math.round(rect.width * dpr));
        canvas.height = Math.max(1, Math.round(rect.height * dpr));

        const peaks = computeWaveformBars(audioBuffer, 256);
        drawWaveformBarsOnCanvas(canvas, peaks, {
            barWidth: 2 * dpr,
            barGap: 1 * dpr,
            color: "rgba(255, 255, 255, 0.10)"
        });
    }, [audioBuffer, progressBarFullWidth]);

    return (
        <div className="progress-bar">
            <canvas className="progress-bar__wave-form" ref={waveFormCanvasRef}></canvas>
            <div className="progress-bar__body" ref={progressBarBodyRef}>
                <div className="progress-bar__body__current" style={{ width: `${progressBarWidth}%` }}>
                    <div className="progress-bar__body__current__thumb" onMouseDown={handleThumbMouseDown} />
                </div>
            </div>
        </div>
    );
}