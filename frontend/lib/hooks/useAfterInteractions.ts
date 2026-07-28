import { useState, useEffect } from 'react';
import { InteractionManager, Platform } from 'react-native';

/**
 * A hook that returns true only after the screen transition or native interactions 
 * have completed. Useful for deferring heavy rendering (like long lists or charts)
 * until after the navigation animation finishes, preventing UI stutter.
 */
export function useAfterInteractions() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      // On Web, InteractionManager doesn't always fire as expected because there's 
      // no native interaction queue. We use a short timeout to yield to the browser's 
      // rendering engine, allowing the page transition and skeleton to paint first.
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      // On iOS/Android, wait for native animations (like screen slide/fade) to finish
      const task = InteractionManager.runAfterInteractions(() => {
        setIsReady(true);
      });
      return () => task.cancel();
    }
  }, []);

  return isReady;
}
