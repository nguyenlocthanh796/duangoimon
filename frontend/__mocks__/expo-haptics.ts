// Mock expo-haptics
export const impactAsync = jest.fn();
export const ImpactFeedbackStyle = { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' };
export const notificationAsync = jest.fn();
export const NotificationFeedbackType = { Success: 'Success', Warning: 'Warning', Error: 'Error' };
export const selectionAsync = jest.fn();
export default { impactAsync, ImpactFeedbackStyle, notificationAsync, NotificationFeedbackType, selectionAsync };
