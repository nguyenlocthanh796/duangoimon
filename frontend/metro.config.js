const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Web can't use Hermes — force babel transform
config.transformer.enableHermes = false;

// Ensure babel minification for web
config.transformer.minifierConfig = {
  compress: {
    drop_console: false,
  },
};

module.exports = withNativeWind(config, { input: './global.css' });
