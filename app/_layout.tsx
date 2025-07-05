import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { StorageProvider } from '@/contexts/StorageContext';
import { Platform } from 'react-native';

// Prévenir l'auto-hide du splash screen seulement si disponible et pas sur web
if (Platform.OS !== 'web' && SplashScreen?.preventAutoHideAsync) {
  try {
    SplashScreen.preventAutoHideAsync();
  } catch (error) {
    // Ignorer l'erreur silencieusement pour éviter les crashes
    console.warn('SplashScreen preventAutoHideAsync failed:', error);
  }
}

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // Seulement cacher le splash screen si la fonction existe et pas sur web
      if (Platform.OS !== 'web' && SplashScreen?.hideAsync) {
        try {
          SplashScreen.hideAsync();
        } catch (error) {
          // Ignorer l'erreur silencieusement
          console.warn('SplashScreen hideAsync failed:', error);
        }
      }
    }
  }, [fontsLoaded, fontError]);

  // Attendre que les polices soient chargées seulement sur mobile
  if (Platform.OS !== 'web' && !fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider>
      <LanguageProvider>
        <StorageProvider>
          <Stack 
            screenOptions={{ 
              headerShown: false,
              // Animation optimisée pour chaque plateforme
              animation: Platform.select({
                web: 'none',
                android: 'slide_from_right',
                ios: 'default',
                default: 'none'
              }),
              animationDuration: Platform.select({
                android: 250,
                ios: 300,
                default: 0
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