import { useEffect } from 'react';

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

export function useFrameworkReady() {
  useEffect(() => {
    try {
      // Vérifier si on est dans un environnement web avant d'accéder à window
      if (typeof window !== 'undefined' && window.frameworkReady) {
        window.frameworkReady();
      }
    } catch (error) {
      // Ignorer les erreurs pour éviter de bloquer l'application
      console.warn('Erreur dans useFrameworkReady:', error);
    }
  }, []);
}