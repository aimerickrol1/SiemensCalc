import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, Text, TouchableOpacity, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Plus, Minus, X } from 'lucide-react-native';
import { Header } from '@/components/Header';
import { Input } from '@/components/Input';
import { DateInput } from '@/components/DateInput';
import { Button } from '@/components/Button';
import { useStorage, createBuilding, createFunctionalZone, createShutter } from '@/contexts/StorageContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

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
  defaultReferenceFlow?: number;
  buildings: PredefinedBuilding[];
}

export default function CreateProjectScreen() {
  const { strings } = useLanguage();
  const { theme } = useTheme();
  const { createProject, createBuilding, createFunctionalZone, createShutter } = useStorage();
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; startDate?: string; endDate?: string }>({});

  const [predefinedStructure, setPredefinedStructure] = useState<PredefinedStructure>({
    enabled: false,
    defaultReferenceFlow: undefined,
    buildings: []
  });

  const generateUniqueId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const handleBack = () => {
    router.push('/(tabs)/');
  };

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

  const handleCreate = async () => {
    if (!validateForm()) return;

    setLoading(true);
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
                        referenceFlow: predefinedStructure.defaultReferenceFlow || 0,
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
                        referenceFlow: predefinedStructure.defaultReferenceFlow || 0,
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
      
      // Navigation vers le projet créé
      router.replace(`/(tabs)/project/${project.id}`);
    } catch (error) {
      console.error('❌ Erreur lors de la création du projet:', error);
      Alert.alert(strings.error, 'Impossible de créer le projet. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const togglePredefinedStructure = () => {
    setPredefinedStructure(prev => ({
      ...prev,
      enabled: !prev.enabled
    }));
    
    // Si on active la structure prédéfinie et qu'il n'y a pas encore de bâtiments, en ajouter un par défaut
    if (!predefinedStructure.enabled && predefinedStructure.buildings.length === 0) {
      const newBuilding: PredefinedBuilding = {
        id: generateUniqueId(),
        name: `Bâtiment 1`,
        zones: [{
          id: generateUniqueId(),
          name: 'ZF01',
          highShutters: 2,
          lowShutters: 2
        }]
      };
      
      setPredefinedStructure(prev => ({
        ...prev,
        defaultReferenceFlow: undefined,
        buildings: [newBuilding]
      }));
    }
  };

  const addBuilding = () => {
    const newBuilding: PredefinedBuilding = {
      id: generateUniqueId(),
      name: `Bâtiment ${predefinedStructure.buildings.length + 1}`,
      zones: [{
        id: generateUniqueId(),
        name: `ZF${(predefinedStructure.buildings.length + 1).toString().padStart(2, '0')}`,
        highShutters: 2,
        lowShutters: 2
      }]
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

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <Header
        title="Nouveau projet"
        onBack={handleBack}
      />
      
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Section informations de base */}
          <View style={styles.basicInfoSection}>
            <Text style={styles.sectionTitle}>📋 Informations du projet</Text>
            
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

            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <DateInput
                  label="Date de début (optionnel)"
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="JJ/MM/AAAA"
                  error={errors.startDate}
                  containerStyle={styles.dateInputContainer}
                />
              </View>
              <View style={styles.dateField}>
                <DateInput
                  label="Date de fin (optionnel)"
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="JJ/MM/AAAA"
                  error={errors.endDate}
                  containerStyle={styles.dateInputContainer}
                />
              </View>
            </View>
          </View>

          {/* Section structure prédéfinie améliorée */}
          <View style={styles.predefinedSection}>
            <View style={styles.predefinedHeader}>
              <View style={styles.predefinedTitleContainer}>
                <Text style={styles.predefinedTitle}>🏗️ Structure prédéfinie</Text>
                <Text style={styles.predefinedSubtitle}>
                  Créez automatiquement vos bâtiments, zones et volets
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.toggle, predefinedStructure.enabled && styles.toggleActive]}
                onPress={togglePredefinedStructure}
              >
                <View style={[styles.toggleThumb, predefinedStructure.enabled && styles.toggleThumbActive]} />
              </TouchableOpacity>
            </View>

            {predefinedStructure.enabled && (
              <View style={styles.predefinedContent}>
                {/* Débit de référence par défaut */}
                <View style={styles.defaultFlowCard}>
                  <Text style={styles.defaultFlowTitle}>⚙️ Configuration par défaut</Text>
                  <Input
                    label="Débit de référence par défaut (m³/h)"
                    value={predefinedStructure.defaultReferenceFlow?.toString() || ''}
                    onChangeText={(text) => {
                      const value = text.trim() === '' ? undefined : parseFloat(text) || undefined;
                      setPredefinedStructure(prev => ({
                        ...prev,
                        defaultReferenceFlow: value
                      }));
                    }}
                    placeholder="Ex: 5000"
                    keyboardType="numeric"
                    containerStyle={styles.defaultFlowInput}
                  />
                  <Text style={styles.defaultFlowDescription}>
                    💡 Cette valeur sera appliquée automatiquement à tous les volets créés
                  </Text>
                </View>

                {/* Liste des bâtiments */}
                <View style={styles.buildingsSection}>
                  <View style={styles.buildingsSectionHeader}>
                    <Text style={styles.buildingsSectionTitle}>🏢 Bâtiments ({predefinedStructure.buildings.length})</Text>
                    <TouchableOpacity style={styles.addBuildingButtonCompact} onPress={addBuilding}>
                      <Plus size={16} color={theme.colors.primary} />
                      <Text style={styles.addBuildingTextCompact}>Ajouter</Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.buildingsScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                    {predefinedStructure.buildings.map((building, buildingIndex) => (
                      <View key={building.id} style={styles.buildingCard}>
                        {/* En-tête du bâtiment */}
                        <View style={styles.buildingHeader}>
                          <View style={styles.buildingTitleRow}>
                            <Text style={styles.buildingNumber}>#{buildingIndex + 1}</Text>
                            <TextInput
                              style={styles.buildingNameInput}
                              value={building.name}
                              onChangeText={(text) => updateBuildingName(building.id, text)}
                              placeholder="Nom du bâtiment"
                              placeholderTextColor={theme.colors.textTertiary}
                            />
                            <TouchableOpacity
                              style={styles.removeBuildingButton}
                              onPress={() => removeBuilding(building.id)}
                            >
                              <Trash2 size={16} color={theme.colors.error} />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Zones du bâtiment */}
                        <View style={styles.zonesContainer}>
                          <View style={styles.zonesHeader}>
                            <Text style={styles.zonesTitle}>Zones ({building.zones.length})</Text>
                            <TouchableOpacity
                              style={styles.addZoneButtonCompact}
                              onPress={() => addZone(building.id)}
                            >
                              <Plus size={14} color={theme.colors.primary} />
                              <Text style={styles.addZoneTextCompact}>Zone</Text>
                            </TouchableOpacity>
                          </View>

                          {building.zones.map((zone, zoneIndex) => (
                            <View key={zone.id} style={styles.zoneCard}>
                              <View style={styles.zoneHeader}>
                                <View style={styles.zoneTitleRow}>
                                  <Text style={styles.zoneNumber}>Z{zoneIndex + 1}</Text>
                                  <TextInput
                                    style={styles.zoneNameInput}
                                    value={zone.name}
                                    onChangeText={(text) => updateZoneName(building.id, zone.id, text)}
                                    placeholder="Nom de la zone"
                                    placeholderTextColor={theme.colors.textTertiary}
                                  />
                                  <TouchableOpacity
                                    style={styles.removeZoneButton}
                                    onPress={() => removeZone(building.id, zone.id)}
                                  >
                                    <X size={12} color={theme.colors.error} />
                                  </TouchableOpacity>
                                </View>
                              </View>

                              {/* Compteurs de volets améliorés */}
                              <View style={styles.shutterCountersRow}>
                                <View style={styles.shutterCounter}>
                                  <View style={styles.shutterCounterHeader}>
                                    <View style={[styles.shutterTypeDot, { backgroundColor: '#10B981' }]} />
                                    <Text style={styles.shutterCounterLabel}>VH</Text>
                                  </View>
                                  <View style={styles.counterControls}>
                                    <TouchableOpacity
                                      style={styles.counterButton}
                                      onPress={() => updateShutterCount(building.id, zone.id, 'high', zone.highShutters - 1)}
                                      disabled={zone.highShutters <= 0}
                                    >
                                      <Minus size={12} color={zone.highShutters <= 0 ? theme.colors.textTertiary : theme.colors.primary} />
                                    </TouchableOpacity>
                                    <Text style={styles.counterValue}>{zone.highShutters}</Text>
                                    <TouchableOpacity
                                      style={styles.counterButton}
                                      onPress={() => updateShutterCount(building.id, zone.id, 'high', zone.highShutters + 1)}
                                      disabled={zone.highShutters >= 30}
                                    >
                                      <Plus size={12} color={zone.highShutters >= 30 ? theme.colors.textTertiary : theme.colors.primary} />
                                    </TouchableOpacity>
                                  </View>
                                </View>

                                <View style={styles.shutterCounter}>
                                  <View style={styles.shutterCounterHeader}>
                                    <View style={[styles.shutterTypeDot, { backgroundColor: '#F59E0B' }]} />
                                    <Text style={styles.shutterCounterLabel}>VB</Text>
                                  </View>
                                  <View style={styles.counterControls}>
                                    <TouchableOpacity
                                      style={styles.counterButton}
                                      onPress={() => updateShutterCount(building.id, zone.id, 'low', zone.lowShutters - 1)}
                                      disabled={zone.lowShutters <= 0}
                                    >
                                      <Minus size={12} color={zone.lowShutters <= 0 ? theme.colors.textTertiary : theme.colors.primary} />
                                    </TouchableOpacity>
                                    <Text style={styles.counterValue}>{zone.lowShutters}</Text>
                                    <TouchableOpacity
                                      style={styles.counterButton}
                                      onPress={() => updateShutterCount(building.id, zone.id, 'low', zone.lowShutters + 1)}
                                      disabled={zone.lowShutters >= 30}
                                    >
                                      <Plus size={12} color={zone.lowShutters >= 30 ? theme.colors.textTertiary : theme.colors.primary} />
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              </View>

                              {/* Résumé de la zone */}
                              <View style={styles.zoneSummary}>
                                <Text style={styles.zoneSummaryText}>
                                  Total: {zone.highShutters + zone.lowShutters} volets
                                </Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bouton fixe en bas */}
      <View style={styles.fixedFooter}>
        <Button
          title={loading ? "Création..." : "Créer le projet"}
          onPress={handleCreate}
          disabled={loading}
          style={styles.createButton}
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
  keyboardContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 140, // Espace pour le bouton fixe
  },
  
  // Section informations de base
  basicInfoSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
    marginBottom: 16,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateField: {
    flex: 1,
  },
  dateInputContainer: {
    marginBottom: 0,
  },
  
  // Section structure prédéfinie améliorée
  predefinedSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  predefinedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  predefinedTitleContainer: {
    flex: 1,
    marginRight: 16,
  },
  predefinedTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  predefinedSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
    flexShrink: 0,
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
  predefinedContent: {
    marginTop: 20,
  },
  
  // Configuration par défaut
  defaultFlowCard: {
    backgroundColor: theme.colors.primary + '15',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  defaultFlowTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.primary,
    marginBottom: 12,
  },
  defaultFlowInput: {
    marginBottom: 8,
  },
  defaultFlowDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: theme.colors.primary,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  
  // Section bâtiments
  buildingsSection: {
    flex: 1,
  },
  buildingsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  defaultFlowContainer: {
    backgroundColor: theme.colors.primary + '20',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  buildingsSectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
  },
  addBuildingButtonCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.primary + '20',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  addBuildingTextCompact: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: theme.colors.primary,
  },
  buildingsScroll: {
    maxHeight: 400,
  },
  
  // Cartes de bâtiment améliorées
  buildingCard: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  buildingHeader: {
    marginBottom: 16,
  },
  buildingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  buildingNumber: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: theme.colors.primary,
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 32,
    textAlign: 'center',
  },
  buildingNameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    backgroundColor: theme.colors.inputBackground,
    color: theme.colors.text,
    minHeight: 44,
  },
  removeBuildingButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: theme.colors.error + '20',
    borderWidth: 1,
    borderColor: theme.colors.error + '40',
  },
  
  // Zones améliorées
  zonesContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 12,
  },
  zonesHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  zonesTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.textSecondary,
    flex: 1,
  },
  addZoneButtonCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: theme.colors.primary + '20',
  },
  addZoneTextCompact: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: theme.colors.primary,
  },
  
  // Cartes de zone améliorées
  zoneCard: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.separator,
  },
  zoneHeader: {
    marginBottom: 10,
  },
  zoneTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  zoneNumber: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.surfaceSecondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 24,
    textAlign: 'center',
  },
  zoneNameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    backgroundColor: theme.colors.inputBackground,
    color: theme.colors.text,
    minHeight: 36,
  },
  removeZoneButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: theme.colors.error + '20',
  },
  
  // Compteurs de volets améliorés
  shutterCountersRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  shutterCounter: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  shutterCounterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 6,
  },
  shutterTypeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  shutterCounterLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.textSecondary,
  },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  counterButton: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: theme.colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  counterValue: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text,
    minWidth: 20,
    textAlign: 'center',
  },
  zoneSummary: {
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: theme.colors.separator,
  },
  zoneSummaryText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: theme.colors.textSecondary,
  },
  
  // Bouton fixe en bas
  fixedFooter: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    bottom: Platform.OS === 'web' ? 20 : 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  createButton: {
    width: '100%',