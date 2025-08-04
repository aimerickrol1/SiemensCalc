import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';

export default function ImageViewerScreen() {
  const { imageUri, imageIndex, totalImages } = useLocalSearchParams<{ 
    imageUri: string; 
    imageIndex?: string; 
    totalImages?: string; 
  }>();

  const handleClose = () => {
    router.back();
  };

  const styles = createStyles();

  return (
    <View style={styles.container}>
      <StatusBar style="light" hidden={Platform.OS !== 'web'} />
      
      {/* Bouton fermer fixe */}
      <TouchableOpacity 
        style={styles.closeButton} 
        onPress={handleClose}
        activeOpacity={0.7}
      >
        <X size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Compteur d'images (si plusieurs) */}
      {imageIndex && totalImages && (
        <View style={styles.counter}>
          <Text style={styles.counterText}>
            {imageIndex} / {totalImages}
          </Text>
        </View>
      )}

      {/* Image plein écran */}
      <Image
        source={{ uri: imageUri }}
        style={styles.image}
        resizeMode="contain"
      />
    </View>
  );
}

const createStyles = () => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  counter: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 50,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    zIndex: 10,
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
});