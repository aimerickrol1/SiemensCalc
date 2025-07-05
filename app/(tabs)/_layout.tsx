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
        headerShown: false,
        animation: 'shift',
        animationDuration: 250,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBarBackground,
          borderTopWidth: 0,
          paddingBottom: Platform?.OS === 'ios' ? 20 : 8,
          paddingTop: 12,
          height: Platform?.OS === 'ios' ? 68 : 56,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 8,
        },
        tabBarActiveTintColor: theme.colors.tabBarActive,
        tabBarInactiveTintColor: theme.colors.tabBarInactive,
        tabBarShowLabel: false,
        tabBarIconStyle: {
          marginTop: -4,
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
          href: null,
        }}
      />
      <Tabs.Screen
        name="building"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="zone"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="shutter"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}