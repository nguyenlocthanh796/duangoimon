// Minimal react-native mock for jest
export const Platform = {
  OS: 'web',
  select: (obj: any) => obj.default || obj.web,
  Version: 0,
  isTesting: true,
};

export const Alert = {
  alert: jest.fn(),
};

export const useWindowDimensions = () => ({
  width: 1024,
  height: 768,
  scale: 1,
  fontScale: 1,
});

export const StyleSheet = {
  create: (styles: any) => styles,
  flatten: (style: any) => style,
  hairlineWidth: 0.5,
  absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
};

export const View = 'View';
export const Text = 'Text';
export const ScrollView = 'ScrollView';
export const TouchableOpacity = 'TouchableOpacity';
export const TextInput = 'TextInput';
export const FlatList = 'FlatList';
export const Modal = 'Modal';
export const ActivityIndicator = 'ActivityIndicator';
export const Image = 'Image';
export const Pressable = 'Pressable';
export const KeyboardAvoidingView = 'KeyboardAvoidingView';

export default {
  Platform,
  Alert,
  useWindowDimensions,
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  ActivityIndicator,
  Image,
  Pressable,
  KeyboardAvoidingView,
};
