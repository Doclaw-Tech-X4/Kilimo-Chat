# KilimoChat Desktop for Linux

This is the Linux Electron shell for KilimoChat. It uses the renderer in `../shared` and the existing KilimoChat backend API. No backend files or endpoints are changed by this app.

## Requirements

- A current 64-bit Linux distribution with GTK 3 support
- Node.js 20 LTS or newer
- A running KilimoChat backend at `http://localhost:8000`

## First-time setup

From this folder:

```bash
npm install
cd ../shared
npm install
cd ../linux
```

If npm reports that Electron was not installed correctly because install scripts are restricted, run:

```bash
npm install-scripts approve electron
npm rebuild electron
```

Set a different backend URL when needed:

```bash
export REACT_APP_API_URL=http://192.168.1.20:8000
```

## Run in development

Terminal 1, from `desktop-app/shared`:

```bash
npm start
```

Terminal 2, from `desktop-app/linux`:

```bash
npm run dev
```

The Electron window connects to the shared renderer on port `3001`.

## Run the packaged renderer locally

```bash
npm start
```

## Build Linux packages

```bash
npm run dist
```

The AppImage and Debian package are written to `release/`.

## Backend connection

The renderer keeps the existing `REACT_APP_API_URL` contract. Start the same backend used by the web and mobile applications before signing in.

AI provider selection is centralized in the backend. When `AI_PAID_TIER_ENABLED=false`, Linux uses
the same free-tier Gemini/Groq fallback as Windows, mobile, web, and WhatsApp.