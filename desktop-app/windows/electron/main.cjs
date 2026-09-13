const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

const isDevelopment = process.env.KILIMOCHAT_DEV === 'true' || (process.env.KILIMOCHAT_DEV !== 'false' && !app.isPackaged);
const rendererUrl = process.env.KILIMOCHAT_RENDERER_URL || 'http://localhost:3001';

function createWindow() {
    const window = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 980,
        minHeight: 640,
        show: false,
        frame: false,
        backgroundColor: '#f3f6f3',
        title: 'KilimoChat Desktop',
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            preload: path.join(__dirname, 'preload.cjs'),
        },
    });

    window.once('ready-to-show', () => window.show());
    window.on('maximize', () => window.webContents.send('window:maximized', true));
    window.on('unmaximize', () => window.webContents.send('window:maximized', false));
    window.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    if (isDevelopment) {
        window.loadURL(rendererUrl);
    } else {
        window.loadFile(path.join(__dirname, '../renderer-build/index.html'));
    }
}

ipcMain.on('window:minimize', (event) => BrowserWindow.fromWebContents(event.sender)?.minimize());
ipcMain.on('window:toggle-maximize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window?.isMaximized()) window.unmaximize();
    else window?.maximize();
});
ipcMain.on('window:close', (event) => BrowserWindow.fromWebContents(event.sender)?.close());
ipcMain.handle('window:is-maximized', (event) => BrowserWindow.fromWebContents(event.sender)?.isMaximized() || false);

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});