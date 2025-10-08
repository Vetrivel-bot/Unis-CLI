import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const mySchema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'contacts',
      columns: [
        { name: 'username', type: 'string' },
        { name: 'public_key', type: 'string' },
        { name: 'last_seen', type: 'number', isOptional: true },
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
