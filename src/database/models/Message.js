import { Model } from '@nozbe/watermelondb';
import { field, text, relation } from '@nozbe/watermelondb/decorators';

export default class Message extends Model {
  static table = 'messages';

  // You can define relationships like this, though it's optional
  // static associations = {
  //   contacts: { type: 'belongs_to', key: 'sender_id' },
  // };

  @text('chat_id') chatId;
  @text('sender_id') senderId;
  @text('content') content; // This will be the E2EE encrypted string
  @text('status') status; // e.g., 'sending', 'sent', 'delivered', 'read'
  @field('timestamp') timestamp;
}
