#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${ANDROID_HOME:-}" || ! -d "${ANDROID_HOME}/platform-tools" ]]; then
  for candidate in \
    "$HOME/Development/Android" \
    "${ANDROID_SDK_ROOT:-}" \
    "$HOME/Android/Sdk"; do
    if [[ -d "$candidate/platform-tools" ]]; then
      export ANDROID_HOME="$candidate"
      break
    fi
  done
fi

if [[ -z "${ANDROID_HOME:-}" || ! -d "${ANDROID_HOME}/platform-tools" ]]; then
  echo "Android SDK not found. Set ANDROID_HOME to your Android SDK directory." >&2
  exit 1
fi

export ANDROID_SDK_ROOT="$ANDROID_HOME"

if [[ -z "${JAVA_HOME:-}" || ! -x "${JAVA_HOME}/bin/javac" ]]; then
  for candidate in \
    "$HOME/Development/toolchains/jdk-21.0.12.1+1" \
    "$HOME/.sdkman/candidates/java/21.0.*/" \
    "/usr/lib/jvm/java-21-openjdk"; do
    if [[ -x "$candidate/bin/javac" ]]; then
      export JAVA_HOME="$candidate"
      break
    fi
  done
fi

if [[ -z "${JAVA_HOME:-}" || ! -x "${JAVA_HOME}/bin/javac" ]]; then
  echo "A complete JDK 21 is required. Set JAVA_HOME to a JDK 21 installation." >&2
  exit 1
fi

export PATH="$JAVA_HOME/bin:$PATH"
npm run build
npx cap sync android
(cd android && ./gradlew assembleDebug)