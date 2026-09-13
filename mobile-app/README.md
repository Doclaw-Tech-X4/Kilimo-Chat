# KilimoChat Mobile (Android)

A modern, standalone Android app for **KilimoChat** built with **React 18 + Vite + Tailwind CSS + Capacitor 7**.
It reuses the existing web app's UI/theming and API (which lives in `../backend`) without touching the backend.

- Real installable **APK** (a WebView app — no Expo Go, no browser needed).
- Themed with the KilimoChat design system (primary green `#0f7e39`, Plus Jakarta Sans / Lexend).
- Responsive for all Android screen sizes (content capped at 480px, safe-area aware).

## Requirements (already configured on this machine)

- Node 18+ (tested with v24)
- JDK **21** installed (`/home/DeathStar/Development/toolchains/jdk-21.0.12.1+1`) — the Capacitor
  geolocation plugin requires a Java 21 toolchain; JDK 17 is also present at `…/jdk-17.0.20.1+1`.
- Android SDK at `/home/DeathStar/Development/Android` (cmdline-tools, platform-tools,
  platforms;android-35, build-tools 34 & 35).

Point the build at them every time:

```bash
export ANDROID_HOME=/home/DeathStar/Development/Android
export ANDROID_SDK_ROOT=$ANDROID_HOME
export JAVA_HOME=/home/DeathStar/Development/toolchains/jdk-21.0.12.1+1
export PATH=$JAVA_HOME/bin:$PATH
```

## How the app talks to the backend

The backend is a FastAPI server (`./backend/main.py`) running on `0.0.0.0:8000` with CORS wide open.
At build time, `vite.config.js` uses `VITE_API_URL` when provided. Otherwise it detects a private
LAN IPv4 and bakes it in as `__API_URL__`. The app also probes Android emulator and USB reverse-
debugging addresses automatically.

- To override (e.g. a different machine, or using the current IP explicitly):
  `VITE_API_URL=http://192.168.0.109:8000 npm run build`
- If your IP ever changes, rebuild + `npx cap sync android` + rebuild the APK.

## Build the APK

```bash
cd mobile-app
npm install
export ANDROID_HOME=/home/DeathStar/Development/Android
npm run android:build
```

The build script automatically selects the documented Android SDK and JDK 21 toolchain when
`ANDROID_HOME` or `JAVA_HOME` is not set. You can still override them explicitly:
`ANDROID_HOME=/path/to/android-sdk JAVA_HOME=/path/to/jdk-21 npm run android:build`.

Output: `android/app/build/outputs/apk/debug/app-debug.apk` (~4.8 MB).

## Install on your phone via wireless debugging (no USB cable)

Phone and PC must be on the **same Wi-Fi network**.

### 1. Backend must be reachable
Start the backend on the PC and bind it to all network interfaces:

```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Do not start it with the default `127.0.0.1` host: that only allows this computer to connect,
not a physical phone. Verify on the PC with `curl http://127.0.0.1:8000/health`, then verify on
the phone with `http://<PC-LAN-IP>:8000/health`.
Confirm from the phone's browser: `http://<PC-LAN-IP>:8000` should respond.

### 2. Enable wireless debugging on the phone
1. Settings → Developer options → turn on **Developer options** (tap Build number 7× if hidden).
2. Enable **USB debugging** and **Wireless debugging**.
3. Open **Wireless debugging** → **Pair device with pairing code**.

### 3. Pair & connect with adb
On the PC, run (the port + code shown on the phone):
```bash
adb pair <phone-ip>:<pairing-port>     # e.g. 192.168.1.50:39745  → enter 6-digit code
adb connect <phone-ip>:<adb-port>      # e.g. 192.168.1.50:41367
adb devices                            # should show device as "device"
```

### 4. Build and install the APK

From `mobile-app`:

```bash
npm run android:build
npm run android:install
```

To install an existing debug APK:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### 5. Launch
Find **KilimoChat** in your app drawer and open it. Register/login, then chat — text, voice,
photo upload, weather, and market prices all go to `http://<PC-LAN-IP>:8000`.

## USB debugging alternative

With USB debugging enabled, reverse the backend port so the phone can use `127.0.0.1` without
depending on Wi-Fi or firewall rules:

```bash
adb devices
npm run android:reverse
VITE_API_URL=http://127.0.0.1:8000 npm run android:build
npm run android:install
```

For a physical phone over Wi-Fi, use the PC's private LAN IP. For the Android emulator, the app
probes `10.0.2.2:8000` automatically.

## Troubleshooting

- **App starts but says connection error** — backend not running, CORS not `*`, or the LAN IP baked
  into the APK changed. Rebuild with the correct `VITE_API_URL` (see above).
- **Mic / voice recording silent** — allow microphone permission for the app; supported in this WebView build.
- **Location always Nairobi** — location access denied or unavailable; the app falls back to Nairobi.
- **Phone can't reach the backend** — confirm the backend is bound to `0.0.0.0:8000`, test
  `http://<PC-LAN-IP>:8000/health` from the phone browser, allow port 8000 through the PC
  firewall, and make sure both devices are on the same network / AP isolation is off.
- **The APK still uses an old backend address** — clear app storage or uninstall/reinstall the
  APK, then rebuild with the correct `VITE_API_URL`; the last healthy URL is cached locally.
- **`gradlew` fails with "Cannot find Java installation... languageVersion=21"** — you must build
  with JDK 21 (`JAVA_HOME` set as above); JDK 17 alone is not enough.
- Rebuild after editing native config (`AndroidManifest.xml`, etc.): `npx cap sync android`.

## Structure

- `src/` — all React UI (mobile-first components; ports of `../src` with a modern redesign).
- `src/index.css` — the full design system (Tailwind + custom component classes).
- `src/services/api.js` — entire API client contract for `../backend`.
- `vite.config.js` — LAN IP detection + `__API_URL__` define.
- `capacitor.config.json` — appId `ke.co.kilimochat.mobile`, webDir `dist`, cleartext enabled.
- `android/` — generated native project (manifest includes INTERNET, RECORD_AUDIO, FINE/COARSE_LOCATION).