import { useCallback, useSyncExternalStore } from "react";

import type { Announcement, DxoBackend, LinkStatus, Meters, SerialPortInfo } from "./backend";
import { createSimulatorBackend } from "./simulator";
import { ALL_CHANNELS, FLAG_PRESET_CHANGED, INPUTS, OUTPUTS, PARAMS, PRESET_COUNT, channelKeys, presetKeys, definitionForKey, fromRaw, keyFor, keyId, toRaw, type DxoKey, type ParameterDefinition } from "./parameters";

export const SIMULATOR_PORT = "SIMULATOR";

type Listener = () => void;

const simulator = createSimulatorBackend();
const electron: DxoBackend | undefined = window.dxo;

export const isElectron: boolean = electron !== undefined;

let backend: DxoBackend = simulator;
let unsubscribeBackend: (() => void) | null = null;

const values = new Map<string, number | string>();
const valueListeners = new Map<string, Set<Listener>>();

let status: LinkStatus = { state: "disconnected", detail: null, mk2: false, writeEnabled: false };
let announcement: Announcement | null = null;
let meters: Meters = { vu: { in: null, out: null }, gr: { in: null, out: null } };
let log: string[] = [];
let refusedWrites = 0;

/** How many inputs/outputs the connected unit has, taken from the length of its VU data. */
export interface ChannelLayout { inputs: number; outputs: number; }
let layout: ChannelLayout = { inputs: INPUTS.length, outputs: OUTPUTS.length };

const statusListeners = new Set<Listener>();
const layoutListeners = new Set<Listener>();
const meterListeners = new Set<Listener>();

function notify(set: Set<Listener> | undefined) {
    if (set) for (const listener of set) listener();
}

function attach(next: DxoBackend) {

    unsubscribeBackend?.();
    backend = next;

    const unsubscribers = [
        next.onStatus(nextStatus => { status = nextStatus; notify(statusListeners); }),
        next.onAnnouncement(nextAnnouncement => { announcement = nextAnnouncement; notify(statusListeners); }),
        next.onValues(received => {
            for (const { key, value } of received) {
                if (value === null) continue;
                const id = keyId(key);
                values.set(id, value);
                notify(valueListeners.get(id));
            }
        }),
        next.onMeters(nextMeters => {
            meters = nextMeters;
            notify(meterListeners);
            const inputs = nextMeters.vu.in?.length ?? layout.inputs,
                outputs = nextMeters.vu.out?.length ?? layout.outputs;
            if (inputs !== layout.inputs || outputs !== layout.outputs) {
                layout = { inputs: Math.min(inputs, INPUTS.length), outputs: Math.min(outputs, OUTPUTS.length) };
                notify(layoutListeners);
            }
        }),
        next.onLog(message => { log = [...log.slice(-200), message]; notify(statusListeners); })
    ];

    unsubscribeBackend = () => unsubscribers.forEach(unsubscribe => unsubscribe());
}

attach(simulator);

export async function listPorts(): Promise<SerialPortInfo[]> {
    const simulated = await simulator.listPorts();
    if (!electron) return simulated;
    return [...(await electron.listPorts()), ...simulated];
}

export async function connect(portPath: string): Promise<boolean> {

    await backend.disconnect();

    values.clear();
    announcement = null;
    meters = { vu: { in: null, out: null }, gr: { in: null, out: null } };
    for (const set of valueListeners.values()) notify(set);

    attach(portPath === SIMULATOR_PORT || !electron ? simulator : electron);

    const ok = await backend.connect(portPath);

    if (ok) {
        // The real unit starts read-only. The simulator may be changed freely.
        await backend.setWriteEnabled(portPath === SIMULATOR_PORT);
        await backend.requestValues([keyFor(PARAMS.unitName, 0), ...presetKeys(), ...ALL_CHANNELS.flatMap(channelKeys)]);
    }

    return ok;
}

export function disconnect(): Promise<void> {
    return backend.disconnect();
}

