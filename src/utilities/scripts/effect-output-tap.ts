import type { Effector } from "@fluex/fluexgl-dsp";

export interface EffectOutputTapOptions {
    /** 1 analyses the downmixed signal, 2 analyses the left and right channel separately. */
    channels?: 1 | 2;
    fftSize?: number;
    smoothingTimeConstant?: number;
    minDecibels?: number;
    maxDecibels?: number;
    /** Which side of the effect is analysed. Defaults to "output". */
    tap?: "input" | "output";
}

/**
 * Listens to the output (or input) of an effect with one AnalyserNode per channel, without changing the effect chain.
 *
 * Rebuilding the effect chain of a channel disconnects every effect output, which also removes this tap.
 * Connecting an existing connection again is ignored, so the tap simply reconnects twice per second.
 */
export class EffectOutputTap {

    readonly analysers: AnalyserNode[] = [];

    private effect: Effector;
    private side: "input" | "output";
    private input: AudioNode;
    private tappedNode: AudioNode | null = null;
    private interval: number;
    private timeData: Float32Array<ArrayBuffer>;

    /** Returns null when the effect is not attached to an audio context yet. */
    static create(effect: Effector, options: EffectOutputTapOptions = {}): EffectOutputTap | null {
        return effect.context ? new EffectOutputTap(effect, effect.context, options) : null;
    }

    private constructor(effect: Effector, context: AudioContext, options: EffectOutputTapOptions) {

        this.effect = effect;
        this.side = options.tap ?? "output";

        const channels: number = options.channels ?? 1;

        for (let i = 0; i < channels; i++) {
            this.analysers.push(new AnalyserNode(context, {
                fftSize: options.fftSize ?? 2048,
                smoothingTimeConstant: options.smoothingTimeConstant ?? 0.8,
                minDecibels: options.minDecibels ?? -100,
                maxDecibels: options.maxDecibels ?? -10
            }));
        }

        if (channels === 1) {
            this.input = this.analysers[0];
        } else {
            const splitter = new ChannelSplitterNode(context, { numberOfOutputs: channels });
            this.analysers.forEach((analyser, i) => splitter.connect(analyser, i));
            this.input = splitter;
        }

        this.timeData = new Float32Array(this.analysers[0].fftSize);

        this.connect();
        this.interval = window.setInterval(() => this.connect(), 500);
    }

    /**
     * The RMS level (linear) of every channel. A mono signal only reaches the first channel
     * of the splitter, so it is mirrored to the other channels.
     */
    readLevels(): number[] {

        const levels: number[] = this.analysers.map(analyser => {

            analyser.getFloatTimeDomainData(this.timeData);

            let sum: number = 0;

            for (let i = 0; i < this.timeData.length; i++)
                sum += this.timeData[i] * this.timeData[i];

            return Math.sqrt(sum / this.timeData.length);
        });

        if (levels.length > 1 && levels[0] > 0 && levels.slice(1).every(level => level === 0))
            return levels.map(() => levels[0]);

        return levels;
    }

    dispose() {

        window.clearInterval(this.interval);

        if (this.tappedNode) {
            try { this.tappedNode.disconnect(this.input); } catch { /* already disconnected */ }
        }

        this.input.disconnect();
        this.tappedNode = null;
    }

    private connect() {

        const output: AudioNode | null = this.side === "input" ? this.effect.inputNode : this.effect.outputNode;

        if (!output) return;

        if (this.tappedNode && this.tappedNode !== output) {
            try { this.tappedNode.disconnect(this.input); } catch { /* already disconnected */ }
        }

        output.connect(this.input);
        this.tappedNode = output;
    }
}

/**
 * How much of the energy in the spectrum sits above `fromFrequency`, between 0 and 1.
 */
export function measureHighFrequencyRatio(analyser: AnalyserNode, data: Float32Array<ArrayBuffer>, fromFrequency: number): number {

    analyser.getFloatFrequencyData(data);

    const binWidth: number = analyser.context.sampleRate / analyser.fftSize,
        fromBin: number = Math.floor(fromFrequency / binWidth);

    let total: number = 0,
        high: number = 0;

    for (let i = 1; i < data.length; i++) {

        const power: number = Math.pow(10, data[i] / 10);

        total += power;

        if (i >= fromBin) high += power;
    }

    return total > 0 ? high / total : 0;
}
