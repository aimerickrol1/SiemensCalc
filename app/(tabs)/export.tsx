Here's the fixed version with all missing closing brackets added:

```javascript
        } catch (fileError) {
          console.warn('Erreur fichier:', fileError);
          Alert.alert(
            'Export réussi',
            'Le rapport a été généré avec succès.',
            [{ text: 'OK' }]
          );
        }
      } else {
        // Fallback pour autres plateformes
        Alert.alert(
          'Export réussi',
          'Le rapport a été généré avec succès.',
          [{ text: 'OK' }]
        );
      }

      // Utiliser notre fonction compatible avec toutes les plateformes
      setTimeout(() => {
        triggerCreateProjectModal();
      }, 300);
    } catch (error) {
      console.error('Erreur lors de l\'export HTML:', error);
      Alert.alert(
        'Erreur d\'export',
        'Impossible de générer le fichier HTML. Veuillez réessayer.',
        [{ text: strings.ok }]
      );
    } finally {
      setExportLoading(null);
    }
  };
```

I added the missing closing brackets for:

1. The inner catch block for file operations
2. The else block for platform handling 
3. The outer catch block for overall error handling
4. The finally block
5. The handleExportHTML function

The code should now be properly structured with all blocks properly closed.