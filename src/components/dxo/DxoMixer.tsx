import { useCallback, useState } from "react";
import { Fragment } from "react";
import { SlidersHorizontal, Filter, Gauge, Route, Link2, Unlink2 } from "lucide-react";

import DxoChannelStrip, { type DxoWindowKind } from "./DxoChannelStrip";
import DxoEqualizerWindow from "./DxoEqualizerWindow";
import { DxoDynamicsWindow, DxoFiltersWindow, DxoRoutingWindow } from "./DxoChannelWindows";
import { INPUTS, OUTPUTS, type DxoChannel } from "../../device/parameters";
import useWindow from "../../hooks/useWindow";
import { areLinked, copyChannelSettings, linkChannels, linkedChannels, unlinkChannels, useChannelLayout, useLinkGroups, useLinkStatus } from "../../device/deviceStore";

import "../mixer/Mixer.scss";
import "./DxoMixer.scss";

const WINDOWS: Record<DxoWindowKind, { title: string; icon: React.ReactNode; width: number; height: number }> = {
    eq: { title: "Parametric EQ", icon: <SlidersHorizontal size={14} />, width: 760, height: 560 },
    filters: { title: "Crossover & delay", icon: <Filter size={14} />, width: 560, height: 560 },
    dynamics: { title: "Limiter & compressor", icon: <Gauge size={14} />, width: 600, height: 470 },
    routing: { title: "Routing", icon: <Route size={14} />, width: 520, height: 330 }
};

/** The chain between two neighbouring strips: click to link or unlink them. */
function LinkToggle({ left, right }: { left: DxoChannel; right: DxoChannel }) {

    useLinkGroups();
    const { status } = useLinkStatus();
    const linked = areLinked(left.id, right.id);

    function onClick() {

        if (linked) return unlinkChannels(left.id, right.id);

        linkChannels(left.id, right.id);

        const copy = status.state === "connected" && status.writeEnabled &&
            window.confirm(`${channelTitle(left)} and ${channelTitle(right)} are now linked.

Copy the settings of ${channelTitle(left)} to ${channelTitle(right)}, so both start out the same?
(Names, routing and polarity stay as they are.)`);

        if (copy) copyChannelSettings(left.id, right.id);
    }

    return (
        <div className={`dxo-link-toggle ${linked ? "linked" : ""}`} title={linked ? `Unlink ${channelTitle(left)} and ${channelTitle(right)}` : `Link ${channelTitle(left)} and ${channelTitle(right)}`} onClick={onClick}>
            {linked ? <Link2 size={12} /> : <Unlink2 size={12} />}
        </div>
    );
}

function renderStrips(channels: DxoChannel[], selected: number | null, openWindow: (channel: DxoChannel, kind: DxoWindowKind) => void) {
    return channels.map((channel, i) => (
        <Fragment key={channel.id}>
            {i > 0 && <LinkToggle left={channels[i - 1]} right={channel} />}
            <DxoChannelStrip channel={channel} isSelected={selected === channel.id} onOpenWindow={openWindow} />
        </Fragment>
    ));
}

function channelTitle(channel: DxoChannel): string {
    return channel.kind === "input" ? `Input ${channel.label}` : `Output ${channel.label}`;
}

export default function DxoMixer() {

    const { setContent, setTitle, setIcon, setSize, showWindow } = useWindow();
    const [selected, setSelected] = useState<number | null>(null);
    const layout = useChannelLayout();

    const openWindow = useCallback(function (channel: DxoChannel, kind: DxoWindowKind) {

        const definition = WINDOWS[kind];
        const key = `${kind}-${channel.id}`;

        setSelected(channel.id);
        const partners = linkedChannels(channel.id).filter(id => id !== channel.id).map(id => id >= 0x80 ? String(id - 0x7f) : "ABCD"[id]);
        setTitle(`${definition.title} · ${channelTitle(channel)}${partners.length && kind !== "routing" ? ` (linked with ${partners.join(", ")})` : ""}`);
        setIcon(definition.icon);

        switch (kind) {
            case "eq": setContent(<DxoEqualizerWindow key={key} channel={channel} />); break;
            case "filters": setContent(<DxoFiltersWindow key={key} channel={channel} />); break;
            case "dynamics": setContent(<DxoDynamicsWindow key={key} channel={channel} />); break;
            case "routing": setContent(<DxoRoutingWindow key={key} channel={channel} />); break;
        }

        showWindow();
        setSize(definition.width, definition.height);
    }, [setContent, setTitle, setIcon, setSize, showWindow]);

    return (
        <div className="app-mixer dxo-mixer">
            <div className="dxo-mixer__groups">
                <section className="dxo-mixer__group">
                    <h2 className="dxo-mixer__group__title">Inputs</h2>
                    <div className="dxo-mixer__group__channels">
                        {renderStrips(INPUTS.slice(0, layout.inputs), selected, openWindow)}
                    </div>
                </section>

                <div className="dxo-mixer__divider"></div>

                <section className="dxo-mixer__group">
                    <h2 className="dxo-mixer__group__title">Outputs</h2>
                    <div className="dxo-mixer__group__channels">
                        {renderStrips(OUTPUTS.slice(0, layout.outputs), selected, openWindow)}
                    </div>
                </section>
            </div>
        </div>
    );
}
