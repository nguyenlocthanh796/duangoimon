process.env.NODE_ENV = 'test';

if (typeof (global as any).__DEV__ === 'undefined') {
  (global as any).__DEV__ = false;
}

if (typeof (globalThis as any).expo === 'undefined') {
  (globalThis as any).expo = { EventEmitter: class MockEventEmitter {} };
}

const Module = require('module');
const origResolveFilename = Module._resolveFilename;

// Module mocking map
const mockModules: Record<string, any> = {
  'react-native': {
    Platform: {
      OS: 'web',
      select: (obj: any) => obj.web ?? obj.default ?? obj.native,
    },
    StyleSheet: {
      create: (styles: any) => styles,
      flatten: (styles: any) => styles,
      absoluteFillObject: {},
    },
    Dimensions: {
      get: () => ({ width: 1280, height: 800, scale: 1, fontScale: 1 }),
      addEventListener: () => ({ remove: () => {} }),
    },
    PixelRatio: {
      get: () => 1,
      getFontScale: () => 1,
      roundToNearestPixel: (n: number) => Math.round(n),
    },
    View: 'View',
    Text: 'Text',
    Pressable: 'Pressable',
    TouchableOpacity: 'TouchableOpacity',
    ScrollView: 'ScrollView',
    Modal: 'Modal',
    StatusBar: { currentHeight: 24 },
    Animated: {
      Value: class {
        val: number;
        constructor(v: number) { this.val = v; }
        setValue(v: number) { this.val = v; }
      },
      timing: () => ({ start: (cb?: any) => cb && cb() }),
      spring: () => ({ start: (cb?: any) => cb && cb() }),
    },
    PanResponder: {
      create: () => ({ panHandlers: {} }),
    },
    Alert: { alert: () => {} },
    Touchable: { Mixin: {} },
  },
  'react-native-safe-area-context': {
    SafeAreaView: 'SafeAreaView',
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  },
  'react-native-svg': {
    default: 'Svg',
    Svg: 'Svg',
    Path: 'Path',
    Rect: 'Rect',
    Circle: 'Circle',
    G: 'G',
    Text: 'Text',
    Defs: 'Defs',
    LinearGradient: 'LinearGradient',
    Stop: 'Stop',
    Line: 'Line',
    Polygon: 'Polygon',
  },
  'expo-image': {
    Image: 'Image',
  },
  'expo-constants': {
    default: { expoConfig: { hostUri: 'localhost:8085' } },
    expoConfig: { hostUri: 'localhost:8085' },
  },
  'expo-router': {
    useRouter: () => ({ back: () => {}, push: () => {} }),
  },
  'expo-haptics': {
    ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
    NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
    impactAsync: async () => {},
    notificationAsync: async () => {},
    selectionAsync: async () => {},
  },
  'expo-av': {
    Audio: {
      Sound: {
        createAsync: async () => ({
          sound: {
            playAsync: async () => {},
            unloadAsync: async () => {},
            setPositionAsync: async () => {},
          },
        }),
      },
    },
  },
  'expo-audio': {
    createAudioPlayer: () => ({
      play: async () => {},
      pause: async () => {},
      seekTo: async () => {},
      release: async () => {},
    }),
    AudioPlayer: class {},
  },
  'expo-modules-core': {
    Platform: { OS: 'web', isDOMAvailable: true },
    EventEmitter: class {},
    NativeModulesProxy: {},
    requireNativeModule: () => ({}),
    requireOptionalNativeModule: () => null,
  },
  '@expo/vector-icons': {
    Ionicons: 'Ionicons',
    MaterialCommunityIcons: 'MaterialCommunityIcons',
  },
  '@expo/vector-icons/MaterialCommunityIcons': {
    default: 'MaterialCommunityIcons',
  },
  '@expo/vector-icons/Ionicons': {
    default: 'Ionicons',
  },
  '@react-native-async-storage/async-storage': (() => {
    const memoryStore = new Map<string, string>();
    const storage = {
      getItem: async (key: string) => memoryStore.get(key) ?? null,
      setItem: async (key: string, value: string) => { memoryStore.set(key, String(value)); },
      removeItem: async (key: string) => { memoryStore.delete(key); },
      clear: async () => { memoryStore.clear(); },
      getAllKeys: async () => Array.from(memoryStore.keys()),
    };
    return { ...storage, default: storage };
  })(),
};

if (typeof (global as any).WebSocket === 'undefined') {
  (global as any).WebSocket = class MockWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    readyState = 1;
    onopen: any = null;
    onmessage: any = null;
    onerror: any = null;
    onclose: any = null;
    send(data: any) {}
    close() {
      this.readyState = 3;
      if (this.onclose) this.onclose({ code: 1000, reason: 'Normal Closure' });
    }
  };
}

Module._resolveFilename = function (request: string, parent: any, isMain: boolean, options: any) {
  if (mockModules[request]) {
    // Virtual module ID
    return `mock:${request}`;
  }
  return origResolveFilename.apply(this, arguments);
};

for (const [modName, modExports] of Object.entries(mockModules)) {
  require.cache[`mock:${modName}`] = {
    id: `mock:${modName}`,
    filename: `mock:${modName}`,
    loaded: true,
    exports: modExports,
    path: '',
    children: [],
    paths: [],
    require: require,
  } as any;
}

// Lightweight React Hook dispatcher for headless Node.js component execution
try {
  const React = require('react');
  const dispatcher = {
    useContext: (ctx: any) => ctx?._currentValue,
    useRef: (val: any) => ({ current: val }),
    useMemo: (fn: any) => fn(),
    useCallback: (fn: any) => fn,
    useState: (val: any) => [typeof val === 'function' ? val() : val, () => {}],
    useEffect: () => {},
    useLayoutEffect: () => {},
    useId: () => 'mock-id',
    useSyncExternalStore: (_sub: any, getSnapshot: any) => getSnapshot(),
  };

  const clientInternals = (React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  if (clientInternals) {
    clientInternals.H = dispatcher;
  }
  const secretInternals = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
  if (secretInternals?.ReactCurrentDispatcher) {
    secretInternals.ReactCurrentDispatcher.current = dispatcher;
  }
} catch (_) {}



