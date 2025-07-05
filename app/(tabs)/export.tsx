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
  // ... rest of the code remains the same ...
}

const createStyles = (theme: any) => StyleSheet.create({
  // ... styles remain the same ...
});