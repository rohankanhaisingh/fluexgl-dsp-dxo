// TODO: Channels hebben geen analyser meer, maar kan handmatig worden toegepast als een effect.
// Haal de analyser effect op om de waveform gegevens op te halen.

import { Channel, Master, Analyser } from "@fluex/fluexgl-dsp";

import { MIXER_CHANNEL_FFTSIZE } from "../utilities/constants";

export interface ChannelPeakMeterData {
    channel: Channel | Master;
    context: CanvasRenderingContext2D;
    canvas: HTMLCanvasElement;
    id: string;
    smoothedPeak?: number;
    analyser: Analyser;
}

// The view mode all channel meters render with. This is a single, global switch
// (rather than a per-channel one), similar to how FL Studio lets you flip the
// mixer's meters between different visualisations all at once.
export type MixerMeterViewMode = "peak" | "waveform" | "spectrum";

// fftSize used while meters are in "peak" mode. Kept tiny because only the
// instantaneous peak of the waveform buffer is needed.
const PEAK_FFTSIZE: number = MIXER_CHANNEL_FFTSIZE;

// fftSize used while meters are showing a waveform or spectrum, so there is
// enough resolution to draw something meaningful in the compact meter.
const VISUAL_FFTSIZE: number = 256;

const SPECTRUM_BAR_COUNT: number = 6;
const SPECTRUM_BAR_GAP: number = 1;

const METER_COLOR: string = "#35e37a";

let currentViewMode: MixerMeterViewMode = "peak";

const channelPeakMeterDataRegistry: ChannelPeakMeterData[] = [];

const frameRate: number = 140;
let lastTimestamp: number = Date.now();

function fftSizeForViewMode(mode: MixerMeterViewMode): number {
    return mode === "peak" ? PEAK_FFTSIZE : VISUAL_FFTSIZE;
}

function drawPeakMeter(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement, peakMeterData: ChannelPeakMeterData) {

    const width = canvas.width,
        height = canvas.height;

    const waveformData = peakMeterData.analyser.getWaveformFloatData();

    if (!waveformData) return;

    const attack = 0.5,
        release = 0.05;

    let instantaneousPeak = 0;

    for (let s = 0; s < waveformData.length; s++) {

        let sample = waveformData[s] * 2;

        if (sample < 0) {
            sample = -sample;
        } else if (sample > instantaneousPeak) {
            instantaneousPeak = sample;
        }
    }

    if (instantaneousPeak < 0) {
        instantaneousPeak = 0;
    }
    if (instantaneousPeak > 1) {
        instantaneousPeak = 1;
    }

    let smoothedPeak = peakMeterData.smoothedPeak;

    if (typeof smoothedPeak !== "number") {

        smoothedPeak = instantaneousPeak;
    } else {

        if (instantaneousPeak > smoothedPeak) {
            smoothedPeak = smoothedPeak + (instantaneousPeak - smoothedPeak) * attack;
        } else {
            smoothedPeak = smoothedPeak + (instantaneousPeak - smoothedPeak) * release;
        }
    }

    peakMeterData.smoothedPeak = smoothedPeak;

    context.save();

    const barHeight = height * smoothedPeak;

    context.fillStyle = METER_COLOR;
    context.fillRect(0, height - barHeight, width, barHeight);

    if (smoothedPeak > 0.95) {

        context.fillStyle = "#ff3b3b";
        context.fillRect(0, 0, width, 4);
    }

    context.restore();
}

