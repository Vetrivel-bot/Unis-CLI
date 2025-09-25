import React, { useCallback } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import RecentChatCard from '../ui/Home/RecentChatCard';

// Mock chats data
const mockChats = [
  {
    id: '1',
    name: 'Eugene Hanson',
    lastMessage: 'Hey! How are you?',
    timestamp: '9:41 AM',
    unreadCount: 2,
    isOnline: true,
    avatarUrl: 'https://picsum.photos/100/100?random=1',
  },
  {
    id: '2',
    name: 'Lauren Spencer',
    lastMessage: 'I am fine, what about you?',
    timestamp: '9:38 AM',
    unreadCount: 0,
    isOnline: false,
    avatarUrl: 'https://picsum.photos/100/100?random=2',
  },
  {
    id: '3',
    name: 'Only Study Group',
    lastMessage: 'What is Pixel Text Message.',
    timestamp: '8:50 AM',
    unreadCount: 5,
    isOnline: true,
    avatarUrl: 'https://picsum.photos/100/100?random=3',
  },
  {
    id: '4',
    name: 'Evelyn Taylor',
    lastMessage: 'No problem, its fine.',
    timestamp: 'Yesterday',
    unreadCount: 0,
    isOnline: true,
    avatarUrl: 'https://picsum.photos/100/100?random=4',
  },
  {
    id: '5',
    name: 'John Doe',
    lastMessage: 'See you tomorrow!',
    timestamp: 'Yesterday',
    unreadCount: 0,
    isOnline: false,
    avatarUrl: 'https://picsum.photos/100/100?random=5',
  },
  {
    id: '6',
    name: 'Sophia Lee',
    lastMessage: 'Can you send me the file?',
    timestamp: '10:15 AM',
    unreadCount: 1,
    isOnline: true,
    avatarUrl: 'https://picsum.photos/100/100?random=6',
  },
  {
    id: '7',
    name: 'Michael Brown',
    lastMessage: 'Thanks for the update.',
    timestamp: '11:00 AM',
    unreadCount: 0,
    isOnline: false,
    avatarUrl: 'https://picsum.photos/100/100?random=7',
  },
  {
    id: '8',
    name: 'Family Group',
    lastMessage: 'Dinner at 7 PM.',
    timestamp: 'Yesterday',
    unreadCount: 3,
    isOnline: true,
    avatarUrl: 'https://picsum.photos/100/100?random=8',
  },
  {
    id: '9',
    name: 'Olivia Martin',
    lastMessage: 'Let’s catch up soon!',
    timestamp: '8:10 AM',
    unreadCount: 0,
    isOnline: true,
    avatarUrl: 'https://picsum.photos/100/100?random=9',
  },
  {
    id: '10',
    name: 'David Wilson',
    lastMessage: 'Meeting postponed to 3 PM.',
    timestamp: '9:00 AM',
    unreadCount: 0,
    isOnline: false,
    avatarUrl: 'https://picsum.photos/100/100?random=10',
  },
  {
    id: '11',
    name: 'Emily Clark',
    lastMessage: 'I finished the project.',
    timestamp: 'Yesterday',
    unreadCount: 2,
    isOnline: true,
    avatarUrl: 'https://picsum.photos/100/100?random=11',
  },
  {
    id: '12',
    name: 'James Scott',
    lastMessage: 'Good morning!',
    timestamp: '7:30 AM',
    unreadCount: 0,
    isOnline: false,
    avatarUrl: 'https://picsum.photos/100/100?random=12',
  },
  {
    id: '13',
    name: 'Work Group',
    lastMessage: 'Deadline extended to Friday.',
    timestamp: 'Yesterday',
    unreadCount: 6,
    isOnline: true,
    avatarUrl: 'https://picsum.photos/100/100?random=13',
  },
  {
    id: '14',
    name: 'Isabella King',
    lastMessage: 'Can you call me?',
    timestamp: 'Yesterday',
    unreadCount: 0,
    isOnline: true,
    avatarUrl: 'https://picsum.photos/100/100?random=14',
  },
  {
    id: '15',
    name: 'Daniel Moore',
    lastMessage: 'Check your email.',
    timestamp: '8:55 AM',
    unreadCount: 0,
    isOnline: false,
    avatarUrl: 'https://picsum.photos/100/100?random=15',
  },
  {
    id: '16',
    name: 'Jessica Taylor',
    lastMessage: 'That sounds great!',
    timestamp: '9:25 AM',
    unreadCount: 1,
    isOnline: true,
    avatarUrl: 'https://picsum.photos/100/100?random=16',
  },
  {
    id: '17',
    name: 'Gaming Squad',
    lastMessage: 'Ready for tonight?',
    timestamp: 'Yesterday',
    unreadCount: 4,
    isOnline: true,
    avatarUrl: 'https://picsum.photos/100/100?random=17',
  },
  {
    id: '18',
    name: 'Nathan Adams',
    lastMessage: 'Let me know your thoughts.',
    timestamp: '10:05 AM',
    unreadCount: 0,
    isOnline: false,
    avatarUrl: 'https://picsum.photos/100/100?random=18',
  },
  {
    id: '19',
    name: 'Mia Johnson',
    lastMessage: 'Happy Birthday!',
    timestamp: 'Yesterday',
    unreadCount: 0,
    isOnline: true,
    avatarUrl: 'https://picsum.photos/100/100?random=19',
  },
  {
    id: '20',
    name: 'Chris Evans',
    lastMessage: 'See you at the event.',
    timestamp: '8:45 AM',
    unreadCount: 0,
    isOnline: false,
    avatarUrl: 'https://picsum.photos/100/100?random=20',
  },
];

interface ChatListScreenProps {
  headerHeight?: number;
  footerHeight?: number;
}

const ITEM_HEIGHT = 88; // match RecentChatCard height

// Type-safe nested navigation
type HomeStackParamList = {
  Home: undefined;
  Profile: undefined;
  Chat: { chatId: string; chatName: string; avatarUrl: string };
};

type RootStackParamList = {
  MainTabs: undefined;
  HomeFlow: undefined;
  DevFlow: undefined;
};

const ChatListScreen: React.FC<ChatListScreenProps> = ({ headerHeight = 0, footerHeight = 0 }) => {
  const navigation =
    useNavigation<NavigationProp<RootStackParamList & { HomeFlow: HomeStackParamList }>>();

  const handleChatPress = useCallback(
    (chatId: string, chatName: string, avatarUrl: string) => {
      // Navigate through HomeFlow to reach the nested Chat screen
      navigation.navigate('HomeFlow', {
        screen: 'Chat',
        params: { chatId, chatName, avatarUrl },
      } as never);
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({
      item,
    }: {
      item: {
        id: string;
        name: string;
        lastMessage: string;
        timestamp: string;
        unreadCount: number;
        isOnline: boolean;
        avatarUrl: string;
      };
    }) => (
      <RecentChatCard
        id={item.id}
        avatarUrl={item.avatarUrl}
        name={item.name}
        lastMessage={item.lastMessage}
        timestamp={item.timestamp}
        unreadCount={item.unreadCount}
        onPress={() => handleChatPress(item.id, item.name, item.avatarUrl)}
      />
    ),
    [handleChatPress],
  );

  return (
    <FlatList
      data={mockChats}
      keyExtractor={item => item.id}
      style={styles.list}
      contentContainerStyle={{
        paddingTop: headerHeight,
        paddingBottom: footerHeight,
      }}
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={7}
      removeClippedSubviews={true}
      getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
});

export default ChatListScreen;