export function setWriteEnabled(enabled: boolean): Promise<void> {
    return backend.setWriteEnabled(enabled);
}

export function refreshChannel(channelId: number) {
    const channel = ALL_CHANNELS.find(c => c.id === channelId);
    if (channel) backend.requestValues(channelKeys(channel));
}

/** Sends a display value to the unit. Returns false when live control is off. */
export function writeValue(parameter: ParameterDefinition, channel: number, index: number, value: number | string): boolean {

    if (!status.writeEnabled || status.state !== "connected") {
        refusedWrites++;
        notify(statusListeners);
        return false;
    }

    const raw = typeof value === "string" ? value : toRaw(parameter, Math.min(parameter.max, Math.max(parameter.min, value)));

    const targets = isLinkable(parameter) ? linkedChannels(channel) : [channel];

    for (const target of targets) {
        const key: DxoKey = keyFor(parameter, target, index);
        const id = keyId(key);
        values.set(id, raw);
        notify(valueListeners.get(id));
        backend.setValue(key, raw);
    }

    setLocalChanges(true);
    return true;
}

/* ---------- Channel links ---------- */

/**
 * Linked channels follow each other: a change to one is written to all of them.
 * Stored as groups of channel ids, per browser profile.
 */
const LINKS_STORAGE_KEY = "dxo-mixer.links";

let linkGroups: number[][] = (function () {
    try {
        const stored = JSON.parse(localStorage.getItem(LINKS_STORAGE_KEY) ?? "[]");
        return Array.isArray(stored) ? stored.filter(group => Array.isArray(group) && group.length > 1) : [];
    } catch {
        return [];
    }
})();

const linkListeners = new Set<Listener>();

function storeLinks(next: number[][]) {
    linkGroups = next.filter(group => group.length > 1).map(group => [...group].sort((a, b) => a - b));
    try { localStorage.setItem(LINKS_STORAGE_KEY, JSON.stringify(linkGroups)); } catch { /* private window: links last for this session */ }
    notify(linkListeners);
}

/** Names, routing and polarity stay per channel: a stereo pair usually differs there. */
function isLinkable(parameter: ParameterDefinition): boolean {
    return parameter !== PARAMS.name && parameter !== PARAMS.mixerGain && parameter !== PARAMS.invert;
}

export function linkedChannels(channel: number): number[] {
    return linkGroups.find(group => group.includes(channel)) ?? [channel];
}

export function areLinked(a: number, b: number): boolean {
    return linkedChannels(a).includes(b);
}

/** Links `a` and `b` (and whatever they were already linked with). */
export function linkChannels(a: number, b: number) {
    const merged = [...new Set([...linkedChannels(a), ...linkedChannels(b)])];
    storeLinks([...linkGroups.filter(group => !group.includes(a) && !group.includes(b)), merged]);
}

/** Cuts the link between neighbours `a` and `b`; channels on each side stay linked. */
export function unlinkChannels(a: number, b: number) {
    const group = linkedChannels(a);
    const left = group.filter(id => id <= Math.min(a, b));
    const right = group.filter(id => id >= Math.max(a, b));
    storeLinks([...linkGroups.filter(g => g !== group), left, right]);
}

/** Copies every linkable setting of `from` to `to`, so linked channels start out equal. */
export function copyChannelSettings(from: number, to: number): boolean {

    const source = ALL_CHANNELS.find(c => c.id === from);
    if (!source || !status.writeEnabled || status.state !== "connected") return false;

    for (const key of channelKeys(source)) {
        const parameter = definitionForKey(key);
        const raw = values.get(keyId(key));
        if (!parameter || raw === undefined || !isLinkable(parameter)) continue;

        const target: DxoKey = [key[0], key[1], to, key[3]];
        values.set(keyId(target), raw);
        notify(valueListeners.get(keyId(target)));
        backend.setValue(target, raw);
    }

    setLocalChanges(true);
    return true;
}

