import { useEffect, useMemo, useState } from "react";
import { Save, X, Lock, CircleDot } from "lucide-react";

import Button from "../common/Button";
import { loadPreset, savePreset, useLinkStatus, usePresets, type PresetSlot } from "../../device/deviceStore";

import "./DxoPresets.scss";

/** The preset list in the side panel: shows the current preset and loads others. */
export function DxoPresetPanel({ onSaveClick }: { onSaveClick: () => void }) {

    const presets = usePresets();
    const { status } = useLinkStatus();
    const [busy, setBusy] = useState<number | null>(null);
    const [showEmpty, setShowEmpty] = useState(false);

    if (status.state !== "connected") return null;

    const visible = presets.slots.filter(slot => showEmpty || !slot.isEmpty);
    const emptyCount = presets.slots.filter(slot => slot.isEmpty).length;

    async function onLoad(slot: PresetSlot) {

        if (slot.isEmpty || busy !== null) return;
        if (slot.number === presets.current && !presets.hasUnsavedChanges) return;

        // Only ask when switching would throw away changes.
        if (presets.hasUnsavedChanges && !window.confirm(`Load preset ${slot.number} "${slot.name}"?\n\nThe current settings have changes that are not saved. They will be lost.`)) return;

        setBusy(slot.number);
        try {
            await loadPreset(slot.number);
        } finally {
            setBusy(null);
        }
    }

    return (
        <div className="dxo-connection__section dxo-presets">
            <div className="dxo-presets__header">
                <label className="dxo-connection__label">Presets</label>
                <div className="dxo-connection__icon-button" title="Save the current settings" onClick={onSaveClick}>
                    <Save size={16} />
                </div>
            </div>

            <div className="dxo-presets__current">
                <span className="dxo-presets__current__number">{presets.current ?? "–"}</span>
                <span className="dxo-presets__current__name">{presets.currentName ?? "…"}</span>
                {presets.hasUnsavedChanges && <span className="dxo-presets__changed" title="Changed since this preset was loaded"><CircleDot size={12} /> changed</span>}
            </div>

            <div className="dxo-presets__list">
                {visible.map(slot => (
                    <div
                        key={slot.number}
                        className={`dxo-presets__slot ${slot.number === presets.current ? "current" : ""} ${slot.isEmpty ? "empty" : ""}`}
                        onClick={() => onLoad(slot)}
                        title={slot.isEmpty ? "Empty slot" : slot.number === presets.current ? "Current preset" : "Click to load"}
                    >
                        <span className="dxo-presets__slot__number">{slot.number}</span>
                        <span className="dxo-presets__slot__name">{slot.name}</span>
                        {slot.isReadOnly && <Lock size={12} />}
                        {busy === slot.number && <span className="dxo-presets__slot__busy">Loading…</span>}
                    </div>
                ))}
                {presets.slots.length === 0 && <p className="dxo-connection__note">Reading presets…</p>}
            </div>

            {emptyCount > 0 && (
                <p className="dxo-presets__toggle" onClick={() => setShowEmpty(!showEmpty)}>
                    {showEmpty ? "Hide empty slots" : `Show ${emptyCount} empty slots`}
                </p>
            )}
        </div>
    );
}

/** Choose a slot and a name, then store the current settings there. */
export function DxoSavePresetDialog({ onClose }: { onClose: (saved: boolean) => void }) {

    const presets = usePresets();
    const [number, setNumber] = useState<number>(presets.current ?? 1);
    const [name, setName] = useState<string>(presets.currentName ?? "");
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const slot = useMemo(() => presets.slots.find(s => s.number === number), [presets.slots, number]);

    useEffect(function () {
        // Suggest the slot's own name when switching to another filled slot.
        // eslint-disable-next-line react-hooks/set-state-in-effect -- follows the chosen slot
        if (slot && !slot.isEmpty && number !== presets.current) setName(slot.name);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the slot changes
    }, [number]);

    async function onSave() {

        if (slot?.isReadOnly) return setError(`Preset ${number} is protected.`);
        if (slot && !slot.isEmpty && number !== presets.current && !window.confirm(`Preset ${number} "${slot.name}" is not empty. Overwrite it?`)) return;

        setIsSaving(true);
        setError(null);

        const ok = await savePreset(number, name.trim() || `Preset ${number}`);

        setIsSaving(false);

        if (ok) onClose(true);
        else setError("Saving failed. Is live control switched on?");
    }

    return (
        <div className="dxo-dialog-backdrop" onMouseDown={event => event.target === event.currentTarget && !isSaving && onClose(false)}>
            <div className="dxo-dialog">
                <div className="dxo-dialog__header">
                    <Save size={16} />
                    <span>Save preset</span>
                    <div className="dxo-dialog__close" onClick={() => !isSaving && onClose(false)}><X size={16} /></div>
                </div>

                <label className="dxo-connection__label">Slot</label>
                <select value={number} onChange={event => setNumber(Number(event.target.value))} disabled={isSaving}>
                    {Array.from({ length: Math.max(presets.slots.at(-1)?.number ?? 0, 1) }, (_, i) => i + 1).map(n => {
                        const s = presets.slots.find(item => item.number === n);
                        return <option key={n} value={n} disabled={s?.isReadOnly}>{n}: {s ? s.name : "?"}{n === presets.current ? "  (current)" : ""}{s?.isReadOnly ? "  (protected)" : ""}</option>;
                    })}
                </select>

                <label className="dxo-connection__label">Name</label>
                <input value={name} maxLength={16} onChange={event => setName(event.target.value)} disabled={isSaving} autoFocus onKeyDown={event => event.key === "Enter" && onSave()} />

                {error && <p className="dxo-connection__error">{error}</p>}

                <div className="dxo-dialog__buttons">
                    <Button text="Cancel" onClick={() => onClose(false)} />
                    <Button icon={<Save size={16} />} text={isSaving ? "Saving…" : "Save"} disabled={isSaving} onClick={onSave} />
                </div>
            </div>
        </div>
    );
}

/** Shown below the mixer while the settings differ from the loaded preset. */
export function DxoUnsavedBar({ onSaveAsClick }: { onSaveAsClick: () => void }) {

    const presets = usePresets();
    const { status } = useLinkStatus();
    const [dismissedAt, setDismissedAt] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const signature = `${presets.current}`;

    if (status.state !== "connected" || !presets.hasUnsavedChanges || dismissedAt === signature) return null;

    const canWrite = status.writeEnabled;

    async function onSaveCurrent() {

        if (presets.current === null) return onSaveAsClick();

        const slot = presets.slots.find(s => s.number === presets.current);
        if (slot?.isReadOnly) return onSaveAsClick();

        setIsSaving(true);
        await savePreset(presets.current, presets.currentName ?? slot?.name ?? `Preset ${presets.current}`);
        setIsSaving(false);
    }

    return (
        <div className="dxo-unsaved-bar">
            <CircleDot size={16} />
            <span>
                The settings have changed since preset <b>{presets.current} "{presets.currentName}"</b> was loaded. Save the changes?
                {!canWrite && " (Switch on live control to save.)"}
            </span>
            <div className="dxo-unsaved-bar__buttons">
                <button disabled={!canWrite || isSaving} className="primary" onClick={onSaveCurrent}>{isSaving ? "Saving…" : `Save to ${presets.current ?? "preset"}`}</button>
                <button disabled={!canWrite || isSaving} onClick={onSaveAsClick}>Save as…</button>
                <button disabled={isSaving} onClick={() => setDismissedAt(signature)}>Not now</button>
            </div>
        </div>
    );
}
