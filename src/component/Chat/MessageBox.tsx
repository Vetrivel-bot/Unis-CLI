  // src/component/ui/Chat/MessageBox.tsx
  import React, { useState } from 'react';
  import { View, TextInput, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
  import { useSafeAreaInsets } from 'react-native-safe-area-context';
  import { useThemeColors } from '../../context/themeColors';

  interface MessageBoxProps {
    onSendMessage: (text: string) => void;
  }

  const MessageBox: React.FC<MessageBoxProps> = ({ onSendMessage }) => {
    const [text, setText] = useState('');
    const colors = useThemeColors();
    const insets = useSafeAreaInsets();
    const isDarkTheme = colors.background.startsWith('#1');

    const handleSend = () => {
      if (text.trim().length > 0) {
        onSendMessage(text.trim());
        setText(''); // Clear the input after sending
      }
    };

    return (
      <View
        style={[
          styles.inputBar,
          {
            // Add padding for the home bar (notch) area on iOS
            paddingBottom: Platform.OS === 'ios' ? insets.bottom : 8,
            backgroundColor: colors.card,
          },
        ]}
      >
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(84, 84, 84, 0.52)',
              color: colors.text,
            },
          ]}
          placeholder='Message...'
          placeholderTextColor={isDarkTheme ? '#aaa' : '#555'}
          value={text}
          onChangeText={setText}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: colors.primary }]}
          onPress={handleSend}
        >
          <Text style={{ color: '#fff' }}>➤</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const styles = StyleSheet.create({
    inputBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 8,
      marginBottom: 4,
    },
    textInput: {
      flex: 1,
      minHeight: 5,
      maxHeight: 90, // Allow input to grow to a certain height
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'ios' ? 12 : 10,
      fontSize: 16,
    },
    sendButton: {
      marginLeft: 8,
      height: 45,
      width: 45,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'flex-end', // Keep button at the bottom when input grows
      marginBottom: Platform.OS === 'ios' ? 0 : 2.5,
    },
  });

  export default MessageBox;