export function useLinkGroups(): number[][] {
    const subscribe = useCallback((listener: Listener) => { linkListeners.add(listener); return () => { linkListeners.delete(listener); }; }, []);
    return useSyncExternalStore(subscribe, () => linkGroups);
}

/* ---------- Presets ---------- */

/** Changes made from this app since the last load/save. The unit's own flag wins when it is known. */
let localChanges = false;

/** The unit clears its "preset changed" flag a moment after a load/save; until then its flag is ignored. */
let ignoreFlagsUntil = 0;

function afterPresetAction() {
    setLocalChanges(false);
    ignoreFlagsUntil = Date.now() + 4000;
    notify(presetListeners);
    for (const delay of [1500, 3000, 4500]) setTimeout(() => backend.requestValues([keyFor(PARAMS.statusFlags, 0)]), delay);
    setTimeout(() => notify(presetListeners), 4100);
}
const presetListeners = new Set<Listener>();

function setLocalChanges(changed: boolean) {
    if (localChanges === changed) return;
    localChanges = changed;
    notify(presetListeners);
}

export async function loadPreset(number: number): Promise<boolean> {
    // Loading a preset works without live control; only individual edits need it.
    if (status.state !== "connected") return false;
    const ok = await backend.loadPreset(number);
    if (ok) {
        afterPresetAction();
        // Everything may have changed: read the whole unit again.
        await backend.requestValues([...presetKeys(), ...ALL_CHANNELS.flatMap(channelKeys)]);
    }
    return ok;
}

export async function savePreset(number: number, name: string): Promise<boolean> {
    if (!status.writeEnabled || status.state !== "connected") { refusedWrites++; notify(statusListeners); return false; }
    const ok = await backend.savePreset(number, name);
    if (ok) {
        afterPresetAction();
        await backend.requestValues([keyFor(PARAMS.statusFlags, 0), keyFor(PARAMS.presetName, number), keyFor(PARAMS.presetName, 0), keyFor(PARAMS.presetNumber, 0)]);
    }
    return ok;
}

export interface PresetSlot {
    number: number;
    name: string;
    isEmpty: boolean;
    isReadOnly: boolean;
}

export interface PresetState {
    current: number | null;
    currentName: string | null;
    slots: PresetSlot[];
    readOnlyUpTo: number;
    hasUnsavedChanges: boolean;
}

let presetSnapshot: PresetState | null = null;
let presetSignature = "";

function readPresetState(): PresetState {

    const ids = presetKeys().map(keyId);
    const ignoreFlags = Date.now() < ignoreFlagsUntil;
    const signature = ids.map(id => String(values.get(id) ?? "")).join("|") + "|" + localChanges + "|" + ignoreFlags;

    if (presetSnapshot && signature === presetSignature) return presetSnapshot;

    const raw = (parameter: ParameterDefinition, channel: number) => values.get(keyId(keyFor(parameter, channel)));
    const startup = Number(raw(PARAMS.startupPreset, 0) ?? 0);
    const readOnlyUpTo = (startup & 0xff00) >> 8;
    const flags = raw(PARAMS.statusFlags, 0);

    const slots: PresetSlot[] = [];
    for (let n = 1; n <= PRESET_COUNT; n++) {
        const name = raw(PARAMS.presetName, n);
        if (typeof name !== "string") continue;
        const isEmpty = /^empty( preset)?$/i.test(name.trim()) || name.trim() === "";
        slots.push({ number: n, name: isEmpty ? "Empty" : name, isEmpty, isReadOnly: n <= readOnlyUpTo });
    }

    const current = raw(PARAMS.presetNumber, 0);
    const currentName = raw(PARAMS.presetName, 0);

    presetSignature = signature;
    presetSnapshot = {
        current: typeof current === "number" ? current : null,
        currentName: typeof currentName === "string" ? currentName : null,
        slots,
        readOnlyUpTo,
        hasUnsavedChanges: typeof flags === "number" && !ignoreFlags ? (flags & FLAG_PRESET_CHANGED) !== 0 || localChanges : localChanges
    };
    return presetSnapshot;
}

