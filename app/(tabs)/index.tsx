import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, ScrollView, TextInput, ToastAndroid, Platform } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Plus, Building, Settings, Star, Trash2, SquareCheck as CheckSquare, Square, X, Minus, Calendar, Layers } from 'lucide-react-native';
import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { DateInput } from '@/components/DateInput';
import { Project } from '@/types';
import { useStorage } from '@/contexts/StorageContext';
import { calculateCompliance } from '@/utils/compliance';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useDoubleBackToExit } from '@/utils/BackHandler';

// Interface pour la structure prédéfinie
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
  
  // États pour le mode sélection
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());

  // États pour le modal de création
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  
  // États du formulaire
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [errors, setErrors] = useState<{ name?: string; startDate?: string; endDate?: string }>({});

  // États pour la prédéfinition de structure
  const [predefinedStructure, setPredefinedStructure] = useState<PredefinedStructure>({
    enabled: false,
    buildings: []
  });

  // Référence pour le ScrollView du modal
  const modalScrollViewRef = useRef<ScrollView>(null);

  // Utiliser le hook pour gérer le double appui sur le bouton retour pour quitter
  useDoubleBackToExit();

  // NOUVEAU : Écouteur d'événement pour ouvrir le modal depuis la page export
  useEffect(() => {
    const handleOpenModal = () => {
      handleCreateModal();
    };

    // Ajouter l'écouteur d'événement seulement sur web
    if (typeof window !== 'undefined') {
      window.addEventListener('openCreateProjectModal', handleOpenModal);
      
      // Nettoyer l'écouteur au démontage
      return () => {
        window.removeEventListener('openCreateProjectModal', handleOpenModal);
      };
    }
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

  // Fonctions pour la prédéfinition de structure
  const generateUniqueId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const togglePredefinedStructure = () => {
    setPredefinedStructure(prev => ({
      ...prev,
      enabled: !prev.enabled,
      buildings: prev.enabled ? [] : prev.buildings
    }));
  };

  const addBuilding = () => {
    const newBuilding: PredefinedBuilding = {
      id: generateUniqueId(),
      name: `Bâtiment ${predefinedStructure.buildings.length + 1}`,
      zones: []
    };
    
    setPredefinedStructure(prev => ({
      ...prev,
      buildings: [...prev.buildings, newBuilding]
    }));
  };

  const removeBuilding = (buildingId: string) => {
    setPredefinedStructure(prev => ({
      ...prev,
      buildings: prev.buildings.filter(b => b.id !== buildingId)
    }));
  };

  const updateBuildingName = (buildingId: string, name: string) => {
    setPredefinedStructure(prev => ({
      ...prev,
      buildings: prev.buildings.map(b => 
        b.id === buildingId ? { ...b, name } : b
      )
    }));
  };

  const addZone = (buildingId: string) => {
    const building = predefinedStructure.buildings.find(b => b.id === buildingId);
    const zoneNumber = building ? building.zones.length + 1 : 1;
    
    const newZone: PredefinedZone = {
      id: generateUniqueId(),
      name: `ZF${zoneNumber.toString().padStart(2, '0')}`,
      highShutters: 0,
      lowShutters: 0
    };

    setPredefinedStructure(prev => ({
      ...prev,
      buildings: prev.buildings.map(b => 
        b.id === buildingId 
          ? { ...b, zones: [...b.zones, newZone] }
          : b
      )
    }));
  };

  const removeZone = (buildingId: string, zoneId: string) => {
    setPredefinedStructure(prev => ({
      ...prev,
      buildings: prev.buildings.map(b => 
        b.id === buildingId 
          ? { ...b, zones: b.zones.filter(z => z.id !== zoneId) }
          : b
      )
    }));
  };

  const updateZoneName = (buildingId: string, zoneId: string, name: string) => {
    setPredefinedStructure(prev => ({
      ...prev,
      buildings: prev.buildings.map(b => 
        b.id === buildingId 
          ? { 
              ...b, 
              zones: b.zones.map(z => 
                z.id === zoneId ? { ...z, name } : z
              )
            }
          : b
      )
    }));
  };

  const updateShutterCount = (buildingId: string, zoneId: string, type: 'high' | 'low', count: number) => {
    const clampedCount = Math.max(0, Math.min(30, count));
    
    setPredefinedStructure(prev => ({
      ...prev,
      buildings: prev.buildings.map(b => 
        b.id === buildingId 
          ? { 
              ...b, 
              zones: b.zones.map(z => 
                z.id === zoneId 
                  ? { 
                      ...z, 
                      [type === 'high' ? 'highShutters' : 'lowShutters']: clampedCount 
                    }
                  : z
              )
            }
          : b
      )
    }));
  };

  // Validation du formulaire avec scroll automatique
  const validateForm = () => {
    const newErrors: { name?: string; startDate?: string; endDate?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Le nom du projet est requis';
    }

    if (startDate && !isValidDate(startDate)) {
      newErrors.startDate = 'Format de date invalide (JJ/MM/AAAA)';
    }

    if (endDate && !isValidDate(endDate)) {
      newErrors.endDate = 'Format de date invalide (JJ/MM/AAAA)';
    }

    if (startDate && endDate && isValidDate(startDate) && isValidDate(endDate)) {
      const start = parseDate(startDate);
      const end = parseDate(endDate);
      if (end <= start) {
        newErrors.endDate = 'La date de fin doit être après la date de début';
      }
    }

    setErrors(newErrors);

    // Si le champ nom est vide, faire un scroll vers le haut
    if (newErrors.name && modalScrollViewRef.current) {
      setTimeout(() => {
        modalScrollViewRef.current?.scrollTo({ 
          y: 0, 
          animated: true 
        });
      }, 100);
    }

    return Object.keys(newErrors).length === 0;
  };

  const isValidDate = (dateString: string): boolean => {
    const regex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const match = dateString.match(regex);
    if (!match) return false;

    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);

    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && 
           date.getMonth() === month - 1 && 
           date.getDate() === day;
  };

  const parseDate = (dateString: string): Date => {
    const [day, month, year] = dateString.split('/').map(num => parseInt(num, 10));
    return new Date(year, month - 1, day);
  };

  // Création du projet avec structure prédéfinie
  const handleCreateProject = async () => {
    if (!validateForm()) return;

    setFormLoading(true);
    try {
      const projectData: any = {
        name: name.trim(),
      };

      if (city.trim()) {
        projectData.city = city.trim();
      }

      if (startDate && isValidDate(startDate)) {
        projectData.startDate = parseDate(startDate);
      }

      if (endDate && isValidDate(endDate)) {
        projectData.endDate = parseDate(endDate);
      }

      // Créer le projet
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

      // Réinitialiser le formulaire
      resetForm();
      setCreateModalVisible(false);

      // Naviguer vers le projet créé
      router.push(`/(tabs)/project/${project.id}`);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de créer le projet. Veuillez réessayer.');
    } finally {
      setFormLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setCity('');
    setStartDate('');
    setEndDate('');
    setErrors({});
    setPredefinedStructure({
      enabled: false,
      buildings: []
    });
  };

  const handleCreateModal = () => {
    resetForm();
    setCreateModalVisible(true);
  };

  // Fonctions pour les favoris et sélection
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

  // NOUVEAU : Fonction pour calculer les statistiques détaillées du projet
  const getProjectStats = (project: Project) => {
    const buildingCount = project.buildings.length;
    const zoneCount = project.buildings.reduce((total, building) => total + building.functionalZones.length, 0);
    const shutterCount = project.buildings.reduce((total, building) => 
      total + building.functionalZones.reduce((zoneTotal, zone) => zoneTotal + zone.shutters.length, 0), 0);

    let compliantCount = 0;
    let acceptableCount = 0;
    let nonCompliantCount = 0;
    let totalMeasuredShutters = 0;

    // Calculer la conformité pour chaque volet
    project.buildings.forEach(building => {
      building.functionalZones.forEach(zone => {
        zone.shutters.forEach(shutter => {
          // Ne compter que les volets qui ont des valeurs de référence et mesurées
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
    });

    // CORRIGÉ : Le taux de conformité inclut maintenant les volets fonctionnels ET acceptables
    const complianceRate = totalMeasuredShutters > 0 ? 
      ((compliantCount + acceptableCount) / totalMeasuredShutters) * 100 : 0;

    return {
      buildingCount,
      zoneCount,
      shutterCount,
      compliantCount,
      acceptableCount,
      nonCompliantCount,
      complianceRate,
      totalMeasuredShutters
    };
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
    const stats = getProjectStats(item);

    return (
      <TouchableOpacity
        style={[
          styles.projectCard,
          isSelected && styles.selectedCard,
          isFavorite && styles.favoriteCard
        ]}
        onPress={() => handleProjectPress(item)}
        onLongPress={() => {
          if (!selectionMode) {
            setSelectionMode(true);
            handleProjectSelection(item.id);
          }
        }}
      >
        {/* En-tête avec nom du projet et actions */}
        <View style={styles.projectHeader}>
          <View style={styles.projectTitleSection}>
            {selectionMode && (
              <TouchableOpacity 
                style={styles.checkbox}
                onPress={() => handleProjectSelection(item.id)}
              >
                {isSelected ? (
                  <CheckSquare size={20} color={theme.colors.primary} />
                ) : (
                  <Square size={20} color={theme.colors.textTertiary} />
                )}
              </TouchableOpacity>
            )}
            <View style={styles.projectInfo}>
              <Text style={styles.projectName}>{item.name}</Text>
              {item.city && <Text style={styles.projectCity}>{item.city}</Text>}
            </View>
          </View>
          
          {!selectionMode && (
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleToggleFavorite(item.id)}
              >
                <Star 
                  size={16} 
                  color={isFavorite ? "#F59E0B" : theme.colors.textTertiary} 
                  fill={isFavorite ? "#F59E0B" : "none"}
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleEditProject(item)}
              >
                <Settings size={16} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleDeleteProject(item)}
              >
                <Trash2 size={16} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Dates du projet */}
        {(item.startDate || item.endDate) && (
          <View style={styles.projectDates}>
            <Calendar size={14} color={theme.colors.textSecondary} />
            <Text style={styles.dateText}>
              {item.startDate && new Date(item.startDate).toLocaleDateString('fr-FR', { 
                day: 'numeric', 
                month: 'short', 
                year: 'numeric' 
              })}
              {item.startDate && item.endDate && ' → '}
              {item.endDate && new Date(item.endDate).toLocaleDateString('fr-FR', { 
                day: 'numeric', 
                month: 'short', 
                year: 'numeric' 
              })}
            </Text>
          </View>
        )}

        {/* CORRIGÉ : Statistiques principales avec alignement parfait */}
        <View style={styles.mainStats}>
          <View style={styles.statBox}>
            <View style={styles.statIconContainer}>
              <Building size={16} color={theme.colors.primary} />
            </View>
            <Text style={styles.statNumber}>{stats.buildingCount}</Text>
            <Text style={styles.statLabel}>Bâtiments</Text>
          </View>
          
          <View style={styles.statBox}>
            <View style={styles.statIconContainer}>
              <Layers size={16} color={theme.colors.primary} />
            </View>
            <Text style={styles.statNumber}>{stats.zoneCount}</Text>
            <Text style={styles.statLabel}>Zones</Text>
          </View>
          
          <View style={styles.statBox}>
            {/* CORRIGÉ : Point coloré dans un conteneur de même taille que les icônes */}
            <View style={styles.statIconContainer}>
              <View style={[styles.complianceDot, { 
                backgroundColor: stats.complianceRate >= 80 ? '#10B981' : stats.complianceRate >= 60 ? '#F59E0B' : '#EF4444' 
              }]} />
            </View>
            <Text style={[styles.statNumber, { 
              color: stats.complianceRate >= 80 ? '#10B981' : stats.complianceRate >= 60 ? '#F59E0B' : '#EF4444' 
            }]}>
              {stats.complianceRate.toFixed(0)}%
            </Text>
            <Text style={styles.statLabel}>Conformité</Text>
          </View>
        </View>

        {/* Barre de progression de conformité */}
        {stats.shutterCount > 0 && (
          <View style={styles.complianceSection}>
            <Text style={styles.shutterCountText}>{stats.shutterCount} volets</Text>
            
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

            <View style={styles.complianceLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.legendText}>{stats.compliantCount} Fonctionnel</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={styles.legendText}>{stats.acceptableCount} Acceptable</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                <Text style={styles.legendText}>{stats.nonCompliantCount} Non conforme</Text>
              </View>
            </View>
          </View>
        )}

        {/* Date de création */}
        <View style={styles.projectFooter}>
          <Text style={styles.createdText}>
            Créé le {new Date(item.createdAt).toLocaleDateString('fr-FR', { 
              day: 'numeric', 
              month: 'short', 
              year: 'numeric' 
            })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPredefinedStructure = () => {
    if (!predefinedStructure.enabled) return null;

    return (
      <View style={styles.predefinedSection}>
        <Text style={styles.predefinedTitle}>🏗️ Structure prédéfinie</Text>
        
        <ScrollView style={styles.predefinedScroll} nestedScrollEnabled>
          {predefinedStructure.buildings.map((building) => (
            <View key={building.id} style={styles.buildingContainer}>
              <View style={styles.buildingHeader}>
                <TextInput
                  style={styles.buildingNameInput}
                  value={building.name}
                  onChangeText={(text) => updateBuildingName(building.id, text)}
                  placeholder="Nom du bâtiment"
                  placeholderTextColor={theme.colors.textTertiary}
                />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeBuilding(building.id)}
                >
                  <X size={16} color={theme.colors.error} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.addZoneButton}
                onPress={() => addZone(building.id)}
              >
                <Plus size={16} color={theme.colors.primary} />
                <Text style={styles.addZoneText}>Ajouter une zone</Text>
              </TouchableOpacity>

              {building.zones.map((zone) => (
                <View key={zone.id} style={styles.zoneContainer}>
                  <View style={styles.zoneHeader}>
                    <TextInput
                      style={styles.zoneNameInput}
                      value={zone.name}
                      onChangeText={(text) => updateZoneName(building.id, zone.id, text)}
                      placeholder="Nom de la zone"
                      placeholderTextColor={theme.colors.textTertiary}
                    />
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeZone(building.id, zone.id)}
                    >
                      <X size={14} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.shutterControls}>
                    <View style={styles.shutterControl}>
                      <Text style={styles.shutterLabel}>VH (Hauts)</Text>
                      <View style={styles.counterContainer}>
                        <TouchableOpacity
                          style={styles.counterButton}
                          onPress={() => updateShutterCount(building.id, zone.id, 'high', zone.highShutters - 1)}
                        >
                          <Minus size={14} color={theme.colors.primary} />
                        </TouchableOpacity>
                        <Text style={styles.counterValue}>{zone.highShutters}</Text>
                        <TouchableOpacity
                          style={styles.counterButton}
                          onPress={() => updateShutterCount(building.id, zone.id, 'high', zone.highShutters + 1)}
                        >
                          <Plus size={14} color={theme.colors.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.shutterControl}>
                      <Text style={styles.shutterLabel}>VB (Bas)</Text>
                      <View style={styles.counterContainer}>
                        <TouchableOpacity
                          style={styles.counterButton}
                          onPress={() => updateShutterCount(building.id, zone.id, 'low', zone.lowShutters - 1)}
                        >
                          <Minus size={14} color={theme.colors.primary} />
                        </TouchableOpacity>
                        <Text style={styles.counterValue}>{zone.lowShutters}</Text>
                        <TouchableOpacity
                          style={styles.counterButton}
                          onPress={() => updateShutterCount(building.id, zone.id, 'low', zone.lowShutters + 1)}
                        >
                          <Plus size={14} color={theme.colors.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ))}

          <TouchableOpacity style={styles.addBuildingButton} onPress={addBuilding}>
            <Plus size={20} color={theme.colors.primary} />
            <Text style={styles.addBuildingText}>Ajouter un bâtiment</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  const styles = createStyles(theme);

  if (loading || isLoading) {
    return (
      <View style={styles.container}>
        <Header title="Chargement..." />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement des projets...</Text>
        </View>
      </View>
    );
  }

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

      {/* Modal de création de projet avec prédéfinition */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={createModalVisible}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouveau projet</Text>
              <TouchableOpacity 
                onPress={() => setCreateModalVisible(false)}
                style={styles.closeButton}
              >
                <X size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              ref={modalScrollViewRef}
              style={styles.modalBody} 
              showsVerticalScrollIndicator={false}
            >
              <Input
                label="Nom du projet *"
                value={name}
                onChangeText={setName}
                placeholder="Ex: Mesures centre commercial Rivoli"
                error={errors.name}
              />

              <Input
                label="Ville (optionnel)"
                value={city}
                onChangeText={setCity}
                placeholder="Ex: Paris, Lyon, Marseille"
              />

              <DateInput
                label="Date de début (optionnel)"
                value={startDate}
                onChangeText={setStartDate}
                placeholder="JJ/MM/AAAA"
                error={errors.startDate}
              />

              <DateInput
                label="Date de fin (optionnel)"
                value={endDate}
                onChangeText={setEndDate}
                placeholder="JJ/MM/AAAA"
                error={errors.endDate}
              />

              {/* Section prédéfinition de structure */}
              <View style={styles.predefinedToggleSection}>
                <View style={styles.toggleHeader}>
                  <Text style={styles.toggleTitle}>🏗️ Prédéfinir la structure (optionnel)</Text>
                  <TouchableOpacity
                    style={[styles.toggle, predefinedStructure.enabled && styles.toggleActive]}
                    onPress={togglePredefinedStructure}
                  >
                    <View style={[styles.toggleThumb, predefinedStructure.enabled && styles.toggleThumbActive]} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.toggleDescription}>
                  Créez automatiquement vos bâtiments, zones et volets
                </Text>
              </View>

              {renderPredefinedStructure()}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title="Annuler"
                onPress={() => setCreateModalVisible(false)}
                variant="secondary"
                style={styles.modalButton}
              />
              <Button
                title="Créer le projet"
                onPress={handleCreateProject}
                disabled={formLoading}
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

  // NOUVEAU : Styles pour les cartes de projet détaillées
  projectCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  favoriteCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  projectTitleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  checkbox: {
    padding: 2,
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  projectCity: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: theme.colors.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  
  // Dates du projet
  projectDates: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 8,
  },
  dateText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: theme.colors.textSecondary,
  },

  // CORRIGÉ : Statistiques principales avec alignement parfait
  mainStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 16,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 12,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  // NOUVEAU : Conteneur pour les icônes avec taille fixe pour alignement parfait
  statIconContainer: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  // CORRIGÉ : Point coloré centré dans son conteneur
  complianceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Section de conformité
  complianceSection: {
    marginBottom: 16,
  },
  shutterCountText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  complianceBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: theme.colors.border,
    marginBottom: 12,
  },
  complianceSegment: {
    height: '100%',
  },
  complianceLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: theme.colors.textSecondary,
  },

  // Pied de page du projet
  projectFooter: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 12,
    alignItems: 'center',
  },
  createdText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textTertiary,
  },

  // Styles pour le modal
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
    maxWidth: 500,
    maxHeight: '90%',
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
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text,
  },
  closeButton: {
    padding: 8,
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },

  // Styles pour la prédéfinition de structure
  predefinedToggleSection: {
    marginBottom: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  toggleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  toggleTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: theme.colors.primary,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    transform: [{ translateX: 22 }],
  },
  toggleDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
  },
  predefinedSection: {
    marginTop: 16,
  },
  predefinedTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
    marginBottom: 16,
  },
  predefinedScroll: {
    maxHeight: 300,
  },
  buildingContainer: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  buildingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  buildingNameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    backgroundColor: theme.colors.inputBackground,
    color: theme.colors.text,
    marginRight: 8,
  },
  removeButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: theme.colors.error + '20',
  },
  addZoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.primary + '20',
    borderWidth: 1,
    borderColor: theme.colors.primary + '40',
    marginBottom: 12,
  },
  addZoneText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: theme.colors.primary,
    marginLeft: 6,
  },
  zoneContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  zoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  zoneNameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    backgroundColor: theme.colors.surfaceSecondary,
    color: theme.colors.text,
    marginRight: 8,
  },
  shutterControls: {
    flexDirection: 'row',
    gap: 16,
  },
  shutterControl: {
    flex: 1,
  },
  shutterLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: theme.colors.textSecondary,
    marginBottom: 6,
    textAlign: 'center',
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 8,
    padding: 4,
  },
  counterButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  counterValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text,
    marginHorizontal: 16,
    minWidth: 24,
    textAlign: 'center',
  },
  addBuildingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: theme.colors.primary + '20',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addBuildingText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.primary,
    marginLeft: 8,
  },
});