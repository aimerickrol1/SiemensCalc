import { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';
import { router } from 'expo-router';

/**
 * Custom hook to handle Android back button presses
 * @param customAction Optional custom action to run on back press
 * @returns void
 */
export function useAndroidBackButton(customAction?: () => boolean) {
  useEffect(() => {
    // Only apply this on Android
    if (Platform.OS !== 'android') return;

    const backAction = () => {
      // If there's a custom action, run it first
      if (customAction && customAction()) {
        return true;
      }

      // Check if we can go back in the navigation stack
      if (router.canGoBack()) {
        router.back();
        return true;
      }

      // If we're on the home screen, let the default behavior happen
      // (which will exit the app after a second press)
      return false;
    };

    // Add event listener
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    // Clean up the event listener on unmount
    return () => backHandler.remove();
  }, [customAction]);
}

/**
 * Custom hook to handle Android back button with double press to exit
 * Only use this on the root screen (home/index)
 */
export function useDoubleBackToExit() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    let backPressCount = 0;
    let backPressTimer: NodeJS.Timeout | null = null;

    const handleBackPress = () => {
      // If this is the first press or the timer has expired
      if (backPressCount === 0 || !backPressTimer) {
        backPressCount = 1;
        
        // Show toast message (you can implement your own toast)
        console.log('Press back again to exit');
        
        // Reset the counter after 2 seconds
        backPressTimer = setTimeout(() => {
          backPressCount = 0;
          backPressTimer = null;
        }, 2000);
        
        return true; // Prevent default behavior
      } 
      
      // This is the second press within the time window
      // Let the default behavior happen (exit the app)
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    );

    return () => {
      if (backPressTimer) {
        clearTimeout(backPressTimer);
      }
      backHandler.remove();
    };
  }, []);
}