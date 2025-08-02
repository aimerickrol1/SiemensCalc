import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function TabLayout() {
  const { strings } = useLanguage();
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        // Configuration de base
        headerShown: false,
        // Désactiver les animations pour éviter les erreurs
        animationEnabled: false,
        // Style de la barre d'onglets
        tabBarStyle: {
          backgroundColor: theme.colors.tabBarBackground,
          borderTopWidth: 0,
          paddingBottom: Platform.select({
            android: 8,
            ios: 20,
            web: 8, // Padding spécifique pour web
            default: 8
          }),
          paddingTop: 12,
          height: Platform.select({
            android: 56,
            ios: 68,
            web: 60, // Hauteur optimisée pour web mobile
            default: 56
          }),
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 8,
          // Amélioration pour web mobile
          ...(Platform.OS === 'web' && {
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
          }),
        },
        tabBarActiveTintColor: theme.colors.tabBarActive,
        tabBarInactiveTintColor: theme.colors.tabBarInactive,
        tabBarShowLabel: Platform.OS === 'web', // Afficher les labels sur web pour une meilleure UX
        tabBarLabelStyle: Platform.OS === 'web' ? {
          fontSize: 10,
          fontFamily: 'Inter-Medium',
          marginTop: -4,
          marginBottom: 4,
        } : undefined,
        tabBarIconStyle: {
          marginTop: Platform.OS === 'web' ? -2 : -4,
          marginBottom: 0,
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: strings.projects,
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="business-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="simple"
        options={{
          title: strings.quickCalc,
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="calculator-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: strings.search,
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="search-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="export"
        options={{
          title: strings.export,
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          title: strings.about,
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="information-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
          title: 'Paramètres',
        }}
      />
      <Tabs.Screen
        name="project"
        options={{
          href: null
        }}
      />
      <Tabs.Screen
        name="building"
        options={{
          href: null
        }}
      />
      <Tabs.Screen
        name="zone"
        options={{
          href: null
        }}
      />
      <Tabs.Screen
        name="shutter"
        options={{
          href: null
        }}
      />
    </Tabs>
  );
}