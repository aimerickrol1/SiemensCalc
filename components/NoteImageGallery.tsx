import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, Platform, Dimensions } from 'react-native';
import { Trash2, X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useModal } from '@/contexts/ModalContext';
import { FullscreenImageViewer } from '@/components/FullscreenImageViewer';

interface NoteImageGalleryProps {
  images: string[];
  onRemoveImage: (index: number) => void;
  editable?: boolean;
}

export function NoteImageGallery({ images, onRemoveImage, editable = false }: NoteImageGalleryProps) {
  const { theme } = useTheme();
  const { showModal, hideModal } = useModal();
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

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

  const handleImagePress = (index: number) => {
    showModal(
      <FullscreenImageViewer 
        images={images}
        initialIndex={index}
        onClose={hideModal}
      />,
      { animationType: 'fade' }
    );
  };

  const styles = createStyles(theme);

  if (!images || images.length === 0) {
    return null;
  }

  // Calculer le nombre de colonnes selon la largeur d'écran
  const screenWidth = Dimensions.get('window').width;
  const numColumns = screenWidth > 600 ? 3 : 2;
  const imageWidth = (screenWidth - 32 - (numColumns - 1) * 8) / numColumns; // 32 = padding, 8 = gap

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Images ({images.length})</Text>
      <View style={[styles.imageGrid, { gap: 8 }]}>
        {images.map((imageBase64, index) => (
          <NoteImageItem
            key={index}
            imageBase64={imageBase64}
            index={index}
            imageWidth={imageWidth}
            editable={editable}
            onPress={() => handleImagePress(index)}
            onRemove={() => handleRemoveImage(index)}
            theme={theme}
          />
        ))}
      </View>
    </View>
  );
}

// Composant séparé pour chaque image avec ses propres hooks
function NoteImageItem({ imageBase64, index, imageWidth, editable, onPress, onRemove, theme }: {
  imageBase64: string;
  index: number;
  imageWidth: number;
  editable: boolean;
  onPress: () => void;
  onRemove: () => void;
  theme: any;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const itemFadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (imageLoaded && !imageError) {
      Animated.timing(itemFadeAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 100,
        useNativeDriver: true,
      }).start();
    }
  }, [imageLoaded, imageError, itemFadeAnim, index]);

  const styles = createStyles(theme);

  // Debug: Afficher les premiers caractères de l'image pour vérifier le format
  React.useEffect(() => {
    console.log(`🖼️ Image ${index} - Format:`, imageBase64.substring(0, 30));
    console.log(`🖼️ Image ${index} - Longueur:`, imageBase64.length);
  }, [imageBase64, index]);

  return (
    <Animated.View style={[styles.imageContainer, { width: imageWidth, opacity: itemFadeAnim }]}>
      <TouchableOpacity
        style={styles.imageButton}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {imageError ? (
          <View style={[styles.errorPlaceholder, { width: imageWidth, height: imageWidth * 0.75 }]}>
            <Text style={styles.errorText}>❌</Text>
            <Text style={styles.errorTextSmall}>Erreur image</Text>
          </View>
        ) : (
          <Image
            source={{ uri: imageBase64 }}
            style={[styles.image, { width: imageWidth, height: imageWidth * 0.75 }]}
            onLoad={() => {
              console.log(`✅ Image ${index} chargée avec succès dans miniature`);
              setImageLoaded(true);
            }}
            onError={(error) => {
              console.error(`❌ Erreur chargement miniature ${index}:`, error);
              console.error(`❌ URI problématique:`, imageBase64.substring(0, 50));
              setImageError(true);
            }}
            resizeMode="cover"
          />
        )}
      </TouchableOpacity>
      {editable && (
        <TouchableOpacity 
          style={styles.removeButton} 
          onPress={onRemove}
        >
          <Trash2 size={14} color="#FFFFFF" />
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  imageContainer: {
    marginBottom: 8,
    position: 'relative',
  },
  imageButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 12,
  },
  removeButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  errorPlaceholder: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  errorText: {
    fontSize: 24,
    marginBottom: 4,
  },
  errorTextSmall: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textTertiary,
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