import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { CreditCard as Edit3, Trash2, Calendar, X, Check } from 'lucide-react-native';
import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import { InlineNoteEditor } from '@/components/InlineNoteEditor';
import { NoteImageGallery } from '@/components/NoteImageGallery';
import { Note } from '@/types';
import { useStorage } from '@/contexts/StorageContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useModal } from '@/contexts/ModalContext';
import { useAndroidBackButton } from '@/utils/BackHandler';
import { LoadingScreen } from '@/components/LoadingScreen';

export default function NoteDetailScreen() {
  const { strings } = useLanguage();
  const { theme } = useTheme();
  const { showModal, hideModal } = useModal();
  const { notes, deleteNote, updateNote } = useStorage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingContent, setEditingContent] = useState('');

  // Configure Android back button
  useAndroidBackButton(() => {
    handleBack();
    return true;
  });

  const loadNote = useCallback(async () => {
    try {
      const foundNote = notes.find(n => n.id === id);
      setNote(foundNote || null);
    } catch (error) {
      console.error('Erreur lors du chargement de la note:', error);
    } finally {
      setLoading(false);
    }
  }, [id, notes]);

  useFocusEffect(
    useCallback(() => {
      console.log('Note screen focused, reloading data...');
      loadNote();
    }, [loadNote])
  );

  useEffect(() => {
    loadNote();
  }, [loadNote]);

  // Initialiser les valeurs d'édition quand la note change
  useEffect(() => {
    if (note) {
      setEditingTitle(note.title || '');
      setEditingContent(note.content || '');
    }
  }, [note]);

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

  const handleEdit = () => {
    safeNavigate(`/(tabs)/note/edit/${id}`);
  };

  const handleDelete = () => {
    if (!note) return;

    showModal(<DeleteNoteDetailModal 
      note={note}
      onConfirm={() => confirmDeleteNote()}
      onCancel={() => hideModal()}
      strings={strings}
    />);
  };

  const confirmDeleteNote = async () => {
    if (!note) return;

    try {
      console.log('🗑️ Confirmation suppression note:', note.id);
      const success = await deleteNote(note.id);
      if (success) {
        console.log('✅ Note supprimée avec succès');
        hideModal();
        handleBack();
      } else {
        console.error('❌ Erreur: Note non trouvée pour la suppression');
        hideModal();
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      hideModal();
    }
  };

  // Auto-save avec debounce
  const autoSaveNote = useCallback(
    debounce(async (field: 'title' | 'content', value: string) => {
      if (!note) return;
      
      try {
        console.log(`💾 Auto-save ${field}:`, value.substring(0, 50));
        const updatedNote = await updateNote(note.id, {
          [field]: value.trim() || (field === 'title' ? strings.untitledNote : ''),
        });
        
        if (updatedNote) {
          setNote(updatedNote);
          console.log(`✅ ${field} sauvegardé automatiquement`);
        }
      } catch (error) {
        console.error(`Erreur auto-save ${field}:`, error);
      }
    }, 1000),
    [note, updateNote, strings.untitledNote]
  );

  const handleTitleEdit = (value: string) => {
    setEditingTitle(value);
    autoSaveNote('title', value);
  };

  const handleContentEdit = (value: string) => {
    setEditingContent(value);
    autoSaveNote('content', value);
  };

  const handleTitlePress = () => {
    setIsEditingTitle(true);
  };

  const handleContentPress = () => {
    setIsEditingContent(true);
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
  };

  const handleContentBlur = () => {
    setIsEditingContent(false);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const styles = createStyles(theme);

  if (loading) {
    return <LoadingScreen title={strings.loading} message={strings.loadingData} />;
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
    <View style={styles.container}>
      <Header
        title={isEditingTitle ? "Modification du titre..." : (note.title || strings.untitledNote)}
        onBack={handleBack}
        rightComponent={
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleEdit} style={styles.actionButton}>
              <Edit3 size={20} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={styles.actionButton}>
              <Trash2 size={20} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={[
          styles.contentContainer,
          Platform.OS === 'web' && styles.contentContainerWeb
        ]}
      >
        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <Calendar size={16} color={theme.colors.textSecondary} />
            <Text style={styles.metaLabel}>Créé le</Text>
            <Text style={styles.metaValue}>{formatDate(note.createdAt)}</Text>
          </View>
          {note.updatedAt.getTime() !== note.createdAt.getTime() && (
            <View style={styles.metaRow}>
              <Calendar size={16} color={theme.colors.textSecondary} />
              <Text style={styles.metaLabel}>Modifié le</Text>
              <Text style={styles.metaValue}>{formatDate(note.updatedAt)}</Text>
            </View>
          )}
        </View>

        {/* Galerie d'images en lecture seule */}
        <NoteImageGallery 
          images={note.images || []}
          onRemoveImage={() => {}} // Pas d'édition en mode lecture
          editable={false}
        />

        {/* Titre éditable inline */}
        <View style={styles.titleCard}>
          <Text style={styles.titleLabel}>Titre</Text>
          <InlineNoteEditor
            value={editingTitle}
            onValueChange={handleTitleEdit}
            onPress={handleTitlePress}
            onBlur={handleTitleBlur}
            isEditing={isEditingTitle}
            placeholder={strings.untitledNote}
            multiline={false}
            style={styles.titleEditor}
          />
        </View>

        {/* Contenu éditable inline */}
        <View style={styles.contentCard}>
          <Text style={styles.contentLabel}>Contenu</Text>
          <InlineNoteEditor
            value={editingContent}
            onValueChange={handleContentEdit}
            onPress={handleContentPress}
            onBlur={handleContentBlur}
            isEditing={isEditingContent}
            placeholder="Cette note est vide. Cliquez pour ajouter du contenu..."
            multiline={true}
            style={styles.contentEditor}
          />
        </View>
      </ScrollView>
    </View>
  );
}

// Fonction utilitaire pour debounce
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Modal de confirmation pour la suppression d'une note (page détail)
function DeleteNoteDetailModal({ note, onConfirm, onCancel, strings }: any) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Supprimer la note</Text>
        <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
          <X size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.modalBody}>
        <Text style={styles.modalText}>
          <Text>⚠️ </Text>
          <Text style={styles.modalBold}>Cette action est irréversible !</Text>
          <Text>{'\n\n'}</Text>
          <Text>Êtes-vous sûr de vouloir supprimer la note </Text>
          <Text style={styles.modalBold}>"{note.title || strings.untitledNote}"</Text>
          <Text> ?</Text>
        </Text>
      </View>

      <View style={styles.modalFooter}>
        <Button
          title={strings.cancel}
          onPress={onCancel}
          variant="secondary"
          style={styles.modalButton}
        />
        <Button
          title="Supprimer"
          onPress={onConfirm}
          variant="danger"
          style={styles.modalButton}
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  contentContainerWeb: {
    paddingBottom: Platform.OS === 'web' ? 100 : 16,
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  metaCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
  },
  metaValue: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: theme.colors.text,
    flex: 1,
    textAlign: 'right',
  },
  titleCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  titleLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  titleEditor: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    lineHeight: 24,
  },
  contentCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 20,
    minHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  contentLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  contentEditor: {
    fontSize: 16,
    fontFamily: 'Inter-Regular', 
    lineHeight: 24,
    minHeight: 200,
  },
  // Styles pour le modal
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
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
  },
});