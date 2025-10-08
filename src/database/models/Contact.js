import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export default class Contact extends Model {
  static table = 'contacts';

  @text('username') username;
  @text('public_key') publicKey;
  @field('last_seen') lastSeen;
}