const { contextBridge, ipcRenderer } = require("electron");

function subscribe(channel) {
    return callback => {
        const listener = (_event, payload) => callback(payload);
        ipcRenderer.on(channel, listener);
        return () => ipcRenderer.removeListener(channel, listener);
    };
}

contextBridge.exposeInMainWorld("dxo", {
    listPorts: () => ipcRenderer.invoke("dxo:list-ports"),
    connect: portPath => ipcRenderer.invoke("dxo:connect", portPath),
    disconnect: () => ipcRenderer.invoke("dxo:disconnect"),
    requestValues: keys => ipcRenderer.invoke("dxo:request-values", keys),
    setValue: (key, rawValue) => ipcRenderer.invoke("dxo:set-value", key, rawValue),
    setWriteEnabled: enabled => ipcRenderer.invoke("dxo:set-write-enabled", enabled),
    loadPreset: number => ipcRenderer.invoke("dxo:load-preset", number),
    savePreset: (number, name) => ipcRenderer.invoke("dxo:save-preset", number, name),
    onStatus: subscribe("dxo:status"),
    onAnnouncement: subscribe("dxo:announcement"),
    onValues: subscribe("dxo:values"),
    onMeters: subscribe("dxo:meters"),
    onLog: subscribe("dxo:log"),
    setUnsaved: unsaved => ipcRenderer.send("dxo:unsaved", !!unsaved),
    onSaveBeforeClose: subscribe("dxo:save-before-close"),
    closeNow: () => ipcRenderer.send("dxo:close-now")
});
