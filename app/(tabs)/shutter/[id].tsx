import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, TextInput } from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Settings, Trash2 } from 'lucide-react-native';
import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import { ComplianceIndicator } from '@/components/ComplianceIndicator';
import { Project, Building, FunctionalZone, Shutter } from '@/types';
import { useStorage } from '@/contexts/StorageContext';
import { calculateCompliance, formatDeviation } from '@/utils/compliance';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAndroidBackButton } from '@/utils/BackHandler';

export default function ShutterDetailScreen() {
  const { strings } = useLanguage();
  const { theme } = useTheme();
  const { projects, updateShutter, deleteShutter } = useStorage();
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const [shutter, setShutter] = useState<Shutter | null>(null);
  const [zone, setZone] = useState<FunctionalZone | null>(null);
  const [building, setBuilding] = useState<Building | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const [editingFlows, setEditingFlows] = useState<{
    referenceFlow: string;
    measuredFlow: string;
    hasBeenFocused: { referenceFlow: boolean; measuredFlow: boolean };
  }>({
    referenceFlow: '',
    measuredFlow: '',
    hasBeenFocused: { referenceFlow: false, measuredFlow: false }
  });

  // Configure Android back button to go back to the zone screen or search
  useAndroidBackButton(() => {
    handleBack();
    return true;
  });

  const loadShutter = useCallback(async () => {
    try {
      for (const proj of projects) {
        for (const bldg of proj.buildings) {
          for (const z of bldg.functionalZones) {
            const foundShutter = z.shutters.find(s => s.id === id);
            if (foundShutter) {
              setShutter(foundShutter);
              setZone(z);
              setBuilding(bldg);
              setProject(proj);
              return;
            }
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement du volet:', error);
    } finally {
      setLoading(false);
    }
  }, [id, projects]);

  useFocusEffect(
    useCallback(() => {
      console.log('Shutter screen focused, reloading data...');
      loadShutter();
    }, [loadShutter])
  );

  useEffect(() => {
    loadShutter();
  }, [loadShutter]);

  useEffect(() => {
    if (shutter) {
      setEditingFlows({
        referenceFlow: shutter.referenceFlow > 0 ? shutter.referenceFlow.toString() : '',
        measuredFlow: shutter.measuredFlow > 0 ? shutter.measuredFlow.toString() : '',
        hasBeenFocused: { referenceFlow: false, measuredFlow: false }
      });
    }
  }, [shutter]);

  const handleBack = () => {
    try {
      if (from === 'search') {
        router.push('/(tabs)/search');
      } else if (zone) {
        router.push(`/(tabs)/zone/${zone.id}`);
      } else {
        router.push('/(tabs)/');
      }
    } catch (error) {
      console.error('Erreur de navigation:', error);
      router.push('/(tabs)/');
    }
  };

  const handleEdit = () => {
    try {
      if (from === 'search') {
        router.push(`/(tabs)/shutter/edit/${id}?from=search`);
      } else {
        router.push(`/(tabs)/shutter/edit/${id}`);
      }
    } catch (error) {
      console.error('Erreur de navigation vers édition:', error);
    }
  };

  const handleDelete = async () => {
    if (!shutter) return;

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
            handleBack();
          }
        }
      ]
    );
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(new Date(date));
  };

  const handleFlowChange = useCallback((field: 'referenceFlow' | 'measuredFlow', value: string) => {
    setEditingFlows(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleFlowFocus = useCallback((field: 'referenceFlow' | 'measuredFlow') => {
    setEditingFlows(prev => {
      return {
        ...prev,
        hasBeenFocused: {
          ...prev.hasBeenFocused,
          [field]: true
        }
      };
    });
  }, []);

  // CORRIGÉ : Mise à jour instantanée de l'état local du volet
  const handleFlowBlur = useCallback(async (field: 'referenceFlow' | 'measuredFlow') => {
    if (!shutter) return;

    const refFlow = parseFloat(editingFlows.referenceFlow) || 0;
    const measFlow = parseFloat(editingFlows.measuredFlow) || 0;

    if (isNaN(refFlow) || refFlow < 0) {
      setEditingFlows(prev => ({
        ...prev,
        referenceFlow: shutter.referenceFlow > 0 ? shutter.referenceFlow.toString() : ''
      }));
      return;
    }

    if (isNaN(measFlow) || measFlow < 0) {
      setEditingFlows(prev => ({
        ...prev,
        measuredFlow: shutter.measuredFlow > 0 ? shutter.measuredFlow.toString() : ''
      }));
      return;
    }

    const hasChanged = refFlow !== shutter.referenceFlow || measFlow !== shutter.measuredFlow;
    
    if (hasChanged) {
      try {
        const updatedShutter = await updateShutter(shutter.id, {
          referenceFlow: refFlow,
          measuredFlow: measFlow,
        });
        
        if (updatedShutter) {
          // CORRIGÉ : Mise à jour instantanée de l'état local du volet
          setShutter(prevShutter => {
            if (!prevShutter) return prevShutter;
            return {
              ...prevShutter,
              referenceFlow: refFlow,
              measuredFlow: measFlow,
              updatedAt: new Date()
            };
          });
          
          console.log(`✅ Volet ${shutter.name} mis à jour instantanément: ${refFlow}/${measFlow}`);
        }
        
      } catch (error) {
        console.error('Erreur lors de la sauvegarde automatique:', error);
        setEditingFlows(prev => ({
          ...prev,
          referenceFlow: shutter.referenceFlow > 0 ? shutter.referenceFlow.toString() : '',
          measuredFlow: shutter.measuredFlow > 0 ? shutter.measuredFlow.toString() : ''
        }));
      }
    }
  }, [editingFlows, shutter, updateShutter]);

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

  if (!shutter || !zone || !building || !project) {
    return (
      <View style={styles.container}>
        <Header title={strings.itemNotFound} onBack={handleBack} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{strings.dataNotFound}</Text>
        </View>
      </View>
    );
  }

  const currentRefFlow = parseFloat(editingFlows.referenceFlow) || 0;
  const currentMeasFlow = parseFloat(editingFlows.measuredFlow) || 0;
  const compliance = calculateCompliance(currentRefFlow, currentMeasFlow);

  return (
    <View style={styles.container}>
      <Header
        title={shutter.name}
        subtitle={`${zone.name} • ${building.name} • ${project.name}`}
        onBack={handleBack}
        rightComponent={
          <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
            <Settings size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{strings.generalInfo}</Text>
            <Text style={styles.shutterType}>
              {shutter.type === 'high' ? strings.shutterHigh : strings.shutterLow}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{strings.projects.slice(0, -1)}</Text>
            <Text style={styles.infoValue}>{project.name}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{strings.building}</Text>
            <Text style={styles.infoValue}>{building.name}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{strings.smokeExtractionZone}</Text>
            <Text style={styles.infoValue}>{zone.name}</Text>
          </View>

          {project.startDate && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{strings.startDate}</Text>
              <Text style={styles.infoValue}>{formatDate(project.startDate)}</Text>
            </View>
          )}

          {project.endDate && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{strings.endDate}</Text>
              <Text style={styles.infoValue}>{formatDate(project.endDate)}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{strings.createdOn}</Text>
            <Text style={styles.infoValue}>
              {new Intl.DateTimeFormat('fr-FR').format(new Date(shutter.createdAt))}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{strings.flowMeasurements}</Text>

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
                  value={editingFlows.referenceFlow}
                  onChangeText={(text) => handleFlowChange('referenceFlow', text)}
                  onFocus={() => handleFlowFocus('referenceFlow')}
                  onBlur={() => handleFlowBlur('referenceFlow')}
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
                  value={editingFlows.measuredFlow}
                  onChangeText={(text) => handleFlowChange('measuredFlow', text)}
                  onFocus={() => handleFlowFocus('measuredFlow')}
                  onBlur={() => handleFlowBlur('measuredFlow')}
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
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{strings.compliance} NF S61-933 Annexe H</Text>
          
          <View style={styles.complianceContainer}>
            <ComplianceIndicator compliance={compliance} size="large" />
          </View>

          {compliance.status !== 'non-compliant' || currentRefFlow > 0 ? (
            <Text style={styles.complianceDescription}>
              {compliance.status === 'compliant' && "Un écart inférieur à 10% entre les valeurs retenues lors de cet essai fonctionnel et les valeurs de référence conduit au constat du fonctionnement attendu du système de désenfumage mécanique."}
              {compliance.status === 'acceptable' && "Un écart compris entre 10% et 20% entre les valeurs retenues lors de cet essai fonctionnel et les valeurs de référence conduit à signaler cette dérive, par une proposition d'action corrective à l'exploitant ou au chef d'établissement."}
              {compliance.status === 'non-compliant' && currentRefFlow > 0 && "Un écart supérieur à 20% entre les valeurs retenues lors de cet essai fonctionnel et les valeurs de référence retenues à la mise en service, doit conduire à une action corrective."}
            </Text>
          ) : (
            <Text style={styles.invalidReferenceMessage}>
              Veuillez rentrer les mesures de débits
            </Text>
          )}
        </View>

        {shutter.remarks && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{strings.remarks}</Text>
            <Text style={styles.remarksText}>{shutter.remarks}</Text>
          </View>
        )}

        <View style={styles.actionButtons}>
          <Button
            title={strings.delete}
            onPress={handleDelete}
            variant="danger"
            style={styles.actionButton}
          />
        </View>
      </ScrollView>
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
  contentContainer: {
    padding: 16,
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
  editButton: {
    padding: 8,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: theme.colors.text,
    textAlign: 'right',
  },
  // AMÉLIORÉ : Styles pour l'édition directe des débits avec meilleure visibilité en mode sombre
  flowEditingContainer: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  flowEditingRow: {
    flexDirection: 'row',
    gap: 8,
  },
  flowEditingField: {
    flex: 1,
  },
  flowLabelContainer: {
    height: 44,
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
    height: 40,
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
    height: 40,
  },
  deviationValue: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
  complianceContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  complianceDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
  },
  invalidReferenceMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.warning,
    lineHeight: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  remarksText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  actionButtons: {
    marginTop: 8,
  },
  actionButton: {
    width: '100%',
  },
});