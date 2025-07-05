import { useEffect, useState } from 'react';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { StorageProvider } from '@/contexts/StorageContext';
import { Platform, View, Text, StyleSheet } from 'react-native';

// Prévenir l'auto-hide du splash screen de manière sécurisée
try {
  if (Platform.OS !== 'web') {
    SplashScreen.preventAutoHideAsync();
  }
} catch (error) {
  console.warn('SplashScreen error:', error);
}

// Composant de chargement simple
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>SIEMENS</Text>
        <Text style={styles.appName}>CalcConform</Text>
      </View>
      <Text style={styles.loadingText}>Initialisation...</Text>
    </View>
  );
}

// Composant d'erreur simple
function ErrorScreen({ error }: { error: string }) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Erreur de démarrage</Text>
      <Text style={styles.errorText}>{error}</Text>
      <Text style={styles.errorSubtext}>Veuillez redémarrer l'application</Text>
    </View>
  );
}

export default function RootLayout() {
  useFrameworkReady();
  
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Initialisation de l\'application...');
        
        // Attendre que les polices soient chargées
        if (fontsLoaded || fontError) {
          console.log('✅ Polices chargées');
          
          // Cacher le splash screen seulement sur mobile
          if (Platform.OS !== 'web') {
            try {
              await SplashScreen.hideAsync();
              console.log('✅ Splash screen caché');
            } catch (error) {
              console.warn('⚠️ Erreur splash screen:', error);
            }
          }
          
          // Délai pour s'assurer que tout est prêt
          await new Promise(resolve => setTimeout(resolve, 100));
          
          console.log('✅ Application prête');
          setIsReady(true);
        }
      } catch (error) {
        console.error('❌ Erreur initialisation:', error);
        setError('Erreur de démarrage');
        setIsReady(true); // Continuer malgré l'erreur
      }
    };

    initializeApp();
  }, [fontsLoaded, fontError]);

  // Écran de chargement
  if (!isReady) {
    return <LoadingScreen />;
  }

  // Écran d'erreur
  if (error) {
    return <ErrorScreen error={error} />;
  }

  // Application principale avec providers
  return (
    <ThemeProvider>
      <LanguageProvider>
        <StorageProvider>
          <Slot />
          <StatusBar style="auto" />
        </StorageProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#009999',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 2,
    marginBottom: 8,
  },
  appName: {
    fontSize: 18,
    color: 'white',
    fontWeight: '500',
  },
  loadingText: {
    fontSize: 16,
    color: 'white',
    opacity: 0.8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});