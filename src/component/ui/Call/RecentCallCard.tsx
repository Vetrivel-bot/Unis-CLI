import React, { memo, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, FlatList } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useThemeColors } from '../../../context/themeColors';
import { useNavigation } from '@react-navigation/native';

interface CallHistoryCardProps {
  id: string;
  avatarUrl: string;
  name: string;
  callType: 'voice' | 'video';
  callDirection: 'incoming' | 'outgoing' | 'missed';
  time: string;
  navigation: any;
}

function parseColorToRgb(color: string) {
  if (!color) return null;
  color = color.trim();
  if (color[0] === '#') {
    const hex = color.slice(1);
    const bigint = parseInt(hex.length === 3 ? hex.repeat(2) : hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r, g, b };
  }
  const rgbMatch = color.match(/rgba?\(([^)]+)\)/);
  if (rgbMatch) {
    const [r, g, b] = rgbMatch[1].split(',').map(p => parseFloat(p.trim()));
    return { r, g, b };
  }
  return null;
}

function isColorDark(color: string) {
  const rgb = parseColorToRgb(color);
  if (!rgb) return false;
  const lum = 0.2126 * (rgb.r / 255) + 0.7152 * (rgb.g / 255) + 0.0722 * (rgb.b / 255);
  return lum < 0.5;
}

const CallHistoryCard: React.FC<CallHistoryCardProps> = ({
  id,
  avatarUrl,
  name,
  callType,
  callDirection,
  time,
  navigation,
}) => {
  const colors = useThemeColors();

  const isDarkMode = useMemo(() => {
    if (typeof colors.mode === 'string') return colors.mode === 'dark';
    return isColorDark(colors.card);
  }, [colors.card, (colors as any).mode]);

  const containerStyle = useMemo(
    () => [
      styles.container,
      {
        backgroundColor: isDarkMode ? 'rgba(0,0,0,0)' : colors.card ?? '#fff',
        borderColor: colors.border ?? 'rgba(255,255,255,0.05)',
      },
    ],
    [isDarkMode, colors.card, colors.border],
  );

  // Call button → navigate to VoiceCallScreen1 with props
  const handleVoiceCall = () => {
    navigation.navigate('voicecall', {
      name,
      avatarUrl,
    });
  };

  // Video call button (for now just navigate with same data)
  const handleVideoCall = () => {
    navigation.navigate('VoiceCallScreen1', {
      name,
      avatarUrl,
      callType: 'video',
    });
  };

  return (
    <TouchableOpacity activeOpacity={0.8} style={containerStyle}>
      <Image source={{ uri: avatarUrl }} style={styles.avatar as any} resizeMode='cover' />

      <View style={styles.contentContainer}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {name}
        </Text>

        <View style={styles.callInfo}>
          <Text style={[styles.time, { color: colors.textSecondary }]}>{time}</Text>
        </View>
      </View>

      {/* Voice Call Button */}
      <TouchableOpacity onPress={handleVoiceCall} style={styles.iconButton}>
        <Ionicons name='call' size={22} color={colors.text} />
      </TouchableOpacity>

      {/* Video Call Button */}
      <TouchableOpacity onPress={handleVideoCall} style={[styles.iconButton, { marginLeft: 10 }]}>
        <Ionicons name='videocam' size={22} color={colors.text} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '97%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginVertical: 3,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    marginRight: 14,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
  },
  callInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  time: {
    fontSize: 13,
    opacity: 0.8,
  },
  iconButton: {
    padding: 6,
  },
});

const CallHistoryScreen = () => {
  const colors = useThemeColors();
  const navigation = useNavigation();

  const callHistoryData = [
    {
      id: '1',
      avatarUrl: 'https://picsum.photos/seed/${seed}/200',
      name: 'Sree Lakshmi',
      callType: 'voice',
      callDirection: 'incoming',
      time: 'Today, 10:45 AM',
    },
    {
      id: '2',
      avatarUrl: 'https://picsum.photos/seed/12378/200',
      name: 'Priya',
      callType: 'video',
      callDirection: 'outgoing',
      time: 'Yesterday, 8:22 PM',
    },
    {
      id: '3',
      avatarUrl: 'https://picsum.photos/seed/78953/200',
      name: 'Jafrin',
      callType: 'voice',
      callDirection: 'incoming',
      time: 'Yesterday, 7:00 PM',
    },
    {
      id: '4',
      avatarUrl: 'https://picsum.photos/seed/15986/200',
      name: 'Vetri',
      callType: 'video',
      callDirection: 'outgoing',
      time: '2 days ago, 6:10 PM',
    },
    {
      id: '5',
      avatarUrl: 'https://picsum.photos/seed/56845/200',
      name: 'Deva',
      callType: 'video',
      callDirection: 'outgoing',
      time: '1 days ago, 9:45 PM',
    },
    {
      id: '6',
      avatarUrl: 'https://picsum.photos/seed/24689/200',
      name: 'shanmugha',
      callType: 'video',
      callDirection: 'outgoing',
      time: '3 days ago, 8:35 PM',
    },
    {
      id: '7',
      avatarUrl: 'https://picsum.photos/seed/45213/200',
      name: 'jayanth',
      callType: 'video',
      callDirection: 'outgoing',
      time: '3 days ago, 10:30 PM',
    },
    {
      id: '8',
      avatarUrl: 'https://picsum.photos/seed/75812/200',
      name: 'Lana',
      callType: 'video',
      callDirection: 'outgoing',
      time: '4 days ago, 4:10 PM',
    },
  ];

  return (
    <FlatList
      data={callHistoryData}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <CallHistoryCard
          {...item}
          navigation={navigation}
        />
      )}
      contentContainerStyle={{
        paddingVertical: 10,
        backgroundColor: colors.background,
      }}
    />
  );
};

export default memo(CallHistoryScreen);

