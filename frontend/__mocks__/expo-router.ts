export const router = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  navigate: jest.fn(),
  canDismiss: jest.fn().mockReturnValue(true),
  dismiss: jest.fn(),
  dismissAll: jest.fn(),
  canGoBack: jest.fn().mockReturnValue(true),
  setParams: jest.fn(),
};

export const useLocalSearchParams = jest.fn().mockReturnValue({});
export const useSegments = jest.fn().mockReturnValue([]);
export const useRootNavigation = jest.fn().mockReturnValue({});
export const Stack = { Screen: 'Screen' };
export const Tabs = { Screen: 'Screen' };
export default { router, useLocalSearchParams, useSegments, useRootNavigation, Stack, Tabs };
