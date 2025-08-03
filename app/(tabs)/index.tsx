import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, TextInput, Platform, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Plus, Settings, Building, Star, Trash2, SquareCheck as CheckSquare, Square, X } from 'lucide-react-native';
import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import { CreateProjectModal } from '@/components/CreateProjectModal';
import { ProjectCard } from '@/components/ProjectCard';
import { Project } from '@/types';
import { useStorage } from '@/contexts/StorageContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useModal } from '@/contexts/ModalContext';
import { addEventListener } from '@/utils/EventEmitter';
import { LoadingScreen } from '@/components/LoadingScreen';

interface PredefinedZone {
  id: string;
  name: string;
  highShutters: number;
  lowShutters: number;
}

interface PredefinedBuilding {
  id: string;
  name: string;
  zones: PredefinedZone[];
}

interface PredefinedStructure {
  enabled: boolean;
  buildings: PredefinedBuilding[];
}

export default function ProjectsScreen() {
  const { strings } = useLanguage();
  const { theme } = useTheme();
  const { showModal, hideModal } = useModal();
  const { 
    projects, 
    favoriteProjects, 
    createProject, 
    createBuilding, 
    createFunctionalZone, 
    createShutter, 
    deleteProject, 
    setFavoriteProjects 
  } = useStorage();
  
  const [loading, setLoading] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());

  // Fonction locale pour gérer l'ouverture du modal
  const handleCreateModal = useCallback(() => {
    console.log('📱 Ouverture du modal de création de projet');
    showModal(
      <CreateProjectModal 
        onSubmit={handleCreateProject}
        loading={createLoading}
      />,
      {
        animationType: 'slide',
        onRequestClose: () => {
          // Le modal se fermera automatiquement
        }
      }
    );
  }, []);

  // Effet pour écouter les événements d'ouverture du modal
  useEffect(() => {
    console.log('🎧 Configuration de l\'écouteur d\'événements pour le modal');
    
    const removeListener = addEventListener('openCreateProjectModal', handleCreateModal);
    
    // Nettoyage de l'écouteur au démontage
    return () => {
      console.log('🧹 Nettoyage de l\'écouteur d\'événements');
      removeListener();
    };
  }, [handleCreateModal]);

  const loadProjects = useCallback(async () => {
    try {
      console.log('📦 Chargement des projets...');
      console.log(`✅ ${projects.length} projets chargés`);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des projets:', error);
    } finally {
      setLoading(false);
    }
  }, [projects]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Projects screen focused, reloading data...');
      loadProjects();
    }, [loadProjects])
  );

  const generateUniqueId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const handleCreateProject = async (projectData: any, predefinedStructure: PredefinedStructure) => {
    setCreateLoading(true);
    try {
      console.log('🏗️ Création du projet:', projectData.name, 'avec structure prédéfinie:', predefinedStructure.enabled);
      
      const project = await createProject(projectData);
      
      if (predefinedStructure.enabled && predefinedStructure.buildings.length > 0) {
        console.log('🏢 Création de la structure prédéfinie avec', predefinedStructure.buildings.length, 'bâtiments');
        
        for (const buildingData of predefinedStructure.buildings) {
          console.log('🏗️ Création du bâtiment:', buildingData.name);
          const building = await createBuilding(project.id, {
            name: buildingData.name,
          });
          
          if (building) {
            console.log('✅ Bâtiment créé:', building.id);
            for (const zoneData of buildingData.zones) {
              console.log('🏢 Création de la zone:', zoneData.name, 'avec', zoneData.highShutters, 'VH et', zoneData.lowShutters, 'VB');
              const zone = await createFunctionalZone(building.id, {
                name: zoneData.name,
              });
              
              if (zone) {
                console.log('✅ Zone créée:', zone.id);
                // Créer les volets hauts
                if (zoneData.highShutters > 0) {
                  console.log(`🔲 Création de ${zoneData.highShutters} volets hauts`);
                  for (let i = 1; i <= zoneData.highShutters; i++) {
                    const shutterName = `VH${i.toString().padStart(2, '0')}`;
                    console.log(`  - Création volet ${shutterName}`);
                    try {
                      const shutter = await createShutter(zone.id, {
                        name: shutterName,
                        type: 'high',
                        referenceFlow: 0,
                        measuredFlow: 0,
                      });
                      console.log(`  ✅ Volet ${shutterName} créé:`, shutter?.id);
                    } catch (error) {
                      console.error(`  ❌ Erreur création volet ${shutterName}:`, error);
                    }
                  }
                }
                
                // Créer les volets bas
                if (zoneData.lowShutters > 0) {
                  console.log(`🔲 Création de ${zoneData.lowShutters} volets bas`);
                  for (let i = 1; i <= zoneData.lowShutters; i++) {
                    const shutterName = `VB${i.toString().padStart(2, '0')}`;
                    console.log(`  - Création volet ${shutterName}`);
                    try {
                      const shutter = await createShutter(zone.id, {
                        name: shutterName,
                        type: 'low',
                        referenceFlow: 0,
                        measuredFlow: 0,
                      });
                      console.log(`  ✅ Volet ${shutterName} créé:`, shutter?.id);
                    } catch (error) {
                      console.error(`  ❌ Erreur création volet ${shutterName}:`, error);
                    }
                  }
                }
              } else {
                console.error('❌ Erreur: Zone non créée pour', zoneData.name);
              }
            }
          } else {
            console.error('❌ Erreur: Bâtiment non créé pour', buildingData.name);
          }
        }
        console.log('✅ Structure prédéfinie créée avec succès');
      }
      
      // Navigation vers le projet créé avec délai pour s'assurer que tout est bien créé
      console.log('⏱️ Attente avant navigation vers le projet...');
      setTimeout(async () => {
        try {
          console.log('🧭 Navigation vers le projet:', project.id);
          await router.push(`/(tabs)/project/${project.id}`);
        } catch (navError) {
          console.error('❌ Erreur de navigation:', navError);
          // Fallback en cas d'erreur
          router.push('/(tabs)/');
        }
      }, 500);
      
    } catch (error) {
      console.error('❌ Erreur lors de la création du projet:', error);
      Alert.alert(strings.error, 'Impossible de créer le projet. Veuillez réessayer.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleProjectPress = (project: Project) => {
    if (selectionMode) {
      handleProjectSelection(project.id);
    } else {
      router.push(`/(tabs)/project/${project.id}`);
    }
  };

  const handleProjectLongPress = (project: Project) => {
    if (!selectionMode) {
      setSelectionMode(true);
      handleProjectSelection(project.id);
    }
  };

  const handleProjectSelection = (projectId: string) => {
    setSelectedProjects(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(projectId)) {
        newSelection.delete(projectId);
      } else {
        newSelection.add(projectId);
      }
      return newSelection;
    });
  };

  const handleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedProjects(new Set());
  };

  const handleBulkDelete = () => {
    if (selectedProjects.size === 0) return;

    showModal(<BulkDeleteProjectsModal 
      count={selectedProjects.size}
      onConfirm={() => confirmBulkDeleteProjects()}
      onCancel={() => hideModal()}
      strings={strings}
    />);
  };

