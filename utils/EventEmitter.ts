import { Platform } from 'react-native';
import { EventEmitter } from 'fbemitter';

// Créer un émetteur d'événements global compatible avec toutes les plateformes
const globalEventEmitter = new EventEmitter();

// Fonction pour émettre un événement
export const emitEvent = (eventName: string, data?: any) => {
  globalEventEmitter.emit(eventName, data);
};

// Fonction pour ajouter un écouteur d'événement
export const addEventListener = (eventName: string, listener: (...args: any[]) => void) => {
  const subscription = globalEventEmitter.addListener(eventName, listener);
  
  // Retourner une fonction pour supprimer l'écouteur
  return () => {
    subscription.remove();
  };
};

// Fonction pour supprimer un écouteur d'événement
export const removeEventListener = (eventName: string, listener: (...args: any[]) => void) => {
  // Note: avec fbemitter, on utilise généralement la méthode remove() sur l'objet subscription
  // Cette méthode est fournie pour compatibilité avec l'API précédente
  // mais il est préférable d'utiliser la fonction de nettoyage retournée par addEventListener
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