import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import RecentChatCard from '../ui/Home/RecentChatCard';
import { useDatabase } from '../../context/DatabaseContext';
// Assuming you have a Contact model from WatermelonDB, otherwise this interface is good.
// It's better to define interfaces/types outside the component scope.
interface Contact {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isOnline: boolean;
  avatarUrl: string;
}

// Type-safe nested navigation
type HomeStackParamList = {
  Home: undefined;
  Profile: undefined;
  Chat: { chatId: string; chatName: string; avatarUrl: string };
};

// Combining param lists for better type safety with nested navigators
type RootStackParamList = {
  MainTabs: undefined;
  HomeFlow: {
    screen: keyof HomeStackParamList;
    params: HomeStackParamList[keyof HomeStackParamList];
  };
  DevFlow: undefined;
};

interface ChatListScreenProps {
  headerHeight?: number;
  footerHeight?: number;
}

const ITEM_HEIGHT = 88; // match RecentChatCard height

const ChatListScreen: React.FC<ChatListScreenProps> = ({ headerHeight = 0, footerHeight = 0 }) => {
  const database = useDatabase();
  const [contacts, setContacts] = useState<Contact[]>([]);
  // Use the combined param list for the navigation prop
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  // *** IMPROVEMENT 1: Fetch data using the useEffect hook ***
  // This ensures contacts are fetched when the component mounts.
  // The empty dependency array [] means this effect runs only once.
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const contactsCollection = database.get('contacts');
        // It's good practice to type the fetched data if possible
        const fetchedContacts = await contactsCollection.query().fetch();

        // WatermelonDB returns Model instances. We map over them to get the raw data
        // which matches our Contact interface.
        const formattedContacts = fetchedContacts.map(c => c._raw as unknown as Contact);

        setContacts(formattedContacts);

        console.log('[Chatlist][Contacts] Current contacts in DB:', formattedContacts);
      } catch (error) {
        console.error('[ChatListScreen] Failed to fetch contacts:', error);
      }
    };

    fetchContacts();
  }, [database]); // Dependency on `database` ensures it doesn't run until DB is available.

  // *** IMPROVEMENT 2: Correctly typed navigation with no `as never` cast ***
  const handleChatPress = useCallback(
    (chatId: string, chatName: string, avatarUrl: string) => {
      navigation.navigate('HomeFlow', {
        screen: 'Chat',
        params: { chatId, chatName, avatarUrl },
      });
    },
    [navigation],
  );

  // *** IMPROVEMENT 3: Type the `item` prop directly for cleaner code ***
  const renderItem = useCallback(
    ({ item }: { item: Contact }) => (
      <RecentChatCard
        id={item.id}
        avatarUrl={
          item.avatarUrl ||
          'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRWCjBpUiJlCXuiyw_Da3n39y4tG-VtTOT2F85jKiFQDQFGB8UB-U05kwpjMMzuSb7Zkwk&usqp=CAU'
        }
        name={item.username}
        lastMessage={item.phone}
        timestamp={item.timestamp || 'Just Now'}
        unreadCount={item.unreadCount}
        onPress={() =>
          handleChatPress(
            item.id,
            item.username,
            item.avatarUrl ||
              'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRWCjBpUiJlCXuiyw_Da3n39y4tG-VtTOT2F85jKiFQDQFGB8UB-U05kwpjMMzuSb7Zkwk&usqp=CAU',
          )
        }
      />
    ),
    [handleChatPress],
  );

  return (
    <FlatList
      data={contacts} // Use the state variable `contacts`
      keyExtractor={item => item.id}
      style={styles.list}
      contentContainerStyle={{
        // paddingTop: headerHeight, // This is still available if you need it
        paddingBottom: footerHeight + 120,
      }}
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
      // Performance props are great!
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={6}
      removeClippedSubviews={true}
      getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    flex: 1,
    zIndex: 60,
    borderTopRightRadius: 30,
    borderTopLeftRadius: 30,
    paddingTop: 10,
  },
});

export default ChatListScreen;
