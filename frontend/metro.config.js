const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Web can't use Hermes — force babel transform
config.transformer.enableHermes = false;

// ⚡ Speed optimizations
// Ignore large binary assets from file watching to speed up Metro
// DO NOT set watchFolders — defaults include node_modules
config.resolver.blockList = [
  /\.git\/.*/,
  /\.idea\/.*/,
  /\.expo\/.*/,
  /assets\/images\/.*\.(png|jpg|webp)$/,
  /assets\/brand\/.*\.(png|webp)$/,
  /public\/.*/,
];

// Minifier config for production only
// (Metro requires this to be defined for export)
config.transformer.minifierConfig = {
  compress: {
    drop_console: false,
  },
};

module.exports = withNativeWind(config, { input: './global.css' });
