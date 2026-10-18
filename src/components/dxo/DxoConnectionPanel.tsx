import { useCallback, useEffect, useState } from "react";
import { Plug, Unplug, RefreshCw, ShieldAlert, ShieldCheck, Usb, Cpu } from "lucide-react";

import Button from "../common/Button";
import type { SerialPortInfo } from "../../device/backend";
import { PARAMS } from "../../device/parameters";
import { SIMULATOR_PORT, connect, disconnect, isElectron, listPorts, setWriteEnabled, useDxoText, useLinkStatus } from "../../device/deviceStore";

import "./DxoConnectionPanel.scss";

const STATE_TEXT = {
    disconnected: "Not connected",
    connecting: "Connecting…",
    connected: "Connected",
    error: "Error"
} as const;

export default function DxoConnectionPanel() {

    const { status, announcement, log, refusedWrites } = useLinkStatus();

    const [ports, setPorts] = useState<SerialPortInfo[]>([]);
    const [selectedPort, setSelectedPort] = useState<string>(SIMULATOR_PORT);
    const [isBusy, setIsBusy] = useState<boolean>(false);
    const [refusalFlash, setRefusalFlash] = useState<boolean>(false);

    const unitName = useDxoText(PARAMS.unitName, 0);
    const presetName = useDxoText(PARAMS.presetName, 0);

    const isConnected = status.state === "connected";
    const isSimulator = status.detail === SIMULATOR_PORT;

    const refreshPorts = useCallback(async function () {

        const found = await listPorts();
        setPorts(found);

        // Prefer a real DXO when one is plugged in.
        const dxo = found.find(port => port.isDxo && port.path !== SIMULATOR_PORT);
        if (dxo) setSelectedPort(dxo.path);
    }, []);

    useEffect(function () {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- loads the port list once on mount
        refreshPorts();
    }, [refreshPorts]);

    useEffect(function () {
        if (refusedWrites === 0) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- briefly highlights the live control switch
        setRefusalFlash(true);
        const timer = setTimeout(() => setRefusalFlash(false), 900);
        return () => clearTimeout(timer);
    }, [refusedWrites]);

    async function onConnectClick() {
        setIsBusy(true);
        try {
            if (isConnected) await disconnect();
            else await connect(selectedPort);
        } finally {
            setIsBusy(false);
        }
    }

    async function onLiveControlClick() {

        if (!status.writeEnabled && !isSimulator) {
            const confirmed = window.confirm("Switch on live control?\n\nChanges are sent straight to the processor and are audible at once. Keep the system volume low while testing.");
            if (!confirmed) return;
        }

        await setWriteEnabled(!status.writeEnabled);
    }

    return (
        <div className="dxo-connection">
            <div className="dxo-connection__section">
                <label className="dxo-connection__label">Port</label>
                <div className="dxo-connection__row">
                    <select value={selectedPort} disabled={isConnected} onChange={event => setSelectedPort(event.target.value)}>
                        {ports.map(port => (
                            <option key={port.path} value={port.path}>
                                {port.path === SIMULATOR_PORT ? "Simulator (no hardware)" : `${port.path}${port.isDxo ? " · DXO" : ""}${port.manufacturer ? ` · ${port.manufacturer}` : ""}`}
                            </option>
                        ))}
                    </select>
                    <div className="dxo-connection__icon-button" title="Search ports again" onClick={refreshPorts}>
                        <RefreshCw size={16} />
                    </div>
                </div>

                <Button
                    icon={isConnected ? <Unplug size={16} /> : <Plug size={16} />}
                    text={isConnected ? "Disconnect" : "Connect"}
                    style={isConnected ? "red" : "normal"}
                    disabled={isBusy}
                    onClick={onConnectClick}
                />

                {!isElectron && (
                    <p className="dxo-connection__note">Running in the browser: only the simulator is available. Start the Electron app for USB.</p>
                )}
            </div>

            <div className="dxo-connection__section">
                <div className={`dxo-connection__status ${status.state}`}>
                    <span className="dxo-connection__status__dot"></span>
                    <span>{STATE_TEXT[status.state]}</span>
                    {isConnected && <span className="dxo-connection__status__tag">{isSimulator ? "Simulator" : status.mk2 ? "MK2 protocol" : "Classic protocol"}</span>}
                </div>
                {status.state === "error" && status.detail && <p className="dxo-connection__error">{status.detail}</p>}

                {isConnected && (
                    <div className="dxo-connection__unit">
                        <div><Cpu size={14} /><span>{unitName ?? "DXO processor"}</span></div>
                        {presetName && <div><span className="dxo-connection__muted">Preset</span><span>{presetName}</span></div>}
                        {announcement && (
                            <>
                                <div><span className="dxo-connection__muted">Type</span><span>{announcement.unitType}</span></div>
                                <div><span className="dxo-connection__muted">Serial</span><span>{announcement.serial}</span></div>
                                <div><span className="dxo-connection__muted">Firmware</span><span>{announcement.picVersion}</span></div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {isConnected && (
                <div className={`dxo-connection__section dxo-connection__live ${status.writeEnabled ? "on" : ""} ${refusalFlash ? "flash" : ""}`} onClick={onLiveControlClick} role="button">
                    {status.writeEnabled ? <ShieldAlert size={18} /> : <ShieldCheck size={18} />}
                    <div>
                        <p className="dxo-connection__live__title">{status.writeEnabled ? "Live control is on" : "Read only"}</p>
                        <p className="dxo-connection__live__text">{status.writeEnabled ? "Changes go to the processor. Click to lock." : "Click to allow changes to the processor."}</p>
                    </div>
                </div>
            )}

            {isElectron && log.length > 0 && (
                <div className="dxo-connection__section">
                    <label className="dxo-connection__label"><Usb size={12} /> Link log</label>
                    <div className="dxo-connection__log">
                        {log.slice(-12).map((line, index) => <p key={index}>{line}</p>)}
                    </div>
                </div>
            )}
        </div>
    );
}
