import type { DxoKey } from "./parameters";

export type LinkState = "disconnected" | "connecting" | "connected" | "error";

export interface LinkStatus {
    state: LinkState;
    detail: string | null;
    mk2: boolean;
    writeEnabled: boolean;
}

export interface SerialPortInfo {
    path: string;
    manufacturer: string;
    vendorId: string;
    productId: string;
    isDxo: boolean;
}

export interface Announcement {
    unitType: string;
    hardwareVersion: string;
    picVersion: string;
    serial: number;
    productionDate: string;
}

export interface RawValue {
    key: DxoKey;
    value: number | string | null;
}

export interface Meters {
    vu: { in: number[] | null; out: number[] | null };
    gr: { in: number[] | null; out: number[] | null };
}

/** What the Electron preload exposes as window.dxo. The simulator implements the same shape. */
export interface DxoBackend {
    listPorts(): Promise<SerialPortInfo[]>;
    connect(portPath: string): Promise<boolean>;
    disconnect(): Promise<void>;
    requestValues(keys: DxoKey[]): Promise<void>;
    setValue(key: DxoKey, rawValue: number | string): Promise<boolean>;
    setWriteEnabled(enabled: boolean): Promise<void>;
    loadPreset(number: number): Promise<boolean>;
    savePreset(number: number, name: string): Promise<boolean>;
    onStatus(callback: (status: LinkStatus) => void): () => void;
    onAnnouncement(callback: (announcement: Announcement) => void): () => void;
    onValues(callback: (values: RawValue[]) => void): () => void;
    onMeters(callback: (meters: Meters) => void): () => void;
    onLog(callback: (message: string) => void): () => void;
    /** Electron only: lets the window ask before closing with unsaved changes. */
    setUnsaved?(unsaved: boolean): void;
    onSaveBeforeClose?(callback: () => void): () => void;
    closeNow?(): void;
}

declare global {
    interface Window {
        dxo?: DxoBackend;
    }
}
