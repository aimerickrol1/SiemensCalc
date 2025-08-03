import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Header } from '@/components/Header';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { useStorage } from '@/contexts/StorageContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function CreateNoteScreen() {
  const { strings } = useLanguage();
  const { theme } = useTheme();
  const { createNote } = useStorage();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ title?: string }>({});

  const handleBack = () => {
    router.push('/(tabs)/notes');
  };

  const validateForm = () => {
    const newErrors: { title?: string } = {};

    if (!title.trim() && !content.trim()) {
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
      });

      if (note) {
        console.log('✅ Note créée avec succès:', note.id);
        router.push(`/(tabs)/note/${note.id}`);
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

  const styles = createStyles(theme);

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <Header
        title={strings.newNote}
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
            title={loading ? "Création..." : strings.createNote}
            onPress={handleCreate}
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