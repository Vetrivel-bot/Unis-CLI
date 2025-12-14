// src/database/models/Contact.js
import { Model } from '@nozbe/watermelondb';
import { text, field } from '@nozbe/watermelondb/decorators';

export default class Contact extends Model {
  static table = 'contacts';

  @text('username') username;
  @text('public_key') publicKey;
  @text('phone') phone;
  @field('last_seen') lastSeen;
  @field('unread_count') unreadCount; // <-- added field
}
