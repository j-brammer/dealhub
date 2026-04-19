#!/usr/bin/env sh
# Forward Metro (8081) from Android emulator to this machine. Requires Android SDK platform-tools.
SDK="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
ADB="$SDK/platform-tools/adb"
if [ ! -x "$ADB" ]; then
  echo "adb not found at $ADB — set ANDROID_HOME or install Android SDK platform-tools." >&2
  exit 1
fi
exec "$ADB" reverse tcp:8081 tcp:8081
