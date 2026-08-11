const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Exclude pnpm temp directories that are created/deleted during installs.
// Without this, Metro's FallbackWatcher crashes with ENOENT when it tries
// to watch a *_tmp_* directory that pnpm already cleaned up.
const originalBlocklist = config.resolver?.blockList ?? [];
const blockListItems = Array.isArray(originalBlocklist)
  ? originalBlocklist
  : [originalBlocklist];

config.resolver = {
  ...config.resolver,
  blockList: [
    ...blockListItems,
    // Block any path segment that looks like a pnpm extraction temp dir
    /node_modules[/\\]\.pnpm[/\\].*_tmp_\d+[/\\]/,
  ],
};

// Also tell the watcher to ignore these paths
config.watchFolders = config.watchFolders ?? [];

module.exports = config;
