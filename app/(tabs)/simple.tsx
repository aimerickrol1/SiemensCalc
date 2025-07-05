import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Clock, Trash2 } from 'lucide-react-native';
import { Header } from '@/components/Header';
import { Input } from '@/components/Input';
import { ComplianceIndicator } from '@/components/ComplianceIndicator';
import { Button } from '@/components/Button';
import { calculateCompliance, formatDeviation } from '@/utils/compliance';
import { useStorage, QuickCalcHistoryItem } from '@/contexts/StorageContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function SimpleCalculatorScreen() {
  const { strings } = useLanguage();
  const { theme } = useTheme();
  const { quickCalcHistory, addQuickCalcHistory, clearQuickCalcHistory } = useStorage();
  const [referenceFlow, setReferenceFlow] = useState('');
  const [measuredFlow, setMeasuredFlow] = useState('');

  const scrollViewRef = useRef<ScrollView>(null);

  const getCompliance = () => {
    const ref = parseFloat(referenceFlow);
    const measured = parseFloat(measuredFlow);
    
    if (isNaN(ref) || isNaN(measured) || ref <= 0) {
      return null;
    }
    
    return calculateCompliance(ref, measured);
  };

  const compliance = getCompliance();

  const saveToHistory = async () => {
    if (!compliance) return;

    const ref = parseFloat(referenceFlow);
    const measured = parseFloat(measuredFlow);

    try {
      await addQuickCalcHistory({
        referenceFlow: ref,
        measuredFlow: measured,
        deviation: compliance.deviation,
        status: compliance.status,
        color: compliance.color
      });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde dans l\'historique:', error);
    }
  };

  const clearHistory = async () => {
    try {
      await clearQuickCalcHistory();
    } catch (error) {
      console.error('Erreur lors de l\'effacement de l\'historique:', error);
    }
  };

  const clearInputs = () => {
    setReferenceFlow('');
    setMeasuredFlow('');
  };

  const getDeviationIcon = () => {
    if (!compliance) return null;
    
    const iconSize = 24;
    const iconColor = compliance.color;
    
    if (compliance.deviation > 0) {
      return <Ionicons name="trending-up" size={iconSize} color={iconColor} />;
    } else if (compliance.deviation < 0) {
      return <Ionicons name="trending-down" size={iconSize} color={iconColor} />;
    } else {
      return <Ionicons name="remove" size={iconSize} color={iconColor} />;
    }
  };

  const formatHistoryDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short'
    }).format(date);
  };

  const useHistoryItem = (item: QuickCalcHistoryItem) => {
    setReferenceFlow(item.referenceFlow.toString());
    setMeasuredFlow(item.measuredFlow.toString());
    
    setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ 
          y: 300,
          animated: true 
        });
      }
    }, 200);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'Fonctionnel';
      case 'acceptable':
        return 'Acceptable';
      case 'non-compliant':
        return 'Non conforme';
      default:
        return '';
    }
  };

  const styles = createStyles(theme);

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <Header 
        title={strings.quickCalc} 
        subtitle={strings.quickCalcSubtitle}
      />
      
      <ScrollView 
        ref={scrollViewRef}
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.calculatorCard}>
          <View style={styles.calculatorHeader}>
            <Ionicons name="calculator-outline" size={24} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>{strings.complianceCalculator}</Text>
          </View>

          <Input
            label={strings.referenceFlow + " (m³/h) *"}
            value={referenceFlow}
            onChangeText={setReferenceFlow}
            placeholder="Ex: 5000"
            keyboardType="numeric"
          />

          <Input
            label={strings.measuredFlow + " (m³/h) *"}
            value={measuredFlow}
            onChangeText={setMeasuredFlow}
            placeholder="Ex: 4800"
            keyboardType="numeric"
          />

          {(referenceFlow || measuredFlow) && (
            <View style={styles.clearButton}>
              <Text 
                style={styles.clearButtonText}
                onPress={clearInputs}
              >
                {strings.clearValues}
              </Text>
            </View>
          )}
        </View>

        {compliance ? (
          <View style={[styles.resultCard, { borderColor: compliance.color }]}>
            <Text style={styles.resultTitle}>{strings.complianceResult}</Text>
            
            <View style={styles.deviationContainer}>
              <Text style={styles.deviationLabel}>{strings.calculatedDeviation}</Text>
              <View style={styles.deviationIcon}>
                {getDeviationIcon()}
              </View>
              <Text style={[styles.deviationValue, { color: compliance.color }]}>
                {formatDeviation(compliance.deviation)}
              </Text>
            </View>

            <View style={styles.complianceContainer}>
              <ComplianceIndicator compliance={compliance} size="large" />
            </View>

            <Text style={styles.complianceDescription}>
              {compliance.status === 'compliant' && "Un écart inférieur à 10% entre les valeurs retenues lors de cet essai fonctionnel et les valeurs de référence conduit au constat du fonctionnement attendu du système de désenfumage mécanique."}
              {compliance.status === 'acceptable' && "Un écart compris entre 10% et 20% entre les valeurs retenues lors de cet essai fonctionnel et les valeurs de référence conduit à signaler cette dérive, par une proposition d'action corrective à l'exploitant ou au chef d'établissement."}
              {compliance.status === 'non-compliant' && "Un écart supérieur à 20% entre les valeurs retenues lors de cet essai fonctionnel et les valeurs de référence retenues à la mise en service, doit conduire à une action corrective."}
            </Text>

            <View style={styles.saveToHistoryContainer}>
              <Button
                title="Sauvegarder dans l'historique"
                onPress={saveToHistory}
                variant="secondary"
                size="small"
              />
            </View>
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <Ionicons name="calculator-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={styles.placeholderText}>
              {strings.simplifiedModeDesc}
            </Text>
          </View>
        )}

        <View style={styles.historyCard}>
          <View style={styles.historyHeader}>
            <View style={styles.historyTitleContainer}>
              <Clock size={18} color={theme.colors.primary} />
              <Text style={styles.historyTitle}>Historique des calculs</Text>
            </View>
            {quickCalcHistory.length > 0 && (
              <TouchableOpacity 
                style={styles.clearHistoryButton}
                onPress={clearHistory}
              >
                <Trash2 size={10} color={theme.colors.error} />
                <Text style={styles.clearHistoryText}>Tout effacer</Text>
              </TouchableOpacity>
            )}
          </View>

          {quickCalcHistory.length === 0 ? (
            <View style={styles.emptyHistoryContainer}>
              <Text style={styles.emptyHistoryText}>
                Aucun calcul effectué récemment
              </Text>
              <Text style={styles.emptyHistorySubtext}>
                Les 5 derniers calculs apparaîtront ici
              </Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              <View style={styles.compactLabelsRow}>
                <Text style={styles.compactLabel}>Débit de réf.</Text>
                <Text style={styles.compactLabel}>Débit mesuré</Text>
                <Text style={styles.compactLabel}>Résultat</Text>
              </View>

              {quickCalcHistory.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.compactHistoryItem}
                  onPress={() => useHistoryItem(item)}
                >
                  <View style={styles.compactDataColumn}>
                    <Text style={styles.compactDataValue}>
                      {item.referenceFlow.toFixed(0)}
                    </Text>
                    <Text style={styles.compactDataUnit}>m³/h</Text>
                  </View>

                  <View style={styles.compactDataColumn}>
                    <Text style={styles.compactDataValue}>
                      {item.measuredFlow.toFixed(0)}
                    </Text>
                    <Text style={styles.compactDataUnit}>m³/h</Text>
                  </View>

                  <View style={styles.compactResultColumn}>
                    <Text style={[styles.compactResultValue, { color: item.color }]}>
                      {formatDeviation(item.deviation)}
                    </Text>
                    <Text style={[styles.compactStatusText, { color: item.color }]}>
                      {getStatusText(item.status)}
                    </Text>
                    <Text style={styles.compactTimeText}>
                      {formatHistoryDate(item.timestamp)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>NF S61-933 Annexe H</Text>
          <Text style={styles.infoText}>
            {strings.nfStandardDesc}
            {'\n\n'}
            <Text>• </Text>
            <Text style={{ color: '#10B981', fontFamily: 'Inter-SemiBold' }}>{strings.compliant}</Text>
            <Text> : {strings.deviation} ≤ ±10%</Text>
            {'\n'}
            <Text>• </Text>
            <Text style={{ color: '#F59E0B', fontFamily: 'Inter-SemiBold' }}>{strings.acceptable}</Text>
            <Text> : {strings.deviation} ±10% - ±20%</Text>
            {'\n'}
            <Text>• </Text>
            <Text style={{ color: '#EF4444', fontFamily: 'Inter-SemiBold' }}>{strings.nonCompliant}</Text>
            <Text> : {strings.deviation} > ±20%</Text>
          </Text>
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
  calculatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 12,
  },
  calculatorCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
  },
  resultCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 2,
  },
  resultTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  deviationContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  deviationLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  deviationValue: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  deviationIcon: {
    marginBottom: 12,
  },
  complianceContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  complianceDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  saveToHistoryContainer: {
    alignItems: 'center',
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  clearButton: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  clearButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: theme.colors.textSecondary,
  },
  placeholderContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  placeholderText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
  historyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
  },
  clearHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: theme.colors.error + '20',
  },
  clearHistoryText: {
    fontSize: 9,
    fontFamily: 'Inter-Medium',
    color: theme.colors.error,
  },
  emptyHistoryContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyHistoryText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  emptyHistorySubtext: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textTertiary,
  },
  historyList: {
    gap: 1,
  },
  compactLabelsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
  },
  compactLabel: {
    flex: 1,
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.textSecondary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  compactHistoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  compactDataColumn: {
    flex: 1,
    alignItems: 'center',
  },
  compactDataValue: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text,
    marginBottom: 1,
  },
  compactDataUnit: {
    fontSize: 9,
    fontFamily: 'Inter-Medium',
    color: theme.colors.textSecondary,
  },
  compactResultColumn: {
    flex: 1,
    alignItems: 'center',
  },
  compactResultValue: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    marginBottom: 2,
  },
  compactStatusText: {
    fontSize: 9,
    fontFamily: 'Inter-SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  compactTimeText: {
    fontSize: 9,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});