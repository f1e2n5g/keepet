// Metro 設定：支援 pnpm monorepo，讓 app 能載入 @keepet/shared 的 TS 原始碼。
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// 監看整個 workspace（才看得到 ../shared）
config.watchFolders = [workspaceRoot];

// 解析 node_modules：先找 app 自己的，再找 workspace root（hoisted 後在 root）
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = config;
