#!/usr/bin/env node
/**
 * Fetches the finished EAS APK build and places it at public/novacrest-capital.apk
 * Usage: EXPO_TOKEN=<token> node scripts/fetch-apk.mjs <buildId>
 */
import { execSync } from "child_process";
import { createWriteStream, mkdirSync } from "fs";
import { pipeline } from "stream/promises";
import path from "path";
import { fileURLToPath } from "url";

const BUILD_ID = process.argv[2] || "dfe4e2da-3538-4c2a-93fc-7d17f4e8b3ac";
const OUT_DIR  = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public");
const OUT_PATH = path.join(OUT_DIR, "novacrest-capital.apk");

// Get build info via eas-cli JSON output
const raw = execSync(
  `npx eas-cli build:view ${BUILD_ID} --json`,
  { env: { ...process.env }, stdio: ["pipe", "pipe", "pipe"] }
).toString();

const build = JSON.parse(raw);
console.log("Build status:", build.status);

if (build.status !== "FINISHED") {
  console.error("Build not finished yet. Status:", build.status);
  process.exit(1);
}

const url = build.artifacts?.buildUrl;
if (!url) {
  console.error("No buildUrl found in artifact:", build.artifacts);
  process.exit(1);
}

console.log("Downloading APK from:", url);
mkdirSync(OUT_DIR, { recursive: true });

const resp = await fetch(url);
if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
await pipeline(resp.body, createWriteStream(OUT_PATH));

console.log("✓ APK saved to:", OUT_PATH);
