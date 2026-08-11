---
name: pnpm Metro temp-dir crash
description: Metro FallbackWatcher crashes with ENOENT after any pnpm install because pnpm creates *_tmp_* directories that are deleted before Metro finishes scanning them.
---

## The rule
After installing any native Expo package with pnpm, the Metro bundler will crash with:
`ENOENT: no such file or directory, watch '...node_modules/.pnpm/.../*_tmp_*/...'`

**Why:** pnpm extracts packages to temp dirs (`package-name_tmp_NNNN`) during installation and deletes them after. Metro's FallbackWatcher starts scanning `node_modules/.pnpm` and tries to watch these paths after they're already gone.

**How to apply:** Two-step fix every time this happens:
1. Delete remaining temp dirs: `find /home/runner/workspace/node_modules/.pnpm -maxdepth 3 -name "*_tmp_*" -type d | xargs rm -rf`
2. Restart the expo workflow.

**Permanent prevention:** Add a `blockList` entry to `metro.config.js` (already done in novacrest-mobile):
```js
config.resolver.blockList = [
  ...existingBlockList,
  /node_modules[/\\]\.pnpm[/\\].*_tmp_\d+[/\\]/,
];
```
This prevents Metro from watching those paths in the first place, so future installs won't cause crashes. The config is at `artifacts/novacrest-mobile/metro.config.js`.

**Note:** This has bitten us with expo-clipboard and expo-notifications. Any `pnpm add` for a native Expo package can trigger it if the blockList is missing.
