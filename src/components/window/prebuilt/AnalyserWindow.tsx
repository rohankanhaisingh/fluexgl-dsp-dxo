import "./AnalyserWindow.scss";

import type { Analyser } from "@fluex/fluexgl-dsp";
import { useEffect, useRef, useState } from "react";
import { AudioWaveform, BarChart3 } from "lucide-react";

import { MIXER_CHANNEL_FFTSIZE } from "../../../utilities/constants";
import useWindow from "../../../hooks/useWindow";
import Knob from "../../mixer/Knob";

export interface AnalyserWindowProperties {
    analyser: Analyser
}

type AnalyserViewMode = "waveform" | "spectrum";

const FFT_SIZES: number[] = [1024, 2048, 4096, 8192, 16384];

const COLOR_PRESETS: string[] = ["#ffffff", "#22d3ee", "#4ade80", "#facc15", "#fb7185", "#a78bfa"];

const SPECTRUM_BAR_COUNT: number = 64;

function hexToRgba(hex: string, alpha: number): string {

    const parsed = hex.replace("#", "");

    const r = parseInt(parsed.substring(0, 2), 16) || 0,
        g = parseInt(parsed.substring(2, 4), 16) || 0,
        b = parseInt(parsed.substring(4, 6), 16) || 0;

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}


const SPECTRUM_MAX_DECIBELS: number = -10;


function sensitivityToMinDecibels(sensitivity: number): number {
    return -20 - (sensitivity / 100) * 80;
}

