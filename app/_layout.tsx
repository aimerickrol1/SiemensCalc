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

// Prévenir l'auto-hide du splash screen
SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignorer l'erreur si le splash screen est déjà caché
});

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
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // Attendre que les polices soient chargées
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider>
      <LanguageProvider>
        <StorageProvider>
          <Stack 
            screenOptions={{ 
              headerShown: false,
              animation: Platform?.OS === 'web' ? 'none' : 'slide_from_right',
              animationDuration: Platform?.OS === 'web' ? 0 : 300,
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