import { useEffect, useRef } from "react";

import { readMeters } from "../../device/deviceStore";
import type { DxoChannel } from "../../device/parameters";

const METER_MIN_DB = -48;
const METER_MAX_DB = 12;

export interface DxoMeterProperties {
    channel: DxoChannel;
}

function levelOf(channel: DxoChannel): { level: number | null; reduction: number | null } {

    const meters = readMeters(),
        index = channel.kind === "input" ? channel.id : channel.id - 0x80,
        vu = channel.kind === "input" ? meters.vu.in : meters.vu.out,
        gr = channel.kind === "input" ? meters.gr.in : meters.gr.out;

    return { level: vu?.[index] ?? null, reduction: gr?.[index] ?? null };
}

/** Level meter fed by the VU data the processor sends with every answer. */
export default function DxoMeter({ channel }: DxoMeterProperties) {

    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(function () {

        const canvas = canvasRef.current,
            context = canvas?.getContext("2d");

        if (!canvas || !context) return;

        const accent = getComputedStyle(canvas).getPropertyValue("--color-accent").trim() || "#FFA646";

        let smoothed = 0,
            peakHold = 0,
            peakHoldUntil = 0,
            frameId = 0;

        function render() {

            const width = canvas!.clientWidth,
                height = canvas!.clientHeight,
                ratio = window.devicePixelRatio || 1;

            if (canvas!.width !== width * ratio || canvas!.height !== height * ratio) {
                canvas!.width = width * ratio;
                canvas!.height = height * ratio;
            }

            context!.setTransform(ratio, 0, 0, ratio, 0, 0);
            context!.clearRect(0, 0, width, height);

            const { level, reduction } = levelOf(channel);
            const target = level === null ? 0 : Math.max(0, Math.min(1, (level - METER_MIN_DB) / (METER_MAX_DB - METER_MIN_DB)));

            smoothed += (target - smoothed) * (target > smoothed ? 0.6 : 0.12);

            const now = performance.now();
            if (smoothed >= peakHold || now > peakHoldUntil) { peakHold = smoothed; peakHoldUntil = now + 900; }

            const meterWidth = reduction !== null && channel.kind === "output" ? width * 0.62 : width;

            context!.fillStyle = accent;
            context!.fillRect(0, height * (1 - smoothed), meterWidth, height * smoothed);

            context!.fillStyle = level !== null && level >= 0 ? "#ff3b3b" : accent;
            context!.fillRect(0, height * (1 - peakHold), meterWidth, 2);

            if (level !== null && level >= 6) {
                context!.fillStyle = "#ff3b3b";
                context!.fillRect(0, 0, meterWidth, 4);
            }

            // Gain reduction hangs down from the top, next to the level.
            if (reduction !== null && channel.kind === "output" && reduction > 0) {
                const grHeight = Math.min(1, reduction / 24) * height;
                context!.fillStyle = "#E3B341";
                context!.fillRect(meterWidth + 2, 0, width - meterWidth - 2, grHeight);
            }

            frameId = requestAnimationFrame(render);
        }

        frameId = requestAnimationFrame(render);

        return () => cancelAnimationFrame(frameId);
    }, [channel]);

    return <canvas className="mixer-channel__peak-meter__canvas" ref={canvasRef}></canvas>;
}
