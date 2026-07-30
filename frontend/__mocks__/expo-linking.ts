// Mock expo-linking
export const createURL = jest.fn().mockReturnValue('mock://');
export const openURL = jest.fn().mockResolvedValue(true);
export const useURL = jest.fn().mockReturnValue(null);
export const addEventListener = jest.fn().mockReturnValue(() => {});
export default { createURL, openURL, useURL, addEventListener };
