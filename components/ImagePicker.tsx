import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Camera, Image as ImageIcon, X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface ImagePickerProps {
  onImageSelected: (imageBase64: string) => void;
  onClose: () => void;
}

export function ImagePicker({ onImageSelected, onClose }: ImagePickerProps) {
  const { theme } = useTheme();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculer les nouvelles dimensions en gardant le ratio
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        const newWidth = img.width * ratio;
        const newHeight = img.height * ratio;

        canvas.width = newWidth;
        canvas.height = newHeight;

        // Dessiner l'image redimensionnée
        ctx?.drawImage(img, 0, 0, newWidth, newHeight);

        // Convertir en base64 avec compression
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        console.log('Image compressée, format:', compressedBase64.substring(0, 30));
        resolve(compressedBase64);
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (event: Event, isCamera: boolean = false) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (file && file.type.startsWith('image/')) {
      try {
        console.log('📸 Fichier sélectionné:', file.name, 'Taille:', file.size, 'Type:', file.type);
        
        // Créer un Blob URL pour l'affichage immédiat
        const blobUrl = URL.createObjectURL(file);
        console.log('🔗 Blob URL créé:', blobUrl);
        
        // Compresser l'image pour le stockage
        const compressedBase64 = await compressImage(file);
        console.log('💾 Image compressée pour stockage, taille:', compressedBase64.length);
        
        // Passer l'image compressée (qui sera stockée)
        onImageSelected(compressedBase64);
        onClose();
      } catch (error) {
        console.error('Erreur lors de la compression de l\'image:', error);
        // Fallback sans compression
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          console.log('📄 Fallback Base64 créé:', base64.substring(0, 30));
          onImageSelected(base64);
          onClose();
        };
        reader.readAsDataURL(file);
      }
    }
    
    // Reset input
    target.value = '';
  };

  const handleCameraClick = () => {
    if (Platform.OS === 'web' && cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const handleGalleryClick = () => {
    if (Platform.OS === 'web' && galleryInputRef.current) {
      galleryInputRef.current.click();
    }
  };

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ajouter une image</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.options}>
        <TouchableOpacity style={styles.option} onPress={handleCameraClick}>
          <View style={styles.optionIcon}>
            <Camera size={24} color={theme.colors.primary} />
          </View>
          <Text style={styles.optionTitle}>Prendre une photo</Text>
          <Text style={styles.optionSubtitle}>Utiliser l'appareil photo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.option} onPress={handleGalleryClick}>
          <View style={styles.optionIcon}>
            <ImageIcon size={24} color={theme.colors.primary} />
          </View>
          <Text style={styles.optionTitle}>Choisir depuis la galerie</Text>
          <Text style={styles.optionSubtitle}>Sélectionner une image existante</Text>
        </TouchableOpacity>
      </View>

      {/* Inputs cachés pour web */}
      {Platform.OS === 'web' && (
        <>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => handleFileSelect(e as any, true)}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => handleFileSelect(e as any, false)}
          />
        </>
      )}
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
  },
  closeButton: {
    padding: 4,
  },
  options: {
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
    flex: 1,
  },
  optionSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
    flex: 1,
  },
});