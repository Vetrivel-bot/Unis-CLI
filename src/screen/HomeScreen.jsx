import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const HomeScreen = ({ navigation }) => {
  const { theme, toggleTheme } = useTheme();
  const themedStyles = theme === 'dark' ? darkStyles : styles;
  return (
    <View style={themedStyles.container}>
      <Text style={themedStyles.title}>Hello Navigation</Text>
      <Button
        title="Go to Secure Storage Test"
        onPress={() => navigation.navigate('SecureStorage')}
      />
      <View style={{ marginTop: 20 }}>
        <Button
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Theme`}
          onPress={toggleTheme}
        />
      </View>
      <View style={{ marginTop: 20 }}>
        <Button
          title="Go to Theme Demo"
          onPress={() => navigation.navigate('ThemeDemo')}
        />
      </View>
      <Text style={{ marginTop: 10 }}>Current theme: {theme}</Text>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#222',
  },
});

const darkStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#222',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#fff',
  },
});

export default HomeScreen;
