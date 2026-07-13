// Jest setup file - runs BEFORE each test suite
// Must be specified in jest.config.js "setupFiles" (NOT setupFilesAfterFramework)

// Mock react-native-css-interop before it gets loaded by jest-expo preset
jest.mock('react-native-css-interop', () => ({}), { virtual: true });
