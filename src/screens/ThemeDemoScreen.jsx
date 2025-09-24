import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useThemeColors } from '../context/themeColors';

const ThemeDemoScreen = () => {
  const { theme, setTheme } = useTheme();
  const colors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <Text style={[styles.title, { color: colors.text }]}>Theme Demo</Text>
      <Text style={[styles.text, { color: colors.text }]}>Current theme: {theme}</Text>
      <View style={styles.toggleRow}>
        <Text style={[styles.text, { color: colors.text }]}>Light</Text>
        <Switch
          value={theme === 'dark'}
          onValueChange={(val) => setTheme(val ? 'dark' : 'light')}
          trackColor={{ false: colors.secondary, true: colors.primary }}
          thumbColor={theme === 'dark' ? colors.primary : colors.secondary}
        />
        <Text style={[styles.text, { color: colors.text }]}>Dark</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  text: {
    fontSize: 18,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
});

export default ThemeDemoScreen;
