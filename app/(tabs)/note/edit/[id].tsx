import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Header } from '@/components/Header';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Note } from '@/types';
import { useStorage } from '@/contexts/StorageContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAndroidBackButton } from '@/utils/BackHandler';

export default function EditNoteScreen() {
  const { strings } = useLanguage();
  const { theme } = useTheme();
  const { notes, updateNote } = useStorage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [errors, setErrors] = useState<{ title?: string }>({});

  // Configure Android back button
  useAndroidBackButton(() => {
    handleBack();
    return true;
  });

  useEffect(() => {
    loadNote();
  }, [id, notes]);

  const loadNote = async () => {
    try {
      console.log('🔍 Recherche de la note avec ID:', id);
      const foundNote = notes.find(n => n.id === id);
      if (foundNote) {
        console.log('✅ Note trouvée:', foundNote.title);
        setNote(foundNote);
        setTitle(foundNote.title);
        setContent(foundNote.content);
      } else {
        console.error('❌ Note non trouvée avec ID:', id);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la note:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleBack = () => {
    try {
      if (note) {
        router.push(`/(tabs)/note/${note.id}`);
      } else {
        router.push('/(tabs)/notes');
      }
    } catch (error) {
      console.error('Erreur de navigation:', error);
      router.push('/(tabs)/notes');
    }
  };

  const validateForm = () => {
    const newErrors: { title?: string } = {};

    if (!title.trim() && !content.trim()) {
      newErrors.title = 'Le titre ou le contenu est requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm() || !note) return;

    setLoading(true);
    try {
      console.log('💾 Sauvegarde de la note:', note.id);
      
      const updatedNote = await updateNote(note.id, {
        title: title.trim() || strings.untitledNote,
        content: content.trim(),
      });

      if (updatedNote) {
        console.log('✅ Note mise à jour avec succès');
        router.push(`/(tabs)/note/${note.id}`);
      } else {
        console.error('❌ Erreur: Note non trouvée pour la mise à jour');
      }
    } catch (error) {
      console.error('Erreur lors de la modification de la note:', error);
    } finally {
      setLoading(false);
    }
  };

  const styles = createStyles(theme);

  if (initialLoading) {
    return (
      <View style={styles.container}>
        <Header title={strings.loading} onBack={handleBack} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{strings.loadingData}</Text>
        </View>
      </View>
    );
  }

  if (!note) {
    return (
      <View style={styles.container}>
        <Header title={strings.itemNotFound} onBack={handleBack} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{strings.dataNotFound}</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <Header
        title={strings.editNote}
        subtitle={note.title || strings.untitledNote}
        onBack={handleBack}
      />
      
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Input
          label={strings.noteTitle}
          value={title}
          onChangeText={setTitle}
          placeholder="Ex: Observations chantier, Mesures particulières..."
          error={errors.title}
        />

        <View style={styles.contentInputContainer}>
          <Input
            label={strings.noteContent}
            value={content}
            onChangeText={setContent}
            placeholder={strings.writeYourNote}
            multiline
            numberOfLines={15}
            style={styles.contentInput}
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title={loading ? "Sauvegarde..." : strings.saveChanges}
            onPress={handleSave}
            disabled={loading}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  contentInputContainer: {
    flex: 1,
    minHeight: 300,
  },
  contentInput: {
    minHeight: 300,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    marginTop: 24,
  },
});