function drawWaveformMeter(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement, peakMeterData: ChannelPeakMeterData) {

    const width = canvas.width,
        height = canvas.height;

    const data = peakMeterData.analyser.getWaveformByteData();

    if (!data) return;

    context.save();
    context.lineWidth = 1;
    context.strokeStyle = METER_COLOR;
    context.beginPath();

    const n = data.length;

    // Time runs along the vertical axis (oldest sample at the bottom, newest
    // at the top), amplitude along the horizontal axis, so the waveform reads
    // bottom-to-top like the peak meter instead of left-to-right.
    for (let i = 0; i < n; i++) {

        const v = data[i] / 255,
            x = v * width,
            y = height - (i / (n - 1)) * height;

        if (i === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
    }

    context.stroke();
    context.restore();
}

function drawSpectrumMeter(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement, peakMeterData: ChannelPeakMeterData) {

    const width = canvas.width,
        height = canvas.height;

    const data = peakMeterData.analyser.getFrequencyByteData();

    if (!data) return;

    // Only the first half of the buffer holds meaningful frequency bins.
    const binCount = Math.max(1, Math.floor(data.length / 2));
    const barCount = Math.min(SPECTRUM_BAR_COUNT, binCount);
    const binsPerBar = binCount / barCount;

    const barWidth = (width - SPECTRUM_BAR_GAP * (barCount - 1)) / barCount;

    context.save();
    context.fillStyle = METER_COLOR;

    for (let bar = 0; bar < barCount; bar++) {

        const start = Math.floor(bar * binsPerBar),
            end = Math.max(start + 1, Math.floor((bar + 1) * binsPerBar));

        let peak = 0;

        for (let bin = start; bin < end && bin < binCount; bin++)
            peak = Math.max(peak, data[bin]);

        const v = peak / 255,
            barHeight = v * height,
            x = bar * (barWidth + SPECTRUM_BAR_GAP);

        context.fillRect(x, height - barHeight, barWidth, barHeight);
    }

    context.restore();
}

function internalRenderLoop() {

    window.requestAnimationFrame(internalRenderLoop);

    const now: number = Date.now();

    if (now < lastTimestamp + (1000 / frameRate)) return;

    lastTimestamp = Date.now();

    for (let i = 0; i < channelPeakMeterDataRegistry.length; i++) {

        const peakMeterData = channelPeakMeterDataRegistry[i],
            canvas = peakMeterData.canvas,
            context = peakMeterData.context;

        const rect = canvas.getBoundingClientRect(),
            targetWidth = Math.floor(rect.width),
            targetHeight = Math.floor(rect.height);

        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {

            canvas.width = targetWidth;
            canvas.height = targetHeight;
        }

        const width = canvas.width,
            height = canvas.height;

        if (width === 0 || height === 0) continue;

        context.clearRect(0, 0, width, height);

        switch (currentViewMode) {
            case "waveform":
                drawWaveformMeter(context, canvas, peakMeterData);
                break;
            case "spectrum":
                drawSpectrumMeter(context, canvas, peakMeterData);
                break;
            case "peak":
            default:
                drawPeakMeter(context, canvas, peakMeterData);
                break;
        }
    }
}

export function startMixerPeakMeterService() {
    internalRenderLoop();
}

export function getMixerMeterViewMode(): MixerMeterViewMode {
    return currentViewMode;
}

export function setMixerMeterViewMode(mode: MixerMeterViewMode) {

    if (mode === currentViewMode) return;

    currentViewMode = mode;

    const fftSize = fftSizeForViewMode(currentViewMode);

    for (const data of channelPeakMeterDataRegistry)
        data.analyser.setOptions({ fftSize });
}

export function addPeakMeterDataToRegistry(data: ChannelPeakMeterData): ChannelPeakMeterData | null {

    for (const _data of channelPeakMeterDataRegistry)
        if (_data.id === data.id)
            return null;

    data.analyser.setOptions({ fftSize: fftSizeForViewMode(currentViewMode) });

    channelPeakMeterDataRegistry.push(data);
    return data;
}

export function removePeakMeterDataFromRegistryById(id: string) {

    for (let i = 0; i < channelPeakMeterDataRegistry.length; i++) {

        const data: ChannelPeakMeterData = channelPeakMeterDataRegistry[i];

        if (data.id === id)
            channelPeakMeterDataRegistry.splice(i, 1);
    }
}
