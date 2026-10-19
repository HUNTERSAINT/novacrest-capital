const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Exclude pnpm temp directories that are created/deleted during installs.
// Without this, Metro's FallbackWatcher crashes with ENOENT when it tries
// to watch a *_tmp_* directory that pnpm already cleaned up.
// Note: the trailing slash is optional — some paths are watched without it.
const originalBlocklist = config.resolver?.blockList ?? [];
const blockListItems = Array.isArray(originalBlocklist)
  ? originalBlocklist
  : [originalBlocklist];

config.resolver = {
  ...config.resolver,
  blockList: [
    ...blockListItems,
    // Match any path containing _tmp_<digits> anywhere under node_modules
    /_tmp_\d+/,
  ],
};

module.exports = config;
