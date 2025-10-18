import React, { createContext, useContext, ReactNode } from 'react';
import { Database } from '@nozbe/watermelondb';

// Define the shape of the context data
interface DatabaseContextData {
  database: Database;
}

// Create the context. We provide a default value that throws an error
// to ensure it's never used outside of a provider.
const DatabaseContext = createContext<DatabaseContextData | undefined>(undefined);

// Define the props for our provider component
interface DatabaseProviderProps {
  children: ReactNode;
  database: Database;
}

/**
 * The provider component that makes the database instance available
 * to any nested components.
 */
export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({ children, database }) => {
  return (
    <DatabaseContext.Provider value={{ database }}>
      {children}
    </DatabaseContext.Provider>
  );
};

/**
 * A custom hook that provides a clean way to access the database instance
 * from any component.
 */
export const useDatabase = (): Database => {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context.database;
};
