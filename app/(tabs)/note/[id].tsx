import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { CreditCard as Edit3, Trash2, Calendar, X } from 'lucide-react-native';
import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
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
  const { notes, deleteNote } = useStorage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);

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

  const handleBack = () => {
    try {
      router.push('/(tabs)/notes');
    } catch (error) {
      console.error('Erreur de navigation:', error);
      router.push('/(tabs)/notes');
    }
  };

  const handleEdit = () => {
    try {
      router.push(`/(tabs)/note/edit/${id}`);
    } catch (error) {
      console.error('Erreur de navigation vers édition:', error);
    }
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
        title={note.title || strings.untitledNote}
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

        <View style={styles.contentCard}>
          <Text style={styles.contentText}>
            {note.content || 'Cette note est vide.'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
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
  contentCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 20,
    minHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  contentText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text,
    lineHeight: 24,
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