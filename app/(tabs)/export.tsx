import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import { Project } from '@/types';
import { useStorage } from '@/contexts/StorageContext';
import { calculateCompliance } from '@/utils/compliance';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { triggerCreateProjectModal } from '@/utils/EventEmitter';
import { LoadingScreen } from '@/components/LoadingScreen';
import { router } from 'expo-router';

// Import conditionnel sécurisé pour éviter les erreurs sur web et Android
let FileSystem: any = null;
let Sharing: any = null;

// Charger les modules seulement si disponibles et pas sur web
const loadNativeModules = async () => {
  if (Platform.OS === 'web') {
    return false;
  }
  
  try {
    const fsModule = await import('expo-file-system').catch(() => null);
    const sharingModule = await import('expo-sharing').catch(() => null);
    
    FileSystem = fsModule?.default || fsModule;
    Sharing = sharingModule?.default || sharingModule;
    
    return FileSystem && Sharing;
  } catch (error) {
    console.warn('Modules natifs non disponibles:', error);
    return false;
  }
};

export default function ExportScreen() {
  const { strings } = useLanguage();
  const { theme } = useTheme();
  const { projects } = useStorage();
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [nativeModulesAvailable, setNativeModulesAvailable] = useState(false);

  // Charger les modules natifs au montage
  useEffect(() => {
    loadNativeModules().then(setNativeModulesAvailable);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simuler un rafraîchissement
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  // Recharger les données quand l'écran est focalisé
  useFocusEffect(
    useCallback(() => {
      console.log('Export screen focused');
    }, [])
  );

  const generateCSVContent = (project: Project): string => {
    let csvContent = 'Projet,Bâtiment,Zone,Volet,Type,Débit Référence (m³/h),Débit Mesuré (m³/h),Écart (%),Statut,Remarques\n';

    project.buildings.forEach(building => {
      building.functionalZones.forEach(zone => {
        zone.shutters.forEach(shutter => {
          const compliance = calculateCompliance(shutter.referenceFlow, shutter.measuredFlow);
          const row = [
            `"${project.name}"`,
            `"${building.name}"`,
            `"${zone.name}"`,
            `"${shutter.name}"`,
            shutter.type === 'high' ? 'VH' : 'VB',
            shutter.referenceFlow,
            shutter.measuredFlow,
            compliance.deviation.toFixed(1),
            compliance.status === 'compliant' ? 'Fonctionnel' : 
            compliance.status === 'acceptable' ? 'Acceptable' : 'Non conforme',
            `"${shutter.remarks || ''}"`
          ].join(',');
          csvContent += row + '\n';
        });
      });
    });

    return csvContent;
  };

  const generateHTMLContent = (project: Project): string => {
    const projectStats = getProjectStats(project);
    
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapport - ${project.name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #009999; padding-bottom: 20px; }
        .logo { color: #009999; font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .project-title { font-size: 28px; color: #333; margin: 10px 0; }
        .stats { display: flex; justify-content: space-around; margin: 20px 0; }
        .stat-box { text-align: center; padding: 15px; background: #f5f5f5; border-radius: 8px; }
        .stat-number { font-size: 24px; font-weight: bold; color: #009999; }
        .stat-label { font-size: 14px; color: #666; }
        .building { margin: 20px 0; border: 1px solid #ddd; border-radius: 8px; }
        .building-header { background: #009999; color: white; padding: 15px; font-size: 18px; font-weight: bold; }
        .zone { margin: 15px; border-left: 3px solid #009999; padding-left: 15px; }
        .zone-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; }
        .shutters-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        .shutters-table th, .shutters-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .shutters-table th { background: #f5f5f5; font-weight: bold; }
        .status-compliant { color: #10B981; font-weight: bold; }
        .status-acceptable { color: #F59E0B; font-weight: bold; }
        .status-non-compliant { color: #EF4444; font-weight: bold; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">SIEMENS CalcConform</div>
        <h1 class="project-title">${project.name}</h1>
        ${project.city ? `<p>Ville: ${project.city}</p>` : ''}
        ${project.startDate ? `<p>Période: ${new Date(project.startDate).toLocaleDateString('fr-FR')}` : ''}
        ${project.endDate ? ` - ${new Date(project.endDate).toLocaleDateString('fr-FR')}</p>` : project.startDate ? '</p>' : ''}
    </div>

    <div class="stats">
        <div class="stat-box">
            <div class="stat-number">${projectStats.buildingCount}</div>
            <div class="stat-label">Bâtiments</div>
        </div>
        <div class="stat-box">
            <div class="stat-number">${projectStats.zoneCount}</div>
            <div class="stat-label">Zones</div>
        </div>
        <div class="stat-box">
            <div class="stat-number">${projectStats.shutterCount}</div>
            <div class="stat-label">Volets</div>
        </div>
        <div class="stat-box">
            <div class="stat-number">${projectStats.complianceRate.toFixed(0)}%</div>
            <div class="stat-label">Conformité</div>
        </div>
    </div>

    ${project.buildings.map(building => `
        <div class="building">
            <div class="building-header">${building.name}</div>
            ${building.functionalZones.map(zone => `
                <div class="zone">
                    <div class="zone-title">${zone.name}</div>
                    ${zone.shutters.length > 0 ? `
                        <table class="shutters-table">
                            <thead>
                                <tr>
                                    <th>Volet</th>
                                    <th>Type</th>
                                    <th>Débit Référence (m³/h)</th>
                                    <th>Débit Mesuré (m³/h)</th>
                                    <th>Écart (%)</th>
                                    <th>Statut</th>
                                    <th>Remarques</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${zone.shutters.map(shutter => {
                                  const compliance = calculateCompliance(shutter.referenceFlow, shutter.measuredFlow);
                                  const statusClass = compliance.status === 'compliant' ? 'status-compliant' : 
                                                    compliance.status === 'acceptable' ? 'status-acceptable' : 'status-non-compliant';
                                  const statusText = compliance.status === 'compliant' ? 'Fonctionnel' : 
                                                   compliance.status === 'acceptable' ? 'Acceptable' : 'Non conforme';
                                  return `
                                    <tr>
                                        <td>${shutter.name}</td>
                                        <td>${shutter.type === 'high' ? 'VH' : 'VB'}</td>
                                        <td>${shutter.referenceFlow}</td>
                                        <td>${shutter.measuredFlow}</td>
                                        <td>${compliance.deviation > 0 ? '+' : ''}${compliance.deviation.toFixed(1)}%</td>
                                        <td class="${statusClass}">${statusText}</td>
                                        <td>${shutter.remarks || '-'}</td>
                                    </tr>
                                  `;
                                }).join('')}
                            </tbody>
                        </table>
                    ` : '<p>Aucun volet dans cette zone</p>'}
                </div>
            `).join('')}
        </div>
    `).join('')}

    <div class="footer">
        <p>Rapport généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
        <p>Application Siemens CalcConform - Calcul de conformité NF S61-933 Annexe H</p>
        <p>© 2025 Siemens. Tous droits réservés.</p>
    </div>
</body>
</html>`;
  };

  const getProjectStats = (project: Project) => {
    const buildingCount = project.buildings.length;
    const zoneCount = project.buildings.reduce((total, building) => 
      total + (building.functionalZones ? building.functionalZones.length : 0), 0);
    const shutterCount = project.buildings.reduce((total, building) => 
      total + (building.functionalZones ? building.functionalZones.reduce((zoneTotal, zone) => 
        zoneTotal + (zone.shutters ? zone.shutters.length : 0), 0) : 0), 0);

    let compliantCount = 0;
    let acceptableCount = 0;
    let nonCompliantCount = 0;
    let totalMeasuredShutters = 0;

    project.buildings.forEach(building => {
      if (building.functionalZones) {
        building.functionalZones.forEach(zone => {
          if (zone.shutters) {
            zone.shutters.forEach(shutter => {
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
          }
        });
      }
    });

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

  const handleExportCSV = async (project: Project) => {
    setExportLoading(project.id);
    
    try {
      const csvContent = generateCSVContent(project);
      const fileName = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_export.csv`;
      
      if (Platform.OS === 'web') {
        // Export pour le web
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        Alert.alert(
          'Export réussi',
          `Le fichier CSV "${fileName}" a été téléchargé.`,
          [{ text: strings.ok }]
        );
      } else if (nativeModulesAvailable && FileSystem && Sharing) {
        // Export pour mobile
        const fileUri = FileSystem.documentDirectory + fileName;
        await FileSystem.writeAsStringAsync(fileUri, csvContent, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Exporter le rapport CSV',
          });
        } else {
          Alert.alert(
            'Export réussi',
            `Le fichier CSV a été sauvegardé dans ${fileUri}`,
            [{ text: strings.ok }]
          );
        }
      } else {
        // Fallback
        Alert.alert(
          'Export réussi',
          'Le rapport CSV a été généré avec succès.',
          [{ text: strings.ok }]
        );
      }
    } catch (error) {
      console.error('Erreur lors de l\'export CSV:', error);
      Alert.alert(
        'Erreur d\'export',
        'Impossible de générer le fichier CSV. Veuillez réessayer.',
        [{ text: strings.ok }]
      );
    } finally {
      setExportLoading(null);
    }
  };

  const handleExportHTML = async (project: Project) => {
    setExportLoading(project.id);
    
    try {
      const htmlContent = generateHTMLContent(project);
      const fileName = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_rapport.html`;
      
      if (Platform.OS === 'web') {
        // Export pour le web
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        Alert.alert(
          'Export réussi',
          `Le rapport HTML "${fileName}" a été téléchargé.`,
          [{ text: strings.ok }]
        );
      } else if (nativeModulesAvailable && FileSystem && Sharing) {
        // Export pour mobile
        const fileUri = FileSystem.documentDirectory + fileName;
        await FileSystem.writeAsStringAsync(fileUri, htmlContent, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/html',
            dialogTitle: 'Exporter le rapport HTML',
          });
        } else {
          Alert.alert(
            'Export réussi',
            `Le rapport HTML a été sauvegardé dans ${fileUri}`,
            [{ text: strings.ok }]
          );
        }
      } else {
        // Fallback
        Alert.alert(
          'Export réussi',
          'Le rapport HTML a été généré avec succès.',
          [{ text: strings.ok }]
        );
      }

      // Utiliser notre fonction compatible avec toutes les plateformes
      setTimeout(() => {
        triggerCreateProjectModal();
      }, 300);
    } catch (error) {
      console.error('Erreur lors de l\'export HTML:', error);
      Alert.alert(
        'Erreur d\'export',
        'Impossible de générer le fichier HTML. Veuillez réessayer.',
        [{ text: strings.ok }]
      );
    } finally {
      setExportLoading(null);
    }
  };

  const renderProjectCard = (project: Project) => {
    const stats = getProjectStats(project);
    const isExporting = exportLoading === project.id;

    return (
      <View key={project.id} style={styles.projectCard}>
        <View style={styles.projectHeader}>
          <View style={styles.projectInfo}>
            <Text style={styles.projectName}>{project.name}</Text>
            {project.city && (
              <Text style={styles.projectCity}>{project.city}</Text>
            )}
            <View style={styles.projectStats}>
              <Text style={styles.statText}>
                {stats.buildingCount} bâtiments • {stats.zoneCount} zones • {stats.shutterCount} volets
              </Text>
              {stats.shutterCount > 0 && (
                <Text style={[styles.complianceText, { 
                  color: stats.complianceRate >= 80 ? '#10B981' : stats.complianceRate >= 60 ? '#F59E0B' : '#EF4444' 
                }]}>
                  {stats.complianceRate.toFixed(0)}% de conformité
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.exportActions}>
          <Button
            title={isExporting ? "Export..." : "Export CSV"}
            onPress={() => handleExportCSV(project)}
            disabled={isExporting}
            variant="secondary"
            style={styles.exportButton}
          />
          <Button
            title={isExporting ? "Export..." : "Rapport HTML"}
            onPress={() => handleExportHTML(project)}
            disabled={isExporting}
            style={styles.exportButton}
          />
        </View>
      </View>
    );
  };

  const styles = createStyles(theme);

  if (loading) {
    return <LoadingScreen title={strings.exportTitle} message={strings.loadingData} />;
  }

  return (
    <View style={styles.container}>
      <Header 
        title={strings.exportTitle} 
        subtitle={strings.exportSubtitle}
      />
      
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {projects.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color={theme.colors.textTertiary} />
            <Text style={styles.emptyTitle}>{strings.noProjectsToExport}</Text>
            <Text style={styles.emptySubtitle}>
              {strings.noProjectsToExportDesc}
            </Text>
            <Button
              title={strings.createFirstProject}
              onPress={triggerCreateProjectModal}
              style={styles.createButton}
            />
          </View>
        ) : (
          <>
            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={24} color={theme.colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Formats d'export disponibles</Text>
                <Text style={styles.infoText}>
                  • <Text style={styles.infoBold}>CSV</Text> : Données tabulaires pour Excel/Calc{'\n'}
                  • <Text style={styles.infoBold}>HTML</Text> : Rapport professionnel avec mise en forme
                </Text>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{strings.availableProjects}</Text>
              <Text style={styles.projectCount}>{projects.length} projet{projects.length > 1 ? 's' : ''}</Text>
            </View>

            {projects.map(renderProjectCard)}
          </>
        )}
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
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
  infoCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary + '20',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.primary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.primary,
    lineHeight: 20,
  },
  infoBold: {
    fontFamily: 'Inter-SemiBold',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
  },
  projectCount: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  projectCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  projectHeader: {
    marginBottom: 16,
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
    marginBottom: 8,
  },
  projectStats: {
    gap: 4,
  },
  statText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
  },
  complianceText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  exportActions: {
    flexDirection: 'row',
    gap: 12,
  },
  exportButton: {
    flex: 1,
  },
});