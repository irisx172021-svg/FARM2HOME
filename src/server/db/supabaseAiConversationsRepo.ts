import crypto from 'crypto';
import { AiConversation, AiMessage } from '../../types.js';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient.js';

// Development personas list
const DEV_PERSONAS = ['usr_rahul_customer', 'usr_ramesh_farmer', 'usr_saraswathi_farmer', 'usr_vikram_delivery'];

// Isolated in-memory store for development personas
const devConversationsStore: Map<string, AiConversation[]> = new Map();
const devMessagesStore: Map<string, AiMessage[]> = new Map();

function normalizeRole(role: string): string {
  const r = role.toLowerCase();
  if (r.includes('farm')) return 'FARMER';
  if (r.includes('cust')) return 'CUSTOMER';
  if (r.includes('deliv')) return 'DELIVERY_PARTNER';
  return 'FARMER';
}

export const supabaseAiConversationsRepo = {
  isAvailable(): boolean {
    return isSupabaseConfigured();
  },

  isDevPersona(userId: string): boolean {
    return DEV_PERSONAS.includes(userId);
  },

  isDevId(id: string): boolean {
    return id.startsWith('conv_dev_') || id.startsWith('msg_dev_') || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  },

  /**
   * Get all conversations owned by the user, ordered newest updated first
   */
  async getConversations(userId: string): Promise<AiConversation[]> {
    if (this.isDevPersona(userId)) {
      const convs = devConversationsStore.get(userId) || [];
      return [...convs].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }

    const supabase = getSupabaseClient();
    if (!supabase) return [];

    try {
      const { data: rows, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('[SupabaseAiConversations] Error fetching conversations:', error.message);
        return [];
      }

      return (rows || []).map((row) => ({
        id: row.conversation_id,
        user_id: row.user_id,
        role: row.role,
        title: row.title || 'Agronomist Advisory Session',
        language: row.language || 'English',
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    } catch (err) {
      console.error('[SupabaseAiConversations] Exception fetching conversations:', err);
      return [];
    }
  },

  /**
   * Get single conversation with strict user ownership verification
   */
  async getConversation(conversationId: string, userId: string): Promise<AiConversation | null> {
    if (this.isDevPersona(userId) || this.isDevId(conversationId)) {
      const convs = devConversationsStore.get(userId) || [];
      const match = convs.find((c) => c.id === conversationId);
      if (!match) return null;
      if (match.user_id !== userId) {
        throw new Error('Forbidden: You do not have permission to access this conversation');
      }
      return match;
    }

    const supabase = getSupabaseClient();
    if (!supabase) return null;

    try {
      const { data: row, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('conversation_id', conversationId)
        .maybeSingle();

      if (error || !row) return null;

      if (row.user_id !== userId) {
        throw new Error('Forbidden: You do not have permission to access this conversation');
      }

      return {
        id: row.conversation_id,
        user_id: row.user_id,
        role: row.role,
        title: row.title || 'Agronomist Advisory Session',
        language: row.language || 'English',
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    } catch (err: any) {
      if (err.message?.includes('Forbidden')) throw err;
      console.error('[SupabaseAiConversations] Exception getting conversation:', err);
      return null;
    }
  },

  /**
   * Get or create active conversation for a user & role
   */
  async getOrCreateActiveConversation(
    userId: string,
    role: string,
    title = 'Agronomist Advisory Session',
    language = 'en'
  ): Promise<AiConversation> {
    const normRole = normalizeRole(role);
    const now = new Date().toISOString();

    if (this.isDevPersona(userId)) {
      const userConvs = devConversationsStore.get(userId) || [];
      const existing = userConvs.find((c) => c.role === normRole);
      if (existing) {
        return existing;
      }

      const newConv: AiConversation = {
        id: `conv_dev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        user_id: userId,
        role: normRole,
        title,
        language,
        created_at: now,
        updated_at: now,
      };
      userConvs.unshift(newConv);
      devConversationsStore.set(userId, userConvs);
      return newConv;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Database client unavailable');
    }

    // Try finding existing active conversation
    const { data: existing, error: findErr } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('role', normRole)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!findErr && existing) {
      return {
        id: existing.conversation_id,
        user_id: existing.user_id,
        role: existing.role,
        title: existing.title || title,
        language: existing.language || language,
        created_at: existing.created_at,
        updated_at: existing.updated_at,
      };
    }

    const newId = crypto.randomUUID();
    const { error: insErr } = await supabase.from('ai_conversations').insert({
      conversation_id: newId,
      user_id: userId,
      role: normRole,
      title,
      language: language === 'te' ? 'Telugu' : language === 'hi' ? 'Hindi' : language === 'ta' ? 'Tamil' : 'English',
      created_at: now,
      updated_at: now,
    });

    if (insErr) {
      console.error('[SupabaseAiConversations] Error creating conversation:', insErr.message);
      throw new Error(`Failed to create conversation in database: ${insErr.message}`);
    }

    return {
      id: newId,
      user_id: userId,
      role: normRole,
      title,
      language,
      created_at: now,
      updated_at: now,
    };
  },

  /**
   * Get all messages in a conversation with strict ownership verification
   */
  async getMessages(conversationId: string, userId: string): Promise<AiMessage[]> {
    const conv = await this.getConversation(conversationId, userId);
    if (!conv) {
      throw new Error('Forbidden: You do not have permission to access messages in this conversation');
    }

    if (this.isDevPersona(userId) || this.isDevId(conversationId)) {
      const msgs = devMessagesStore.get(conversationId) || [];
      return [...msgs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    const supabase = getSupabaseClient();
    if (!supabase) return [];

    try {
      const { data: rows, error } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[SupabaseAiConversations] Error fetching messages:', error.message);
        return [];
      }

      return (rows || []).map((row) => ({
        id: row.message_id,
        conversation_id: row.conversation_id,
        user_id: row.user_id,
        role: row.sender === 'USER' ? 'user' : row.sender === 'SYSTEM' ? 'system' : 'model',
        content: row.content,
        language: row.language || undefined,
        metadata: row.metadata,
        created_at: row.created_at,
      }));
    } catch (err) {
      console.error('[SupabaseAiConversations] Exception fetching messages:', err);
      return [];
    }
  },

  /**
   * Save a new message in an authenticated user's conversation
   */
  async saveMessage(data: {
    conversationId: string;
    userId: string;
    role: 'user' | 'model' | 'assistant' | 'system';
    content: string;
    language?: string;
    metadata?: any;
  }): Promise<AiMessage> {
    const { conversationId, userId, role, content, language, metadata } = data;

    if (!content || typeof content !== 'string' || !content.trim()) {
      throw new Error('Message content is required');
    }

    const conv = await this.getConversation(conversationId, userId);
    if (!conv) {
      throw new Error('Conversation not found or unauthorized');
    }

    const now = new Date().toISOString();

    // Map sender to database check constraint ('USER', 'ASSISTANT', 'SYSTEM')
    const dbSender = role === 'user' ? 'USER' : role === 'system' ? 'SYSTEM' : 'ASSISTANT';

    if (this.isDevPersona(userId) || this.isDevId(conversationId)) {
      const msgId = `msg_dev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const newMsg: AiMessage = {
        id: msgId,
        conversation_id: conversationId,
        user_id: userId,
        role: role === 'assistant' ? 'model' : role,
        content: content.trim(),
        language: language || 'en',
        metadata: metadata || null,
        created_at: now,
      };

      const msgs = devMessagesStore.get(conversationId) || [];
      msgs.push(newMsg);
      devMessagesStore.set(conversationId, msgs);

      // Update conversation updated_at
      conv.updated_at = now;
      return newMsg;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Database client unavailable');
    }

    const msgId = crypto.randomUUID();
    const { error: insErr } = await supabase.from('ai_messages').insert({
      message_id: msgId,
      conversation_id: conversationId,
      user_id: userId,
      sender: dbSender,
      content: content.trim(),
      language: language || null,
      metadata: metadata || null,
      created_at: now,
    });

    if (insErr) {
      console.error('[SupabaseAiConversations] Error saving message:', insErr.message);
      throw new Error(`Failed to save message in database: ${insErr.message}`);
    }

    // Touch conversation updated_at
    await supabase
      .from('ai_conversations')
      .update({ updated_at: now })
      .eq('conversation_id', conversationId);

    return {
      id: msgId,
      conversation_id: conversationId,
      user_id: userId,
      role: role === 'assistant' ? 'model' : role,
      content: content.trim(),
      language: language || 'en',
      metadata,
      created_at: now,
    };
  },

  /**
   * Retrieve recent conversation history formatted for model memory
   */
  async getRecentHistory(userId: string, limit = 8): Promise<{ role: 'user' | 'model'; text: string }[]> {
    if (this.isDevPersona(userId)) {
      const userConvs = devConversationsStore.get(userId) || [];
      const allMsgs: AiMessage[] = [];
      for (const conv of userConvs) {
        const msgs = devMessagesStore.get(conv.id) || [];
        allMsgs.push(...msgs);
      }
      allMsgs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return allMsgs
        .slice(0, limit)
        .reverse()
        .map((m) => ({
          role: m.role === 'user' ? 'user' : 'model',
          text: m.content,
        }));
    }

    const supabase = getSupabaseClient();
    if (!supabase) return [];

    try {
      const { data: rows, error } = await supabase
        .from('ai_messages')
        .select('sender, content, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error || !rows) return [];

      return rows
        .reverse()
        .map((r) => ({
          role: r.sender === 'USER' ? 'user' : 'model',
          text: r.content,
        }));
    } catch (err) {
      console.error('[SupabaseAiConversations] Error querying recent history:', err);
      return [];
    }
  },

  /**
   * Delete a conversation and its messages with strict user ownership verification
   */
  async deleteConversation(conversationId: string, userId: string): Promise<{ success: boolean }> {
    const conv = await this.getConversation(conversationId, userId);
    if (!conv) {
      throw new Error('Conversation not found or unauthorized');
    }

    if (this.isDevPersona(userId) || this.isDevId(conversationId)) {
      devMessagesStore.delete(conversationId);
      const userConvs = devConversationsStore.get(userId) || [];
      const filtered = userConvs.filter((c) => c.id !== conversationId);
      devConversationsStore.set(userId, filtered);
      return { success: true };
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Database client unavailable');
    }

    // Delete messages first
    await supabase.from('ai_messages').delete().eq('conversation_id', conversationId).eq('user_id', userId);
    // Delete conversation
    const { error: delErr } = await supabase
      .from('ai_conversations')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (delErr) {
      throw new Error(`Failed to delete conversation: ${delErr.message}`);
    }

    return { success: true };
  },
};
