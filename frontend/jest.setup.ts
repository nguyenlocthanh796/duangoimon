// Mock minimal RN APIs needed by hooks
globalThis.alert = jest.fn();
globalThis.window = Object.create(window);
globalThis.window.confirm = jest.fn(() => true);
