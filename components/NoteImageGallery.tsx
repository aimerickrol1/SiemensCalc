import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, Platform } from 'react-native';
import { Trash2, X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useModal } from '@/contexts/ModalContext';

interface NoteImageGalleryProps {
  images: string[];
  onRemoveImage: (index: number) => void;
  editable?: boolean;
}

export function NoteImageGallery({ images, onRemoveImage, editable = false }: NoteImageGalleryProps) {
  const { theme } = useTheme();
  const { showModal, hideModal } = useModal();

  const handleRemoveImage = (index: number) => {
    if (!editable) return;

    showModal(
      <RemoveImageModal 
        onConfirm={() => {
          onRemoveImage(index);
          hideModal();
        }}
        onCancel={hideModal}
      />
    );
  };

  const styles = createStyles(theme);

  if (!images || images.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Images ({images.length})</Text>
      <View style={styles.imageGrid}>
        {images.map((imageBase64, index) => (
          <ImageItem
            key={index}
            imageBase64={imageBase64}
            index={index}
            editable={editable}
            onRemove={() => handleRemoveImage(index)}
            theme={theme}
          />
        ))}
      </View>
    </View>
  );
}

// Composant séparé pour chaque image avec ses propres hooks
function ImageItem({ imageBase64, index, editable, onRemove, theme }: {
  imageBase64: string;
  index: number;
  editable: boolean;
  onRemove: () => void;
  theme: any;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;

  React.useEffect(() => {
    if (imageLoaded) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          delay: index * 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          delay: index * 100,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [imageLoaded, fadeAnim, scaleAnim, index]);

  const styles = createStyles(theme);

  return (
    <Animated.View 
      style={[
        styles.imageContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      <Image
        source={{ uri: imageBase64 }}
        style={styles.image}
        onLoad={() => setImageLoaded(true)}
        resizeMode="cover"
      />
      {editable && (
        <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
          <Trash2 size={16} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

// Modal de confirmation pour supprimer une image
function RemoveImageModal({ onConfirm, onCancel }: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Supprimer l'image</Text>
        <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
          <X size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.modalBody}>
        <Text style={styles.modalText}>
          Êtes-vous sûr de vouloir supprimer cette image ?
        </Text>
        <Text style={[styles.modalText, styles.modalBold]}>
          Cette action est irréversible.
        </Text>
      </View>

      <View style={styles.modalFooter}>
        <TouchableOpacity
          style={[styles.modalButton, { backgroundColor: theme.colors.surfaceSecondary }]}
          onPress={onCancel}
        >
          <Text style={[styles.modalButtonText, { color: theme.colors.textSecondary }]}>
            Annuler
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modalButton, { backgroundColor: theme.colors.error }]}
          onPress={onConfirm}
        >
          <Text style={[styles.modalButtonText, { color: 'white' }]}>
            Supprimer
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    marginTop: 16,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  imageGrid: {
    gap: 12,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  // Styles pour le modal
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    marginBottom: 20,
  },
  modalText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  modalBold: {
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
});