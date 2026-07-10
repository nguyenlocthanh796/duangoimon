/// <reference types="jest" />

// Mock native modules for Jest
jest.mock('react-native-gesture-handler', () => {});
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('@gorhom/bottom-sheet', () => ({}));
