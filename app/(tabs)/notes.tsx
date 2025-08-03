import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, Animated } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Plus, FileText, Trash2, Edit3, Calendar } from 'lucide-react-native';
import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import { Note } from '@/types';
import { useStorage } from '@/contexts/StorageContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useModal } from '@/contexts/ModalContext';

export default function NotesScreen() {
  const { strings } = useLanguage();
  const { theme } = useTheme();
  const { showModal, hideModal } = useModal();
  const { notes, deleteNote } = useStorage();
  const [loading, setLoading] = useState(false);

  // Animation pour l'apparition des notes en stagger
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      console.log('Notes screen focused, animating...');
      // Animation d'apparition
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, [fadeAnim])
  );

  const handleCreateNote = () => {
    try {
      router.push('/(tabs)/note/create');
    } catch (error) {
      console.error('Erreur de navigation vers création note:', error);
    }
  };

  const handleNotePress = (note: Note) => {
    try {
      router.push(`/(tabs)/note/${note.id}`);
    } catch (error) {
      console.error('Erreur de navigation vers note:', error);
    }
  };

  const handleEditNote = (note: Note) => {
    try {
      router.push(`/(tabs)/note/edit/${note.id}`);
    } catch (error) {
      console.error('Erreur de navigation vers édition note:', error);
    }
  };

  const handleDeleteNote = (note: Note) => {
    showModal(<DeleteNoteModal 
      note={note}
      onConfirm={() => confirmDeleteNote(note)}
      onCancel={() => hideModal()}
      strings={strings}
    />);
  };

  const confirmDeleteNote = async (note: Note) => {
    try {
      setLoading(true);
      const success = await deleteNote(note.id);
      if (success) {
        console.log('✅ Note supprimée avec succès');
        hideModal();
      } else {
        console.error('❌ Erreur: Note non trouvée pour la suppression');
        hideModal();
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      hideModal();
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const getPreviewText = (content: string) => {
    return content.length > 100 ? content.substring(0, 100) + '...' : content;
  };

  const renderNote = ({ item, index }: { item: Note; index: number }) => {
    // Animation stagger pour chaque note
    const itemFadeAnim = React.useRef(new Animated.Value(0)).current;
    
    React.useEffect(() => {
      Animated.timing(itemFadeAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 100, // Stagger effect
        useNativeDriver: true,
      }).start();
    }, [itemFadeAnim, index]);

    return (
      <Animated.View style={{ opacity: itemFadeAnim }}>
        <TouchableOpacity
          style={styles.noteCard}
          onPress={() => handleNotePress(item)}
        >
          <View style={styles.noteHeader}>
            <View style={styles.noteInfo}>
              <Text style={styles.noteTitle} numberOfLines={1}>
                {item.title || strings.untitledNote}
              </Text>
              <View style={styles.noteMeta}>
                <Calendar size={12} color={theme.colors.textTertiary} />
                <Text style={styles.noteDate}>
                  {formatDate(item.updatedAt)}
                </Text>
              </View>
            </View>
            
            <View style={styles.noteActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleEditNote(item)}
              >
                <Edit3 size={16} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDeleteNote(item)}
              >
                <Trash2 size={16} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          </View>

          {item.content && (
            <Text style={styles.notePreview} numberOfLines={3}>
              {getPreviewText(item.content)}
            </Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <Header
        title={strings.notesTitle}
        subtitle={strings.notesSubtitle}
      />

      <View style={[styles.content, Platform.OS === 'web' && styles.contentWeb]}>
        {notes.length === 0 ? (
          <Animated.View style={[styles.emptyContainer, { opacity: fadeAnim }]}>
            <FileText size={64} color={theme.colors.textTertiary} />
            <Text style={styles.emptyTitle}>{strings.noNotes}</Text>
            <Text style={styles.emptySubtitle}>
              {strings.noNotesDesc}
            </Text>
            <Button
              title={strings.createFirstNote}
              onPress={handleCreateNote}
              style={styles.createButton}
            />
          </Animated.View>
        ) : (
          <Animated.View style={[styles.listContainer, { opacity: fadeAnim }]}>
            <FlatList
              data={notes}
              renderItem={renderNote}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[
                styles.listContent,
                Platform.OS === 'web' && styles.listContentWeb
              ]}
              showsVerticalScrollIndicator={false}
            />
          </Animated.View>
        )}
      </View>

      {/* Bouton flottant pour créer une note */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={handleCreateNote}
      >
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

// Modal de confirmation pour la suppression d'une note
const DeleteNoteModal = ({ note, onConfirm, onCancel, strings }: {
  note: Note;
  onConfirm: () => void;
  onCancel: () => void;
  strings: any;
}) => {
  const { theme } = useTheme();
  const modalStyles = createStyles(theme);

  return (
    <View style={modalStyles.modalContent}>
      <View style={modalStyles.modalHeader}>
        <Text style={modalStyles.modalTitle}>
          {strings.deleteNote}
        </Text>
        <TouchableOpacity onPress={onCancel} style={modalStyles.closeButton}>
          <X size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <View style={modalStyles.modalBody}>
        <Text style={modalStyles.modalText}>
          {strings.deleteNoteConfirm} "{note.title || strings.untitledNote}" ?
        </Text>
        <Text style={[modalStyles.modalText, modalStyles.modalBold]}>
          Cette action est irréversible.
        </Text>
      </View>
      <View style={modalStyles.modalFooter}>
        <Button
          title={strings.cancel}
          onPress={onCancel}
          variant="secondary"
          style={modalStyles.modalButton}
        />
        <Button
          title={strings.delete}
          onPress={onConfirm}
          variant="danger"
          style={modalStyles.modalButton}
        />
      </View>
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
  },
  contentWeb: {
    paddingBottom: Platform.OS === 'web' ? 100 : 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text,
    marginTop: 24,
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  createButton: {
    paddingHorizontal: 32,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100, // Espace pour le bouton flottant
  },
  listContentWeb: {
    paddingBottom: Platform.OS === 'web' ? 120 : 100,
  },
  noteCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  noteInfo: {
    flex: 1,
    marginRight: 12,
  },
  noteTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  noteMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  noteDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textTertiary,
  },
  noteActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  notePreview: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  floatingButton: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 100 : 80,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
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
  },
});