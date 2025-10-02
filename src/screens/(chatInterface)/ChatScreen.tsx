// src/screens/ChatScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet, Image, Platform, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import ProfileHeader from '../../component/layout/ProfileHeader';
import { useThemeColors } from '../../context/themeColors';
import MessageList from '../../component/ui/Chat/Messagelist';
import { Message } from '../../types/chat';

// 1. Import the new MessageBox component
import MessageBox from '../../component/Chat/MessageBox';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const route = useRoute();
  const { chatId, chatName, avatarUrl } = route.params as {
    chatId: string;
    chatName: string;
    avatarUrl: string;
  };

  const [messages, setMessages] = useState<Message[]>([
    // Your messages data...
    { id: '1', type: 'received', contentType: 'text', text: 'Hey, how’s it going?' },
    {
      id: '2',
      type: 'sent',
      contentType: 'text',
      text: 'I’m doing great, thanks for asking! You?',
      status: 'read',
    },
    // ...etc
  ]);

  // 2. REMOVED: All useEffect and useState logic for keyboard handling is gone.
  // It's no longer needed.

  const handleSendMessage = (text: string) => {
    // This is where you'll add the new message to your state
    // and send it to your backend (e.g., Realm or your API)
    console.log('New message to send:', text);
    const newMessage: Message = {
      id: Math.random().toString(),
      type: 'sent',
      contentType: 'text',
      text: text,
      status: 'sent',
    };
    setMessages(prevMessages => [...prevMessages, newMessage]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* <Image source={doodleSource} ... /> */}
      <ProfileHeader
        title={chatName}
        avatarUrl={avatarUrl}
        screen='ChatScreen'
        onPressAvatar={() => console.log('Avatar pressed')}
        onPressSearch={() => console.log('Search pressed')}
      />

      {/* 3. The KeyboardAvoidingView now wraps the list and input box */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        // Offset for the header
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <MessageList
          messages={messages}
          // headerHeight and footerHeight are no longer needed for KAV
        />

        {/* 4. Render the new MessageBox component here */}
        <MessageBox onSendMessage={handleSendMessage} />
      </KeyboardAvoidingView>
    </View>
  );
}

// 5. REMOVED: The old inputBar, textInput, and sendButton styles are gone.
const styles = StyleSheet.create({
  container: { flex: 1 },
  doodleBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0.1,
  },
});
