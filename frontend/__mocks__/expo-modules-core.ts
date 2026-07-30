export const requireOptionalNativeModule = jest.fn().mockReturnValue(null);
export const CodedError = class extends Error {};
export default { requireOptionalNativeModule, CodedError };
