import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, Animated, ScrollView, TextInput } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Plus, FileText, Trash2, CreditCard as Edit3, Calendar, X, Star, SquareCheck as CheckSquare, Square, Filter, Dessert as SortDesc, Clock } from 'lucide-react-native';
import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import { Note } from '@/types';
import { useStorage } from '@/contexts/StorageContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useModal } from '@/contexts/ModalContext';

type SortOption = 'newest' | 'oldest' | 'title' | 'updated';
type FilterOption = 'all' | 'with-images' | 'text-only';

// Composant séparé pour chaque note
function NoteItem({ item, index, onPress, onEdit, onDelete, onToggleFavorite, isSelected, isFavorite, selectionMode, onLongPress, theme, strings }: {
  item: Note;
  index: number;
  onPress: (note: Note) => void;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
  onToggleFavorite: (noteId: string) => void;
  isSelected: boolean;
  isFavorite: boolean;
  selectionMode: boolean;
  onLongPress: (note: Note) => void;
  theme: any;
  strings: any;
}) {
  const itemFadeAnim = React.useRef(new Animated.Value(0)).current;
  
  React.useEffect(() => {
    Animated.timing(itemFadeAnim, {
      toValue: 1,
      duration: 300,
      delay: index * 100,
      useNativeDriver: true,
    }).start();
  }, [itemFadeAnim, index]);

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

  const styles = createStyles(theme);

  return (
    <Animated.View style={{ opacity: itemFadeAnim }}>
      <TouchableOpacity
        style={[
          styles.noteCard,
          isSelected && styles.selectedCard,
          isFavorite && styles.favoriteCard
        ]}
        onPress={() => selectionMode ? onLongPress(item) : onPress(item)}
        onLongPress={() => onLongPress(item)}
      >
        <View style={styles.noteHeader}>
          {selectionMode && (
            <TouchableOpacity 
              style={styles.checkbox}
              onPress={() => onLongPress(item)}
            >
              {isSelected ? (
                <CheckSquare size={20} color={theme.colors.primary} />
              ) : (
                <Square size={20} color={theme.colors.textTertiary} />
              )}
            </TouchableOpacity>
          )}
          <View style={styles.noteInfo}>
            <TouchableOpacity 
              style={[styles.noteTitleContainer, selectionMode && styles.noteTitleContainerSelection]}
              onPress={() => !selectionMode && onEdit(item)}
              disabled={selectionMode}
            >
              <Text style={styles.noteTitle} numberOfLines={1}>
                {item.title || strings.untitledNote}
              </Text>
              {!selectionMode && <Text style={styles.editIcon}>✏️</Text>}
            </TouchableOpacity>
            <View style={styles.noteMeta}>
              <Calendar size={12} color={theme.colors.textTertiary} />
              <Text style={styles.noteDate}>
                {formatDate(item.updatedAt)}
              </Text>
            </View>
          </View>
          
          {!selectionMode && (
            <View style={styles.noteActions}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => onToggleFavorite(item.id)}
              >
                <Star 
                  size={14} 
                  color={isFavorite ? "#F59E0B" : theme.colors.textTertiary} 
                  fill={isFavorite ? "#F59E0B" : "none"}
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => onDelete(item)}
              >
                <Trash2 size={14} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {item.content && (
          <Text style={styles.notePreview} numberOfLines={3}>
            {getPreviewText(item.content)}
          </Text>
        )}

        {item.images && item.images.length > 0 && (
          <View style={styles.imagePreview}>
            <Text style={styles.imageCount}>📷 {item.images.length} image{item.images.length > 1 ? 's' : ''}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function NotesScreen() {
  const { strings } = useLanguage();
  const { theme } = useTheme();
  const { showModal, hideModal } = useModal();
  const { notes, deleteNote, favoriteNotes, setFavoriteNotes } = useStorage();
  const [loading, setLoading] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [filterVisible, setFilterVisible] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [filterOption, setFilterOption] = useState<FilterOption>('all');

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

  const safeNavigate = (path: string) => {
    try {
      // Vérifier que le router est prêt avant de naviguer
      if (router.canGoBack !== undefined) {
        router.push(path);
      } else {
        // Fallback avec délai si le router n'est pas encore prêt
        setTimeout(() => {
          router.push(path);
        }, 100);
      }
    } catch (error) {
      console.error('Erreur de navigation:', error);
      // Retry après un délai
      setTimeout(() => {
        try {
          router.push(path);
        } catch (retryError) {
          console.error('Erreur de navigation retry:', retryError);
        }
      }, 200);
    }
  };

  const handleCreateNote = () => {
    safeNavigate('/(tabs)/note/create');
  };

  const handleNotePress = (note: Note) => {
    safeNavigate(`/(tabs)/note/${note.id}`);
  };

  const handleEditNote = (note: Note) => {
    showModal(<EditNoteTitleModal 
      note={note}
      onSave={saveNoteTitleChange}
      onCancel={() => hideModal()}
      strings={strings}
    />);
  };

  const saveNoteTitleChange = async (note: Note, newTitle: string) => {
    if (!note) return;

    try {
      const { updateNote } = useStorage();
      await updateNote(note.id, {
        title: newTitle.trim() || strings.untitledNote,
      });
      
      hideModal();
    } catch (error) {
      console.error('Erreur lors de la modification du titre:', error);
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

  const handleToggleFavorite = async (noteId: string) => {
    const newFavorites = new Set(favoriteNotes || []);
    if (newFavorites.has(noteId)) {
      newFavorites.delete(noteId);
    } else {
      newFavorites.add(noteId);
    }
    
    await setFavoriteNotes(Array.from(newFavorites));
  };

  const handleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedNotes(new Set());
  };

  const handleNoteLongPress = (note: Note) => {
    if (selectionMode) {
      handleNoteSelection(note.id);
    } else {
      setSelectionMode(true);
      handleNoteSelection(note.id);
    }
  };

  const handleNoteSelection = (noteId: string) => {
    setSelectedNotes(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(noteId)) {
        newSelection.delete(noteId);
      } else {
        newSelection.add(noteId);
      }
      return newSelection;
    });
  };

  const handleBulkDelete = () => {
    if (selectedNotes.size === 0) return;

    showModal(<BulkDeleteNotesModal 
      count={selectedNotes.size}
      onConfirm={() => confirmBulkDeleteNotes()}
      onCancel={() => hideModal()}
      strings={strings}
    />);
  };

  const confirmBulkDeleteNotes = async () => {
    try {
      for (const noteId of selectedNotes) {
        const success = await deleteNote(noteId);
        if (!success) {
          console.error('Erreur lors de la suppression de la note:', noteId);
        }
      }
      setSelectedNotes(new Set());
      setSelectionMode(false);
      hideModal();
    } catch (error) {
      console.error('Erreur lors de la suppression en lot:', error);
      hideModal();
    }
  };

  const handleBulkFavorite = async () => {
    if (selectedNotes.size === 0) return;

    const newFavorites = new Set(favoriteNotes || []);
    for (const noteId of selectedNotes) {
      if (newFavorites.has(noteId)) {
        newFavorites.delete(noteId);
      } else {
        newFavorites.add(noteId);
      }
    }
    
    await setFavoriteNotes(Array.from(newFavorites));
    setSelectedNotes(new Set());
    setSelectionMode(false);
  };

  // Fonction pour filtrer et trier les notes
  const getFilteredAndSortedNotes = () => {
    let filteredNotes = [...notes];
    
    // Appliquer le filtre
    switch (filterOption) {
      case 'with-images':
        filteredNotes = notes.filter(note => note.images && note.images.length > 0);
        break;
      case 'text-only':
        filteredNotes = notes.filter(note => !note.images || note.images.length === 0);
        break;
      default:
        filteredNotes = notes;
    }
    
    // Appliquer le tri
    switch (sortOption) {
      case 'oldest':
        filteredNotes.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'title':
        filteredNotes.sort((a, b) => (a.title || strings.untitledNote).localeCompare(b.title || strings.untitledNote));
        break;
      case 'updated':
        filteredNotes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
      default: // newest
        filteredNotes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    
    // Trier les favoris en premier
    return filteredNotes.sort((a, b) => {
      const aIsFavorite = favoriteNotes?.includes(a.id) || false;
      const bIsFavorite = favoriteNotes?.includes(b.id) || false;
      
      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;
      return 0;
    });
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

  const renderNote = ({ item, index }: { item: Note; index: number }) => {
    const isSelected = selectedNotes.has(item.id);
    const isFavorite = favoriteNotes?.includes(item.id) || false;
    
    return (
      <NoteItem
        item={item}
        index={index}
        onPress={handleNotePress}
        onEdit={handleEditNote}
        onDelete={handleDeleteNote}
        onToggleFavorite={handleToggleFavorite}
        isSelected={isSelected}
        isFavorite={isFavorite}
        selectionMode={selectionMode}
        onLongPress={handleNoteLongPress}
        theme={theme}
        strings={strings}
      />
    );
  };

  const filteredNotes = getFilteredAndSortedNotes();

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <Header
        title={strings.notesTitle}
        subtitle={strings.notesSubtitle}
        rightComponent={
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => setFilterVisible(!filterVisible)} style={styles.actionButton}>
              <Filter size={20} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSelectionMode} style={styles.selectionButton}>
              <Text style={styles.selectionButtonText}>
                {selectionMode ? strings.cancel : 'Sélect.'}
              </Text>
            </TouchableOpacity>
          </View>
        }
      />

      {selectionMode && (
        <View style={styles.selectionToolbar}>
          <Text style={styles.selectionCount}>
            {selectedNotes.size} {strings.selected}{selectedNotes.size > 1 ? 's' : ''}
          </Text>
          <View style={styles.selectionActions}>
            <TouchableOpacity 
              style={styles.toolbarButton}
              onPress={handleBulkFavorite}
              disabled={selectedNotes.size === 0}
            >
              <Star size={20} color={selectedNotes.size > 0 ? "#F59E0B" : theme.colors.textTertiary} />
              <Text style={[styles.toolbarButtonText, { color: selectedNotes.size > 0 ? "#F59E0B" : theme.colors.textTertiary }]}>
                {strings.favorites}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.toolbarButton}
              onPress={handleBulkDelete}
              disabled={selectedNotes.size === 0}
            >
              <Trash2 size={20} color={selectedNotes.size > 0 ? theme.colors.error : theme.colors.textTertiary} />
              <Text style={[styles.toolbarButtonText, { color: selectedNotes.size > 0 ? theme.colors.error : theme.colors.textTertiary }]}>
                {strings.delete}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Barre de filtres */}
      {filterVisible && (
        <View style={styles.filterBar}>
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>📅 Tri</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              <View style={styles.filterButtons}>
                <TouchableOpacity
                  style={[styles.filterButton, sortOption === 'newest' && styles.filterButtonActive]}
                  onPress={() => setSortOption('newest')}
                >
                  <Text style={[styles.filterButtonText, sortOption === 'newest' && styles.filterButtonTextActive]}>
                    Plus récentes
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterButton, sortOption === 'oldest' && styles.filterButtonActive]}
                  onPress={() => setSortOption('oldest')}
                >
                  <Text style={[styles.filterButtonText, sortOption === 'oldest' && styles.filterButtonTextActive]}>
                    Plus anciennes
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterButton, sortOption === 'updated' && styles.filterButtonActive]}
                  onPress={() => setSortOption('updated')}
                >
                  <Text style={[styles.filterButtonText, sortOption === 'updated' && styles.filterButtonTextActive]}>
                    Modifiées
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterButton, sortOption === 'title' && styles.filterButtonActive]}
                  onPress={() => setSortOption('title')}
                >
                  <Text style={[styles.filterButtonText, sortOption === 'title' && styles.filterButtonTextActive]}>
                    Alphabétique
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>🔍 Contenu</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              <View style={styles.filterButtons}>
              <TouchableOpacity
                style={[styles.filterButton, filterOption === 'all' && styles.filterButtonActive]}
                onPress={() => setFilterOption('all')}
              >
                <Text style={[styles.filterButtonText, filterOption === 'all' && styles.filterButtonTextActive]}>
                  Toutes ({notes.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, filterOption === 'with-images' && styles.filterButtonActive]}
                onPress={() => setFilterOption('with-images')}
              >
                <Text style={[styles.filterButtonText, filterOption === 'with-images' && styles.filterButtonTextActive]}>
                  Avec images ({notes.filter(n => n.images && n.images.length > 0).length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, filterOption === 'text-only' && styles.filterButtonActive]}
                onPress={() => setFilterOption('text-only')}
              >
                <Text style={[styles.filterButtonText, filterOption === 'text-only' && styles.filterButtonTextActive]}>
                  Texte seul ({notes.filter(n => !n.images || n.images.length === 0).length})
                </Text>
              </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      <View style={[styles.content, Platform.OS === 'web' && styles.contentWeb]}>
        {filteredNotes.length === 0 && notes.length === 0 ? (
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
        ) : filteredNotes.length === 0 ? (
          <Animated.View style={[styles.emptyContainer, { opacity: fadeAnim }]}>
            <Filter size={64} color={theme.colors.textTertiary} />
            <Text style={styles.emptyTitle}>Aucune note trouvée</Text>
            <Text style={styles.emptySubtitle}>
              Aucune note ne correspond aux filtres sélectionnés
            </Text>
          </Animated.View>
        ) : (
          <Animated.View style={[styles.listContainer, { opacity: fadeAnim }]}>
            <FlatList
              data={filteredNotes}
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

// Modal de confirmation pour la suppression en lot
const BulkDeleteNotesModal = ({ count, onConfirm, onCancel, strings }: {
  count: number;
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
          Supprimer {count} note{count > 1 ? 's' : ''}
        </Text>
        <TouchableOpacity onPress={onCancel} style={modalStyles.closeButton}>
          <X size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <View style={modalStyles.modalBody}>
        <Text style={modalStyles.modalText}>
          <Text>⚠️ </Text>
          <Text style={modalStyles.modalBold}>Cette action est irréversible !</Text>
          <Text>{'\n\n'}</Text>
          <Text>Êtes-vous sûr de vouloir supprimer </Text>
          <Text style={modalStyles.modalBold}>{count} note{count > 1 ? 's' : ''}</Text>
          <Text> ?</Text>
        </Text>
      </View>
      <View style={modalStyles.modalFooter}>
        <Button
          title={strings.cancel || 'Annuler'}
          onPress={onCancel}
          variant="secondary"
          style={modalStyles.modalButton}
        />
        <Button
          title={`Supprimer ${count > 1 ? 'tout' : 'la note'}`}
          onPress={onConfirm}
          variant="danger"
          style={modalStyles.modalButton}
        />
      </View>
    </View>
  );
};

// Modal d'édition du titre de note
const EditNoteTitleModal = ({ note, onSave, onCancel, strings }: {
  note: Note;
  onSave: (note: Note, newTitle: string) => void;
  onCancel: () => void;
  strings: any;
}) => {
  const { theme } = useTheme();
  const [title, setTitle] = useState(note.title || '');
  const modalStyles = createStyles(theme);

  const handleSave = () => {
    onSave(note, title);
  };

  return (
    <View style={modalStyles.modalContent}>
      <View style={modalStyles.modalHeader}>
        <Text style={modalStyles.modalTitle}>Modifier le titre de la note</Text>
        <TouchableOpacity onPress={onCancel} style={modalStyles.closeButton}>
          <X size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={modalStyles.modalBody}>
        <Text style={modalStyles.inputLabel}>Titre de la note *</Text>
        <TextInput
          style={modalStyles.titleTextInput}
          value={title}
          onChangeText={setTitle}
          placeholder="Ex: Observations chantier, Mesures particulières..."
          placeholderTextColor={theme.colors.textTertiary}
          autoFocus={true}
          selectTextOnFocus={true}
          returnKeyType="done"
          blurOnSubmit={true}
        />
      </View>

      <View style={modalStyles.modalFooter}>
        <Button
          title={strings.cancel}
          onPress={onCancel}
          variant="secondary"
          style={modalStyles.modalButton}
        />
        <Button
          title={strings.save}
          onPress={handleSave}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  selectionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  selectionButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: theme.colors.textSecondary,
  },
  selectionToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  selectionCount: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: theme.colors.text,
  },
  selectionActions: {
    flexDirection: 'row',
    gap: 16,
  },
  toolbarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  toolbarButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  filterBar: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterSection: {
    marginBottom: 12,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  filterButtonTextActive: {
    color: '#ffffff',
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
  selectedCard: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '20',
  },
  favoriteCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  checkbox: {
    padding: 2,
    marginRight: 8,
    flexShrink: 0,
  },
  noteInfo: {
    flex: 1,
    marginRight: 12,
  },
  noteTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: theme.colors.surfaceSecondary,
    marginBottom: 4,
  },
  noteTitleContainerSelection: {
    backgroundColor: 'transparent',
  },
  noteTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
    flex: 1,
  },
  editIcon: {
    fontSize: 12,
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
    flexShrink: 0,
  },
  notePreview: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  imagePreview: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.separator,
  },
  imageCount: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: theme.colors.primary,
  },
  floatingButton: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 20 : 20,
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
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  titleTextInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    backgroundColor: theme.colors.inputBackground,
    color: theme.colors.text,
    minHeight: 48,
  },
});