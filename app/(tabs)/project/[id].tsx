import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, ScrollView, TextInput } from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Plus, Settings, Building, Wind, Star, Trash2, SquareCheck as CheckSquare, Square, X } from 'lucide-react-native';
import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Project, Building as BuildingType, FunctionalZone } from '@/types';
import { useStorage } from '@/contexts/StorageContext';
import { calculateCompliance, formatDeviation } from '@/utils/compliance';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAndroidBackButton } from '@/utils/BackHandler';

export default function ProjectDetailScreen() {
  const { strings } = useLanguage();
  const { theme } = useTheme();
  const { 
    projects,
    favoriteBuildings,
    createBuilding,
    deleteBuilding,
    setFavoriteBuildings,
    updateBuilding
  } = useStorage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [createBuildingModalVisible, setCreateBuildingModalVisible] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedBuildings, setSelectedBuildings] = useState<Set<string>>(new Set());
  
  // Form states
  const [buildingName, setBuildingName] = useState('');
  const [buildingDescription, setBuildingDescription] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string }>({});

  // NOUVEAU : Modal pour éditer le nom du bâtiment
  const [nameEditModal, setNameEditModal] = useState<{
    visible: boolean;
    building: BuildingType | null;
    name: string;
  }>({ visible: false, building: null, name: '' });

  // NOUVEAU : Référence pour l'auto-focus
  const nameInputRef = useRef<TextInput>(null);

  // Configure Android back button to go back to the home screen
  useAndroidBackButton(() => {
    handleBack();
    return true;
  });

  // NOUVEAU : Auto-focus sur l'input du nom quand le modal s'ouvre
  useEffect(() => {
    if (nameEditModal.visible && nameInputRef.current) {
      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [nameEditModal.visible]);

  const loadProject = useCallback(async () => {
    try {
      const foundProject = projects.find(p => p.id === id);
      setProject(foundProject || null);
    } catch (error) {
      console.error('Erreur lors du chargement du projet:', error);
    } finally {
      setLoading(false);
    }
  }, [id, projects]);

  // NOUVEAU : Utiliser useFocusEffect pour recharger les données quand on revient sur la page
  useFocusEffect(
    useCallback(() => {
      console.log('Project screen focused, reloading data...');
      loadProject();
    }, [loadProject])
  );

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const handleBack = () => {
    try {
      // CORRIGÉ : Retourner vers la liste des projets
      router.push('/(tabs)/');
    } catch (error) {
      console.error('Erreur de navigation:', error);
      // Fallback vers l'accueil
      router.push('/(tabs)/');
    }
  };

  const resetForm = () => {
    setBuildingName('');
    setBuildingDescription('');
    setErrors({});
  };

  const handleCreateBuilding = () => {
    resetForm();
    setCreateBuildingModalVisible(true);
  };

  const handleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedBuildings(new Set());
  };

  const handleBuildingSelection = (buildingId: string) => {
    const newSelection = new Set(selectedBuildings);
    if (newSelection.has(buildingId)) {
      newSelection.delete(buildingId);
    } else {
      newSelection.add(buildingId);
    }
    setSelectedBuildings(newSelection);
  };

  const handleBulkDelete = () => {
    if (selectedBuildings.size === 0) return;

    Alert.alert(
      strings.delete + ' ' + strings.buildings.toLowerCase(),
      `Êtes-vous sûr de vouloir supprimer ${selectedBuildings.size} bâtiment${selectedBuildings.size > 1 ? 's' : ''} ?`,
      [
        { text: strings.cancel, style: 'cancel' },
        {
          text: strings.delete,
          style: 'destructive',
          onPress: async () => {
            for (const buildingId of selectedBuildings) {
              await deleteBuilding(buildingId);
            }
            setSelectedBuildings(new Set());
            setSelectionMode(false);
            loadProject();
          }
        }
      ]
    );
  };

  const handleBulkFavorite = async () => {
    if (selectedBuildings.size === 0) return;

    const newFavorites = new Set(favoriteBuildings);
    for (const buildingId of selectedBuildings) {
      if (newFavorites.has(buildingId)) {
        newFavorites.delete(buildingId);
      } else {
        newFavorites.add(buildingId);
      }
    }
    
    await setFavoriteBuildings(Array.from(newFavorites));
    setSelectedBuildings(new Set());
    setSelectionMode(false);
  };

  const handleToggleFavorite = async (buildingId: string) => {
    const newFavorites = new Set(favoriteBuildings);
    if (newFavorites.has(buildingId)) {
      newFavorites.delete(buildingId);
    } else {
      newFavorites.add(buildingId);
    }
    
    await setFavoriteBuildings(Array.from(newFavorites));
  };

  const validateForm = () => {
    const newErrors: { name?: string } = {};

    if (!buildingName.trim()) {
      newErrors.name = strings.nameRequired;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitBuilding = async () => {
    if (!validateForm() || !project) return;

    setFormLoading(true);
    try {
      console.log('🏗️ Création du bâtiment:', buildingName.trim(), 'dans le projet:', project.id);
      
      const building = await createBuilding(project.id, {
        name: buildingName.trim(),
        description: buildingDescription.trim() || undefined,
      });

      if (building) {
        console.log('✅ Bâtiment créé avec succès:', building.id);
        setCreateBuildingModalVisible(false);
        resetForm();
        loadProject();
        
        // Navigation directe vers le bâtiment créé
        router.push(`/(tabs)/building/${building.id}`);
      } else {
        console.error('❌ Erreur: Bâtiment non créé');
        Alert.alert(strings.error, 'Impossible de créer le bâtiment.');
      }
    } catch (error) {
      console.error('❌ Erreur lors de la création du bâtiment:', error);
      Alert.alert(strings.error, 'Impossible de créer le bâtiment. Veuillez réessayer.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleBuildingPress = (building: BuildingType) => {
    if (selectionMode) {
      handleBuildingSelection(building.id);
    } else {
      router.push(`/(tabs)/building/${building.id}`);
    }
  };

  // NOUVEAU : Fonction pour ouvrir le modal d'édition du nom
  const openNameEditModal = (building: BuildingType) => {
    setNameEditModal({
      visible: true,
      building,
      name: building.name
    });
  };

  // CORRIGÉ : Fonction pour sauvegarder le changement de nom avec mise à jour instantanée
  const saveNameChange = async () => {
    if (!nameEditModal.building || !nameEditModal.name.trim()) return;

    try {
      console.log('✏️ Modification du nom du bâtiment:', nameEditModal.building.id, 'nouveau nom:', nameEditModal.name.trim());
      
      const updatedBuilding = await updateBuilding(nameEditModal.building.id, {
        name: nameEditModal.name.trim(),
      });
      
      if (updatedBuilding) {
        console.log('✅ Nom du bâtiment modifié avec succès');
        
        // CORRIGÉ : Mise à jour instantanée de l'état local du projet
        setProject(prevProject => {
          if (!prevProject) return prevProject;
          
          return {
            ...prevProject,
            buildings: prevProject.buildings.map(b => 
              b.id === nameEditModal.building!.id 
                ? { ...b, name: nameEditModal.name.trim() }
                : b
            )
          };
        });
        
        setNameEditModal({ visible: false, building: null, name: '' });
      } else {
        console.error('❌ Erreur: Bâtiment non trouvé pour la modification');
        Alert.alert(strings.error, 'Impossible de modifier le nom du bâtiment');
      }
    } catch (error) {
      console.error('❌ Erreur lors de la modification du nom:', error);
      Alert.alert(strings.error, 'Impossible de modifier le nom du bâtiment');
    }
  };

  const handleEditBuilding = (building: BuildingType) => {
    try {
      router.push(`/(tabs)/building/edit/${building.id}`);
    } catch (error) {
      console.error('Erreur de navigation vers édition bâtiment:', error);
    }
  };

  const handleDeleteBuilding = async (building: BuildingType) => {
    Alert.alert(
      strings.deleteBuilding,
      `Êtes-vous sûr de vouloir supprimer le bâtiment "${building.name}" ?`,
      [
        { text: strings.cancel, style: 'cancel' },
        {
          text: strings.delete,
          style: 'destructive',
          onPress: async () => {
            console.log('🗑️ Suppression du bâtiment:', building.id);
            const success = await deleteBuilding(building.id);
            if (success) {
              console.log('✅ Bâtiment supprimé avec succès');
              loadProject();
            } else {
              console.error('❌ Erreur lors de la suppression du bâtiment');
            }
          }
        }
      ]
    );
  };

  const handleEditProject = () => {
    try {
      router.push(`/(tabs)/project/edit/${id}`);
    } catch (error) {
      console.error('Erreur de navigation:', error);
      Alert.alert(strings.error, 'Impossible d\'ouvrir la page de modification.');
    }
  };

  const getBuildingStats = (building: BuildingType) => {
    const zoneCount = building.functionalZones.length;
    const shutterCount = building.functionalZones.reduce((total, zone) => total + zone.shutters.length, 0);
    
    let compliantCount = 0;
    let acceptableCount = 0;
    let nonCompliantCount = 0;
    let totalMeasuredShutters = 0;

    building.functionalZones.forEach(zone => {
      zone.shutters.forEach(shutter => {
        // Ne compter que les volets qui ont des valeurs de référence
        if (shutter.referenceFlow > 0) {
          totalMeasuredShutters++;
          const compliance = calculateCompliance(shutter.referenceFlow, shutter.measuredFlow);
          switch (compliance.status) {
            case 'compliant':
              compliantCount++;
              break;
            case 'acceptable':
              acceptableCount++;
              break;
            case 'non-compliant':
              nonCompliantCount++;
              break;
          }
        }
      });
    });

    // CORRIGÉ : Le taux de conformité inclut maintenant les volets fonctionnels ET acceptables
    const complianceRate = totalMeasuredShutters > 0 ? 
      ((compliantCount + acceptableCount) / totalMeasuredShutters) * 100 : 0;

    return {
      zoneCount,
      shutterCount,
      compliantCount,
      acceptableCount,
      nonCompliantCount,
      complianceRate,
      totalMeasuredShutters
    };
  };

  // Fonction pour déterminer la taille de police adaptative
  const getAdaptiveFontSize = (text: string, hasActions: boolean) => {
    const baseSize = 18;
    const minSize = 15;
    const maxLength = hasActions ? 25 : 35;
    
    if (text.length <= maxLength) {
      return baseSize;
    } else if (text.length <= maxLength + 8) {
      return 16;
    } else {
      return minSize;
    }
  };

  // Trier les bâtiments : favoris en premier
  const sortedBuildings = project ? [...project.buildings].sort((a, b) => {
    const aIsFavorite = favoriteBuildings.includes(a.id);
    const bIsFavorite = favoriteBuildings.includes(b.id);
    
    if (aIsFavorite && !bIsFavorite) return -1;
    if (!aIsFavorite && bIsFavorite) return 1;
    return 0;
  }) : [];

  const renderBuilding = ({ item }: { item: BuildingType }) => {
    const stats = getBuildingStats(item);
    const isSelected = selectedBuildings.has(item.id);
    const isFavorite = favoriteBuildings.includes(item.id);
    const hasActions = !selectionMode;
    const adaptiveFontSize = getAdaptiveFontSize(item.name, hasActions);

    return (
      <TouchableOpacity
        style={[
          styles.buildingCard,
          isSelected && styles.selectedCard,
          isFavorite && styles.favoriteCard
        ]}
        onPress={() => handleBuildingPress(item)}
        onLongPress={() => {
          if (!selectionMode) {
            setSelectionMode(true);
            handleBuildingSelection(item.id);
          }
        }}
      >
        <View style={styles.buildingHeader}>
          <View style={styles.buildingTitleSection}>
            <View style={styles.titleRow}>
              {selectionMode && (
                <TouchableOpacity 
                  style={styles.checkbox}
                  onPress={() => handleBuildingSelection(item.id)}
                >
                  {isSelected ? (
                    <CheckSquare size={20} color={theme.colors.primary} />
                  ) : (
                    <Square size={20} color={theme.colors.textTertiary} />
                  )}
                </TouchableOpacity>
              )}
              <Building size={20} color={theme.colors.primary} />
              {/* NOUVEAU : Nom du bâtiment cliquable pour édition directe */}
              <TouchableOpacity 
                style={[styles.buildingNameContainer, selectionMode && styles.buildingNameContainerSelection]}
                onPress={() => !selectionMode && openNameEditModal(item)}
                disabled={selectionMode}
              >
                <Text 
                  style={[styles.buildingName, { fontSize: adaptiveFontSize }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {item.name}
                </Text>
                {!selectionMode && <Text style={styles.editIcon}>✏️</Text>}
              </TouchableOpacity>
            </View>
            {item.description && (
              <Text style={styles.buildingDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}
          </View>
          
          {!selectionMode && (
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleToggleFavorite(item.id)}
              >
                <Star 
                  size={14} 
                  color={isFavorite ? "#F59E0B" : theme.colors.textTertiary} 
                  fill={isFavorite ? "#F59E0B" : "none"}
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleEditBuilding(item)}
              >
                <Settings size={14} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleDeleteBuilding(item)}
              >
                <Trash2 size={14} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.buildingContent}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Wind size={16} color={theme.colors.primary} />
              <Text style={styles.statText}>{stats.zoneCount} {strings.zones.toLowerCase()}</Text>
            </View>
            
            <View style={styles.statItem}>
              <View style={[styles.complianceIndicator, { 
                backgroundColor: stats.complianceRate >= 80 ? '#10B981' : stats.complianceRate >= 60 ? '#F59E0B' : '#EF4444' 
              }]} />
              <Text style={styles.statText}>{stats.shutterCount} {strings.shutters.toLowerCase()}</Text>
            </View>

            {stats.shutterCount > 0 && (
              <View style={styles.statItem}>
                <Text style={[styles.complianceRate, { 
                  color: stats.complianceRate >= 80 ? '#10B981' : stats.complianceRate >= 60 ? '#F59E0B' : '#EF4444' 
                }]}>
                  {stats.complianceRate.toFixed(0)}%
                </Text>
              </View>
            )}
          </View>

          {stats.shutterCount > 0 && (
            <View style={styles.complianceBar}>
              <View style={[styles.complianceSegment, { 
                flex: stats.compliantCount, 
                backgroundColor: '#10B981' 
              }]} />
              <View style={[styles.complianceSegment, { 
                flex: stats.acceptableCount, 
                backgroundColor: '#F59E0B' 
              }]} />
              <View style={[styles.complianceSegment, { 
                flex: stats.nonCompliantCount, 
                backgroundColor: '#EF4444' 
              }]} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const styles = createStyles(theme);

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title={strings.loading} onBack={handleBack} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{strings.loadingData}</Text>
        </View>
      </View>
    );
  }

  if (!project) {
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
        title={project.name}
        subtitle={project.city}
        onBack={handleBack}
        rightComponent={
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleSelectionMode} style={styles.selectionButton}>
              <Text style={styles.selectionButtonText}>
                {selectionMode ? strings.cancel : 'Sélect.'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleEditProject} style={styles.actionButton}>
              <Settings size={18} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCreateBuilding} style={styles.actionButton}>
              <Plus size={22} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        }
      />

      {selectionMode && (
        <View style={styles.selectionToolbar}>
          <Text style={styles.selectionCount}>
            {selectedBuildings.size} {strings.selected}{selectedBuildings.size > 1 ? 's' : ''}
          </Text>
          <View style={styles.selectionActions}>
            <TouchableOpacity 
              style={styles.toolbarButton}
              onPress={handleBulkFavorite}
              disabled={selectedBuildings.size === 0}
            >
              <Star size={20} color={selectedBuildings.size > 0 ? "#F59E0B" : theme.colors.textTertiary} />
              <Text style={[styles.toolbarButtonText, { color: selectedBuildings.size > 0 ? "#F59E0B" : theme.colors.textTertiary }]}>
                {strings.favorites}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.toolbarButton}
              onPress={handleBulkDelete}
              disabled={selectedBuildings.size === 0}
            >
              <Trash2 size={20} color={selectedBuildings.size > 0 ? theme.colors.error : theme.colors.textTertiary} />
              <Text style={[styles.toolbarButtonText, { color: selectedBuildings.size > 0 ? theme.colors.error : theme.colors.textTertiary }]}>
                {strings.delete}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.content}>
        {project.buildings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Building size={64} color={theme.colors.textTertiary} />
            <Text style={styles.emptyTitle}>{strings.noBuildings}</Text>
            <Text style={styles.emptySubtitle}>
              {strings.noBuildingsDesc}
            </Text>
            <Button
              title={strings.createBuilding}
              onPress={handleCreateBuilding}
              style={styles.createButton}
            />
          </View>
        ) : (
          <FlatList
            data={sortedBuildings}
            renderItem={renderBuilding}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Modal de création de bâtiment */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={createBuildingModalVisible}
        onRequestClose={() => setCreateBuildingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{strings.newBuilding}</Text>
              <TouchableOpacity 
                onPress={() => setCreateBuildingModalVisible(false)}
                style={styles.closeButton}
              >
                <X size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Input
                label={strings.buildingName + " *"}
                value={buildingName}
                onChangeText={setBuildingName}
                placeholder="Ex: Bâtiment A, Tour Nord"
                error={errors.name}
              />

              <Input
                label={strings.description + " (" + strings.optional + ")"}
                value={buildingDescription}
                onChangeText={setBuildingDescription}
                placeholder="Ex: Bâtiment principal, 5 étages"
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title={strings.cancel}
                onPress={() => setCreateBuildingModalVisible(false)}
                variant="secondary"
                style={styles.modalButton}
              />
              <Button
                title={formLoading ? "Création..." : strings.create}
                onPress={handleSubmitBuilding}
                disabled={formLoading}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* NOUVEAU : Modal pour éditer le nom du bâtiment avec auto-focus */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={nameEditModal.visible}
        onRequestClose={() => setNameEditModal({ visible: false, building: null, name: '' })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.nameEditModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier le nom du bâtiment</Text>
              <TouchableOpacity 
                onPress={() => setNameEditModal({ visible: false, building: null, name: '' })}
                style={styles.closeButton}
              >
                <X size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>{strings.buildingName} *</Text>
              <TextInput
                ref={nameInputRef}
                style={styles.nameTextInput}
                value={nameEditModal.name}
                onChangeText={(text) => setNameEditModal(prev => ({ ...prev, name: text }))}
                placeholder="Ex: Bâtiment A, Tour Nord"
                placeholderTextColor={theme.colors.textTertiary}
                autoFocus={true}
                selectTextOnFocus={true}
              />
            </View>

            <View style={styles.modalFooter}>
              <Button
                title={strings.cancel}
                onPress={() => setNameEditModal({ visible: false, building: null, name: '' })}
                variant="secondary"
                style={styles.modalButton}
              />
              <Button
                title={strings.save}
                onPress={saveNameChange}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
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
    alignItems: 'center',
    gap: 4,
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
    padding: 6,
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
  buildingCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
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
  buildingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  buildingTitleSection: {
    flex: 1,
    minWidth: 0,
    marginRight: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    minWidth: 0,
  },
  checkbox: {
    padding: 2,
    flexShrink: 0,
  },
  // NOUVEAU : Conteneur pour le nom du bâtiment cliquable
  buildingNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: theme.colors.surfaceSecondary,
    minWidth: 0,
  },
  buildingNameContainerSelection: {
    backgroundColor: 'transparent',
  },
  buildingName: {
    fontFamily: 'Inter-Bold',
    color: theme.colors.text,
    flex: 1,
    minWidth: 0,
  },
  editIcon: {
    fontSize: 12,
  },
  buildingDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
    marginTop: 4,
    marginLeft: 28,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 2,
    flexShrink: 0,
  },
  buildingContent: {
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: theme.colors.textSecondary,
  },
  complianceIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  complianceRate: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  complianceBar: {
    flexDirection: 'row',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: theme.colors.border,
  },
  complianceSegment: {
    height: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
  },
  // NOUVEAU : Modal spécifique pour l'édition du nom
  nameEditModalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.separator,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text,
  },
  closeButton: {
    padding: 8,
  },
  modalBody: {
    padding: 20,
    maxHeight: 300,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.separator,
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
  // NOUVEAU : Styles pour l'input avec auto-focus
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  nameTextInput: {
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