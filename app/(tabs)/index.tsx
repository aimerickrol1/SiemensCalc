import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Platform } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Plus, Building, Star, Trash2, SquareCheck as CheckSquare, Square } from 'lucide-react-native';
import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import { ProjectCard } from '@/components/ProjectCard';
import { CreateProjectModal } from '@/components/CreateProjectModal';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Project } from '@/types';
import { useStorage } from '@/contexts/StorageContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useDoubleBackToExit } from '@/utils/BackHandler';
import { addEventListener } from '@/utils/EventEmitter';

export default function ProjectsScreen() {
  const { strings } = useLanguage();
  const { theme } = useTheme();
  const { 
    projects, 
    favoriteProjects,
    createProject, 
    deleteProject, 
    setFavoriteProjects,
    createBuilding,
    createFunctionalZone,
    createShutter,
    isLoading 
  } = useStorage();
  
  const [loading, setLoading] = useState(true);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Utiliser le hook pour gérer le double appui sur le bouton retour pour quitter
  useDoubleBackToExit();

    // Utiliser notre émetteur d'événements compatible avec toutes les plateformes
    const handleOpenModal = () => {
      handleCreateModal();
    };
    
    // Ajouter l'écouteur et récupérer la fonction de nettoyage
    const cleanup = addEventListener('openCreateProjectModal', handleOpenModal);
    
    // Nettoyer l'écouteur au démontage
    return cleanup;
  }, []);

  useFocusEffect(
    useCallback(() => {
      console.log('Projects screen focused, data should be up to date');
      setLoading(false);
    }, [])
  );

  useEffect(() => {
    setLoading(false);
  }, []);

  // Affichage conditionnel pour éviter l'écran blanc
  if (isLoading || loading) {
    return <LoadingScreen title="Chargement..." message="Chargement des projets..." />;
  }

  const handleCreateModal = () => {
    setCreateModalVisible(true);
  };

  const handleCreateProject = async (projectData: any, predefinedStructure: any) => {
    setFormLoading(true);
    try {
      const project = await createProject(projectData);

      // Si la prédéfinition est activée, créer la structure
      if (predefinedStructure.enabled && predefinedStructure.buildings.length > 0) {
        for (const buildingData of predefinedStructure.buildings) {
          if (buildingData.name.trim()) {
            const building = await createBuilding(project.id, {
              name: buildingData.name.trim()
            });

            if (building && buildingData.zones.length > 0) {
              for (const zoneData of buildingData.zones) {
                if (zoneData.name.trim()) {
                  const zone = await createFunctionalZone(building.id, {
                    name: zoneData.name.trim()
                  });

                  if (zone) {
                    // Créer les volets hauts (VH)
                    for (let i = 1; i <= zoneData.highShutters; i++) {
                      await createShutter(zone.id, {
                        name: `VH${i.toString().padStart(2, '0')}`,
                        type: 'high',
                        referenceFlow: 0,
                        measuredFlow: 0
                      });
                    }

                    // Créer les volets bas (VB)
                    for (let i = 1; i <= zoneData.lowShutters; i++) {
                      await createShutter(zone.id, {
                        name: `VB${i.toString().padStart(2, '0')}`,
                        type: 'low',
                        referenceFlow: 0,
                        measuredFlow: 0
                      });
                    }
                  }
                }
              }
            }
          }
        }
      }

      setCreateModalVisible(false);
      router.push(`/(tabs)/project/${project.id}`);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de créer le projet. Veuillez réessayer.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleFavorite = async (projectId: string) => {
    const newFavorites = new Set(favoriteProjects || []);
    if (newFavorites.has(projectId)) {
      newFavorites.delete(projectId);
    } else {
      newFavorites.add(projectId);
    }
    
    await setFavoriteProjects(Array.from(newFavorites));
  };

  const handleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedProjects(new Set());
  };

  const handleProjectSelection = (projectId: string) => {
    const newSelection = new Set(selectedProjects);
    if (newSelection.has(projectId)) {
      newSelection.delete(projectId);
    } else {
      newSelection.add(projectId);
    }
    setSelectedProjects(newSelection);
  };

  const handleBulkDelete = () => {
    if (selectedProjects.size === 0) return;

    Alert.alert(
      'Supprimer les projets',
      `Êtes-vous sûr de vouloir supprimer ${selectedProjects.size} projet${selectedProjects.size > 1 ? 's' : ''} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            for (const projectId of selectedProjects) {
              await deleteProject(projectId);
            }
            setSelectedProjects(new Set());
            setSelectionMode(false);
          }
        }
      ]
    );
  };

  const handleBulkFavorite = async () => {
    if (selectedProjects.size === 0) return;

    const newFavorites = new Set(favoriteProjects || []);
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

  const handleProjectPress = (project: Project) => {
    if (selectionMode) {
      handleProjectSelection(project.id);
    } else {
      router.push(`/(tabs)/project/${project.id}`);
    }
  };

  const handleDeleteProject = async (project: Project) => {
    Alert.alert(
      'Supprimer le projet',
      `Êtes-vous sûr de vouloir supprimer le projet "${project.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deleteProject(project.id);
          }
        }
      ]
    );
  };

  const handleEditProject = (project: Project) => {
    router.push(`/(tabs)/project/edit/${project.id}`);
  };

  // Trier les projets : favoris en premier
  const favoriteProjectsSet = new Set(favoriteProjects);
  const sortedProjects = [...projects].sort((a, b) => {
    const aIsFavorite = favoriteProjectsSet.has(a.id);
    const bIsFavorite = favoriteProjectsSet.has(b.id);
    
    if (aIsFavorite && !bIsFavorite) return -1;
    if (!aIsFavorite && bIsFavorite) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const renderProject = ({ item }: { item: Project }) => {
    const isSelected = selectedProjects.has(item.id);
    const isFavorite = favoriteProjectsSet.has(item.id);

    return (
      <ProjectCard
        project={item}
        isFavorite={isFavorite}
        isSelected={isSelected}
        selectionMode={selectionMode}
        onPress={() => handleProjectPress(item)}
        onLongPress={() => {
          if (!selectionMode) {
            setSelectionMode(true);
            handleProjectSelection(item.id);
          }
        }}
        onToggleFavorite={() => handleToggleFavorite(item.id)}
        onEdit={() => handleEditProject(item)}
        onDelete={() => handleDeleteProject(item)}
      />
    );
  };

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <Header
        title="Projets"
        subtitle="Gestion des projets de désenfumage"
        rightComponent={
          <View style={styles.headerActions}>
            {projects.length > 0 && (
              <TouchableOpacity onPress={handleSelectionMode} style={styles.selectionButton}>
                <Text style={styles.selectionButtonText}>
                  {selectionMode ? 'Annuler' : 'Sélect.'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleCreateModal} style={styles.actionButton}>
              <Plus size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        }
      />

      {selectionMode && (
        <View style={styles.selectionToolbar}>
          <Text style={styles.selectionCount}>
            {selectedProjects.size} sélectionné{selectedProjects.size > 1 ? 's' : ''}
          </Text>
          <View style={styles.selectionActions}>
            <TouchableOpacity 
              style={styles.toolbarButton}
              onPress={handleBulkFavorite}
              disabled={selectedProjects.size === 0}
            >
              <Star size={20} color={selectedProjects.size > 0 ? "#F59E0B" : theme.colors.textTertiary} />
              <Text style={[styles.toolbarButtonText, { color: selectedProjects.size > 0 ? "#F59E0B" : theme.colors.textTertiary }]}>
                Favoris
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.toolbarButton}
              onPress={handleBulkDelete}
              disabled={selectedProjects.size === 0}
            >
              <Trash2 size={20} color={selectedProjects.size > 0 ? theme.colors.error : theme.colors.textTertiary} />
              <Text style={[styles.toolbarButtonText, { color: selectedProjects.size > 0 ? theme.colors.error : theme.colors.textTertiary }]}>
                Supprimer
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.content}>
        {projects.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Building size={64} color={theme.colors.textTertiary} />
            <Text style={styles.emptyTitle}>Aucun projet</Text>
            <Text style={styles.emptySubtitle}>
              Créez votre premier projet de désenfumage pour commencer
            </Text>
            <Button
              title="Créer un projet"
              onPress={handleCreateModal}
              style={styles.createButton}
            />
          </View>
        ) : (
          <FlatList
            data={sortedProjects}
            renderItem={renderProject}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <CreateProjectModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSubmit={handleCreateProject}
        loading={formLoading}
      />
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
});