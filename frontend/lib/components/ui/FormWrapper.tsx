import { View, Platform } from 'react-native';

// Render native <form> DOM element on web, <View> on native
export default function FormWrapper({ children, onSubmit, style }: any) {
  if (Platform.OS === 'web') {
    return (
      <form
        onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          onSubmit?.();
        }}
        style={{ ...style, margin: 0, padding: 0 }}
      >
        {children}
      </form>
    );
  }
  return <View style={style}>{children}</View>;
}
