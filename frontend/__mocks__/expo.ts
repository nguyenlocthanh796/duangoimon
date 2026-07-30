// Mock expo module — avoid virtual/env.js ESM crash
export const isRunningInExpoGo = false;
export const getExpoGoProjectConfig = jest.fn().mockReturnValue(null);
export default { isRunningInExpoGo, getExpoGoProjectConfig };
