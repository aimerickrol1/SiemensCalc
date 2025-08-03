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
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <Header
        title="Nouveau projet"
        onBack={handleBack}
      />
      
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
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

        {predefinedStructure.enabled && (
          <View style={styles.predefinedSection}>
            <Text style={styles.predefinedTitle}>🏗️ Structure prédéfinie</Text>
            
            <View style={styles.defaultFlowContainer}>
              <Input
                label="Débit de référence par défaut (m³/h) - Optionnel"
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
              />
              <Text style={styles.defaultFlowDescription}>
                Si renseigné, cette valeur sera appliquée automatiquement à tous les volets créés dans cette structure.
              </Text>
            </View>
            
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
        )}
        <View style={styles.buttonContainer}>
          <Button
            title="Créer le projet"
            onPress={handleCreate}
            disabled={loading}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    paddingBottom: 100,
  },
  buttonContainer: {
    marginTop: 24,
  },
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
  defaultFlowContainer: {
    backgroundColor: theme.colors.primary + '20',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.primary + '40',
  },
  defaultFlowDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: theme.colors.primary,
    marginTop: 8,
    lineHeight: 16,
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