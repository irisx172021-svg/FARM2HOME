import { getDatabase } from '../connection.js';

export interface AiConversationRecord {
  id: string;
  user_id: string;
  role: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AiMessageRecord {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  language: string;
  metadata: string | null;
  created_at: string;
}

export const aiMemoryRepo = {
  getConversations(userId: string): AiConversationRecord[] {
    const db = getDatabase();
    return db
      .prepare('SELECT * FROM ai_conversations WHERE user_id = ? ORDER BY updated_at DESC')
      .all(userId) as any[];
  },

  getConversation(id: string, userId: string): AiConversationRecord | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM ai_conversations WHERE id = ? AND user_id = ?').get(id, userId) as any;
    return row || null;
  },

  getOrCreateActiveConversation(userId: string, role: string, title = 'Agronomist Advisory Session'): AiConversationRecord {
    const db = getDatabase();
    const existing = db
      .prepare('SELECT * FROM ai_conversations WHERE user_id = ? AND role = ? ORDER BY updated_at DESC LIMIT 1')
      .get(userId, role) as any;

    if (existing) {
      return existing;
    }

    const id = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO ai_conversations (id, user_id, role, title, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, userId, role, title, now, now);

    return db.prepare('SELECT * FROM ai_conversations WHERE id = ?').get(id) as any;
  },

  getMessages(conversationId: string, userId: string): AiMessageRecord[] {
    const db = getDatabase();
    // Enforce user isolation: only retrieve if conversation belongs to this userId
    const conv = this.getConversation(conversationId, userId);
    if (!conv) return [];

    return db
      .prepare('SELECT * FROM ai_messages WHERE conversation_id = ? AND user_id = ? ORDER BY created_at ASC')
      .all(conversationId, userId) as any[];
  },

  saveMessage(data: {
    conversationId: string;
    userId: string;
    role: 'user' | 'model';
    content: string;
    language?: string;
    metadata?: any;
  }): AiMessageRecord {
    const db = getDatabase();
    const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO ai_messages (id, conversation_id, user_id, role, content, language, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.conversationId,
      data.userId,
      data.role,
      data.content,
      data.language || 'en',
      data.metadata ? JSON.stringify(data.metadata) : null,
      now
    );

    // Update conversation timestamp
    db.prepare('UPDATE ai_conversations SET updated_at = ? WHERE id = ?').run(now, data.conversationId);

    return {
      id,
      conversation_id: data.conversationId,
      user_id: data.userId,
      role: data.role,
      content: data.content,
      language: data.language || 'en',
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      created_at: now,
    };
  },

  getRecentHistory(userId: string, limit = 8): { role: 'user' | 'model'; text: string }[] {
    const db = getDatabase();
    const rows = db
      .prepare(`
        SELECT role, content 
        FROM ai_messages 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
      `)
      .all(userId, limit) as any[];

    // Return in chronological order
    return rows.reverse().map((r) => ({
      role: r.role === 'user' ? 'user' : 'model',
      text: r.content,
    }));
  },
};
