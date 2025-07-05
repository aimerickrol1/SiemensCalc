import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { StorageProvider } from '@/contexts/StorageContext';
import { Platform, View, Text } from 'react-native';

// Prévenir l'auto-hide du splash screen SEULEMENT sur mobile
if (Platform.OS !== 'web') {
  try {
    SplashScreen.preventAutoHideAsync();
  } catch (error) {
    // Ignorer silencieusement
  }
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
        // Attendre que les polices soient chargées ou qu'il y ait une erreur
        if (fontsLoaded || fontError) {
          // Cacher le splash screen seulement sur mobile
          if (Platform.OS !== 'web') {
            try {
              await SplashScreen.hideAsync();
            } catch (error) {
              // Ignorer l'erreur
            }
          }
          
          // Marquer l'app comme prête
          setIsReady(true);
        }
      } catch (error) {
        console.error('Erreur initialisation app:', error);
        setError('Erreur de démarrage');
        setIsReady(true); // Continuer malgré l'erreur
      }
    };

    initializeApp();
  }, [fontsLoaded, fontError]);

  // Écran de chargement simple
  if (!isReady) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#009999' 
      }}>
        <Text style={{ 
          color: 'white', 
          fontSize: 18, 
          fontWeight: 'bold' 
        }}>
          Siemens CalcConform
        </Text>
        <Text style={{ 
          color: 'white', 
          fontSize: 14, 
          marginTop: 8 
        }}>
          Chargement...
        </Text>
      </View>
    );
  }

  // Écran d'erreur simple
  if (error) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#f8f9fa',
        padding: 20 
      }}>
        <Text style={{ 
          color: '#dc3545', 
          fontSize: 18, 
          fontWeight: 'bold',
          marginBottom: 8 
        }}>
          Erreur de démarrage
        </Text>
        <Text style={{ 
          color: '#6c757d', 
          fontSize: 14,
          textAlign: 'center' 
        }}>
          {error}
        </Text>
      </View>
    );
  }

  return (
    <ThemeProvider>
      <LanguageProvider>
        <StorageProvider>
          <Stack 
            screenOptions={{ 
              headerShown: false,
              animation: Platform.select({
                web: 'none',
                android: 'slide_from_right',
                ios: 'default',
                default: 'slide_from_right'
              }),
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="auto" />
        </StorageProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}