import { useTheme, Theme } from './ThemeContext';

const colorPalettes: Record<Theme, Record<string, string>> = {
  light: {
    background: '#fff',
    text: '#222',
    primary: '#007bff',
    secondary: '#6c757d',
    card: '#f8f9fa',
    border: '#dee2e6',
    
    // Add more semantic colors as needed
  },
  dark: {
    background: '#222',
    text: '#fff',
    primary: '#4f8cff',
    secondary: '#adb5bd',
    card: '#343a40',
    border: '#495057',
    // Add more semantic colors as needed
  },
};

export const useThemeColors = () => {
  const { theme } = useTheme();
  return colorPalettes[theme];
};