export default function AnalyserWindow({ analyser }: AnalyserWindowProperties) {

    const { windowData } = useWindow();

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const contextRef = useRef<CanvasRenderingContext2D>(null);

    const [viewMode, setViewMode] = useState<AnalyserViewMode>("waveform");
    const [color, setColor] = useState<string>(COLOR_PRESETS[0]);
    const [fftSize, setFftSize] = useState<number>(4096);
    const [smoothing, setSmoothing] = useState<number>(0.8);
    const [sensitivity, setSensitivity] = useState<number>(85);

    const settingsRef = useRef({ viewMode, color });

    useEffect(function () {
        settingsRef.current = { viewMode, color };
    }, [viewMode, color]);

    useEffect(function () {

        if (!canvasRef.current || !wrapperRef.current) return;

        const canvas = canvasRef.current,
            wrapper = wrapperRef.current;

        const wrapperBoundaries: DOMRect = wrapper.getBoundingClientRect();

        canvas.width = wrapperBoundaries.width;
        canvas.height = wrapperBoundaries.height;
    }, [windowData, viewMode]);

    useEffect(function () {

        if (!canvasRef.current) return;

        const canvas = canvasRef.current,
            context = canvas.getContext("2d");

        contextRef.current = context;
    }, [canvasRef]);

    useEffect(function () {
        // maxDecibels must be applied before minDecibels: setOptions assigns properties
        // on the underlying AnalyserNode in object-key order, and the node throws if
        // minDecibels is ever set >= the maxDecibels it currently holds (or vice versa).
        analyser.setOptions({
            maxDecibels: SPECTRUM_MAX_DECIBELS,
            minDecibels: sensitivityToMinDecibels(sensitivity),
            fftSize,
            smoothingTimeConstant: smoothing,
        });
    }, [analyser, fftSize, smoothing, sensitivity]);

    useEffect(function () {

        let frameId: number = 0;

        function drawWaveform(ctx: CanvasRenderingContext2D, width: number, height: number, strokeColor: string) {

            const data: Uint8Array | null = analyser.getWaveformByteData();
            if (!data) return;

            ctx.save();
            ctx.lineWidth = 1;
            ctx.strokeStyle = strokeColor;
            ctx.beginPath();

            const n = data.length;

            for (let i = 0; i < n; i++) {

                const v = data[i] / 255,
                    x = (i / (n - 1)) * width,
                    y = height - (v * height);

                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }

            ctx.stroke();
            ctx.restore();
        }

        function drawSpectrum(ctx: CanvasRenderingContext2D, width: number, height: number, barColor: string) {

            const data: Uint8Array | null = analyser.getFrequencyByteData();
            if (!data) return;

            // Only the first half of the buffer holds meaningful frequency bins.
            const binCount = Math.max(1, Math.floor(data.length / 2));
            const barCount = Math.min(SPECTRUM_BAR_COUNT, binCount);
            const binsPerBar = binCount / barCount;

            const gap = 2;
            const barWidth = (width - gap * (barCount - 1)) / barCount;

            const gradient = ctx.createLinearGradient(0, height, 0, 0);
            gradient.addColorStop(0, barColor);
            gradient.addColorStop(1, hexToRgba(barColor, 0.25));

            ctx.save();
            ctx.fillStyle = gradient;

            for (let bar = 0; bar < barCount; bar++) {

                const start = Math.floor(bar * binsPerBar),
                    end = Math.max(start + 1, Math.floor((bar + 1) * binsPerBar));

                let peak = 0;

                for (let bin = start; bin < end && bin < binCount; bin++)
                    peak = Math.max(peak, data[bin]);

                const v = peak / 255,
                    barHeight = v * height,
                    x = bar * (barWidth + gap);

                ctx.fillRect(x, height - barHeight, barWidth, barHeight);
            }

            ctx.restore();
        }

        function render() {
            frameId = window.requestAnimationFrame(render);

            if (!contextRef.current || !canvasRef.current) return;

            const ctx = contextRef.current;
            const canvas = canvasRef.current;

            const width = canvas.width;
            const height = canvas.height;

            ctx.clearRect(0, 0, width, height);

            const { viewMode: currentViewMode, color: currentColor } = settingsRef.current;

            if (currentViewMode === "waveform")
                drawWaveform(ctx, width, height, currentColor);
            else
                drawSpectrum(ctx, width, height, currentColor);
        }

        frameId = window.requestAnimationFrame(render);

        return function () {
            contextRef.current = null;
            analyser.setOptions({ fftSize: MIXER_CHANNEL_FFTSIZE });
            window.cancelAnimationFrame(frameId);
        };

    }, [analyser]);

    return (
        <div className="analyser-window-content">
            <div className="analyser-window-content__toolbar">
                <div className="analyser-window-content__toolbar__view-toggle">
                    <button className={viewMode === "waveform" ? "active" : ""} onClick={() => setViewMode("waveform")} title="Waveform">
                        <AudioWaveform size={16} />
                        <span>Waveform</span>
                    </button>
                    <button className={viewMode === "spectrum" ? "active" : ""} onClick={() => setViewMode("spectrum")} title="Spectrum">
                        <BarChart3 size={16} />
                        <span>Spectrum</span>
                    </button>
                </div>

                <div className="analyser-window-content__toolbar__group">
                    <label>FFT size</label>
                    <div className="analyser-window-content__toolbar__fft-sizes">
                        {FFT_SIZES.map(function (size) {
                            return (
                                <button key={size} className={fftSize === size ? "active" : ""} onClick={() => setFftSize(size)}>
                                    {size}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="analyser-window-content__toolbar__group">
                    <label>Color</label>
                    <div className="analyser-window-content__toolbar__color-swatches">
                        {COLOR_PRESETS.map(function (preset) {
                            return (
                                <button
                                    key={preset}
                                    className={color === preset ? "active" : ""}
                                    style={{ background: preset }}
                                    title={preset}
                                    onClick={() => setColor(preset)}
                                />
                            );
                        })}
                        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} title="Custom color" />
                    </div>
                </div>

                <div className="analyser-window-content__toolbar__group">
                    <label>Smoothing: {(smoothing * 100).toFixed(0)}%</label>
                    <Knob value={smoothing} defaultValue={0.8} min={0} max={0.95} step={0.01} onChange={setSmoothing} />
                </div>

                <div className="analyser-window-content__toolbar__group">
                    <label>Sensitivity: {sensitivity.toFixed(0)}%</label>
                    <Knob value={sensitivity} defaultValue={85} min={0} max={100} step={1} onChange={setSensitivity} />
                </div>
            </div>

            <div className="analyser-window-content__canvas-wrapper" ref={wrapperRef}>
                <canvas ref={canvasRef}></canvas>
            </div>
        </div>
    );
}
