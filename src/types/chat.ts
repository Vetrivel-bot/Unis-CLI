// src/types/chat.ts

export type MessageStatus = 'sent' | 'delivered' | 'read';
export type MessageContentType = 'text' | 'image' | 'video' | 'audio' | 'pdf' | 'voice';

export type Message = {
  id: string;
  type: 'sent' | 'received';
  contentType: MessageContentType;
  text?: string;
  uri?: string;
  fileName?: string;
  duration?: string;
  status?: MessageStatus;
  // ADD THIS LINE:
  senderAvatarUri?: string; // URI for the sender's profile image
};
