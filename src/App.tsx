import { useEffect, useState } from "react";
import { Cable } from "lucide-react";

import Header from "./components/header/Header";
import HeaderContent from "./components/header/HeaderContent";
import HeaderTitlebar from "./components/header/HeaderTitlebar";
import HeaderDivider from "./components/header/HeaderDivider";

import DxoNavigationBar from "./components/dxo/DxoNavigationBar";
import DxoConnectionPanel from "./components/dxo/DxoConnectionPanel";
import DxoMixer from "./components/dxo/DxoMixer";
import { DxoPresetPanel, DxoSavePresetDialog, DxoUnsavedBar } from "./components/dxo/DxoPresets";
import { hasUnsavedChanges, savePreset, usePresets } from "./device/deviceStore";

import "./styles/App.scss";

/** Keeps Electron informed about unsaved changes, and saves when the user chooses "Save" on closing. */
function useCloseGuard() {

    const presets = usePresets();
    const unsaved = hasUnsavedChanges();

    useEffect(function () {
        window.dxo?.setUnsaved?.(unsaved);
    }, [unsaved]);

    useEffect(function () {
        return window.dxo?.onSaveBeforeClose?.(async function () {
            if (presets.current !== null)
                await savePreset(presets.current, presets.currentName ?? `Preset ${presets.current}`);
            window.dxo?.closeNow?.();
        });
    }, [presets.current, presets.currentName]);
}

export default function App() {

    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);

    useCloseGuard();

    return (
        <div className="app-layout">
            <div className="app-layout__container">
                <DxoNavigationBar />

                <Header position="left">
                    <HeaderContent>
                        <HeaderTitlebar icon={<Cable size={20} />} title="Processor" />
                        <HeaderDivider />
                        <DxoConnectionPanel />
                        <div className="dxo-connection dxo-connection--continued">
                            <DxoPresetPanel onSaveClick={() => setIsSaveDialogOpen(true)} />
                        </div>
                    </HeaderContent>
                </Header>

                <DxoMixer />

                <DxoUnsavedBar onSaveAsClick={() => setIsSaveDialogOpen(true)} />
                {isSaveDialogOpen && <DxoSavePresetDialog onClose={() => setIsSaveDialogOpen(false)} />}
            </div>
        </div>
    );
}
