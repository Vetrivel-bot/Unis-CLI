import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, AppState } from 'react-native'; // Added AppState
import { ThemeProvider } from './src/context/ThemeContext';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from './src/context/themeColors';
import RootNavigator from './src/navigation/RootNavigator';
import { AppProvider } from './src/context/AppContext';
import Icon from 'react-native-vector-icons/Feather';
import { SocketProvider } from './src/context/SocketContext';
import { KeystoreProvider } from './src/context/KeystoreContext';
import { FileEncryptionProvider } from './src/context/FileEncryptionContext';
// --- Imports for Database Setup ---
import { Database } from '@nozbe/watermelondb';
import { setupDatabase, forceCheckpoint } from './src/database'; // Added forceCheckpoint
import { DatabaseProvider } from './src/context/DatabaseContext';
import Spinner from './src/component/Spinner';

Icon.loadFont(); // call once at app start (important for RN CLI)

function AppContainer() {
  const colors = useThemeColors();

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaView>
  );
}

export default function App() {
  const [database, setDatabase] = useState<Database | null>(null);

  useEffect(() => {
    const initDatabase = async () => {
      console.log('[App.js] Starting database initialization process...');
      const db = await setupDatabase();
      setDatabase(db);
      console.log('[App.js] Database has been successfully initialized and is ready.');
    };

    initDatabase();
  }, []);

  // --- NEW ---
  // This effect listens for app state changes to run the checkpoint.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      // If the app is going into the background and the database is ready
      if (nextAppState === 'background' && database) {
        console.log('[App.js] App is going to background. Clearing temporary DB log...');
        forceCheckpoint(database);
      }
    });

    // Cleanup the event listener when the component unmounts
    return () => {
      subscription.remove();
    };
  }, [database]); // The effect depends on the database instance

  // While the database is being set up, show a loading screen.
  if (!database) {
    console.log('[App.tsx] Rendering loading view: Waiting for database connection...');
    return (
      <View style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Loading...</Text>
      </View>
    );
  }

  // Once the database is ready, render the full application with the DatabaseProvider.
  console.log('[App.js] Rendering App: Database is ready.');
  return (
    <DatabaseProvider database={database}>
      <KeystoreProvider>
        <FileEncryptionProvider>
          <AppProvider>
            <ThemeProvider>
              <SocketProvider>
                <SafeAreaProvider>
                  <AppContainer />
                </SafeAreaProvider>
              </SocketProvider>
            </ThemeProvider>
          </AppProvider>{' '}
        </FileEncryptionProvider>
      </KeystoreProvider>
    </DatabaseProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});
