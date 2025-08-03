import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Modal, View, StyleSheet, Platform } from 'react-native';

interface ModalContextType {
  showModal: (content: ReactNode, options?: ModalOptions) => void;
  hideModal: () => void;
  isVisible: boolean;
}

interface ModalOptions {
  animationType?: 'none' | 'slide' | 'fade';
  transparent?: boolean;
  onRequestClose?: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

interface ModalProviderProps {
  children: ReactNode;
}

export function ModalProvider({ children }: ModalProviderProps) {
  const [modalContent, setModalContent] = useState<ReactNode>(null);
  const [modalOptions, setModalOptions] = useState<ModalOptions>({});
  const [isVisible, setIsVisible] = useState(false);

  const showModal = (content: ReactNode, options: ModalOptions = {}) => {
    setModalContent(content);
    setModalOptions({
      animationType: 'fade',
      transparent: true,
      ...options
    });
    setIsVisible(true);
  };

  const hideModal = () => {
    setIsVisible(false);
    // Délai pour permettre l'animation de fermeture
    setTimeout(() => {
      setModalContent(null);
      setModalOptions({});
    }, 300);
  };

  const handleRequestClose = () => {
    if (modalOptions.onRequestClose) {
      modalOptions.onRequestClose();
    } else {
      hideModal();
    }
  };

  return (
    <ModalContext.Provider value={{ showModal, hideModal, isVisible }}>
      {children}
      
      {/* Modal globale rendue à la racine */}
      <Modal
        animationType={modalOptions.animationType || 'fade'}
        transparent={modalOptions.transparent !== false}
        visible={isVisible}
        onRequestClose={handleRequestClose}
        statusBarTranslucent={true}
      >
        <View style={styles.globalModalOverlay}>
          {modalContent}
        </View>
      </Modal>
    </ModalContext.Provider>
  );
}

export function useModal(): ModalContextType {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  globalModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 20 : 20,
    // Styles spécifiques pour web pour garantir la superposition
    ...(Platform.OS === 'web' && {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 99999, // Z-index très élevé pour passer au-dessus de tout
      paddingTop: 40,
      paddingBottom: 120, // Espace pour la barre de navigation
    }),
  },
});