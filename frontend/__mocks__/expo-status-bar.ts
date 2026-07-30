// Mock expo-status-bar
export const StatusBar = { currentHeight: 0 };
export const setStatusBarStyle = jest.fn();
export const setStatusBarHidden = jest.fn();
export default { StatusBar, setStatusBarStyle, setStatusBarHidden };
