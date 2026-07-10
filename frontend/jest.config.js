module.exports = {
  preset: 'jest-expo',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testMatch: ['**/__tests__/**/*.test.(ts|tsx|js)'],
  testPathIgnorePatterns: ['/node_modules/', '/dist_tests/'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@expo|expo|react-native-web|@react-navigation|react-native-gesture-handler|react-native-reanimated|react-native-safe-area-context|react-native-screens|@gorhom|expo-modules-core|react-native-css-interop)/)',
  ],
};
