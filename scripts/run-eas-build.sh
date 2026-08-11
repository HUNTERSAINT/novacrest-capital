#!/usr/bin/env bash
# One-shot EAS cloud build — run inside a workflow so EXPO_TOKEN is injected.
# Builds the Android APK on Expo's servers and downloads it to the API public dir.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE_DIR="$REPO_ROOT/artifacts/novacrest-mobile"
OUT_DIR="$REPO_ROOT/artifacts/api-server/public"
APK_NAME="novacrest-capital.apk"
TMP_APK="/tmp/$APK_NAME"

echo "=== Novacrest Android APK build ==="
echo "EXPO_TOKEN : ${EXPO_TOKEN:+set (${#EXPO_TOKEN} chars)}"

if [ -z "${EXPO_TOKEN:-}" ]; then
  echo "ERROR: EXPO_TOKEN is not set."
  exit 1
fi

cd "$MOBILE_DIR"

echo "--- Verifying EAS login ---"
eas whoami

echo "--- Ensuring EAS project is initialized ---"
# Create/link the project under the team account if it has no valid UUID projectId yet
if ! node -e "const a=require('./app.json'); const id=a?.expo?.extra?.eas?.projectId; if(!id||!/^[0-9a-f-]{36}$/.test(id)){process.exit(1)}" 2>/dev/null; then
  echo "No valid projectId found — running eas init..."
  eas init --account mazixxxs-team --non-interactive
fi

echo "--- Starting EAS cloud build ---"
# Capture build output to extract the download URL when done
BUILD_LOG="/tmp/eas-build-$$.log"

eas build \
  --platform android \
  --profile production \
  --non-interactive \
  --wait \
  2>&1 | tee "$BUILD_LOG"

echo "--- Build finished. Extracting download URL ---"

# EAS prints the artifact URL in the build output
DOWNLOAD_URL=$(grep -oE 'https://[^ ]+\.apk' "$BUILD_LOG" | tail -1)

if [ -z "$DOWNLOAD_URL" ]; then
  # Try alternative: get the latest build URL via eas build:list
  echo "APK URL not found in log, trying eas build:list..."
  LATEST=$(eas build:list \
    --platform android \
    --status finished \
    --limit 1 \
    --non-interactive \
    --json 2>/dev/null | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log(d[0]?.artifacts?.buildUrl || '')")
  DOWNLOAD_URL="$LATEST"
fi

if [ -z "$DOWNLOAD_URL" ]; then
  echo "ERROR: Could not find APK download URL. Check EAS dashboard: https://expo.dev"
  exit 1
fi

echo "Download URL: $DOWNLOAD_URL"
echo "--- Downloading APK ---"
curl -L --progress-bar -o "$TMP_APK" "$DOWNLOAD_URL"

echo "--- Copying APK ---"
mkdir -p "$OUT_DIR"
cp "$TMP_APK" "$OUT_DIR/$APK_NAME"

echo ""
echo "=== Done! ==="
echo "APK: $OUT_DIR/$APK_NAME ($(du -h "$OUT_DIR/$APK_NAME" | cut -f1))"