// Composant modal pour la suppression d'un projet
function DeleteProjectModal({ project, onConfirm, onCancel, strings }: any) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>{strings.deleteProject}</Text>
        <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
          <X size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.modalBody}>
        <Text style={styles.modalText}>
          <Text>⚠️ </Text>
          <Text style={styles.modalBold}>Cette action est irréversible !</Text>
          <Text>{'\n\n'}</Text>
          <Text>Êtes-vous sûr de vouloir supprimer le projet </Text>
          <Text style={styles.modalBold}>"{project.name}"</Text>
          <Text> ?</Text>
          <Text>{'\n\n'}</Text>
          <Text>Tous les bâtiments, zones et volets associés seront également supprimés.</Text>
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
          title={strings.delete}
          onPress={onConfirm}
          variant="danger"
          style={styles.modalButton}
        />
      </View>
    </View>
  );
}

// Composant modal pour la suppression en lot de projets
function BulkDeleteProjectsModal({ count, onConfirm, onCancel, strings }: any) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Supprimer {count} projet{count > 1 ? 's' : ''}</Text>
        <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
          <X size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.modalBody}>
        <Text style={styles.modalText}>
          <Text>⚠️ </Text>
          <Text style={styles.modalBold}>Cette action est irréversible !</Text>
          <Text>{'\n\n'}</Text>
          <Text>Êtes-vous sûr de vouloir supprimer </Text>
          <Text style={styles.modalBold}>{count} projet{count > 1 ? 's' : ''}</Text>
          <Text> ?</Text>
          <Text>{'\n\n'}</Text>
          <Text>Tous les bâtiments, zones et volets associés seront également supprimés.</Text>
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
          title={`Supprimer ${count > 1 ? 'tout' : 'le projet'}`}
          onPress={onConfirm}
          variant="danger"
          style={styles.modalButton}
        />
      </View>
    </View>
  );
}

  const handleBulkFavorite = async () => {
    if (selectedProjects.size === 0) return;

    const newFavorites = new Set(favoriteProjects);
    for (const projectId of selectedProjects) {
      if (newFavorites.has(projectId)) {
        newFavorites.delete(projectId);
      } else {
        newFavorites.add(projectId);
      }
    }
    
    await setFavoriteProjects(Array.from(newFavorites));
    setSelectedProjects(new Set());
    setSelectionMode(false);
  };

  const handleToggleFavorite = async (projectId: string) => {
    // Protection contre null/undefined
    const newFavorites = new Set(favoriteProjects || []);
    if (newFavorites.has(projectId)) {
      newFavorites.delete(projectId);
    } else {
      newFavorites.add(projectId);
    }
    
    await setFavoriteProjects(Array.from(newFavorites));
  };

  const handleEditProject = (project: Project) => {
    router.push(`/(tabs)/project/edit/${project.id}`);
  };

  const handleDeleteProject = async (project: Project) => {
    showModal(<DeleteProjectModal 
      project={project}
      onConfirm={() => confirmDeleteProject(project)}
      onCancel={() => hideModal()}
      strings={strings}
    />);
  };

  const confirmDeleteProject = async (project: Project) => {
    try {
      const success = await deleteProject(project.id);
      if (success) {
        console.log('✅ Projet supprimé avec succès');
        hideModal();
      } else {
        console.error('❌ Erreur: Projet non trouvé pour la suppression');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
  };

  // Trier les projets : favoris en premier
  const sortedProjects = [...projects].sort((a, b) => {
    // Protection contre null/undefined
    const aIsFavorite = favoriteProjects?.includes(a.id) || false;
    const bIsFavorite = favoriteProjects?.includes(b.id) || false;
    
    if (aIsFavorite && !bIsFavorite) return -1;
    if (!aIsFavorite && bIsFavorite) return 1;
    
    // Si même statut de favori, trier par date de création (plus récent en premier)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const confirmBulkDeleteProjects = async () => {
    try {
      for (const projectId of selectedProjects) {
        const success = await deleteProject(projectId);
        if (!success) {
          console.error('Erreur lors de la suppression du projet:', projectId);
        }
      }
      setSelectedProjects(new Set());
      setSelectionMode(false);
      hideModal();
    } catch (error) {
      console.error('Erreur lors de la suppression en lot:', error);
    }
  };

  const renderProject = ({ item }: { item: Project }) => (
    <ProjectCard
      project={item}
      isFavorite={favoriteProjects?.includes(item.id) || false}
      isSelected={selectedProjects.has(item.id)}
      selectionMode={selectionMode}
      onPress={() => handleProjectPress(item)}
      onLongPress={() => handleProjectLongPress(item)}
      onToggleFavorite={() => handleToggleFavorite(item.id)}
      onEdit={() => handleEditProject(item)}
      onDelete={() => handleDeleteProject(item)}
    />
  );

  const styles = createStyles(theme);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.container}>
      <Header
        title={strings.projectsTitle}
        subtitle={strings.projectsSubtitle}
        rightComponent={
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleSelectionMode} style={styles.selectionButton}>
              <Text style={styles.selectionButtonText}>
                {selectionMode ? strings.cancel : 'Sélect.'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCreateModal} style={styles.actionButton}>
              <Plus size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        }
      />

      {selectionMode && (
        <View style={styles.selectionToolbar}>
          <Text style={styles.selectionCount}>
            {selectedProjects.size} {strings.selected}{selectedProjects.size > 1 ? 's' : ''}
          </Text>
          <View style={styles.selectionActions}>
            <TouchableOpacity 
              style={styles.toolbarButton}
              onPress={handleBulkFavorite}
              disabled={selectedProjects.size === 0}
            >
              <Star size={20} color={selectedProjects.size > 0 ? "#F59E0B" : theme.colors.textTertiary} />
              <Text style={[styles.toolbarButtonText, { color: selectedProjects.size > 0 ? "#F59E0B" : theme.colors.textTertiary }]}>
                {strings.favorites}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.toolbarButton}
              onPress={handleBulkDelete}
              disabled={selectedProjects.size === 0}
            >
              <Trash2 size={20} color={selectedProjects.size > 0 ? theme.colors.error : theme.colors.textTertiary} />
              <Text style={[styles.toolbarButtonText, { color: selectedProjects.size > 0 ? theme.colors.error : theme.colors.textTertiary }]}>
                {strings.delete}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={[styles.content, Platform.OS === 'web' && styles.contentWeb]}>
        {projects.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Building size={64} color={theme.colors.textTertiary} />
            <Text style={styles.emptyTitle}>{strings.noProjects}</Text>
            <Text style={styles.emptySubtitle}>
              {strings.noProjectsDesc}
            </Text>
            <Button
              title={strings.createFirstProject}
              onPress={handleCreateModal}
              style={styles.createButton}
            />
          </View>
        ) : (
          <FlatList
            data={sortedProjects}
            renderItem={renderProject}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContainer,
              Platform.OS === 'web' && styles.listContainerWeb
            ]}
            showsVerticalScrollIndicator={false}
          />
        )}
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
  contentWeb: {
    // Ajouter un padding bottom pour éviter que le contenu soit caché par la tab bar
    paddingBottom: Platform.OS === 'web' ? 80 : 0,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  actionButton: {
    padding: 8,
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
    padding: 16,
  },
  listContainerWeb: {
    paddingBottom: Platform.OS === 'web' ? 100 : 16, // Padding supplémentaire sur web
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    margin: 20,
    maxWidth: 400,
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text,
    lineHeight: 24,
  },
  modalBold: {
    fontFamily: 'Inter-Bold',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  modalButton: {
    minWidth: 100,
  },
});