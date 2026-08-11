#!/usr/bin/env bash
# Build the Novacrest Capital Android APK via EAS cloud and place it for hosting.
#
# Prerequisites:
#   1. An Expo account — sign up at https://expo.dev
#   2. EAS CLI authenticated: run `eas login` or set the EXPO_TOKEN env var
#   3. eas-cli installed: npm install -g eas-cli
#
# Usage:
#   EXPO_TOKEN=<your-token> bash scripts/build-android-apk.sh
#
set -euo pipefail

MOBILE_DIR="artifacts/novacrest-mobile"
API_PUBLIC_DIR="artifacts/api-server/public"
APK_NAME="novacrest-capital.apk"

echo "==> Building Android APK via EAS cloud..."
cd "$MOBILE_DIR"

# Run an EAS cloud build for Android (no local Android SDK needed).
# --non-interactive: do not prompt; --output: download the built artifact to the given path
eas build \
  --platform android \
  --profile production \
  --non-interactive \
  --output "/tmp/$APK_NAME"

cd - > /dev/null

echo "==> Copying APK to API server public directory..."
cp "/tmp/$APK_NAME" "$API_PUBLIC_DIR/$APK_NAME"

echo "==> Done! APK placed at $API_PUBLIC_DIR/$APK_NAME"
echo "    It will be served at /novacrest-capital.apk once the API server is deployed."
