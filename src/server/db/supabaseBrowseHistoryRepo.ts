import crypto from 'crypto';
import { BrowseHistoryItem } from '../../types.js';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient.js';
import { CatalogRepository } from './catalogRepository.js';

// Development personas list
const DEV_PERSONAS = ['usr_rahul_customer', 'usr_ramesh_farmer', 'usr_saraswathi_farmer', 'usr_vikram_delivery'];
const MAX_HISTORY_LIMIT = 30;

// Isolated in-memory store for development fixture browse history
const devBrowseHistoryStore: Map<string, BrowseHistoryItem[]> = new Map();

export const supabaseBrowseHistoryRepo = {
  isAvailable(): boolean {
    return isSupabaseConfigured();
  },

  isDevPersona(userId: string): boolean {
    return DEV_PERSONAS.includes(userId);
  },

  /**
   * Retrieve browse history for a user, ordered newest first with 30 item cap
   */
  async getHistory(userId: string): Promise<BrowseHistoryItem[]> {
    const isDev = this.isDevPersona(userId);
    const supabase = getSupabaseClient();

    let realHistory: BrowseHistoryItem[] = [];

    if (supabase && !isDev) {
      try {
        const { data: rows, error } = await supabase
          .from('browse_history')
          .select('history_id, user_id, product_id, viewed_at')
          .eq('user_id', userId)
          .order('viewed_at', { ascending: false })
          .limit(MAX_HISTORY_LIMIT);

        if (error) {
          console.warn('[SupabaseBrowseHistory] Error fetching browse history:', error.message);
        } else if (rows) {
          for (const row of rows) {
            const { product } = await CatalogRepository.getProductById(row.product_id);
            realHistory.push({
              id: row.history_id,
              user_id: row.user_id,
              product_id: row.product_id,
              viewed_at: row.viewed_at,
              product: product || undefined,
            });
          }
        }
      } catch (err) {
        console.error('[SupabaseBrowseHistory] Exception querying browse history:', err);
      }
    }

    // Merge with any isolated dev store items for this user (e.g., if dev persona or viewed dev fixtures)
    const devItems = devBrowseHistoryStore.get(userId) || [];
    const hydratedDevItems: BrowseHistoryItem[] = [];
    for (const item of devItems) {
      const { product } = await CatalogRepository.getProductById(item.product_id);
      hydratedDevItems.push({
        ...item,
        product: product || item.product,
      });
    }

    if (isDev) {
      return hydratedDevItems.slice(0, MAX_HISTORY_LIMIT);
    }

    // For real user, combine real history with any dev fixture overlay items, deduplicate by product_id
    const combined: BrowseHistoryItem[] = [];
    const seenProductIds = new Set<string>();

    for (const item of [...realHistory, ...hydratedDevItems]) {
      if (!seenProductIds.has(item.product_id)) {
        seenProductIds.add(item.product_id);
        combined.push(item);
      }
    }

    combined.sort((a, b) => new Date(b.viewed_at).getTime() - new Date(a.viewed_at).getTime());
    return combined.slice(0, MAX_HISTORY_LIMIT);
  },

  /**
   * Record a product view for a user.
   * Deduplicates earlier views of the same product, moves the new view to top, and caps at 30 items.
   */
  async recordView(userId: string, productId: string): Promise<{ success: boolean; item?: BrowseHistoryItem }> {
    if (!productId || typeof productId !== 'string' || !productId.trim()) {
      throw new Error('Valid productId is required');
    }

    // 1. Authoritative product validation from CatalogRepository
    const { product, isFixture } = await CatalogRepository.getProductById(productId);
    if (!product) {
      throw new Error('Product not found or inactive');
    }

    const isDev = this.isDevPersona(userId);
    const now = new Date().toISOString();

    // If development persona or fixture product, record in dev store
    if (isDev || isFixture) {
      const userHistory = devBrowseHistoryStore.get(userId) || [];
      // Deduplicate: remove existing entry for same product
      const filtered = userHistory.filter((item) => item.product_id !== productId);
      const newItem: BrowseHistoryItem = {
        id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        user_id: userId,
        product_id: productId,
        viewed_at: now,
        product,
      };
      // Prepend newest item
      filtered.unshift(newItem);
      // Enforce 30 item cap
      const capped = filtered.slice(0, MAX_HISTORY_LIMIT);
      devBrowseHistoryStore.set(userId, capped);
      return { success: true, item: newItem };
    }

    // Real authenticated user with real product -> Supabase
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Database client is not available');
    }

    try {
      // 1. Concurrency-safe deduplication: delete any existing browse_history entry for this user and product
      const { error: delErr } = await supabase
        .from('browse_history')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId);

      if (delErr) {
        console.warn('[SupabaseBrowseHistory] Notice removing existing view record:', delErr.message);
      }

      // 2. Insert newest view at current timestamp
      const historyId = crypto.randomUUID();
      const { error: insErr } = await supabase.from('browse_history').insert({
        history_id: historyId,
        user_id: userId,
        product_id: productId,
        viewed_at: now,
      });

      if (insErr) {
        console.error('[SupabaseBrowseHistory] Insert error:', insErr.message);
        throw new Error(`Failed to record browse history: ${insErr.message}`);
      }

      // 3. Enforce 30-item limit in Supabase:
      // Fetch any rows beyond the top 30
      const { data: excessRows, error: fetchErr } = await supabase
        .from('browse_history')
        .select('history_id')
        .eq('user_id', userId)
        .order('viewed_at', { ascending: false })
        .range(MAX_HISTORY_LIMIT, MAX_HISTORY_LIMIT + 50);

      if (!fetchErr && excessRows && excessRows.length > 0) {
        const idsToRemove = excessRows.map((r) => r.history_id);
        await supabase.from('browse_history').delete().in('history_id', idsToRemove);
      }

      return {
        success: true,
        item: {
          id: historyId,
          user_id: userId,
          product_id: productId,
          viewed_at: now,
          product,
        },
      };
    } catch (err: any) {
      console.error('[SupabaseBrowseHistory] Exception recording view:', err);
      throw err;
    }
  },

  /**
   * Helper to clear browse history (e.g. for testing)
   */
  async clearHistory(userId: string): Promise<{ success: boolean }> {
    if (this.isDevPersona(userId)) {
      devBrowseHistoryStore.delete(userId);
      return { success: true };
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('browse_history').delete().eq('user_id', userId);
    }
    devBrowseHistoryStore.delete(userId);
    return { success: true };
  },
};
