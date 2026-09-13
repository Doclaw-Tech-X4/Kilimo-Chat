const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
    platform: process.platform,
    minimize: () => ipcRenderer.send('window:minimize'),
    toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
    onMaximizedChanged: (listener) => {
        const handler = (_event, value) => listener(value);
        ipcRenderer.on('window:maximized', handler);
        return () => ipcRenderer.removeListener('window:maximized', handler);
    },
});