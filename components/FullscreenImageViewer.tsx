import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Platform, StatusBar } from 'react-native';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { PanGestureHandler, PinchGestureHandler, State } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

interface FullscreenImageViewerProps {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

export function FullscreenImageViewer({ images, initialIndex, onClose }: FullscreenImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imageError, setImageError] = useState(false);
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  // Valeurs animées pour le zoom et le pan
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);

  // Reset des transformations quand on change d'image
  useEffect(() => {
    scale.value = withSpring(1);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    savedScale.value = 1;
    setImageError(false);
  }, [currentIndex]);

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleImageError = () => {
    console.error('❌ Erreur chargement image plein écran:', images[currentIndex]?.substring(0, 50));
    setImageError(true);
  };

  const handleImageLoad = () => {
    console.log('✅ Image plein écran chargée avec succès');
    setImageError(false);
  };

  // Gestionnaire de pincement pour le zoom
  const pinchHandler = useAnimatedGestureHandler({
    onStart: () => {
      savedScale.value = scale.value;
    },
    onActive: (event) => {
      scale.value = savedScale.value * event.scale;
    },
    onEnd: () => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
      } else if (scale.value > 3) {
        scale.value = withSpring(3);
      }
      savedScale.value = scale.value;
    },
  });

  // Gestionnaire de pan pour le déplacement
  const panHandler = useAnimatedGestureHandler({
    onStart: () => {
      // Sauvegarder les positions actuelles
    },
    onActive: (event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    },
    onEnd: (event) => {
      // Si on tire vers le bas avec une vitesse suffisante, fermer
      if (event.translationY > 100 && event.velocityY > 500) {
        runOnJS(onClose)();
      } else {
        // Sinon, revenir à la position d'origine
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    },
  });

  // Style animé pour l'image
  const animatedImageStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    };
  });

  const currentImage = images[currentIndex];

  return (
    <View style={styles.container}>
      {/* StatusBar cachée pour un vrai plein écran */}
      {Platform.OS !== 'web' && <StatusBar hidden />}
      
      {/* Header avec compteur et bouton fermer */}
      <View style={styles.header}>
        <View style={styles.counter}>
          <Text style={styles.counterText}>
            {currentIndex + 1} / {images.length}
          </Text>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Contenu principal avec l'image */}
      <View style={styles.imageContainer}>
        {!currentImage || currentImage.trim() === '' ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Image vide</Text>
          </View>
        ) : imageError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Impossible de charger l'image</Text>
          </View>
        ) : (
          <PinchGestureHandler onGestureEvent={pinchHandler}>
            <Animated.View style={styles.gestureContainer}>
              <PanGestureHandler onGestureEvent={panHandler}>
                <Animated.View style={styles.gestureContainer}>
                  <Animated.Image
                    source={{ uri: currentImage }}
                    style={[styles.fullImage, animatedImageStyle]}
                    onError={handleImageError}
                    onLoad={handleImageLoad}
                    resizeMode="contain"
                  />
                </Animated.View>
              </PanGestureHandler>
            </Animated.View>
          </PinchGestureHandler>
        )}
      </View>

      {/* Boutons de navigation (seulement si plusieurs images) */}
      {images.length > 1 && (
        <>
          {currentIndex > 0 && (
            <TouchableOpacity style={[styles.navButton, styles.navButtonLeft]} onPress={goToPrevious}>
              <ChevronLeft size={32} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          {currentIndex < images.length - 1 && (
            <TouchableOpacity style={[styles.navButton, styles.navButtonRight]} onPress={goToNext}>
              <ChevronRight size={32} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Indicateurs de pagination (seulement si plusieurs images) */}
      {images.length > 1 && (
        <View style={styles.pagination}>
          {images.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === currentIndex && styles.paginationDotActive
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    width: '100%',
    height: '100%',
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  counter: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  gestureContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateY: -30 }],
    zIndex: 10,
  },
  navButtonLeft: {
    left: 20,
  },
  navButtonRight: {
    right: 20,
  },
  pagination: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 40 : 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  paginationDotActive: {
    backgroundColor: '#FFFFFF',
    width: 12,
    height: 8,
    borderRadius: 4,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
});