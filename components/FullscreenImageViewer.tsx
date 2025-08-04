import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions, Platform } from 'react-native';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';

interface FullscreenImageViewerProps {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

export function FullscreenImageViewer({ images, initialIndex, onClose }: FullscreenImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const scrollViewRef = useRef<ScrollView>(null);

  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    console.log('🖼️ FullscreenImageViewer - Images reçues:', images.length);
    console.log('🖼️ FullscreenImageViewer - Index initial:', initialIndex);
    
    // Scroll vers l'image initiale
    if (scrollViewRef.current && initialIndex > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          x: initialIndex * screenWidth,
          animated: false
        });
      }, 100);
    }
  }, [initialIndex, screenWidth]);

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffsetX / screenWidth);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < images.length) {
      setCurrentIndex(newIndex);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      scrollViewRef.current?.scrollTo({
        x: newIndex * screenWidth,
        animated: true
      });
    }
  };

  const goToNext = () => {
    if (currentIndex < images.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      scrollViewRef.current?.scrollTo({
        x: newIndex * screenWidth,
        animated: true
      });
    }
  };

  const handleImageError = (index: number) => {
    console.error('❌ Erreur chargement image plein écran', index);
    setImageErrors(prev => new Set([...prev, index]));
  };

  const handleImageLoad = (index: number) => {
    console.log('✅ Image plein écran', index, 'chargée avec succès');
    setImageErrors(prev => {
      const newSet = new Set(prev);
      newSet.delete(index);
      return newSet;
    });
  };

  return (
    <View style={styles.container}>
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
      <View style={styles.content}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {images.map((imageBase64, index) => (
            <View key={index} style={[styles.imageContainer, { width: screenWidth }]}>
              {!imageBase64 || imageBase64.trim() === '' ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>Image vide</Text>
                </View>
              ) : imageErrors.has(index) ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>Impossible de charger l'image</Text>
                </View>
              ) : (
                <Image
                  source={{ uri: imageBase64 }}
                  style={styles.fullImage}
                  resizeMode="contain"
                  onError={() => handleImageError(index)}
                  onLoad={() => handleImageLoad(index)}
                />
              )}
            </View>
          ))}
        </ScrollView>

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
      </View>

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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  scrollView: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  scrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    padding: 20,
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