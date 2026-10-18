const path = require("node:path");
const { app, BrowserWindow, dialog, ipcMain } = require("electron");

const { DxoLink, listPorts } = require("./dxo-link.cjs");

const DEV_SERVER_URL = process.env.DXO_DEV_SERVER_URL;

let mainWindow = null;
let hasUnsavedChanges = false;
let forceClose = false;
const link = new DxoLink();

function send(channel, payload) {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
}

link.on("status", status => send("dxo:status", status));
link.on("announcement", announcement => send("dxo:announcement", announcement));
link.on("values", values => send("dxo:values", values));
link.on("meters", meters => send("dxo:meters", meters));
link.on("log", message => { console.log("[dxo]", message); send("dxo:log", message); });

ipcMain.handle("dxo:list-ports", () => listPorts());
ipcMain.handle("dxo:connect", (_event, portPath) => link.connect(portPath).then(() => true, () => false));
ipcMain.handle("dxo:disconnect", () => link.disconnect());
ipcMain.handle("dxo:request-values", (_event, keys) => link.requestValues(keys));
ipcMain.handle("dxo:set-value", (_event, key, rawValue) => link.setValue(key, rawValue));
ipcMain.handle("dxo:set-write-enabled", (_event, enabled) => link.setWriteEnabled(enabled));
ipcMain.on("dxo:unsaved", (_event, unsaved) => { hasUnsavedChanges = unsaved; });
ipcMain.on("dxo:close-now", () => { forceClose = true; mainWindow?.close(); });
ipcMain.handle("dxo:load-preset", (_event, number) => link.loadPreset(number));
ipcMain.handle("dxo:save-preset", (_event, number, name) => link.savePreset(number, name));

function createWindow() {

    mainWindow = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 1000,
        minHeight: 640,
        backgroundColor: "#0d0f12",
        title: "DXO Mixer",
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, "preload.cjs"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        }
    });

    if (DEV_SERVER_URL) mainWindow.loadURL(DEV_SERVER_URL);
    else mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));

    mainWindow.on("close", event => {

        if (forceClose || !hasUnsavedChanges) return;

        event.preventDefault();

        const choice = dialog.showMessageBoxSync(mainWindow, {
            type: "question",
            buttons: ["Save", "Don't save", "Cancel"],
            defaultId: 0,
            cancelId: 2,
            title: "Unsaved changes",
            message: "The settings on the processor have changed since the preset was loaded.",
            detail: "Save them to the current preset before closing? Without saving, the processor keeps the changes until another preset is loaded."
        });

        if (choice === 0) send("dxo:save-before-close");
        else if (choice === 1) { forceClose = true; mainWindow.close(); }
    });

    mainWindow.on("closed", () => { mainWindow = null; });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", async () => {
    await link.disconnect();
    app.quit();
});
