// src/components/Chat/Bubble/StatusTicks.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Check, CheckCheck } from 'lucide-react-native'; // Using lucide-react-native for icons
import { MessageStatus } from '../../../types/chat';

interface StatusTicksProps {
  status?: MessageStatus;
}

const StatusTicks: React.FC<StatusTicksProps> = ({ status }) => {
  if (!status) return null;

  const deliveredColor = '#a2a2a2ff'; // gray-400
  const readColor = '#ffffffff'; // blue-500

  return (
    <View style={styles.container}>
      {status === 'sent' && <Check size={16} color={deliveredColor} />}
      {status === 'delivered' && <CheckCheck size={16} color={deliveredColor} />}
      {status === 'read' && <CheckCheck size={16} color={readColor} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginLeft: 4,
    alignSelf: 'flex-end',
  },
});

export default StatusTicks;
