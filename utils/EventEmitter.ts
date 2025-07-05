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

// Fonction spécifique pour déclencher l'ouverture du modal de création de projet
export const triggerCreateProjectModal = () => {
  emitEvent('openCreateProjectModal');
};