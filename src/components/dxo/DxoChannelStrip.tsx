import { VolumeX, SlidersHorizontal, Filter, Gauge, Route, FlipVertical2, Mic, Speaker } from "lucide-react";

import Fader from "../mixer/Fader";
import DxoMeter from "./DxoMeter";
import { PARAMS, type DxoChannel } from "../../device/parameters";
import { useDxoText, useDxoValue, writeValue } from "../../device/deviceStore";

import "../mixer/Channel.scss";
import "./DxoChannelStrip.scss";

export type DxoWindowKind = "eq" | "filters" | "dynamics" | "routing";

export interface DxoChannelStripProperties {
    channel: DxoChannel;
    isSelected: boolean;
    onOpenWindow: (channel: DxoChannel, kind: DxoWindowKind) => void;
}

function formatGain(value: number): string {
    return value <= -48 ? "-∞" : `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}

export default function DxoChannelStrip({ channel, isSelected, onOpenWindow }: DxoChannelStripProperties) {

    const gain = useDxoValue(PARAMS.gain, channel.id);
    const mute = useDxoValue(PARAMS.mute, channel.id);
    const invert = useDxoValue(PARAMS.invert, channel.id);
    const name = useDxoText(PARAMS.name, channel.id);

    const isOutput = channel.kind === "output";
    const isMuted = mute === 1;

    return (
        <div className={`mixer-channel dxo-channel ${isSelected ? "selected" : ""} ${isMuted ? "muted" : ""}`}>
            <div className="mixer-channel__container">
                <div className={`mixer-channel__channel-count ${isOutput ? "output" : "input"}`}>
                    {isOutput ? <Speaker size={12} /> : <Mic size={12} />}
                    <span>{channel.label}</span>
                </div>

                <div className="mixer-channel__channel-label" title={name ?? ""}>
                    <input readOnly spellCheck="false" value={name ?? (isOutput ? `Output ${channel.label}` : `Input ${channel.label}`)} />
                </div>

                <div className="mixer-channel__peak-meter">
                    <DxoMeter channel={channel} />
                </div>

                <Fader
                    value={gain}
                    minimumValue={PARAMS.gain.min}
                    maximumValue={PARAMS.gain.max}
                    defaultValue={0}
                    step={0.5}
                    format={formatGain}
                    onChange={value => writeValue(PARAMS.gain, channel.id, 0, value)}
                />

                <div className="mixer-channel__buttons">
                    <div className={`mixer-channel__buttons__button mute ${isMuted ? "active" : ""}`} title="Mute" onClick={() => writeValue(PARAMS.mute, channel.id, 0, isMuted ? 0 : 1)}>
                        <VolumeX size={18} />
                    </div>
                    <div className="mixer-channel__buttons__button" title="Parametric EQ" onClick={() => onOpenWindow(channel, "eq")}>
                        <SlidersHorizontal size={18} />
                    </div>
                    <div className="mixer-channel__buttons__button" title="Crossover & delay" onClick={() => onOpenWindow(channel, "filters")}>
                        <Filter size={18} />
                    </div>
                    <div className="mixer-channel__buttons__button" title="Limiter & compressor" onClick={() => onOpenWindow(channel, "dynamics")}>
                        <Gauge size={18} />
                    </div>
                    {isOutput && (
                        <>
                            <div className="mixer-channel__buttons__button" title="Routing (inputs A–D)" onClick={() => onOpenWindow(channel, "routing")}>
                                <Route size={18} />
                            </div>
                            <div className={`mixer-channel__buttons__button ${invert === 1 ? "active" : ""}`} title="Polarity" onClick={() => writeValue(PARAMS.invert, channel.id, 0, invert === 1 ? 0 : 1)}>
                                <FlipVertical2 size={18} />
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
