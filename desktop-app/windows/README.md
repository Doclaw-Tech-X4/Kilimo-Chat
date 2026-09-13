# KilimoChat Desktop for Windows

This is the Windows Electron shell for KilimoChat. It uses the renderer in `../shared` and the existing KilimoChat backend API. No backend files or endpoints are changed by this app.

## Requirements

- Windows 10 or newer
- Node.js 20 LTS or newer
- A running KilimoChat backend at `http://localhost:8000`

## First-time setup

From this folder:

```powershell
npm install
cd ..\shared
npm install
cd ..\windows
```

If npm reports that Electron was not installed correctly because install scripts are restricted, run from this folder:

```powershell
npm install-scripts approve electron
npm rebuild electron
```

Set a different backend URL when needed:

```powershell
$env:REACT_APP_API_URL = "http://192.168.1.20:8000"
```

## Run in development

Terminal 1, from `desktop-app\shared`:

```powershell
npm start
```

Terminal 2, from `desktop-app\windows`:

```powershell
npm run dev
```

The Electron window connects to the shared renderer on port `3001`.

## Run the packaged renderer locally

```powershell
npm start
```

## Build an installer

```powershell
npm run dist
```

The installer and portable executable are written to `release/`. Build Windows artifacts on Windows for the most reliable signing and installer results.

## Backend connection

The renderer keeps the existing `REACT_APP_API_URL` contract. Start the same backend used by the web and mobile applications before signing in.