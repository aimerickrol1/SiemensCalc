import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, Linking, Platform } from 'react-native';
import { Info, ChevronRight, Shield, Smartphone, CircleCheck as CheckCircle, FileText, Calculator, Sparkles, X } from 'lucide-react-native';
import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import * as WebBrowser from 'expo-web-browser';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function AboutScreen() {
  const { strings } = useLanguage();
  const { theme } = useTheme();
  const [versionModalVisible, setVersionModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [calculationsModalVisible, setCalculationsModalVisible] = useState(false);
  const [upcomingFeaturesModalVisible, setUpcomingFeaturesModalVisible] = useState(false);

  const appVersion = "1.1.0";

  const handleVersionPress = () => {
    setVersionModalVisible(true);
  };

  const handlePrivacyPress = () => {
    setPrivacyModalVisible(true);
  };

  const handleCalculationsPress = () => {
    setCalculationsModalVisible(true);
  };

  const handleUpcomingFeaturesPress = () => {
    setUpcomingFeaturesModalVisible(true);
  };

  const handleContactPress = () => {
    Alert.alert(
      strings.contact,
      strings.contactDeveloperMessage,
      [{ text: strings.ok }]
    );
  };

  const handleOpenPDF = async () => {
    try {
      const pdfUrl = 'https://www.anitec.fr/wp-content/uploads/2017/04/VN_INCENDIE_NFS_61-933.pdf';
      
      if (Platform.OS === 'web') {
        window.open(pdfUrl, '_blank');
      } else {
        const result = await WebBrowser.openBrowserAsync(pdfUrl);
        
        if (result.type === 'cancel' || result.type === 'dismiss')  {
          console.log('Navigateur fermé');
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'ouverture du PDF:', error);
      Alert.alert(
        strings.error,
        strings.pdfOpenError,
        [{ text: strings.ok }]
      );
    }
  };

  const renderInfoItem = (icon: React.ReactNode, title: string, subtitle?: string, onPress?: () => void) => (
    <TouchableOpacity 
      style={styles.infoItem} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.infoItemLeft}>
        <View style={styles.iconContainer}>
          {icon}
        </View>
        <View style={styles.infoTextContainer}>
          <Text style={styles.infoTitle}>{title}</Text>
          {subtitle && <Text style={styles.infoSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {onPress && (
        <ChevronRight size={20} color={theme.colors.textTertiary} />
      )}
    </TouchableOpacity>
  );

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <Header title={strings.aboutTitle} subtitle={strings.aboutSubtitle} />
      
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* En-tête de l'application */}
        <View style={styles.appHeader}>
          <View style={styles.appIconContainer}>
            <Info size={48} color={theme.colors.primary} />
          </View>
          <Text style={styles.appTitle}>
            {strings.appDescription}
          </Text>
          <Text style={styles.developer}>{strings.developedBy}</Text>
          <Text style={styles.copyright}>{strings.copyright}</Text>
        </View>

        {/* Informations de l'application */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{strings.application}</Text>
          
          {renderInfoItem(
            <Smartphone size={20} color={theme.colors.primary} />,
            strings.version,
            `${strings.version} ${appVersion}`,
            handleVersionPress
          )}

          {renderInfoItem(
            <Shield size={20} color={theme.colors.primary} />,
            strings.privacy,
            strings.dataProtection,
            handlePrivacyPress
          )}
        </View>

        {/* Informations techniques */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{strings.compliance}</Text>
          
          {renderInfoItem(
            <FileText size={20} color={theme.colors.primary} />,
            'NF S61-933 Annexe H',
            strings.consultDocument,
            handleOpenPDF
          )}

          {renderInfoItem(
            <Calculator size={20} color={theme.colors.success} />,
            strings.complianceCalculations,
            'Formules et algorithmes utilisés',
            handleCalculationsPress
          )}
        </View>

        {/* Section Prochaines nouveautés */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚀 Développement</Text>
          
          {renderInfoItem(
            <Sparkles size={20} color="#F59E0B" />,
            'Prochaines nouveautés',
            'Découvrez les fonctionnalités à venir',
            handleUpcomingFeaturesPress
          )}
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Button
            title={strings.contactDeveloper}
            onPress={handleContactPress}
            variant="secondary"
          />
        </View>
      </ScrollView>

      {/* Modal Version */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={versionModalVisible}
        onRequestClose={() => setVersionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <CheckCircle size={32} color={theme.colors.success} />
              <Text style={styles.modalTitle}>{strings.appUpToDate}</Text>
            </View>
            <Text style={styles.modalText}>
              {strings.appUpToDate}.{'\n'}
              {strings.currentVersion} : {appVersion}
            </Text>
            <Button
              title={strings.ok}
              onPress={() => setVersionModalVisible(false)}
              style={styles.modalButton}
            />
          </View>
        </View>
      </Modal>

      {/* Modal Confidentialité */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={privacyModalVisible}
        onRequestClose={() => setPrivacyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Shield size={32} color={theme.colors.primary} />
              <Text style={styles.modalTitle}>{strings.privacyTitle}</Text>
            </View>
            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalText}>
                <Text style={styles.modalBold}>{strings.unofficialApp}{'\n'}</Text>
                {strings.unofficialAppDesc}
                {'\n\n'}
                <Text style={styles.modalBold}>{strings.dataProtectionTitle}{'\n'}</Text>
                {strings.dataProtectionDesc}
                {'\n\n'}
                <Text style={styles.modalBold}>{strings.localStorageTitle}{'\n'}</Text>
                {strings.localStorageDesc}
              </Text>
            </ScrollView>
            <Button
              title={strings.understood}
              onPress={() => setPrivacyModalVisible(false)}
              style={styles.modalButton}
            />
          </View>
        </View>
      </Modal>

      {/* Modal Calculs de conformité - SANS BARRE DE SCROLL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={calculationsModalVisible}
        onRequestClose={() => setCalculationsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.calculationsModalContent}>
            <View style={styles.modalHeader}>
              <Calculator size={32} color={theme.colors.success} />
              <Text style={styles.modalTitle}>Calculs de conformité</Text>
              <TouchableOpacity 
                onPress={() => setCalculationsModalVisible(false)}
                style={styles.closeButton}
              >
                <X size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.calculationsScrollView} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.calculationsScrollContent}
            >
              {/* Formule principale */}
              <View style={styles.calculationSection}>
                <Text style={styles.calculationTitle}>📐 Formule de calcul de l'écart</Text>
                <View style={styles.formulaContainer}>
                  <Text style={styles.formulaText}>
                    Écart (%) = ((Débit mesuré - Débit de référence) / Débit de référence) × 100
                  </Text>
                </View>
                <Text style={styles.calculationDescription}>
                  Cette formule calcule l'écart relatif entre la valeur mesurée et la valeur de référence, exprimé en pourcentage.
                </Text>
              </View>

              {/* Critères de conformité */}
              <View style={styles.calculationSection}>
                <Text style={styles.calculationTitle}>⚖️ Critères de conformité NF S61-933 Annexe H</Text>
                
                <View style={styles.criteriaContainer}>
                  <View style={styles.criteriaItem}>
                    <View style={[styles.criteriaIndicator, { backgroundColor: '#10B981' }]} />
                    <View style={styles.criteriaContent}>
                      <Text style={styles.criteriaLabel}>Fonctionnel (|Écart| ≤ 10%)</Text>
                      <Text style={styles.criteriaDescription}>
                        Un écart inférieur à ±10% entre les valeurs retenues lors de l'essai fonctionnel et les valeurs de référence conduit au constat du fonctionnement attendu du système de désenfumage mécanique.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.criteriaItem}>
                    <View style={[styles.criteriaIndicator, { backgroundColor: '#F59E0B' }]} />
                    <View style={styles.criteriaContent}>
                      <Text style={styles.criteriaLabel}>Acceptable (10% {'<'} |Écart| ≤ 20%)</Text>
                      <Text style={styles.criteriaDescription}>
                        Un écart compris entre ±10% et ±20% conduit à signaler cette dérive, par une proposition d'action corrective à l'exploitant ou au chef d'établissement.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.criteriaItem}>
                    <View style={[styles.criteriaIndicator, { backgroundColor: '#EF4444' }]} />
                    <View style={styles.criteriaContent}>
                      <Text style={styles.criteriaLabel}>Non conforme (|Écart| {'>'} 20%)</Text>
                      <Text style={styles.criteriaDescription}>
                        Un écart supérieur à ±20% doit conduire à une action corrective obligatoire, la valeur étant jugée non conforme à la mise en service.
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Exemples de calcul */}
              <View style={styles.calculationSection}>
                <Text style={styles.calculationTitle}>🧮 Exemples de calcul</Text>
                
                <View style={styles.exampleContainer}>
                  <Text style={styles.exampleTitle}>Exemple 1 : Volet fonctionnel</Text>
                  <Text style={styles.exampleData}>
                    • Débit de référence : 5000 m³/h{'\n'}
                    • Débit mesuré : 4900 m³/h
                  </Text>
                  <Text style={styles.exampleCalculation}>
                    Écart = ((4900 - 5000) / 5000) × 100 = -2%
                  </Text>
                  <Text style={styles.exampleResult}>
                    ✅ Résultat : <Text style={{ color: '#10B981', fontWeight: 'bold' }}>Fonctionnel</Text> (|2%| ≤ 10%)
                  </Text>
                </View>

                <View style={styles.exampleContainer}>
                  <Text style={styles.exampleTitle}>Exemple 2 : Volet acceptable</Text>
                  <Text style={styles.exampleData}>
                    • Débit de référence : 3000 m³/h{'\n'}
                    • Débit mesuré : 3450 m³/h
                  </Text>
                  <Text style={styles.exampleCalculation}>
                    Écart = ((3450 - 3000) / 3000) × 100 = +15%
                  </Text>
                  <Text style={styles.exampleResult}>
                    ⚠️ Résultat : <Text style={{ color: '#F59E0B', fontWeight: 'bold' }}>Acceptable</Text> (10% {'<'} |15%| ≤ 20%)
                  </Text>
                </View>

                <View style={styles.exampleContainer}>
                  <Text style={styles.exampleTitle}>Exemple 3 : Volet non conforme</Text>
                  <Text style={styles.exampleData}>
                    • Débit de référence : 4000 m³/h{'\n'}
                    • Débit mesuré : 3000 m³/h
                  </Text>
                  <Text style={styles.exampleCalculation}>
                    Écart = ((3000 - 4000) / 4000) × 100 = -25%
                  </Text>
                  <Text style={styles.exampleResult}>
                    ❌ Résultat : <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>Non conforme</Text> (|25%| {'>'} 20%)
                  </Text>
                </View>
              </View>

              {/* Algorithme de validation */}
              <View style={styles.calculationSection}>
                <Text style={styles.calculationTitle}>🔧 Algorithme de validation</Text>
                <View style={styles.algorithmContainer}>
                  <Text style={styles.algorithmStep}>1. Vérification des données d'entrée</Text>
                  <Text style={styles.algorithmDetail}>   • Débit de référence > 0</Text>
                  <Text style={styles.algorithmDetail}>   • Débit mesuré ≥ 0</Text>
                  
                  <Text style={styles.algorithmStep}>2. Calcul de l'écart relatif</Text>
                  <Text style={styles.algorithmDetail}>   • Écart = ((Mesuré - Référence) / Référence) × 100</Text>
                  
                  <Text style={styles.algorithmStep}>3. Détermination du statut</Text>
                  <Text style={styles.algorithmDetail}>   • Si |Écart| ≤ 10% → Fonctionnel</Text>
                  <Text style={styles.algorithmDetail}>   • Si 10% {'<'} |Écart| ≤ 20% → Acceptable</Text>
                  <Text style={styles.algorithmDetail}>   • Si |Écart| {'>'} 20% → Non conforme</Text>
                </View>
              </View>

              {/* Note technique */}
              <View style={styles.technicalNote}>
                <Text style={styles.technicalNoteTitle}>📋 Note technique</Text>
                <Text style={styles.technicalNoteText}>
                  Les calculs sont effectués en temps réel lors de la saisie des données. L'application utilise la précision JavaScript standard (IEEE 754) et arrondit les résultats à une décimale pour l'affichage.
                  {'\n\n'}
                  La conformité est évaluée selon les critères officiels de la norme française NF S61-933 Annexe H, version en vigueur.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title={strings.understood}
                onPress={() => setCalculationsModalVisible(false)}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Prochaines nouveautés - SANS BARRE DE SCROLL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={upcomingFeaturesModalVisible}
        onRequestClose={() => setUpcomingFeaturesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.upcomingFeaturesModalContent}>
            <View style={styles.modalHeader}>
              <Sparkles size={32} color="#F59E0B" />
              <Text style={styles.modalTitle}>Prochaines nouveautés</Text>
              <TouchableOpacity 
                onPress={() => setUpcomingFeaturesModalVisible(false)}
                style={styles.closeButton}
              >
                <X size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.upcomingScrollView} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.upcomingScrollContent}
            >
              {/* Introduction */}
              <View style={styles.upcomingIntro}>
                <Text style={styles.upcomingIntroText}>
                  Découvrez les futures fonctionnalités qui arriveront dans l'application Siemens CalcConform.
                </Text>
              </View>

              {/* Fonctionnalités principales */}
              <View style={styles.featureSection}>
                <Text style={styles.featureSectionTitle}>🎯 Fonctionnalités principales</Text>
                
                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>📊</Text>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Tableaux de bord avancés</Text>
                    <Text style={styles.featureDescription}>
                      Visualisations graphiques interactives avec statistiques en temps réel, graphiques de tendances et indicateurs de performance.
                    </Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>📱</Text>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Interface optimisée</Text>
                    <Text style={styles.featureDescription}>
                      Amélioration de l'ergonomie avec navigation simplifiée, raccourcis clavier et gestes tactiles avancés.
                    </Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>🔄</Text>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Sauvegarde automatique</Text>
                    <Text style={styles.featureDescription}>
                      Protection renforcée de vos données avec sauvegarde automatique locale et récupération en cas de fermeture inattendue.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Outils et fonctionnalités */}
              <View style={styles.featureSection}>
                <Text style={styles.featureSectionTitle}>🔧 Outils et fonctionnalités</Text>
                
                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>📷</Text>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Capture photo intégrée</Text>
                    <Text style={styles.featureDescription}>
                      Ajout de photos directement aux volets avec annotations pour une documentation complète sur le terrain.
                    </Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>🎙️</Text>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Notes vocales</Text>
                    <Text style={styles.featureDescription}>
                      Enregistrement de remarques audio pour une saisie rapide sur le terrain, avec lecture directe dans l'application.
                    </Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>📋</Text>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Modèles de rapports</Text>
                    <Text style={styles.featureDescription}>
                      Bibliothèque de modèles personnalisables pour générer des rapports professionnels adaptés à vos besoins.
                    </Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>📊</Text>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Analyse statistique</Text>
                    <Text style={styles.featureDescription}>
                      Outils d'analyse avancés avec calculs de moyennes, écarts-types et tendances pour optimiser vos mesures.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Améliorations UX */}
              <View style={styles.featureSection}>
                <Text style={styles.featureSectionTitle}>✨ Expérience utilisateur</Text>
                
                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>♿</Text>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Accessibilité renforcée</Text>
                    <Text style={styles.featureDescription}>
                      Support complet des technologies d'assistance avec navigation vocale et adaptation pour tous les utilisateurs.
                    </Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>⚡</Text>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Performance optimisée</Text>
                    <Text style={styles.featureDescription}>
                      Temps de chargement réduits, animations fluides et gestion optimisée de la mémoire pour une expérience ultra-rapide.
                    </Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>🔍</Text>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Recherche avancée</Text>
                    <Text style={styles.featureDescription}>
                      Moteur de recherche amélioré avec filtres multiples, recherche par plage de valeurs et suggestions intelligentes.
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title="OK"
                onPress={() => setUpcomingFeaturesModalVisible(false)}
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
  contentContainer: {
    padding: 16,
  },
  appHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 24,
  },
  appIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 28,
  },
  developer: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: theme.colors.primary,
    marginBottom: 8,
  },
  copyright: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  infoItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: theme.colors.text,
  },
  infoSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
    marginTop: 2,
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
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  // Modal des calculs de conformité optimisé pour mobile SANS BARRE DE SCROLL
  calculationsModalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 650,
    maxHeight: '85%',
    marginVertical: 40,
  },
  // Modal des prochaines nouveautés optimisé pour mobile SANS BARRE DE SCROLL
  upcomingFeaturesModalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 650,
    maxHeight: '85%',
    marginVertical: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
    flex: 1,
    marginLeft: 12,
  },
  closeButton: {
    padding: 8,
  },
  modalScrollView: {
    maxHeight: 300,
  },
  // ScrollView optimisé pour mobile SANS BARRE DE SCROLL
  calculationsScrollView: {
    maxHeight: 450,
    paddingBottom: 10,
  },
  // Style pour le contenu du scroll des calculs
  calculationsScrollContent: {
    paddingBottom: 20,
  },
  // ScrollView optimisé pour mobile SANS BARRE DE SCROLL
  upcomingScrollView: {
    maxHeight: 500,
    paddingBottom: 10,
  },
  // Style pour le contenu du scroll
  upcomingScrollContent: {
    paddingBottom: 20,
  },
  modalText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  modalBold: {
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
  },
  modalButton: {
    marginTop: 8,
  },
  modalFooter: {
    marginTop: 16,
    paddingTop: 12,
  },

  // Styles pour le contenu des calculs
  calculationSection: {
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.separator,
  },
  calculationTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
    marginBottom: 10,
  },
  formulaContainer: {
    backgroundColor: theme.colors.primary + '20',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.success,
  },
  formulaText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: theme.colors.primary,
    textAlign: 'center',
  },
  calculationDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  criteriaContainer: {
    gap: 10,
  },
  criteriaItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  criteriaIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 3,
  },
  criteriaContent: {
    flex: 1,
  },
  criteriaLabel: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
    marginBottom: 3,
  },
  criteriaDescription: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
    lineHeight: 15,
  },
  exampleContainer: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  exampleTitle: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
    marginBottom: 5,
  },
  exampleData: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
    marginBottom: 3,
  },
  exampleCalculation: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: theme.colors.primary,
    marginBottom: 5,
    fontStyle: 'italic',
  },
  exampleResult: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: theme.colors.text,
  },
  algorithmContainer: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 8,
    padding: 10,
  },
  algorithmStep: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
    marginTop: 6,
    marginBottom: 3,
  },
  algorithmDetail: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  technicalNote: {
    backgroundColor: theme.colors.warning + '20',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.warning,
  },
  technicalNoteTitle: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.warning,
    marginBottom: 5,
  },
  technicalNoteText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: theme.colors.warning,
    lineHeight: 15,
  },

  // Styles pour les prochaines nouveautés - VERSION CORRIGÉE
  upcomingIntro: {
    backgroundColor: theme.colors.primary + '20',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  upcomingIntroText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: theme.colors.primary,
    lineHeight: 20,
    textAlign: 'center',
  },
  featureSection: {
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.separator,
  },
  featureSectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
    marginBottom: 14,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
  },
  featureIcon: {
    fontSize: 22,
    marginRight: 14,
    marginTop: 2,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
    marginBottom: 5,
  },
  featureDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
});