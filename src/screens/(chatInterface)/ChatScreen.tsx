// src/components/Chat/ChatScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Keyboard,
  LayoutAnimation,
  Platform,
  KeyboardEventName,
  KeyboardEvent as RNKeyboardEvent,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import ProfileHeader from '../../component/layout/ProfileHeader';
import { useThemeColors } from '../../context/themeColors';
import MessageList from '../../component/ui/Chat/Messagelist';
import TextBubble from '../../component/ui/Chat/Bubble/TextBubble';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const route = useRoute();
  const { chatId, chatName, avatarUrl } = route.params as {
    chatId: string;
    chatName: string;
    avatarUrl: string;
  };

  type Message = {
    id: string;
    text: string;
    type: 'sent' | 'received';
  };

  // Dummy messages (kept as you provided)
  const messages: Message[] = [
    { id: '1', text: 'Hey, how’s it going?', type: 'received' },
    { id: '2', text: 'I’m doing great, thanks for asking! You?', type: 'sent' },
    { id: '3', text: 'Pretty good! Just working on that new feature.', type: 'received' },
    { id: '4', text: 'Oh nice! How’s that coming along?', type: 'sent' },
    { id: '5', text: 'It’s challenging, but I think I’m making progress.', type: 'received' },
    {
      id: '6',
      text: 'That’s awesome to hear. Let me know if you need another pair of eyes on it.',
      type: 'sent',
    },
    {
      id: '7',
      text: 'Thanks, I really appreciate that! I might take you up on that offer later this week.',
      type: 'received',
    },
    {
      id: '8',
      text: 'Sounds good. By the way, did you see the email from marketing?',
      type: 'sent',
    },
    { id: '9', text: 'No, haven’t checked my email yet. What’s up?', type: 'received' },
    { id: '10', text: 'Just some updates on the Q4 launch plan. Nothing urgent.', type: 'sent' },
    { id: '11', text: 'Got it. I’ll take a look after my next meeting.', type: 'received' },
    { id: '12', text: 'Cool. Are we still on for lunch tomorrow?', type: 'sent' },
    { id: '13', text: 'Absolutely! Same place, same time?', type: 'received' },
    { id: '14', text: 'You know it.', type: 'sent' },
    { id: '15', text: 'Perfect. See you then.', type: 'received' },
    { id: '16', text: 'Hey, running about 10 minutes late.', type: 'sent' },
    {
      id: '17',
      text: 'No worries at all. I just got here myself. Grabbing a table now.',
      type: 'received',
    },
    { id: '18', text: 'Okay, be there soon!', type: 'sent' },
    { id: '19', text: 'Did you finish the report?', type: 'received' },
    {
      id: '20',
      text: 'Almost. Just need to add the final charts. Should be done in an hour.',
      type: 'sent',
    },
    { id: '21', text: 'Great, no rush.', type: 'received' },
    {
      id: '22',
      text: 'Can you send me the link to that document we were talking about?',
      type: 'sent',
    },
    { id: '23', text: 'Yeah, one sec.', type: 'received' },
    { id: '24', text: 'Here it is: [link]', type: 'received' },
    { id: '25', text: 'Thanks a bunch!', type: 'sent' },
    { id: '26', text: 'Any plans for the weekend?', type: 'received' },
    {
      id: '27',
      text: 'Not really, just planning to relax. Maybe catch a movie. You?',
      type: 'sent',
    },
    {
      id: '28',
      text: 'Going for a hike on Saturday morning if you’re interested.',
      type: 'received',
    },
    { id: '29', text: 'That sounds fun! What time?', type: 'sent' },
    { id: '30', text: 'We’re meeting at the trailhead at 8 AM.', type: 'received' },
    { id: '31', text: 'Okay, count me in!', type: 'sent' },
    { id: '32', text: 'Awesome!', type: 'received' },
    { id: '33', text: 'This new update is looking really slick.', type: 'sent' },
    { id: '34', text: 'I agree, the design team did a fantastic job.', type: 'received' },
    { id: '35', text: 'The animations are so smooth.', type: 'sent' },
    { id: '36', text: 'Right? It feels so much more responsive now.', type: 'received' },
    { id: '37', text: 'Hey, I think I found a small bug.', type: 'sent' },
    { id: '38', text: 'Oh? What is it?', type: 'received' },
    { id: '39', text: 'The login button doesn’t work on the staging server.', type: 'sent' },
    { id: '40', text: 'Ah, good catch. I’ll look into it right away.', type: 'received' },
    { id: '41', text: 'Thanks!', type: 'sent' },
    { id: '42', text: 'Okay, I pushed a fix. Can you check again?', type: 'received' },
    { id: '43', text: 'Yep, works perfectly now. You’re a legend!', type: 'sent' },
    { id: '44', text: 'Haha, happy to help.', type: 'received' },
    { id: '45', text: 'I’m heading out for the day. Talk to you tomorrow.', type: 'sent' },
    { id: '46', text: 'You too! Have a good evening.', type: 'received' },
    { id: '47', text: 'What do you think of this color scheme?', type: 'sent' },
    { id: '48', text: 'I like it! It’s modern and clean.', type: 'received' },
    { id: '49', text: 'Glad you think so. I was worried it was too bright.', type: 'sent' },
    { id: '50', text: 'Not at all, I think it’s perfect.', type: 'received' },
  ];

  const isDarkTheme = colors.background.startsWith('#1');
  const doodleSource = isDarkTheme
    ? require('../../assets/Unis-dark.png')
    : require('../../assets/Unis.png');

  // keyboard state
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const [keyboardOpen, setKeyboardOpen] = useState<boolean>(false);

  // key to force remount/re-measure of MessageList on keyboard hide
  const [messageListKey, setMessageListKey] = useState<number>(0);

  useEffect(() => {
    const showEvent: KeyboardEventName =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent: KeyboardEventName =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: RNKeyboardEvent) => {
      const h = e.endCoordinates?.height || 0;
      try {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      } catch {}
      setKeyboardHeight(h);
      setKeyboardOpen(true);
      // don't remount here
    };

    const onHide = () => {
      try {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      } catch {}
      setKeyboardHeight(0);
      setKeyboardOpen(false);
      // force remount so MessageList resets its measurements and layout (restores original size)
      // small timeout helps on some Android devices where hide fires before layout stabilizes
      setTimeout(() => setMessageListKey(k => k + 1), Platform.OS === 'ios' ? 50 : 0);
    };

    const showSub = Keyboard.addListener(showEvent, onShow as (e: any) => void);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // base footer reserved for safe area + custom footer
  const baseFooter = insets.bottom + 70;
  // when keyboard open, add keyboardHeight; when closed, pass baseFooter only
  const listFooterHeight = keyboardOpen ? baseFooter + keyboardHeight : baseFooter;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} // use padding on iOS, height on Android
      keyboardVerticalOffset={insets.top + 10} // account for status + header
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Image source={doodleSource} style={styles.doodleBackground} resizeMode='cover' />

        <ProfileHeader
          title={chatName}
          avatarUrl={avatarUrl}
          screen='ChatScreen'
          onPressAvatar={() => console.log('Avatar pressed')}
          onPressSearch={() => console.log('Search pressed')}
        />

        {/* MessageList keyed so it can be remounted after keyboard hides */}
        <MessageList
          key={messageListKey}
          messages={messages}
          headerHeight={insets.top + 80}
          footerHeight={listFooterHeight}
        />

        {/* Input Bar */}
        <View
          style={[
            styles.inputBar,
            {
              // when keyboardOpen we respect keyboard height + small padding, else base inset
              paddingBottom: (keyboardOpen ? keyboardHeight : insets.bottom) + 8,
              backgroundColor: colors.card,
            },
          ]}
        >
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                color: colors.text,
              },
            ]}
            placeholder='Message...'
            placeholderTextColor={isDarkTheme ? '#aaa' : '#555'}
          />
          <TouchableOpacity style={[styles.sendButton, { backgroundColor: colors.primary }]}>
            <Text style={{ color: '#fff' }}>➤</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

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
  chatArea: { flex: 1 },
  bubble: { maxWidth: '70%', borderRadius: 18, padding: 10, marginVertical: 4 },
  sentBubble: { alignSelf: 'flex-end' },
  receivedBubble: { alignSelf: 'flex-start' },
  messageText: { fontSize: 15 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  textInput: {
    flex: 1,
    height: 45,
    borderRadius: 22,
    paddingHorizontal: 16,
  },
  sendButton: {
    marginLeft: 8,
    height: 45,
    width: 45,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
