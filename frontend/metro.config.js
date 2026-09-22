const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Disable package exports to allow deep imports like react-native/Libraries/Core/InitializeCore
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
