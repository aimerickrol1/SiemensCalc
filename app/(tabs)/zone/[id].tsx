import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Plus, Settings, Copy, Clipboard, Filter, Star, Trash2, SquareCheck as CheckSquare, Square, MessageSquare, X } from 'lucide-react-native';
import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import { ComplianceIndicator } from '@/components/ComplianceIndicator';
import { Project, Building, FunctionalZone, Shutter } from '@/types';
import { useStorage } from '@/contexts/StorageContext';
import { calculateCompliance, formatDeviation } from '@/utils/compliance';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAndroidBackButton } from '@/utils/BackHandler';

export default function ZoneDetailScreen() {
  const { strings } = useLanguage();
  const { theme } = useTheme();
  const { 
    projects, 
    favoriteShutters, 
    setFavoriteShutters, 
    deleteShutter, 
    updateShutter 
  } = useStorage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [zone, setZone] = useState<FunctionalZone | null>(null);
  const [building, setBuilding] = useState<Building | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedShutter, setCopiedShutter] = useState<Shutter | null>(null);
  
  // Convert favoriteShutters array to Set for .has() method
  const favoriteShuttersSet = new Set(favoriteShutters);

  // CORRIGÉ : États pour l'édition directe des débits - AVEC MISE À JOUR INSTANTANÉE
  const [editingFlows, setEditingFlows] = useState<{[key: string]: {
    referenceFlow: string;
    measuredFlow: string;
    hasBeenFocused: { referenceFlow: boolean; measuredFlow: boolean };
  }}>({});

  // Modal pour éditer le nom
  const [nameEditModal, setNameEditModal] = useState<{
    visible: boolean;
    shutter: Shutter | null;
    name: string;
  }>({ visible: false, shutter: null, name: '' });

  // Modal pour éditer les remarques
  const [remarksEditModal, setRemarksEditModal] = useState<{
    visible: boolean;
    shutter: Shutter | null;
    remarks: string;
  }>({ visible: false, shutter: null, remarks: '' });

  // NOUVEAU : Références pour l'auto-focus des inputs
  const nameInputRef = useRef<TextInput>(null);
  const remarksInputRef = useRef<TextInput>(null);

  // Configure Android back button to go back to the building screen
  useAndroidBackButton(() => {
    handleBack();
    return true;
  });

  // États pour le filtre
  const [filterVisible, setFilterVisible] = useState(false);
  const [filter, setFilter] = useState<'all' | 'high' | 'low'>('all');
  
  // NOUVEAU : État pour le filtre de conformité
  const [complianceFilter, setComplianceFilter] = useState<'all' | 'compliant' | 'acceptable' | 'non-compliant'>('all');

  // États pour le mode sélection
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedShutters, setSelectedShutters] = useState<Set<string>>(new Set());

  // Référence pour le FlatList pour le scroll automatique
  const flatListRef = useRef<FlatList>(null);

  // Charger la zone
  const loadZone = useCallback(async () => {
    try {
      for (const proj of projects) {
        for (const bldg of proj.buildings) {
          const foundZone = bldg.functionalZones.find(z => z.id === id);
          if (foundZone) {
            setZone(foundZone);
            setBuilding(bldg);
            setProject(proj);
            return;
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la zone:', error);
    } finally {
      setLoading(false);
    }
  }, [id, projects]);

  // NOUVEAU : Utiliser useFocusEffect pour recharger les données quand on revient sur la page
  useFocusEffect(
    useCallback(() => {
      console.log('Zone screen focused, reloading data...');
      loadZone();
    }, [loadZone])
  );

  useEffect(() => {
    loadZone();
  }, [loadZone]);

  // CORRIGÉ : Initialiser l'édition pour tous les volets quand la zone change
  useEffect(() => {
    if (zone) {
      const newEditingFlows: typeof editingFlows = {};
      zone.shutters.forEach(shutter => {
        // CORRIGÉ : Initialiser avec des valeurs vides si les débits sont à 0
        newEditingFlows[shutter.id] = {
          referenceFlow: shutter.referenceFlow > 0 ? shutter.referenceFlow.toString() : '',
          measuredFlow: shutter.measuredFlow > 0 ? shutter.measuredFlow.toString() : '',
          hasBeenFocused: editingFlows[shutter.id]?.hasBeenFocused || { referenceFlow: false, measuredFlow: false }
        };
      });
      
      setEditingFlows(newEditingFlows);
    }
  }, [zone]); // CORRIGÉ : Dépendance uniquement sur zone, pas sur editingFlows pour éviter les boucles

  // NOUVEAU : Auto-focus sur l'input du nom quand le modal s'ouvre
  useEffect(() => {
    if (nameEditModal.visible && nameInputRef.current) {
      // Délai pour s'assurer que le modal est complètement ouvert
      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [nameEditModal.visible]);

  // Auto-focus sur l'input des remarques quand le modal s'ouvre
  useEffect(() => {
    if (remarksEditModal.visible && remarksInputRef.current) {
      // Délai pour s'assurer que le modal est complètement ouvert
      const timer = setTimeout(() => {
        remarksInputRef.current?.focus();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [remarksEditModal.visible]);

  const handleBack = () => {
    try {
      if (building) {
        router.push(`/(tabs)/building/${building.id}`);
      } else {
        router.push('/(tabs)/');
      }
    } catch (error) {
      console.error('Erreur de navigation:', error);
      router.push('/(tabs)/');
    }
  };

  const handleEditZone = () => {
    try {
      router.push(`/(tabs)/zone/edit/${id}`);
    } catch (error) {
      console.error('Erreur de navigation vers édition:', error);
    }
  };

  const handleCreateShutter = () => {
    try {
      router.push(`/(tabs)/shutter/create?zoneId=${id}`);
    } catch (error) {
      console.error('Erreur de navigation vers création volet:', error);
    }
  };

  const handleShutterPress = (shutter: Shutter) => {
    // Si on est en mode sélection, sélectionner/désélectionner
    if (selectionMode) {
      handleShutterSelection(shutter.id);
      return;
    }

    // Sinon, aller vers la page détaillée
    try {
      router.push(`/(tabs)/shutter/${shutter.id}`);
    } catch (error) {
      console.error('Erreur de navigation vers volet:', error);
    }
  };

  // NOUVEAU : Fonction pour éditer un volet
  const handleEditShutter = (shutter: Shutter) => {
    try {
      router.push(`/(tabs)/shutter/edit/${shutter.id}`);
    } catch (error) {
      console.error('Erreur de navigation vers édition volet:', error);
    }
  };

  // Copier sans pop-up
  const handleCopyShutter = (shutter: Shutter) => {
    setCopiedShutter(shutter);
  };

  // Coller avec scroll automatique vers le bas
  const handlePasteShutter = async () => {
    if (!copiedShutter || !zone) return;

    try {
      const existingNames = zone.shutters.map(s => s.name);
      let newName = copiedShutter.name;
      let counter = 1;
      
      while (existingNames.includes(newName)) {
        const baseName = copiedShutter.name.replace(/\d+$/, '');
        newName = `${baseName}${counter.toString().padStart(2, '0')}`;
        counter++;
      }

      const newShutter = await createShutter(zone.id, {
        name: newName,
        type: copiedShutter.type,
        referenceFlow: copiedShutter.referenceFlow,
        measuredFlow: 0,
        remarks: copiedShutter.remarks,
      });

      if (newShutter) {
        await loadZone();
        
        // Scroll automatique vers le bas après un petit délai
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 300);
      }
    } catch (error) {
      Alert.alert(strings.error, 'Impossible de coller le volet. Veuillez réessayer.');
    }
  };

  const handleDeleteShutter = async (shutter: Shutter) => {
    Alert.alert(
      strings.deleteShutter,
      `${strings.deleteShutterConfirm} "${shutter.name}" ?`,
      [
        { text: strings.cancel, style: 'cancel' },
        {
          text: strings.delete,
          style: 'destructive',
          onPress: async () => {
            await deleteShutter(shutter.id);
            loadZone();
          }
        }
      ]
    );
  };

  // Fonctions pour le mode sélection
  const handleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedShutters(new Set());
  };

  const handleShutterSelection = (shutterId: string) => {
    setSelectedShutters(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(shutterId)) {
        newSelection.delete(shutterId);
      } else {
        newSelection.add(shutterId);
      }
      return newSelection;
    });
  };

  const handleBulkDelete = () => {
    if (selectedShutters.size === 0) return;

    Alert.alert(
      strings.delete + ' ' + strings.shutters.toLowerCase(),
      `Êtes-vous sûr de vouloir supprimer ${selectedShutters.size} volet${selectedShutters.size > 1 ? 's' : ''} ?`,
      [
        { text: strings.cancel, style: 'cancel' },
        {
          text: strings.delete,
          style: 'destructive',
          onPress: async () => {
            for (const shutterId of selectedShutters) {
              await deleteShutter(shutterId);
            }
            setSelectedShutters(new Set());
            setSelectionMode(false);
            loadZone();
          }
        }
      ]
    );
  };

  const handleBulkFavorite = async () => {
    if (selectedShutters.size === 0) return;

    const newFavorites = new Set(favoriteShuttersSet);
    for (const shutterId of selectedShutters) {
      if (newFavorites.has(shutterId)) {
        newFavorites.delete(shutterId);
      } else {
        newFavorites.add(shutterId);
      }
    }
    
    setFavoriteShutters(Array.from(newFavorites));
    setSelectedShutters(new Set());
    setSelectionMode(false);
  };

  const handleToggleFavorite = async (shutterId: string) => {
    setFavoriteShutters(prev => {
      const newFavorites = new Set(favoriteShuttersSet);
      if (newFavorites.has(shutterId)) {
        newFavorites.delete(shutterId);
      } else {
        newFavorites.add(shutterId);
      }
      return Array.from(newFavorites);
    });
  };

  // CORRIGÉ : Fonctions pour l'édition directe des débits avec mise à jour instantanée
  const handleFlowChange = useCallback((shutterId: string, field: 'referenceFlow' | 'measuredFlow', value: string) => {
    setEditingFlows(prev => ({
      ...prev,
      [shutterId]: {
        ...prev[shutterId],
        [field]: value
      }
    }));
  }, []);

  // Fonction pour gérer le focus et l'effacement automatique du "0"
  const handleFlowFocus = useCallback((shutterId: string, field: 'referenceFlow' | 'measuredFlow') => {
    setEditingFlows(prev => {
      const currentEdit = prev[shutterId];
      if (!currentEdit) return prev;

      // Marquer comme focalisé
      return {
        ...prev,
        [shutterId]: {
          ...currentEdit,
          hasBeenFocused: {
            ...currentEdit.hasBeenFocused,
            [field]: true
          }
        }
      };
    });
  }, []);

  // CORRIGÉ : Sauvegarde automatique avec mise à jour instantanée de l'état local
  const handleFlowBlur = useCallback(async (shutter: Shutter, field: 'referenceFlow' | 'measuredFlow') => {
    const editData = editingFlows[shutter.id];
    if (!editData) return;

    const refFlow = parseFloat(editData.referenceFlow) || 0;
    const measFlow = parseFloat(editData.measuredFlow) || 0;

    // Validation des valeurs
    if (isNaN(refFlow) || refFlow < 0) {
      // Restaurer la valeur originale en cas d'erreur
      setEditingFlows(prev => ({
        ...prev,
        [shutter.id]: {
          ...prev[shutter.id],
          referenceFlow: shutter.referenceFlow > 0 ? shutter.referenceFlow.toString() : ''
        }
      }));
      return;
    }

    if (isNaN(measFlow) || measFlow < 0) {
      // Restaurer la valeur originale en cas d'erreur
      setEditingFlows(prev => ({
        ...prev,
        [shutter.id]: {
          ...prev[shutter.id],
          measuredFlow: shutter.measuredFlow > 0 ? shutter.measuredFlow.toString() : ''
        }
      }));
      return;
    }

    // Vérifier si les valeurs ont changé
    const hasChanged = refFlow !== shutter.referenceFlow || measFlow !== shutter.measuredFlow;
    
    if (hasChanged) {
      try {
        // CORRIGÉ : Sauvegarde automatique ET mise à jour instantanée de l'état local
        await updateShutter(shutter.id, {
          referenceFlow: refFlow,
          measuredFlow: measFlow,
        });
        
        // CORRIGÉ : Mise à jour instantanée de l'état local du volet SANS recharger toute la zone
        setZone(prevZone => {
          if (!prevZone) return prevZone;
          
          return {
            ...prevZone,
            shutters: prevZone.shutters.map(s => 
              s.id === shutter.id 
                ? { ...s, referenceFlow: refFlow, measuredFlow: measFlow, updatedAt: new Date() }
                : s
            )
          };
        });
        
        console.log(`✅ Volet ${shutter.name} mis à jour instantanément: ${refFlow}/${measFlow}`);
        
      } catch (error) {
        console.error('Erreur lors de la sauvegarde automatique:', error);
        // En cas d'erreur, restaurer les valeurs originales
        setEditingFlows(prev => ({
          ...prev,
          [shutter.id]: {
            ...prev[shutter.id],
            referenceFlow: shutter.referenceFlow > 0 ? shutter.referenceFlow.toString() : '',
            measuredFlow: shutter.measuredFlow > 0 ? shutter.measuredFlow.toString() : ''
          }
        }));
      }
    }
  }, [editingFlows, updateShutter]);

  // Fonctions pour éditer le nom
  const openNameEditModal = (shutter: Shutter) => {
    setNameEditModal({
      visible: true,
      shutter,
      name: shutter.name
    });
  };

  const saveNameChange = async () => {
    if (!nameEditModal.shutter || !nameEditModal.name.trim()) return;

    try {
      await updateShutter(nameEditModal.shutter.id, {
        name: nameEditModal.name.trim(),
      });
      
      setNameEditModal({ visible: false, shutter: null, name: '' });
      loadZone();
    } catch (error) {
      Alert.alert(strings.error, 'Impossible de modifier le nom');
    }
  };

  // Fonctions pour éditer les remarques
  const openRemarksEditModal = (shutter: Shutter) => {
    setRemarksEditModal({
      visible: true,
      shutter,
      remarks: shutter.remarks || ''
    });
  };

  const saveRemarksChange = async () => {
    if (!remarksEditModal.shutter) return;

    try {
      await updateShutter(remarksEditModal.shutter.id, {
        remarks: remarksEditModal.remarks.trim() || undefined,
      });
      
      setRemarksEditModal({ visible: false, shutter: null, remarks: '' });
      loadZone();
    } catch (error) {
      Alert.alert(strings.error, 'Impossible de modifier les remarques');
    }
  };

  // CORRIGÉ : Fonction pour filtrer les volets avec filtre de conformité
  const getFilteredShutters = () => {
    if (!zone) return [];
    
    let filtered = zone.shutters;
    
    // Filtre par type de volet
    switch (filter) {
      case 'high':
        filtered = zone.shutters.filter(s => s.type === 'high');
        break;
      case 'low':
        filtered = zone.shutters.filter(s => s.type === 'low');
        break;
      default:
        filtered = zone.shutters;
    }

    // NOUVEAU : Filtre par niveau de conformité
    if (complianceFilter !== 'all') {
      filtered = filtered.filter(shutter => {
        const compliance = calculateCompliance(shutter.referenceFlow, shutter.measuredFlow);
        return compliance.status === complianceFilter;
      });
    }

    // Trier les favoris en premier
    return [...filtered].sort((a, b) => {
      const aIsFavorite = favoriteShuttersSet.has(a.id);
      const bIsFavorite = favoriteShuttersSet.has(b.id);
      
      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;
      return 0;
    });
  };

  // Fonction pour obtenir le nombre de volets par type
  const getShutterCounts = () => {
    if (!zone) return { high: 0, low: 0, total: 0 };
    
    const high = zone.shutters.filter(s => s.type === 'high').length;
    const low = zone.shutters.filter(s => s.type === 'low').length;
    const total = zone.shutters.length;
    
    return { high, low, total };
  };

  // NOUVEAU : Fonction pour obtenir le nombre de volets par niveau de conformité
  const getComplianceCounts = () => {
    if (!zone) return { compliant: 0, acceptable: 0, nonCompliant: 0, total: 0 };
    
    let compliant = 0;
    let acceptable = 0;
    let nonCompliant = 0;
    
    zone.shutters.forEach(shutter => {
      const compliance = calculateCompliance(shutter.referenceFlow, shutter.measuredFlow);
      switch (compliance.status) {
        case 'compliant':
          compliant++;
          break;
        case 'acceptable':
          acceptable++;
          break;
        case 'non-compliant':
          nonCompliant++;
          break;
      }
    });
    
    return { compliant, acceptable, nonCompliant, total: zone.shutters.length };
  };

  const renderShutter = ({ item }: { item: Shutter }) => {
    const isSelected = selectedShutters.has(item.id);
    const isFavorite = favoriteShuttersSet.has(item.id);
    const editData = editingFlows[item.id];
    
    // CORRIGÉ : Calculer la conformité avec les valeurs actuelles (éditées ou du volet mis à jour)
    const currentRefFlow = editData ? parseFloat(editData.referenceFlow) || 0 : item.referenceFlow;
    const currentMeasFlow = editData ? parseFloat(editData.measuredFlow) || 0 : item.measuredFlow;
    const compliance = calculateCompliance(currentRefFlow, currentMeasFlow);

    return (
      <TouchableOpacity
        style={[
          styles.shutterCard,
          isSelected && styles.selectedCard,
          isFavorite && styles.favoriteCard
        ]}
        onPress={() => handleShutterPress(item)}
        onLongPress={() => {
          if (!selectionMode) {
            setSelectionMode(true);
            handleShutterSelection(item.id);
          }
        }}
      >
        <View style={styles.shutterHeader}>
          <View style={styles.shutterHeaderLeft}>
            {selectionMode && (
              <TouchableOpacity 
                style={styles.checkbox}
                onPress={() => handleShutterSelection(item.id)}
              >
                {isSelected ? (
                  <CheckSquare size={20} color={theme.colors.primary} />
                ) : (
                  <Square size={20} color={theme.colors.textTertiary} />
                )}
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.shutterNameContainer, selectionMode && styles.shutterNameContainerSelection]}
              onPress={() => !selectionMode && openNameEditModal(item)}
              disabled={selectionMode}
            >
              <Text style={styles.shutterName}>{item.name}</Text>
              {!selectionMode && <Text style={styles.editIcon}>✏️</Text>}
            </TouchableOpacity>
          </View>
          
          <View style={styles.shutterHeaderRight}>
            <Text style={styles.shutterType}>
              {item.type === 'high' ? strings.shutterHigh : strings.shutterLow}
            </Text>
            {!selectionMode && (
              <>
                <TouchableOpacity
                  style={styles.favoriteButton}
                  onPress={() => handleToggleFavorite(item.id)}
                >
                  <Star 
                    size={14} 
                    color={isFavorite ? "#F59E0B" : theme.colors.textTertiary} 
                    fill={isFavorite ? "#F59E0B" : "none"}
                  />
                </TouchableOpacity>
                {/* NOUVEAU : Bouton paramètres pour le volet */}
                <TouchableOpacity
                  style={styles.settingsButton}
                  onPress={() => handleEditShutter(item)}
                >
                  <Settings size={14} color={theme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={() => handleCopyShutter(item)}
                >
                  <Copy size={16} color={theme.colors.primary} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* CORRIGÉ : Interface d'édition directe avec placeholders d'exemples et meilleure visibilité */}
        <View style={styles.flowEditingContainer}>
          <View style={styles.flowEditingRow}>
            <View style={styles.flowEditingField}>
              <View style={styles.flowLabelContainer}>
                <Text style={styles.flowEditingLabel}>Débit de</Text>
                <Text style={styles.flowEditingLabel}>référence</Text>
                <Text style={styles.flowEditingUnit}>({strings.cubicMeterPerHour})</Text>
              </View>
              <TextInput
                style={styles.flowEditingInput}
                value={editData?.referenceFlow || (item.referenceFlow > 0 ? item.referenceFlow.toString() : '')}
                onChangeText={(text) => handleFlowChange(item.id, 'referenceFlow', text)}
                onFocus={() => handleFlowFocus(item.id, 'referenceFlow')}
                onBlur={() => handleFlowBlur(item, 'referenceFlow')}
                keyboardType="numeric"
                placeholder="Ex: 5000"
                placeholderTextColor={theme.colors.textTertiary}
                selectTextOnFocus={true}
              />
            </View>
            
            <View style={styles.flowEditingField}>
              <View style={styles.flowLabelContainer}>
                <Text style={styles.flowEditingLabel}>Débit mesuré</Text>
                <Text style={styles.flowEditingUnit}>({strings.cubicMeterPerHour})</Text>
              </View>
              <TextInput
                style={styles.flowEditingInput}
                value={editData?.measuredFlow || (item.measuredFlow > 0 ? item.measuredFlow.toString() : '')}
                onChangeText={(text) => handleFlowChange(item.id, 'measuredFlow', text)}
                onFocus={() => handleFlowFocus(item.id, 'measuredFlow')}
                onBlur={() => handleFlowBlur(item, 'measuredFlow')}
                keyboardType="numeric"
                placeholder="Ex: 4800"
                placeholderTextColor={theme.colors.textTertiary}
                selectTextOnFocus={true}
              />
            </View>
            
            <View style={styles.flowEditingField}>
              <View style={styles.flowLabelContainer}>
                <Text style={styles.flowEditingLabel}>Écart</Text>
                <Text style={styles.flowEditingUnit}>(%)</Text>
              </View>
              <View style={styles.deviationDisplay}>
                <Text style={[styles.deviationValue, { color: compliance.color }]}>
                  {formatDeviation(compliance.deviation)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Indicateur de conformité */}
        <View style={styles.complianceContainer}>
          <ComplianceIndicator compliance={compliance} size="small" />
        </View>

        {/* Bouton remarques fin sur toute la largeur */}
        {!selectionMode && (
          <TouchableOpacity
            style={styles.remarksButton}
            onPress={() => openRemarksEditModal(item)}
          >
            <MessageSquare size={14} color={theme.colors.textSecondary} />
            <Text style={styles.remarksButtonText}>
              {item.remarks ? `Remarque: ${item.remarks}` : 'Ajouter une remarque'}
            </Text>
          </TouchableOpacity>
        )}
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

  if (!zone || !building || !project) {
    return (
      <View style={styles.container}>
        <Header title={strings.itemNotFound} onBack={handleBack} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{strings.dataNotFound}</Text>
        </View>
      </View>
    );
  }

  const filteredShutters = getFilteredShutters();
  const shutterCounts = getShutterCounts();
  const complianceCounts = getComplianceCounts();

  return (
    <View style={styles.container}>
      <Header
        title={zone.name}
        subtitle={`${building.name} • ${project.name}`}
        onBack={handleBack}
        rightComponent={
          <View style={styles.headerContainer}>
            {/* Première ligne avec les boutons principaux */}
            <View style={styles.headerActions}>
              {copiedShutter && (
                <TouchableOpacity onPress={handlePasteShutter} style={styles.actionButton}>
                  <Clipboard size={20} color={theme.colors.success} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setFilterVisible(!filterVisible)} style={styles.actionButton}>
                <Filter size={20} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleEditZone} style={styles.actionButton}>
                <Settings size={20} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreateShutter} style={styles.actionButton}>
                <Plus size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
            
            {/* Deuxième ligne avec le bouton sélection */}
            <View style={styles.selectionRow}>
              <TouchableOpacity onPress={handleSelectionMode} style={styles.selectionButton}>
                <Text style={styles.selectionButtonText}>
                  {selectionMode ? strings.cancel : 'Sélect'}
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
            {selectedShutters.size} {strings.selected}{selectedShutters.size > 1 ? 's' : ''}
          </Text>
          <View style={styles.selectionActions}>
            <TouchableOpacity 
              style={styles.toolbarButton}
              onPress={handleBulkFavorite}
              disabled={selectedShutters.size === 0}
            >
              <Star size={20} color={selectedShutters.size > 0 ? "#F59E0B" : theme.colors.textTertiary} />
              <Text style={[styles.toolbarButtonText, { color: selectedShutters.size > 0 ? "#F59E0B" : theme.colors.textTertiary }]}>
                {strings.favorites}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.toolbarButton}
              onPress={handleBulkDelete}
              disabled={selectedShutters.size === 0}
            >
              <Trash2 size={20} color={selectedShutters.size > 0 ? theme.colors.error : theme.colors.textTertiary} />
              <Text style={[styles.toolbarButtonText, { color: selectedShutters.size > 0 ? theme.colors.error : theme.colors.textTertiary }]}>
                {strings.delete}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.content}>
        {/* Indicateur de volet copié - SIMPLIFIÉ */}
        {copiedShutter && (
          <View style={styles.copiedIndicator}>
            <View style={styles.copiedIndicatorContent}>
              <Clipboard size={16} color={theme.colors.success} />
              <Text style={styles.copiedText}>
                {strings.shutter} "{copiedShutter.name}" {strings.copied}
              </Text>
            </View>
          </View>
        )}

        {/* Barre de filtre */}
        {filterVisible && (
          <View style={styles.filterBar}>
            {/* Filtre par type de volet */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Type de volet</Text>
              <View style={styles.filterButtons}>
                <TouchableOpacity
                  style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
                  onPress={() => setFilter('all')}
                >
                  <Text style={[styles.filterButtonText, filter === 'all' && styles.filterButtonTextActive]}>
                    Tous ({shutterCounts.total})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterButton, filter === 'high' && styles.filterButtonActive]}
                  onPress={() => setFilter('high')}
                >
                  <View style={styles.filterButtonContent}>
                    <View style={[styles.filterIndicator, { backgroundColor: '#10B981' }]} />
                    <Text style={[styles.filterButtonText, filter === 'high' && styles.filterButtonTextActive]}>
                      VH ({shutterCounts.high})
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterButton, filter === 'low' && styles.filterButtonActive]}
                  onPress={() => setFilter('low')}
                >
                  <View style={styles.filterButtonContent}>
                    <View style={[styles.filterIndicator, { backgroundColor: '#F59E0B' }]} />
                    <Text style={[styles.filterButtonText, filter === 'low' && styles.filterButtonTextActive]}>
                      VB ({shutterCounts.low})
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* MODIFIÉ : Filtre par niveau de conformité - HORIZONTAL avec points colorés uniquement */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Niveau de conformité</Text>
              <View style={styles.filterButtons}>
                <TouchableOpacity
                  style={[styles.filterButton, complianceFilter === 'all' && styles.filterButtonActive]}
                  onPress={() => setComplianceFilter('all')}
                >
                  <Text style={[styles.filterButtonText, complianceFilter === 'all' && styles.filterButtonTextActive]}>
                    Tous ({complianceCounts.total})
                  </Text>
                </TouchableOpacity>
                
                {/* Bouton Fonctionnel - point vert uniquement */}
                <TouchableOpacity
                  style={[styles.filterButton, complianceFilter === 'compliant' && styles.filterButtonActive]}
                  onPress={() => setComplianceFilter('compliant')}
                >
                  <View style={[styles.complianceDot, { backgroundColor: '#10B981' }]} />
                </TouchableOpacity>
                
                {/* Bouton Acceptable - point orange uniquement */}
                <TouchableOpacity
                  style={[styles.filterButton, complianceFilter === 'acceptable' && styles.filterButtonActive]}
                  onPress={() => setComplianceFilter('acceptable')}
                >
                  <View style={[styles.complianceDot, { backgroundColor: '#F59E0B' }]} />
                </TouchableOpacity>
                
                {/* Bouton Non conforme - point rouge uniquement */}
                <TouchableOpacity
                  style={[styles.filterButton, complianceFilter === 'non-compliant' && styles.filterButtonActive]}
                  onPress={() => setComplianceFilter('non-compliant')}
                >
                  <View style={[styles.complianceDot, { backgroundColor: '#EF4444' }]} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {zone.shutters.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>{strings.noShutters}</Text>
            <Text style={styles.emptySubtitle}>
              {strings.noShuttersDesc}
            </Text>
            <Button
              title={strings.addFirstShutter}
              onPress={handleCreateShutter}
              style={styles.createButton}
            />
          </View>
        ) : filteredShutters.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Aucun volet trouvé</Text>
            <Text style={styles.emptySubtitle}>
              Aucun volet ne correspond aux filtres sélectionnés
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={filteredShutters}
            renderItem={renderShutter}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Modal pour éditer le nom avec auto-focus */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={nameEditModal.visible}
        onRequestClose={() => setNameEditModal({ visible: false, shutter: null, name: '' })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier le nom du volet</Text>
              <TouchableOpacity 
                onPress={() => setNameEditModal({ visible: false, shutter: null, name: '' })}
                style={styles.closeButton}
              >
                <X size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>{strings.shutterName} *</Text>
              <TextInput
                ref={nameInputRef}
                style={styles.nameTextInput}
                value={nameEditModal.name}
                onChangeText={(text) => setNameEditModal(prev => ({ ...prev, name: text }))}
                placeholder="Ex: VH01, VB01"
                placeholderTextColor={theme.colors.textTertiary}
                autoFocus={true}
                selectTextOnFocus={true}
              />
            </View>

            <View style={styles.modalFooter}>
              <Button
                title={strings.cancel}
                onPress={() => setNameEditModal({ visible: false, shutter: null, name: '' })}
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

      {/* Modal pour éditer les remarques avec auto-focus */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={remarksEditModal.visible}
        onRequestClose={() => setRemarksEditModal({ visible: false, shutter: null, remarks: '' })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier les remarques</Text>
              <TouchableOpacity 
                onPress={() => setRemarksEditModal({ visible: false, shutter: null, remarks: '' })}
                style={styles.closeButton}
              >
                <X size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>{strings.remarks}</Text>
              <TextInput
                ref={remarksInputRef}
                style={styles.remarksTextInput}
                value={remarksEditModal.remarks}
                onChangeText={(text) => setRemarksEditModal(prev => ({ ...prev, remarks: text }))}
                placeholder="Observations, conditions de mesure..."
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                autoFocus={true}
              />
            </View>

            <View style={styles.modalFooter}>
              <Button
                title={strings.cancel}
                onPress={() => setRemarksEditModal({ visible: false, shutter: null, remarks: '' })}
                variant="secondary"
                style={styles.modalButton}
              />
              <Button
                title={strings.save}
                onPress={saveRemarksChange}
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
  copiedIndicator: {
    backgroundColor: theme.colors.success + '20',
    borderWidth: 1,
    borderColor: theme.colors.success + '40',
    borderRadius: 8,
    margin: 16,
    padding: 12,
  },
  copiedIndicatorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  copiedText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: theme.colors.success,
    flex: 1,
  },
  // CORRIGÉ : Styles pour la barre de filtre avec sections horizontales
  filterBar: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  filterIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  // Point coloré pour le filtre de conformité
  complianceDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
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
  shutterCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  // Styles pour les cartes sélectionnées et favorites
  selectedCard: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '20',
  },
  favoriteCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  shutterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  // Styles pour la partie gauche de l'en-tête avec checkbox
  shutterHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  checkbox: {
    padding: 2,
    flexShrink: 0,
  },
  shutterNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  shutterNameContainerSelection: {
    backgroundColor: 'transparent',
  },
  shutterName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
    flex: 1,
  },
  editIcon: {
    fontSize: 12,
  },
  shutterHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shutterType: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.surfaceSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  // Bouton favori
  favoriteButton: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: theme.colors.warning + '20',
  },
  // NOUVEAU : Bouton paramètres pour le volet
  settingsButton: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: theme.colors.primary + '20',
  },
  copyButton: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: theme.colors.primary + '20',
  },
  
  // STYLES pour l'édition directe avec sauvegarde automatique - AMÉLIORÉ POUR DARK MODE
  flowEditingContainer: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  flowEditingRow: {
    flexDirection: 'row',
    gap: 8,
  },
  flowEditingField: {
    flex: 1,
  },
  // Conteneur pour les labels avec hauteur fixe
  flowLabelContainer: {
    height: 44, // Hauteur fixe pour aligner tous les champs
    justifyContent: 'flex-start',
    marginBottom: 4,
  },
  flowEditingLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: theme.colors.textSecondary,
    lineHeight: 12,
  },
  flowEditingUnit: {
    fontSize: 9,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  flowEditingInput: {
    borderWidth: 1,
    // Amélioration pour le mode sombre: bordure plus visible avec une teinte de la couleur primaire
    borderColor: theme.mode === 'dark' 
      ? theme.colors.primary + '80'  // Bordure plus visible en mode sombre
      : theme.colors.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    // Amélioration pour le mode sombre: arrière-plan légèrement teinté pour plus de contraste
    backgroundColor: theme.mode === 'dark' 
      ? theme.colors.primary + '15'  // Arrière-plan légèrement teinté en mode sombre
      : theme.colors.inputBackground,
    color: theme.colors.text,
    textAlign: 'center',
    height: 40, // Hauteur fixe pour tous les champs
  },
  deviationDisplay: {
    borderWidth: 1,
    // Amélioration pour le mode sombre: bordure plus visible
    borderColor: theme.mode === 'dark' 
      ? theme.colors.border + '80'  // Bordure plus visible en mode sombre
      : theme.colors.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    height: 40, // Même hauteur que les inputs
  },
  deviationValue: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
  
  complianceContainer: {
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  
  // Bouton remarques fin sur toute la largeur
  remarksButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  remarksButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
    flex: 1,
    fontStyle: 'italic',
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
  
  // Styles pour les inputs avec auto-focus
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
  remarksTextInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    backgroundColor: theme.colors.inputBackground,
    color: theme.colors.text,
    minHeight: 100,
    maxHeight: 150,
  },
});