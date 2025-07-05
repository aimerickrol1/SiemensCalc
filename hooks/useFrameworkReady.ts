import { useEffect } from 'react';
import { Platform } from 'react-native';

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

export function useFrameworkReady() {
  useEffect(() => {
    try {
      // Seulement pour le web, ignorer complètement sur mobile pour éviter les erreurs
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.frameworkReady) {
        window.frameworkReady();
      }
    } catch (error) {
      // Ignorer complètement les erreurs pour éviter de bloquer l'application
      // Ne pas même logger en production pour éviter le spam de console
      if (__DEV__) {
        console.warn('Framework ready hook error (ignoré):', error);
      }
    }
  }, []);
}