export function usePresets(): PresetState {
    const subscribe = useCallback((listener: Listener) => {
        const unsubscribers = presetKeys().map(key => subscribeKey(keyId(key), listener));
        presetListeners.add(listener);
        return () => { unsubscribers.forEach(unsubscribe => unsubscribe()); presetListeners.delete(listener); };
    }, []);
    return useSyncExternalStore(subscribe, readPresetState);
}

export function hasUnsavedChanges(): boolean {
    return status.state === "connected" && readPresetState().hasUnsavedChanges;
}

function subscribeKey(id: string, listener: Listener) {
    let set = valueListeners.get(id);
    if (!set) valueListeners.set(id, set = new Set());
    set.add(listener);
    return () => { set!.delete(listener); };
}

/** The display value of one parameter, or null while it has not been read yet. */
export function useDxoValue(parameter: ParameterDefinition, channel: number, index: number = 0): number | null {

    const id = keyId(keyFor(parameter, channel, index));
    const subscribe = useCallback((listener: Listener) => subscribeKey(id, listener), [id]);

    const raw = useSyncExternalStore(subscribe, () => values.get(id));

    if (raw === undefined || typeof raw === "string") return null;
    return fromRaw(parameter, raw);
}

export function useDxoText(parameter: ParameterDefinition, channel: number, index: number = 0): string | null {

    const id = keyId(keyFor(parameter, channel, index));
    const subscribe = useCallback((listener: Listener) => subscribeKey(id, listener), [id]);

    const raw = useSyncExternalStore(subscribe, () => values.get(id));

    return typeof raw === "string" ? raw : null;
}

export function useLinkStatus(): { status: LinkStatus; announcement: Announcement | null; log: string[]; refusedWrites: number } {

    const subscribe = useCallback((listener: Listener) => { statusListeners.add(listener); return () => { statusListeners.delete(listener); }; }, []);

    useSyncExternalStore(subscribe, () => status);
    useSyncExternalStore(subscribe, () => announcement);
    useSyncExternalStore(subscribe, () => log);
    useSyncExternalStore(subscribe, () => refusedWrites);

    return { status, announcement, log, refusedWrites };
}

/** Meters change ~20 times per second; read them in an animation loop instead of rendering. */
export function readMeters(): Meters {
    return meters;
}

export function subscribeMeters(listener: Listener): () => void {
    meterListeners.add(listener);
    return () => { meterListeners.delete(listener); };
}

export { definitionForKey };

export interface ValueRequest {
    parameter: ParameterDefinition;
    channel: number;
    index?: number;
}

/** Many display values at once (e.g. all EQ bands). Re-renders when any of them changes. */
export function useDxoValues(requests: ValueRequest[]): (number | null)[] {

    const ids = requests.map(request => keyId(keyFor(request.parameter, request.channel, request.index ?? 0)));
    const signature = ids.join("|");

    const subscribe = useCallback((listener: Listener) => {
        const unsubscribers = signature.split("|").map(id => subscribeKey(id, listener));
        return () => unsubscribers.forEach(unsubscribe => unsubscribe());
    }, [signature]);

    // A string snapshot stays stable between renders as long as no value changed.
    const snapshot = useSyncExternalStore(subscribe, () => ids.map(id => String(values.get(id) ?? "")).join("|"));

    return snapshot.split("|").map((raw, i) => raw === "" || isNaN(Number(raw)) ? null : fromRaw(requests[i].parameter, Number(raw)));
}

export function useChannelLayout(): ChannelLayout {
    const subscribe = useCallback((listener: Listener) => { layoutListeners.add(listener); return () => { layoutListeners.delete(listener); }; }, []);
    return useSyncExternalStore(subscribe, () => layout);
}
