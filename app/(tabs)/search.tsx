import React, { useState } from 'react';
import { View, Text, ScrollView, FlatList, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

export default function SearchScreen() {
  const [results, setResults] = useState([]);

  const renderResult = ({ item }) => (
    <View style={styles.resultItem}>
      <Text>{item.shutter.id}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView>
        {results.length > 0 && (
          <>
            {results.length > 0 ? (
              <Animated.View style={styles.resultsContainer}>
                <View style={styles.resultsHeader}>
                  <Text style={styles.resultsTitle}>Results</Text>
                  <View style={styles.resultsBadge}>
                    <Text style={styles.resultsBadgeText}>
                      {results.length}
                    </Text>
                  </View>
                </View>
                <FlatList
                  data={results}
                  renderItem={renderResult}
                  keyExtractor={(item) => item.shutter.id}
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={false}
                />
              </Animated.View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  resultsContainer: {
    padding: 16,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultsBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  resultsBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  resultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});