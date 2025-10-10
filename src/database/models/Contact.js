// src/database/models/Contact.js
import { Model } from '@nozbe/watermelondb';
import { text, field } from '@nozbe/watermelondb/decorators';

export default class Contact extends Model {
  static table = 'contacts';

  @text('username') username;
  @text('public_key') publicKey;
  @text('phone') phone; // if you add phone column to schema
  @field('last_seen') lastSeen;
  // if you added an 'added_at' number column in schema:
  // @field('added_at') addedAt;
}
