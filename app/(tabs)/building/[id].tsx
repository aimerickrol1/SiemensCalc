import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Plus, Settings, Wind, Star, Trash2, SquareCheck as CheckSquare, Square, X } from 'lucide-react-native';
import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import { Project, Building, FunctionalZone } from '@/types';
import { useStorage } from '@/contexts/StorageContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAndroidBackButton } from '@/utils/BackHandler';

export default function BuildingDetailScreen() {
  const { strings } = useLanguage();
  const { theme } = useTheme();
  const { 
    projects, 
    favoriteZones, 
    setFavoriteZones, 
    deleteFunctionalZone, 
    updateFunctionalZone 
  } = useStorage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [building, setBuilding] = useState<Building | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  // Convert favoriteZones array to Set for .has() method
  const favoriteZonesSet = new Set(favoriteZones);

  // États pour le mode sélection
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedZones, setSelectedZones] = useState<Set<string>>(new Set());

  // Modal pour éditer le nom de la zone
  const [nameEditModal, setNameEditModal] = useState<{
    visible: boolean;
    zone: FunctionalZone | null;
    name: string;
  }>({ visible: false, zone: null, name: '' });

  // Référence pour l'auto-focus
  const nameInputRef = useRef<TextInput>(null);

  // Configure Android back button to go back to the project screen
  useAndroidBackButton(() => {
    handleBack();
    return true;
  });

  // Auto-focus sur l'input du nom quand le modal s'ouvre
  useEffect(() => {
    if (nameEditModal.visible && nameInputRef.current) {
      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [nameEditModal.visible]);

  const loadBuilding = useCallback(async () => {
    try {
      for (const proj of projects) {
        const foundBuilding = proj.buildings.find(b => b.id === id);
        if (foundBuilding) {
          setBuilding(foundBuilding);
          setProject(proj);
          break;
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement du bâtiment:', error);
    } finally {
      setLoading(false);
    }
  }, [id, projects]);

  // NOUVEAU : Utiliser useFocusEffect pour recharger les données quand on revient sur la page
  useFocusEffect(
    useCallback(() => {
      console.log('Building screen focused, reloading data...');
      loadBuilding();
    }, [loadBuilding])
  );

  useEffect(() => {
    loadBuilding();
  }, [loadBuilding]);

  const handleBack = () => {
    try {
      if (project) {
        router.push(`/(tabs)/project/${project.id}`);
      } else {
        router.push('/(tabs)/');
      }
    } catch (error) {
      console.error('Erreur de navigation:', error);
      router.push('/(tabs)/');
    }
  };

  const handleEditBuilding = () => {
    try {
      router.push(`/(tabs)/building/edit/${id}`);
    } catch (error) {
      console.error('Erreur de navigation vers édition:', error);
    }
  };

  const handleCreateZone = () => {
    try {
      router.push(`/(tabs)/zone/create?buildingId=${id}`);
    } catch (error) {
      console.error('Erreur de navigation vers création zone:', error);
    }
  };

  const handleZonePress = (zone: FunctionalZone) => {
    // Si on est en mode sélection, sélectionner/désélectionner
    if (selectionMode) {
      handleZoneSelection(zone.id);
      return;
    }

    router.push(`/(tabs)/zone/${zone.id}`);
  };

  // Fonction pour éditer une zone
  const handleEditZone = (zone: FunctionalZone) => {
    try {
      router.push(`/(tabs)/zone/edit/${zone.id}`);
    } catch (error) {
      console.error('Erreur de navigation vers édition zone:', error);
    }
  };

  // Fonction pour ouvrir le modal d'édition du nom
  const openNameEditModal = (zone: FunctionalZone) => {
    setNameEditModal({
      visible: true,
      zone,
      name: zone.name
    });
  };

  // CORRIGÉ : Fonction pour sauvegarder le changement de nom avec mise à jour instantanée
  const saveNameChange = async () => {
    if (!nameEditModal.zone || !nameEditModal.name.trim()) return;

    try {
      const updatedZone = await updateFunctionalZone(nameEditModal.zone.id, {
        name: nameEditModal.name.trim(),
      });
      
      if (updatedZone) {
        // CORRIGÉ : Mise à jour instantanée de l'état local du bâtiment
        setBuilding(prevBuilding => {
          if (!prevBuilding) return prevBuilding;
          
          return {
            ...prevBuilding,
            functionalZones: prevBuilding.functionalZones.map(z => 
              z.id === nameEditModal.zone!.id 
                ? { ...z, name: nameEditModal.name.trim() }
                : z
            )
          };
        });
        
        setNameEditModal({ visible: false, zone: null, name: '' });
      } else {
        Alert.alert(strings.error, 'Impossible de modifier le nom de la zone');
      }
    } catch (error) {
      Alert.alert(strings.error, 'Impossible de modifier le nom de la zone');
    }
  };

  // Fonctions pour le mode sélection
  const handleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedZones(new Set());
  };

  const handleZoneSelection = (zoneId: string) => {
    const newSelection = new Set(selectedZones);
    if (newSelection.has(zoneId)) {
      newSelection.delete(zoneId);
    } else {
      newSelection.add(zoneId);
    }
    setSelectedZones(newSelection);
  };

  const handleBulkDelete = () => {
    if (selectedZones.size === 0) return;

    Alert.alert(
      strings.delete + ' ' + strings.zones.toLowerCase(),
      `Êtes-vous sûr de vouloir supprimer ${selectedZones.size} zone${selectedZones.size > 1 ? 's' : ''} ?`,
      [
        { text: strings.cancel, style: 'cancel' },
        {
          text: strings.delete,
          style: 'destructive',
          onPress: async () => {
            for (const zoneId of selectedZones) {
              await deleteFunctionalZone(zoneId);
            }
            setSelectedZones(new Set());
            setSelectionMode(false);
            loadBuilding();
          }
        }
      ]
    );
  };

  const handleBulkFavorite = async () => {
    if (selectedZones.size === 0) return;

    const newFavorites = new Set(favoriteZones);
    for (const zoneId of selectedZones) {
      if (newFavorites.has(zoneId)) {
        newFavorites.delete(zoneId);
      } else {
        newFavorites.add(zoneId);
      }
    }
    
    setFavoriteZones(Array.from(newFavorites));
    setSelectedZones(new Set());
    setSelectionMode(false);
  };

  const handleToggleFavorite = async (zoneId: string) => {
    const newFavorites = new Set(favoriteZones);
    if (newFavorites.has(zoneId)) {
      newFavorites.delete(zoneId);
    } else {
      newFavorites.add(zoneId);
    }
    
    setFavoriteZones(Array.from(newFavorites));
  };

  const handleDeleteZone = async (zone: FunctionalZone) => {
    Alert.alert(
      strings.deleteZone,
      `Êtes-vous sûr de vouloir supprimer la zone "${zone.name}" ?`,
      [
        { text: strings.cancel, style: 'cancel' },
        {
          text: strings.delete,
          style: 'destructive',
          onPress: async () => {
            await deleteFunctionalZone(zone.id);
            loadBuilding();
          }
        }
      ]
    );
  };

  // Fonction pour obtenir le détail des volets par type
  const getShutterDetails = (zone: FunctionalZone) => {
    const highShutters = zone.shutters.filter(s => s.type === 'high').length;
    const lowShutters = zone.shutters.filter(s => s.type === 'low').length;
    const total = zone.shutters.length;
    
    return { highShutters, lowShutters, total };
  };

  const getFilteredZones = () => {
    if (!building) return [];
    
    return building.functionalZones || [];
  };

  // Trier les zones : favoris en premier
  const sortedZones = building ? [...building.functionalZones].sort((a, b) => {
    const aIsFavorite = favoriteZonesSet.has(a.id);
    const bIsFavorite = favoriteZonesSet.has(b.id);
    
    if (aIsFavorite && !bIsFavorite) return -1;
    if (!aIsFavorite && bIsFavorite) return 1;
    return 0;
  }) : [];

  const renderZone = ({ item }: { item: FunctionalZone }) => {
    const shutterDetails = getShutterDetails(item);
    const isSelected = selectedZones.has(item.id);
    const isFavorite = favoriteZonesSet.has(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.zoneCard,
          isSelected && styles.selectedCard,
          isFavorite && styles.favoriteCard
        ]}
        onPress={() => handleZonePress(item)}
        onLongPress={() => {
          if (!selectionMode) {
            setSelectionMode(true);
            handleZoneSelection(item.id);
          }
        }}
      >
        {/* PREMIÈRE LIGNE COMPACTE : Icône + Nom + Nombre de volets */}
        <View style={styles.zoneFirstRow}>
          <View style={styles.zoneNameSection}>
            {selectionMode && (
              <TouchableOpacity 
                style={styles.checkbox}
                onPress={() => handleZoneSelection(item.id)}
              >
                {isSelected ? (
                  <CheckSquare size={16} color={theme.colors.primary} />
                ) : (
                  <Square size={16} color={theme.colors.textTertiary} />
                )}
              </TouchableOpacity>
            )}
            <Wind size={16} color={theme.colors.primary} />
            {/* Nom de la zone cliquable pour édition directe */}
            <TouchableOpacity 
              style={[styles.zoneNameContainer, selectionMode && styles.zoneNameContainerSelection]}
              onPress={() => !selectionMode && openNameEditModal(item)}
              disabled={selectionMode}
            >
              <Text style={styles.zoneName} numberOfLines={1} ellipsizeMode="tail">
                {item.name}
              </Text>
              {!selectionMode && <Text style={styles.editIcon}>✏️</Text>}
            </TouchableOpacity>
          </View>
          
          {/* Case du nombre total de volets - COMPACTE */}
          <View style={styles.shutterCountContainer}>
            <Text style={styles.shutterCountTotal}>
              {shutterDetails.total} {strings.shutters.toLowerCase()}
            </Text>
          </View>
        </View>

        {/* DEUXIÈME LIGNE : Description (si elle existe) */}
        {item.description && (
          <View style={styles.descriptionRow}>
            <Text style={styles.zoneDescription} numberOfLines={1} ellipsizeMode="tail">
              {item.description}
            </Text>
          </View>
        )}

        {/* TROISIÈME LIGNE COMPACTE : Détail VH/VB + Actions (SANS le pourcentage) */}
        <View style={styles.zoneBottomRow}>
          {/* Détail des volets par type - COMPACT */}
          <View style={styles.shutterDetailsCompact}>
            {shutterDetails.highShutters > 0 && (
              <View style={styles.shutterTypeCompact}>
                <View style={[styles.shutterDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.shutterTypeText}>{shutterDetails.highShutters} VH</Text>
              </View>
            )}
            {shutterDetails.lowShutters > 0 && (
              <View style={styles.shutterTypeCompact}>
                <View style={[styles.shutterDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={styles.shutterTypeText}>{shutterDetails.lowShutters} VB</Text>
              </View>
            )}
          </View>

          {/* Actions - COMPACTES (maintenant à droite sans le pourcentage) */}
          {!selectionMode && (
            <View style={styles.actionButtonsCompact}>
              <TouchableOpacity 
                style={styles.actionButtonCompact}
                onPress={() => handleToggleFavorite(item.id)}
              >
                <Star 
                  size={12} 
                  color={isFavorite ? "#F59E0B" : theme.colors.textTertiary} 
                  fill={isFavorite ? "#F59E0B" : "none"}
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButtonCompact}
                onPress={() => handleEditZone(item)}
              >
                <Settings size={12} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButtonCompact}
                onPress={() => handleDeleteZone(item)}
              >
                <Trash2 size={12} color={theme.colors.error} />
              </TouchableOpacity>
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

  if (!building || !project) {
    return (
      <View style={styles.container}>
        <Header title={strings.itemNotFound} onBack={handleBack} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{strings.dataNotFound}</Text>
        </View>
      </View>
    );
  }

  // Afficher la ville si elle existe, sinon afficher le nom du projet
  const locationInfo = project.city ? `${project.name} • ${project.city}` : project.name;

  return (
    <View style={styles.container}>
      <Header
        title={building.name}
        subtitle={locationInfo}
        onBack={handleBack}
        rightComponent={
          <View style={styles.headerContainer}>
            {/* Première ligne avec les boutons principaux */}
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleEditBuilding} style={styles.actionButton}>
                <Settings size={20} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreateZone} style={styles.actionButton}>
                <Plus size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
            
            {/* Deuxième ligne avec le bouton sélection */}
            <View style={styles.selectionRow}>
              <TouchableOpacity onPress={handleSelectionMode} style={styles.selectionButton}>
                <Text style={styles.selectionButtonText}>
                  {selectionMode ? strings.cancel : 'Sélect.'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        }
      />

      {/* Barre d'outils de sélection */}
      {selectionMode && (
        <View style={styles.selectionToolbar}>
          <Text style={styles.selectionCount}>
            {selectedZones.size} {strings.selected}{selectedZones.size > 1 ? 's' : ''}
          </Text>
          <View style={styles.selectionActions}>
            <TouchableOpacity 
              style={styles.toolbarButton}
              onPress={handleBulkFavorite}
              disabled={selectedZones.size === 0}
            >
              <Star size={20} color={selectedZones.size > 0 ? "#F59E0B" : theme.colors.textTertiary} />
              <Text style={[styles.toolbarButtonText, { color: selectedZones.size > 0 ? "#F59E0B" : theme.colors.textTertiary }]}>
                {strings.favorites}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.toolbarButton}
              onPress={handleBulkDelete}
              disabled={selectedZones.size === 0}
            >
              <Trash2 size={20} color={selectedZones.size > 0 ? theme.colors.error : theme.colors.textTertiary} />
              <Text style={[styles.toolbarButtonText, { color: selectedZones.size > 0 ? theme.colors.error : theme.colors.textTertiary }]}>
                {strings.delete}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.content}>
        {building.functionalZones.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Wind size={48} color={theme.colors.textTertiary} />
            <Text style={styles.emptyTitle}>{strings.noZones}</Text>
            <Text style={styles.emptySubtitle}>
              {strings.noZonesDesc}
            </Text>
            <Button
              title={strings.createZone}
              onPress={handleCreateZone}
              style={styles.createButton}
            />
          </View>
        ) : (
          <FlatList
            data={sortedZones}
            renderItem={renderZone}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Modal pour éditer le nom de la zone avec auto-focus */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={nameEditModal.visible}
        onRequestClose={() => setNameEditModal({ visible: false, zone: null, name: '' })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.nameEditModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier le nom de la zone</Text>
              <TouchableOpacity 
                onPress={() => setNameEditModal({ visible: false, zone: null, name: '' })}
                style={styles.closeButton}
              >
                <X size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>{strings.zoneName} *</Text>
              <TextInput
                ref={nameInputRef}
                style={styles.nameTextInput}
                value={nameEditModal.name}
                onChangeText={(text) => setNameEditModal(prev => ({ ...prev, name: text }))}
                placeholder="Ex: ZF01, Zone Hall"
                placeholderTextColor={theme.colors.textTertiary}
                autoFocus={true}
                selectTextOnFocus={true}
              />
            </View>

            <View style={styles.modalFooter}>
              <Button
                title={strings.cancel}
                onPress={() => setNameEditModal({ visible: false, zone: null, name: '' })}
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
  // Styles pour le conteneur d'en-tête à deux niveaux
  headerContainer: {
    alignItems: 'flex-end',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  selectionRow: {
    flexDirection: 'row',
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
  // Styles pour la barre d'outils de sélection
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
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  createButton: {
    paddingHorizontal: 32,
  },
  listContainer: {
    padding: 16,
  },

  // STYLES COMPACTS ET RAFFINÉS pour les cartes de zone
  zoneCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  // Styles pour les cartes sélectionnées et favorites
  selectedCard: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '20',
  },
  favoriteCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },

  // PREMIÈRE LIGNE COMPACTE : Icône + Nom + Nombre de volets
  zoneFirstRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  zoneNameSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  checkbox: {
    padding: 1,
    flexShrink: 0,
  },
  // Conteneur pour le nom de la zone cliquable - COMPACT
  zoneNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    backgroundColor: theme.colors.surfaceSecondary,
    minWidth: 0,
  },
  zoneNameContainerSelection: {
    backgroundColor: 'transparent',
  },
  zoneName: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
    flex: 1,
    minWidth: 0,
  },
  editIcon: {
    fontSize: 10,
  },
  // Case du nombre total de volets - COMPACTE
  shutterCountContainer: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    minWidth: 70,
  },
  shutterCountTotal: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: theme.colors.primary,
    textAlign: 'center',
  },

  // DEUXIÈME LIGNE : Description (optionnelle) - COMPACTE
  descriptionRow: {
    marginBottom: 6,
  },
  zoneDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
    paddingLeft: 22, // Aligné avec le nom (icône + gap)
  },

  // TROISIÈME LIGNE COMPACTE : Détail VH/VB + Actions (SANS pourcentage)
  zoneBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // Détail des volets par type - TRÈS COMPACT
  shutterDetailsCompact: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  shutterTypeCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  shutterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  shutterTypeText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: theme.colors.textSecondary,
  },

  // Actions - TRÈS COMPACTES (maintenant directement à droite)
  actionButtonsCompact: {
    flexDirection: 'row',
    gap: 2,
  },
  actionButtonCompact: {
    padding: 3,
    borderRadius: 3,
    backgroundColor: theme.colors.surfaceSecondary,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
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
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
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