import { useTheme, Theme } from './ThemeContext';

const colorPalettes: Record<Theme, Record<string, string>> = {
  light: {
    // Core Palette
    background: '#f9f9f7',      // A soft off-white background
    text: '#293228',            // High-contrast dark green-gray
    textSecondary: '#657164',   // Muted for less important text
    primary: '#0d9488',         // A vibrant, modern teal/emerald
    secondary: '#475569',       // A professional slate blue for harmony
    accent: '#facc15',          // A bright, clean sunflower gold
    card: '#ffffff',            // Clean and crisp
    cardSecondary: '#f5f5f4',   // For subtle UI differentiation
    border: '#e7e5e4',          // Soft and unobtrusive

    // Status Colors
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    
    // Glassmorphism Effect
    glassBackground: 'rgba(252, 252, 252, 0.75)',
    glassBorder: 'rgba(255, 255, 255, 0.8)',
    glassShadow: 'rgba(0, 0, 0, 0.05)',

    // Chat-Specific Colors
    chatBubbleOutgoing: '#e0f2f1',
    chatBubbleIncoming: '#f5f5f4',
    onlineIndicator: '#10b981',
  },
  dark: {
    // Core Palette
    background: '#000000ff',      // A deep, immersive dark green
    text: '#e3e5e2',            // Soft white for easy reading
    textSecondary: '#8f988e',   // Muted gray-green
    primary: '#0056b8ff',         // A bright mint for excellent contrast
    secondary: '#94a3b8',       // The light version of the slate blue
    accent: '#fcd34d',          // A strong, vibrant gold
    card: '#1c2521',            // Dark, low-contrast card background
    cardSecondary: '#27322d',   // Subtle variation for nested elements
    border: '#424d47',          // Visible but not distracting

    // Status Colors
    success: '#34d399',
    warning: '#fbbf24',
    error: '#f87171',

    // Glassmorphism Effect
    glassBackground: 'rgba(5, 3, 14, 1)',
    glassBorder: 'rgba(255, 255, 255, 0.1)',
    glassShadow: 'rgba(0, 0, 0, 0.3)',

    // Chat-Specific Colors
    chatBubbleOutgoing: '#133fffff',
    chatBubbleIncoming: '#2d2c2cff',
    onlineIndicator: '#34d399',
  },
};

export const useThemeColors = () => {
  const { theme } = useTheme();
  return colorPalettes[theme];
};