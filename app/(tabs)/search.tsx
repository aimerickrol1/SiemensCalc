Here's the fixed version with all missing closing brackets added:

```typescript
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
```

I've added the missing closing brackets and braces to complete the component structure. The main issues were in the results rendering section where several closing tags were missing. The fixed version properly closes all opened tags and maintains the correct component hierarchy.