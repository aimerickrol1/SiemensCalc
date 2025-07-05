import { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';
import { router } from 'expo-router';

/**
 * Custom hook to handle Android back button presses
 * Optimisé pour APK Android
 */
export function useAndroidBackButton(customAction?: () => boolean) {
  useEffect(() => {
    // Seulement sur Android
    if (Platform.OS !== 'android') return;

    const backAction = () => {
      try {
        // Si il y a une action personnalisée, l'exécuter en premier
        if (customAction && customAction()) {
          return true;
        }

        // Vérifier si on peut revenir en arrière dans la pile de navigation
        if (router.canGoBack()) {
          router.back();
          return true;
        }

        // Si on est sur l'écran d'accueil, laisser le comportement par défaut
        return false;
      } catch (error) {
        console.warn('Erreur dans useAndroidBackButton:', error);
        return false;
      }
    };

    // Ajouter l'écouteur d'événement
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    // Nettoyer l'écouteur au démontage
    return () => {
      try {
        backHandler.remove();
      } catch (error) {
        console.warn('Erreur lors du nettoyage BackHandler:', error);
      }
    };
  }, [customAction]);
}

/**
 * Custom hook pour gérer le double appui pour quitter
 * Optimisé pour APK Android
 */
export function useDoubleBackToExit() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    let backPressCount = 0;
    let backPressTimer: NodeJS.Timeout | null = null;

    const handleBackPress = () => {
      try {
        // Si c'est le premier appui ou que le timer a expiré
        if (backPressCount === 0 || !backPressTimer) {
          backPressCount = 1;
          
          // Réinitialiser le compteur après 2 secondes
          backPressTimer = setTimeout(() => {
            backPressCount = 0;
            backPressTimer = null;
          }, 2000);
          
          return true; // Empêcher le comportement par défaut
        } 
        
        // C'est le deuxième appui dans la fenêtre de temps
        // Laisser le comportement par défaut (quitter l'app)
        return false;
      } catch (error) {
        console.warn('Erreur dans useDoubleBackToExit:', error);
        return false;
      }
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    );

    return () => {
      try {
        if (backPressTimer) {
          clearTimeout(backPressTimer);
        }
        backHandler.remove();
      } catch (error) {
        console.warn('Erreur lors du nettoyage DoubleBackToExit:', error);
      }
    };
  }, []);
}