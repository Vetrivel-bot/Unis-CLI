import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import RecentChatCard from '../ui/Home/RecentChatCard';
import { useDatabase } from '../../context/DatabaseContext';
import { Q } from '@nozbe/watermelondb';

// Interfaces
interface Contact {
  id: string;
  username: string;
  phone: string;
  timestamp: string;
  unreadCount: number;
  isOnline: boolean;
  avatarUrl: string;
}

// Navigation types (unchanged)
type HomeStackParamList = {
  Home: undefined;
  Profile: undefined;
  Chat: { chatId: string; chatName: string; avatarUrl: string };
};

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
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  useEffect(() => {
    if (!database) return;

    const contactsCollection = database.collections.get('contacts');
    const messagesCollection = database.collections.get('messages');

    // Keep last snapshots in closure so both observers can combine info
    let lastContactsRecords: any[] = [];
    let lastMessagesRecords: any[] = [];

    let contactsSub: any = null;
    let messagesSub: any = null;
    let mounted = true;

    const computeAndSet = async (contactsRecords: any[], messagesRecords: any[]) => {
      if (!mounted) return;

      try {
        // Build unread counts and latest timestamp map from messages table
        const unreadCountMap = new Map<string, number>();
        const latestTsMap = new Map<string, number>();

        for (const m of messagesRecords || []) {
          const raw = m._raw || {};
          const sender = raw.sender_id ?? null;
          const status = raw.status ?? '';
          const tsRaw = raw.timestamp ?? raw.ts ?? null;
          // normalize timestamp to ms
          let tsNum = 0;
          if (tsRaw !== null && tsRaw !== undefined) {
            const n = Number(tsRaw);
            if (!Number.isNaN(n)) tsNum = String(n).length === 10 ? n * 1000 : n;
            else tsNum = Date.now();
          }

          // Count only incoming messages (sender exists and not 'me') and not read
          if (sender && sender !== 'me' && status !== 'read') {
            unreadCountMap.set(sender, (unreadCountMap.get(sender) ?? 0) + 1);
          }

          // Use chat_id or sender to determine latest time per contact
          const contactKey = raw.sender_id ?? raw.chat_id ?? null;
          if (contactKey) {
            const prev = latestTsMap.get(contactKey) ?? 0;
            if (tsNum > prev) latestTsMap.set(contactKey, tsNum);
          }
        }

        // Map contacts to UI shape and detect differences to sync DB if needed
        const toUpdate: { rec: any; newCount: number }[] = [];
        const formatted: Contact[] = (contactsRecords || []).map(c => {
          const raw = c._raw || {};
          const id = raw.id ?? raw._id ?? '';
          const computedUnread = Number(unreadCountMap.get(id) ?? 0);
          const dbUnread = Number(raw.unread_count ?? 0);

          // if mismatch between computed unread and DB, schedule update
          if (computedUnread !== dbUnread && c) {
            toUpdate.push({ rec: c, newCount: computedUnread });
          }

          const ts = latestTsMap.get(id) ?? Number(raw.last_seen ?? raw.timestamp ?? 0);
          const timestampString =
            ts && !Number.isNaN(Number(ts)) ? new Date(Number(ts)).toISOString() : '';

          return {
            id,
            username: raw.username ?? '',
            phone: raw.phone ?? '',
            timestamp: timestampString,
            unreadCount: computedUnread,
            isOnline: Boolean(raw.is_online ?? false),
            avatarUrl: raw.avatar_url ?? '',
          } as Contact;
        });

        // If there are contacts not present in contactsRecords but present in messages (new chats),
        // add entries for them so user sees chats even before contact row exists.
        for (const [senderId, cnt] of unreadCountMap.entries()) {
          const exists = formatted.some(f => f.id === senderId);
          if (!exists) {
            const ts = latestTsMap.get(senderId) ?? Date.now();
            formatted.push({
              id: senderId,
              username: senderId,
              phone: '',
              timestamp: new Date(ts).toISOString(),
              unreadCount: cnt,
              isOnline: false,
              avatarUrl: '',
            });
            // Optionally: we could create a contact record here, but avoid auto-creating unless you want that.
          }
        }

        // Sort: unread desc, then newest timestamp desc
        formatted.sort((a, b) => {
          if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
          const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return tb - ta;
        });

        // Apply DB sync for any changed unread counts in a single write
        if (toUpdate.length > 0) {
          try {
            await database.write(async () => {
              for (const upd of toUpdate) {
                // defensive check: ensure rec still exists and update only if needed
                try {
                  const latestRaw = upd.rec._raw || {};
                  const cur = Number(latestRaw.unread_count ?? 0);
                  if (cur !== upd.newCount) {
                    await upd.rec.update(r => {
                      r._raw = {
                        ...r._raw,
                        unread_count: upd.newCount,
                      };
                    });
                  }
                } catch (e) {
                  // ignore per-record update failure
                }
              }
            });
          } catch (e) {
            console.warn('[ChatListScreen] failed to sync unread counts to DB', e);
          }
        }

        // Finally set local state
        setContacts(formatted);
      } catch (e) {
        console.warn('[ChatListScreen] computeAndSet error', e);
      }
    };

    // subscribe to contacts observable
    try {
      const contactsObs = contactsCollection.query().observe();
      contactsSub = contactsObs.subscribe((records: any[]) => {
        lastContactsRecords = records || [];
        void computeAndSet(lastContactsRecords, lastMessagesRecords);
      });
    } catch (e) {
      console.warn('[ChatListScreen] contacts observe failed', e);
    }

    // subscribe to messages observable
    try {
      const messagesObs = messagesCollection.query().observe();
      messagesSub = messagesObs.subscribe((records: any[]) => {
        lastMessagesRecords = records || [];
        void computeAndSet(lastContactsRecords, lastMessagesRecords);
      });
    } catch (e) {
      console.warn('[ChatListScreen] messages observe failed', e);
    }

    return () => {
      mounted = false;
      try {
        if (contactsSub && typeof contactsSub.unsubscribe === 'function') contactsSub.unsubscribe();
        if (messagesSub && typeof messagesSub.unsubscribe === 'function') messagesSub.unsubscribe();
      } catch (e) {
        // ignore cleanup errors
      }
    };
  }, [database]);

  const handleChatPress = useCallback(
    (chatId: string, chatName: string, avatarUrl: string) => {
      navigation.navigate('HomeFlow', {
        screen: 'Chat',
        params: { chatId, chatName, avatarUrl },
      });
    },
    [navigation],
  );

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
      data={contacts}
      keyExtractor={item => item.id}
      style={styles.list}
      contentContainerStyle={{
        paddingBottom: footerHeight + 120,
      }}
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
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

  },
});

export default ChatListScreen;
