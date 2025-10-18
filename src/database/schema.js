// src/database/schema.js
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const mySchema = appSchema({
  version: 2, // increment version when you modify schema
  tables: [
    tableSchema({
      name: 'contacts',
      columns: [
        { name: 'username', type: 'string' },
        { name: 'public_key', type: 'string' },
        { name: 'last_seen', type: 'number', isOptional: true },
        { name: 'unread_count', type: 'number', isOptional: true }, // <-- new column
      ],
    }),
    tableSchema({
      name: 'messages',
      columns: [
        { name: 'chat_id', type: 'string', isIndexed: true },
        { name: 'sender_id', type: 'string' },
        { name: 'content', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'timestamp', type: 'number' },
      ],
    }),
  ],
});
