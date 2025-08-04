import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TextInput, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Camera } from 'lucide-react-native';
import { Header } from '@/components/Header';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { ImagePicker } from '@/components/ImagePicker';
import { NoteImageGallery } from '@/components/NoteImageGallery';
import { useStorage } from '@/contexts/StorageContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useModal } from '@/contexts/ModalContext';

export default function CreateNoteScreen() {
  const { strings } = useLanguage();
  const { theme } = useTheme();
  const { showModal, hideModal } = useModal();
  const { createNote } = useStorage();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ title?: string }>({});

  const handleBack = () => {
    safeNavigate('/(tabs)/notes');
  };

  const safeNavigate = (path: string) => {
    try {
      if (router.canGoBack !== undefined) {
        router.push(path);
      } else {
        setTimeout(() => {
          router.push(path);
        }, 100);
      }
    } catch (error) {
      console.error('Erreur de navigation:', error);
      setTimeout(() => {
        try {
          router.push(path);
        } catch (retryError) {
          console.error('Erreur de navigation retry:', retryError);
        }
      }, 200);
    }
  };

  const validateForm = () => {
    const newErrors: { title?: string } = {};

    if (!title.trim() && !content.trim() && images.length === 0) {
      newErrors.title = 'Le titre ou le contenu est requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      console.log('📝 Création de la note:', title.trim() || 'Note sans titre');
      
      const note = await createNote({
        title: title.trim() || strings.untitledNote,
        content: content.trim(),
        images: images.length > 0 ? images : undefined,
      });

      if (note) {
        console.log('✅ Note créée avec succès:', note.id);
        safeNavigate(`/(tabs)/note/${note.id}`);
      } else {
        console.error('❌ Erreur: Note non créée');
        Alert.alert(strings.error, 'Impossible de créer la note. Veuillez réessayer.');
      }
    } catch (error) {
      console.error('❌ Erreur lors de la création de la note:', error);
      Alert.alert(strings.error, 'Impossible de créer la note. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddImage = () => {
    showModal(
      <ImagePicker 
        onImageSelected={(imageBase64) => {
          console.log('📝 Image ajoutée à la note, format:', imageBase64.substring(0, 30));
          setImages(prev => [...prev, imageBase64]);
        }}
        onClose={hideModal}
      />
    );
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <Header
        title={strings.newNote}
        onBack={handleBack}
      />
      
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Input
            label={strings.noteTitle}
            value={title}
            onChangeText={setTitle}
            placeholder="Ex: Observations chantier, Mesures particulières..."
            error={errors.title}
          />


          {/* Galerie d'images */}
          <NoteImageGallery 
            images={images}
            onRemoveImage={handleRemoveImage}
            editable={true}
          />

          {/* Bouton ajouter image */}
          <View style={styles.imageButtonContainer}>
            <TouchableOpacity
              style={styles.addPhotoButton}
              onPress={handleAddImage}
            >
              <Camera size={16} color={theme.colors.primary} />
              <Text style={styles.addPhotoText}>Ajouter une photo</Text>
            </TouchableOpacity>
          </View>

          {/* Champ de contenu simplifié */}
          <View style={styles.contentSection}>
            <Text style={styles.contentLabel}>{strings.noteContent}</Text>
            <TextInput
              style={styles.contentTextInput}
              value={content}
              onChangeText={setContent}
              placeholder={strings.writeYourNote}
              placeholderTextColor={theme.colors.textTertiary}
              multiline={true}
              textAlignVertical="top"
              scrollEnabled={true}
              autoCorrect={true}
              spellCheck={true}
              returnKeyType="default"
              blurOnSubmit={false}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bouton fixe en bas du viewport */}
      <View style={styles.fixedFooter}>
        <Button
          title={loading ? "Création..." : strings.createNote}
          onPress={handleCreate}
          disabled={loading}
          style={styles.footerButton}
        />
      </View>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 140, // Espace augmenté pour le bouton fixe
  },
  contentInputContainer: {
    flex: 1,
    minHeight: 300,
  },
  contentInput: {
    minHeight: 300,
    textAlignVertical: 'top',
  },
  contentSection: {
    flex: 1,
    minHeight: 300,
  },
  contentLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  contentTextInput: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text,
    lineHeight: 24,
    minHeight: 300,
    flex: 1,
    padding: 0,
    margin: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    textAlignVertical: 'top',
    ...(Platform.OS === 'web' && {
      outlineWidth: 0,
      resize: 'none',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    }),
  },
  imageButtonContainer: {
    marginTop: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: 36,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  addPhotoText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: theme.colors.primary,
  },
  fixedFooter: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    bottom: Platform.OS === 'web' ? 20 : 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  footerButton: {
    width: '100%',
  },
});