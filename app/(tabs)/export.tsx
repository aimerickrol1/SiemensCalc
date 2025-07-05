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
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';

export default function ExportScreen() {
  const { strings } = useLanguage();
  const { theme } = useTheme();
  const { projects } = useStorage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      setError(null);
      console.log('Chargement des projets...');
      console.log('Projets chargés:', projects.length);
    } catch (error) {
      console.error('Erreur lors du chargement des projets:', error);
      setError('Erreur lors du chargement des projets');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projects]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useFocusEffect(
    useCallback(() => {
      console.log('Export screen focused, reloading projects...');
      loadProjects();
    }, [loadProjects])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProjects();
  }, [loadProjects]);

  const handleCreateFirstProject = () => {
    try {
      router.push('/(tabs)/');
      
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('openCreateProjectModal'));
        }
      }, 300);
    } catch (error) {
      console.error('Erreur de navigation:', error);
      router.push('/(tabs)/');
    }
  };

  const generateProjectReport = (project: Project) => {
    const totalShutters = project.buildings.reduce((total, building) => 
      total + building.functionalZones.reduce((zoneTotal, zone) => zoneTotal + zone.shutters.length, 0), 0
    );
    
    let compliantCount = 0;
    let acceptableCount = 0;
    let nonCompliantCount = 0;
    let totalMeasuredShutters = 0;

    project.buildings.forEach(building => {
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
    });

    // CORRIGÉ : Le taux de conformité inclut maintenant les volets fonctionnels ET acceptables
    const complianceRate = totalMeasuredShutters > 0 ? 
      ((compliantCount + acceptableCount) / totalMeasuredShutters) * 100 : 0;

    return { 
      totalShutters,
      compliantCount,
      acceptableCount,
      nonCompliantCount,
      complianceRate,
      totalMeasuredShutters
    };
  };

  const generateProfessionalHTML = (project: Project) => {
    const report = generateProjectReport(project);
    const timestamp = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    let htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapport de Conformité - ${project.name}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #fff;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px;
        }
        
        .pdf-instructions {
            background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
            border: 2px solid #2196f3;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 30px;
            box-shadow: 0 4px 12px rgba(33, 150, 243, 0.2);
        }
        
        .pdf-instructions h3 {
            color: #1976d2;
            font-size: 18px;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .pdf-instructions-content {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 15px;
        }
        
        .pdf-device {
            background: white;
            border-radius: 8px;
            padding: 15px;
            border-left: 4px solid #2196f3;
        }
        
        .pdf-device h4 {
            color: #1976d2;
            font-size: 16px;
            margin-bottom: 10px;
        }
        
        .pdf-steps {
            list-style: none;
            padding: 0;
        }
        
        .pdf-steps li {
            margin-bottom: 8px;
            padding-left: 20px;
            position: relative;
            font-size: 14px;
            line-height: 1.4;
        }
        
        .pdf-steps li:before {
            content: "→";
            position: absolute;
            left: 0;
            color: #2196f3;
            font-weight: bold;
        }
        
        .pdf-note {
            background: #fff3e0;
            border-left: 4px solid #ff9800;
            padding: 12px;
            margin-top: 15px;
            border-radius: 0 8px 8px 0;
        }
        
        .pdf-note p {
            margin: 0;
            font-size: 13px;
            color: #e65100;
            font-weight: 500;
        }
        
        @media print {
            .pdf-instructions {
                display: none !important;
            }
        }
        
        .header {
            border-bottom: 4px solid #009999;
            padding-bottom: 30px;
            margin-bottom: 40px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .logo-section {
            display: flex;
            align-items: center;
            gap: 20px;
        }
        
        .siemens-logo {
            font-size: 32px;
            font-weight: bold;
            color: #009999;
            letter-spacing: 2px;
        }
        
        .report-info {
            text-align: right;
            color: #666;
        }
        
        .report-title {
            font-size: 28px;
            font-weight: bold;
            color: #009999;
            margin-bottom: 10px;
        }
        
        .report-subtitle {
            font-size: 16px;
            color: #666;
            margin-bottom: 30px;
        }
        
        .project-section {
            background: linear-gradient(135deg, #f8fffe 0%, #e6fffa 100%);
            border-left: 6px solid #009999;
            padding: 30px;
            margin-bottom: 40px;
            border-radius: 0 8px 8px 0;
        }
        
        .project-title {
            font-size: 24px;
            font-weight: bold;
            color: #009999;
            margin-bottom: 15px;
        }
        
        .project-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        
        .detail-item {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .detail-label {
            font-weight: 600;
            color: #555;
        }
        
        .detail-value {
            color: #009999;
            font-weight: 500;
        }
        
        .executive-summary {
            background: #fff;
            border: 2px solid #e0e0e0;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 40px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .summary-title {
            font-size: 22px;
            font-weight: bold;
            color: #333;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            border: 1px solid #dee2e6;
        }
        
        .stat-value {
            font-size: 32px;
            font-weight: bold;
            color: #009999;
            margin-bottom: 5px;
        }
        
        .stat-label {
            font-size: 14px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .compliance-bar-container {
            margin: 30px 0;
        }
        
        .compliance-bar {
            height: 20px;
            border-radius: 10px;
            overflow: hidden;
            display: flex;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .compliance-segment {
            height: 100%;
            transition: all 0.3s ease;
        }
        
        .compliance-legend {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin-top: 15px;
        }
        
        .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .legend-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
        }
        
        .legend-text {
            font-size: 14px;
            color: #555;
        }
        
        .detailed-table {
            margin-top: 40px;
            overflow-x: auto;
        }
        
        .table-title {
            font-size: 20px;
            font-weight: bold;
            color: #333;
            margin-bottom: 20px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            background: #fff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            font-size: 13px;
        }
        
        th {
            background: linear-gradient(135deg, #009999 0%, #007a7a 100%);
            color: white;
            padding: 12px 8px;
            text-align: left;
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        td {
            padding: 10px 8px;
            border-bottom: 1px solid #e0e0e0;
            font-size: 12px;
            word-wrap: break-word;
        }
        
        tr:nth-child(even) {
            background: #f8f9fa;
        }
        
        tr:hover {
            background: #e8f4f8;
        }
        
        .status-badge {
            padding: 3px 8px;
            border-radius: 15px;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            white-space: nowrap;
        }
        
        .status-compliant {
            background: #d4edda;
            color: #155724;
        }
        
        .status-acceptable {
            background: #fff3cd;
            color: #856404;
        }
        
        .status-non-compliant {
            background: #f8d7da;
            color: #721c24;
        }
        
        .col-building { width: 15%; min-width: 100px; }
        .col-zone { width: 15%; min-width: 80px; }
        .col-building { width: 12%; min-width: 80px; }
        .col-zone { width: 15%; min-width: 80px; }
        .col-shutter { width: 10%; min-width: 60px; }
        .col-ref-flow { width: 11%; min-width: 65px; text-align: center; }
        .col-measured-flow { width: 11%; min-width: 65px; text-align: center; }
        .col-deviation { width: 9%; min-width: 55px; text-align: center; }
        .col-status { width: 11%; min-width: 75px; text-align: center; }
        .col-remarks { width: 26%; min-width: 130px; }
        
        .footer {
            margin-top: 60px;
            padding-top: 30px;
            border-top: 2px solid #e0e0e0;
            text-align: center;
            color: #666;
        }
        
        .footer-note {
            font-size: 12px;
            margin-bottom: 10px;
        }
        
        .footer-signature {
            font-weight: 600;
            color: #009999;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 15px;
            }
            
            .header {
                flex-direction: column;
                text-align: center;
                gap: 15px;
            }
            
            .stats-grid {
                grid-template-columns: 1fr 1fr;
                gap: 10px;
            }
            
            .compliance-legend {
                flex-direction: column;
                gap: 8px;
            }
            
            .pdf-instructions-content {
                grid-template-columns: 1fr;
            }
            
            table {
                font-size: 11px;
            }
            
            th, td {
                padding: 8px 4px;
            }
            
            .status-badge {
                font-size: 9px;
                padding: 2px 6px;
            }
        }
        
        @media print {
            @page {
                size: A4;
                margin: 1cm;
            }
            
            .container {
                padding: 20px;
            }
            
            .executive-summary,
            table {
                box-shadow: none;
                border: 1px solid #ccc;
            }
            
            table {
                font-size: 11px;
            }
            
            th, td {
                padding: 6px 4px;
            }
            
            .pdf-instructions {
                display: none !important;
            }
            
            body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="pdf-instructions">
            <h3>📄 Pour exporter ce rapport en PDF</h3>
            <div id="pdf-download-container" style="text-align: center; margin-bottom: 15px;">
                <button id="download-pdf-button" style="background-color: #009999; color: white; border: none; border-radius: 8px; padding: 10px 20px; font-size: 16px; font-weight: 600; cursor: pointer; display: flex; align-items: center; margin: 0 auto; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Télécharger en PDF
                </button>
            </div>
            <div class="pdf-instructions-content">
                <div class="pdf-device">
                    <h4>📱 Sur téléphone/tablette</h4>
                    <ul class="pdf-steps">
                        <li>Appuyez sur le menu de votre navigateur (⋮ ou ⋯)</li>
                        <li>Sélectionnez "Imprimer" ou "Partager"</li>
                        <li>Choisissez "Enregistrer au format PDF"</li>
                        <li>Ajustez les marges si nécessaire</li>
                        <li>Appuyez sur "Télécharger" ou "Enregistrer"</li>
                    </ul>
                </div>
                <div class="pdf-device">
                    <h4>💻 Sur ordinateur</h4>
                    <ul class="pdf-steps">
                        <li>Appuyez sur Ctrl+P (Windows) ou Cmd+P (Mac)</li>
                        <li>Dans "Destination", choisissez "Enregistrer au format PDF"</li>
                        <li>Sélectionnez "Plus de paramètres" si nécessaire</li>
                        <li>Vérifiez l'aperçu et ajustez la mise en page</li>
                        <li>Cliquez sur "Enregistrer" pour télécharger le PDF</li>
                    </ul>
                </div>
            </div>
            <div class="pdf-note">
                <p>💡 Astuce : Les instructions ci-dessus ne seront pas incluses dans le PDF final. Le rapport sera automatiquement formaté pour l'impression professionnelle.</p>
            </div>
            
            <script>
                document.getElementById('download-pdf-button').addEventListener('click', function() {
                    // Cacher temporairement les instructions PDF
                    const pdfInstructions = document.querySelector('.pdf-instructions');
                    pdfInstructions.style.display = 'none';
                    
                    // Déclencher l'impression
                    window.print();
                    
                    // Réafficher les instructions après un court délai
                    setTimeout(function() {
                        pdfInstructions.style.display = 'block';
                    }, 1000);
                });
            </script>
        </div>

        <div class="header">
            <div class="logo-section">
                <div class="siemens-logo">SIEMENS</div>
                <div>
                    <div class="report-title">RAPPORT DE CONFORMITÉ</div>
                    <div class="report-subtitle">Système de Désenfumage - NF S61-933 Annexe H</div>
                </div>
            </div>
            <div class="report-info">
                <div><strong>Date :</strong> ${timestamp}</div>
                <div><strong>Version :</strong> 1.1.0</div>
                <div><strong>Référence :</strong> ${project.id.substring(0, 8).toUpperCase()}</div>
            </div>
        </div>

        <div class="project-section">
            <div class="project-title">${project.name}</div>
            <div class="project-details">
                <div class="detail-item">
                    <span class="detail-label">Localisation :</span>
                    <span class="detail-value">${project.city || 'Non spécifiée'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Nombre de bâtiments :</span>
                    <span class="detail-value">${project.buildings.length}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Zones de désenfumage :</span>
                    <span class="detail-value">${project.buildings.reduce((total, building) => total + building.functionalZones.length, 0)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Total volets :</span>
                    <span class="detail-value">${report.totalShutters}</span>
                </div>
                ${project.startDate ? `
                <div class="detail-item">
                    <span class="detail-label">Date début :</span>
                    <span class="detail-value">${new Date(project.startDate).toLocaleDateString('fr-FR')}</span>
                </div>
                ` : ''}
                ${project.endDate ? `
                <div class="detail-item">
                    <span class="detail-label">Date fin :</span>
                    <span class="detail-value">${new Date(project.endDate).toLocaleDateString('fr-FR')}</span>
                </div>
                ` : ''}
            </div>
        </div>

        <div class="executive-summary">
            <div class="summary-title">📊 RÉSUMÉ EXÉCUTIF</div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${report.totalShutters}</div>
                    <div class="stat-label">Volets Testés</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${report.complianceRate.toFixed(1)}%</div>
                    <div class="stat-label">Taux de Conformité</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${report.compliantCount}</div>
                    <div class="stat-label">Fonctionnels</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${report.acceptableCount}</div>
                    <div class="stat-label">Acceptables</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${report.nonCompliantCount}</div>
                    <div class="stat-label">Non Conformes</div>
                </div>
            </div>

            <div class="compliance-bar-container">
                <div class="compliance-bar">
                    <div class="compliance-segment" style="flex: ${report.compliantCount}; background: #10B981;"></div>
                    <div class="compliance-segment" style="flex: ${report.acceptableCount}; background: #F59E0B;"></div>
                    <div class="compliance-segment" style="flex: ${report.nonCompliantCount}; background: #EF4444;"></div>
                </div>
                <div class="compliance-legend">
                    <div class="legend-item">
                        <div class="legend-dot" style="background: #10B981;"></div>
                        <span class="legend-text">Fonctionnel (${report.compliantCount})</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-dot" style="background: #F59E0B;"></div>
                        <span class="legend-text">Acceptable (${report.acceptableCount})</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-dot" style="background: #EF4444;"></div>
                        <span class="legend-text">Non Conforme (${report.nonCompliantCount})</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="detailed-table">
            <div class="table-title">📋 DÉTAIL DES MESURES</div>
            <table>
                <thead>
                    <tr>
                        <th class="col-building">Bâtiment</th>
                        <th class="col-zone">Zone</th>
                        <th class="col-shutter">Volet</th>
                        <th class="col-ref-flow">Débit Réf. (m³/h)</th>
                        <th class="col-measured-flow">Débit Mesuré (m³/h)</th>
                        <th class="col-deviation">Écart (%)</th>
                        <th class="col-status">Statut</th>
                        <th class="col-remarks">Remarques</th>
                    </tr>
                </thead>
                <tbody>`;

    project.buildings.forEach(building => {
      building.functionalZones.forEach(zone => {
        zone.shutters.forEach(shutter => {
          const compliance = calculateCompliance(shutter.referenceFlow, shutter.measuredFlow);
          const deviation = ((shutter.measuredFlow - shutter.referenceFlow) / shutter.referenceFlow) * 100;
          
          let statusClass = '';
          switch (compliance.status) {
            case 'compliant':
              statusClass = 'status-compliant';
              break;
            case 'acceptable':
              statusClass = 'status-acceptable';
              break;
            case 'non-compliant':
              statusClass = 'status-non-compliant';
              break;
          }
          
          htmlContent += `
                    <tr>
                        <td class="col-building">${building.name}</td>
                        <td class="col-zone">${zone.name}</td>
                        <td class="col-shutter"><strong>${shutter.name}</strong></td>
                        <td class="col-ref-flow">${shutter.referenceFlow.toFixed(0)}</td>
                        <td class="col-measured-flow">${shutter.measuredFlow.toFixed(0)}</td>
                        <td class="col-deviation">${deviation >= 0 ? '+' : ''}${deviation.toFixed(1)}%</td>
                        <td class="col-status"><span class="status-badge ${statusClass}">${compliance.label}</span></td>
                        <td class="col-remarks">${shutter.remarks || '-'}</td>
                    </tr>`;
        });
      });
    });

    htmlContent += `
                </tbody>
            </table>
        </div>

        <div class="footer">
            <div class="footer-note">
                Ce rapport a été généré automatiquement par l'application Siemens CalcConform v1.1.0<br>
                Conformité évaluée selon la norme NF S61-933 Annexe H
            </div>
            <div class="footer-signature">
                © ${new Date().getFullYear()} Siemens - Tous droits réservés
            </div>
        </div>
    </div>
</body>
</html>`;

    return htmlContent;
  };

  const handleExportHTML = async (project: Project) => {
    setExportLoading(project.id);
    
    try {
      const htmlContent = generateProfessionalHTML(project);
      const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const fileName = `Rapport_Siemens_${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.html`;
      
      if (Platform.OS === 'web') {
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        Alert.alert(
          '✅ Rapport Téléchargé',
          `Le rapport HTML professionnel "${fileName}" a été téléchargé avec succès.\n\n📄 Le rapport contient des instructions détaillées pour l'exporter en PDF depuis votre navigateur.`,
          [{ text: 'Parfait !' }]
        );
      } else {
          const fileUri = FileSystem.documentDirectory + fileName;
          await FileSystem.writeAsStringAsync(fileUri, htmlContent, {
              encoding: FileSystem.EncodingType.UTF8,
          });

          if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(fileUri);
          } else {
              Alert.alert(
                  '✅ Rapport généré',
                  `Fichier enregistré :\n${fileUri}`,
                  [{ text: 'OK' }]
              );
          }
      }
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

  const renderProject = (project: Project) => {
    const report = generateProjectReport(project);
    const buildingCount = project.buildings.length;
    const zoneCount = project.buildings.reduce((total, building) => total + building.functionalZones.length, 0);
    const isExportingHTML = exportLoading === project.id;

    return (
      <View key={project.id} style={styles.projectCard}>
        <View style={styles.projectHeader}>
          <Text style={styles.projectName}>{project.name}</Text>
          <Text style={styles.projectSite}>{project.city}</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{buildingCount}</Text>
            <Text style={styles.statLabel}>{strings.buildings}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{zoneCount}</Text>
            <Text style={styles.statLabel}>{strings.zones}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{report.totalShutters}</Text>
            <Text style={styles.statLabel}>{strings.shutters}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{report.complianceRate.toFixed(0)}%</Text>
            <Text style={styles.statLabel}>{strings.compliance}</Text>
          </View>
        </View>

        <View style={styles.complianceBreakdown}>
          <View style={styles.complianceItem}>
            <View style={[styles.complianceDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.complianceText}>{report.compliantCount} {strings.compliant}</Text>
          </View>
          <View style={styles.complianceItem}>
            <View style={[styles.complianceDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.complianceText}>{report.acceptableCount} {strings.acceptable}</Text>
          </View>
          <View style={styles.complianceItem}>
            <View style={[styles.complianceDot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.complianceText}>{report.nonCompliantCount} {strings.nonCompliant}</Text>
          </View>
        </View>

        <View style={styles.exportButtons}>
          <Button
            title={isExportingHTML ? 'Génération...' : 'Exporter le rapport'}
            onPress={() => handleExportHTML(project)}
            variant="primary"
            size="small"
            style={styles.exportButton}
            disabled={isExportingHTML}
          />
        </View>
      </View>
    );
  };

  const styles = createStyles(theme);

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title={strings.exportTitle} subtitle={strings.exportSubtitle} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{strings.loading}</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Header title={strings.exportTitle} subtitle={strings.exportSubtitle} />
        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.errorContainer}>
            <Ionicons name="document-text-outline" size={48} color={theme.colors.error} />
            <Text style={styles.errorTitle}>Erreur de chargement</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Button
              title="Réessayer"
              onPress={onRefresh}
              style={styles.retryButton}
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title={strings.exportTitle} subtitle={strings.exportSubtitle} />
      
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
            <Ionicons name="document-text-outline" size={48} color={theme.colors.textTertiary} />
            <Text style={styles.emptyTitle}>{strings.noProjectsToExport}</Text>
            <Text style={styles.emptySubtitle}>
              {strings.noProjectsToExportDesc}
            </Text>
            <Button
              title="Créer votre premier projet"
              onPress={handleCreateFirstProject}
              style={styles.refreshButton}
            />
          </View>
        ) : (
          <>
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>🏢 Rapport Professionnel Siemens</Text>
              <View style={styles.formatList}>
                <View style={styles.formatItem}>
                  <Ionicons name="document-text-outline" size={16} color={theme.colors.primary} />
                  <Text style={styles.formatText}>
                    <Text style={styles.formatName}>Rapport HTML :</Text> Document professionnel avec graphiques et mise en page élégante
                  </Text>
                </View>
                <View style={styles.formatItem}>
                  <Ionicons name="print-outline" size={16} color={theme.colors.warning} />
                  <Text style={styles.formatText}>
                    <Text style={styles.formatName}>Conversion PDF :</Text> Instructions détaillées incluses dans le rapport pour l'exporter en PDF depuis votre navigateur
                  </Text>
                </View>
                <View style={styles.formatItem}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={theme.colors.success} />
                  <Text style={styles.formatText}>
                    <Text style={styles.formatName}>Qualité :</Text> Mise en page optimisée pour l'impression et la présentation professionnelle
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.sectionTitle}>{strings.availableProjects}</Text>
            <Text style={styles.sectionSubtitle}>
              Générez des rapports professionnels
            </Text>
            {projects.map(renderProject)}
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
    paddingVertical: 64,
  },
  errorTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.error,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 32,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
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
    lineHeight: 24,
    marginBottom: 24,
  },
  refreshButton: {
    paddingHorizontal: 32,
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
    marginBottom: 12,
  },
  formatList: {
    gap: 12,
  },
  formatItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 4,
  },
  formatText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  formatName: {
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
    marginBottom: 24,
    lineHeight: 24,
  },
  projectCard: {
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
  projectHeader: {
    marginBottom: 16,
  },
  projectName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  projectSite: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.primary,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  complianceBreakdown: {
    marginBottom: 16,
  },
  complianceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  complianceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  complianceText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
  },
  exportButtons: {
    flexDirection: 'row',
  },
  exportButton: {
    flex: 1,
  },
});