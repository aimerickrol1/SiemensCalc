import { Platform } from 'react-native';
import { EventEmitter } from 'events';

// Créer un émetteur d'événements global compatible avec toutes les plateformes
const globalEventEmitter = new EventEmitter();

// Augmenter le nombre maximum d'écouteurs pour éviter les avertissements
globalEventEmitter.setMaxListeners(20);

// Fonction pour émettre un événement
export const emitEvent = (eventName: string, data?: any) => {
  globalEventEmitter.emit(eventName, data);
};

// Fonction pour ajouter un écouteur d'événement
export const addEventListener = (eventName: string, listener: (...args: any[]) => void) => {
  globalEventEmitter.on(eventName, listener);
  
  // Retourner une fonction pour supprimer l'écouteur
  return () => {
    globalEventEmitter.off(eventName, listener);
  };
};

// Fonction pour supprimer un écouteur d'événement
export const removeEventListener = (eventName: string, listener: (...args: any[]) => void) => {
  globalEventEmitter.off(eventName, listener);
};

// Fonction pour déclencher l'ouverture du modal de création de projet
// Compatible avec toutes les plateformes
export const triggerCreateProjectModal = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      // Sur web, utiliser l'API standard
      window.dispatchEvent(new CustomEvent('openCreateProjectModal'));
    } catch (error) {
      // Fallback en cas d'erreur
      emitEvent('openCreateProjectModal');
    }
  } else {
    // Sur mobile, utiliser notre émetteur d'événements
    emitEvent('openCreateProjectModal');
  }
};