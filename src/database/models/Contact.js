import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export default class Contact extends Model {
  static table = 'contacts';

  // This ID is from your backend API, used for unique identification
  @text('contact_id') contactId;

  @text('alias') alias;
  @text('phone') phone;
  @text('public_key') publicKey;
  @field('added_at') addedAt;
}
