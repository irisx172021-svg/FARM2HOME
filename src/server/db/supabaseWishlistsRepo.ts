import { WishlistItem, Product } from '../../types.js';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient.js';
import { CatalogRepository } from './catalogRepository.js';

// Development personas
const DEV_PERSONAS = ['usr_rahul_customer', 'usr_ramesh_farmer', 'usr_saraswathi_farmer', 'usr_vikram_delivery'];

// Isolated in-memory store for development fixture wishlists
const devWishlistStore: Map<string, WishlistItem[]> = new Map();

export const supabaseWishlistsRepo = {
  isAvailable(): boolean {
    return isSupabaseConfigured();
  },

  isDevPersona(userId: string): boolean {
    return DEV_PERSONAS.includes(userId);
  },

  /**
   * Get or create a Supabase wishlist row for a real user
   */
  async getOrCreateWishlist(userId: string): Promise<string | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    try {
      const { data: existing } = await supabase
        .from('wishlists')
        .select('wishlist_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing?.wishlist_id) {
        return existing.wishlist_id;
      }

      const { data: inserted, error: insertErr } = await supabase
        .from('wishlists')
        .insert({ user_id: userId })
        .select('wishlist_id')
        .single();

      if (insertErr) {
        // If unique violation occurred due to concurrent creation, fetch again
        if (insertErr.code === '23505') {
          const { data: retry } = await supabase
            .from('wishlists')
            .select('wishlist_id')
            .eq('user_id', userId)
            .maybeSingle();
          return retry?.wishlist_id || null;
        }
        console.warn('[SupabaseWishlists] Failed to insert wishlist row:', insertErr.message);
        return null;
      }

      return inserted.wishlist_id;
    } catch (err) {
      console.warn('[SupabaseWishlists] getOrCreateWishlist exception:', err);
      return null;
    }
  },

  /**
   * Get wishlist for a user with hydrated product details
   */
  async getWishlist(userId: string): Promise<WishlistItem[]> {
    if (this.isDevPersona(userId)) {
      const items = devWishlistStore.get(userId) || [];
      const hydrated: WishlistItem[] = [];
      for (const item of items) {
        const { product } = await CatalogRepository.getProductById(item.product_id);
        if (product) {
          hydrated.push({
            ...item,
            product,
          });
        }
      }
      return hydrated;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      const items = devWishlistStore.get(userId) || [];
      return items;
    }

    try {
      const wishlistId = await this.getOrCreateWishlist(userId);
      if (!wishlistId) {
        return devWishlistStore.get(userId) || [];
      }

      const { data: dbItems, error: itemsErr } = await supabase
        .from('wishlist_items')
        .select('wishlist_item_id, wishlist_id, product_id')
        .eq('wishlist_id', wishlistId);

      if (itemsErr) {
        console.warn('[SupabaseWishlists] Error fetching wishlist_items:', itemsErr.message);
        return devWishlistStore.get(userId) || [];
      }

      const result: WishlistItem[] = [];
      const seenProductIds = new Set<string>();

      for (const row of dbItems || []) {
        const { product } = await CatalogRepository.getProductById(row.product_id);
        seenProductIds.add(row.product_id);
        if (product) {
          result.push({
            id: row.wishlist_item_id,
            user_id: userId,
            product_id: row.product_id,
            created_at: new Date().toISOString(),
            product,
          });
        }
      }

      // Also merge any fixture overlay items for this real user
      const overlayItems = devWishlistStore.get(userId) || [];
      for (const item of overlayItems) {
        if (!seenProductIds.has(item.product_id)) {
          const { product } = await CatalogRepository.getProductById(item.product_id);
          if (product) {
            result.push({
              ...item,
              product,
            });
          }
        }
      }

      return result;
    } catch (err) {
      console.error('[SupabaseWishlists] getWishlist error:', err);
      return devWishlistStore.get(userId) || [];
    }
  },

  /**
   * Toggle a product in the user's wishlist (adds if absent, removes if present)
   */
  async toggleWishlist(userId: string, productId: string): Promise<{ isWishlisted: boolean }> {
    if (!productId || typeof productId !== 'string') {
      throw new Error('Valid productId is required');
    }

    // 1. Authoritative product validation from CatalogRepository
    const { product, isFixture } = await CatalogRepository.getProductById(productId);
    if (!product) {
      throw new Error('Product not found or inactive');
    }

    const isDev = this.isDevPersona(userId);

    // 2. Real user + real product -> persist to Supabase wishlists and wishlist_items
    if (!isDev && !isFixture) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const wishlistId = await this.getOrCreateWishlist(userId);
        if (wishlistId) {
          // Check if item already exists in wishlist
          const { data: existing } = await supabase
            .from('wishlist_items')
            .select('wishlist_item_id')
            .eq('wishlist_id', wishlistId)
            .eq('product_id', productId)
            .maybeSingle();

          if (existing) {
            // Remove from wishlist
            await supabase
              .from('wishlist_items')
              .delete()
              .eq('wishlist_item_id', existing.wishlist_item_id);

            return { isWishlisted: false };
          } else {
            // Add to wishlist
            const { error: insertErr } = await supabase
              .from('wishlist_items')
              .insert({
                wishlist_id: wishlistId,
                product_id: productId,
              });

            if (!insertErr) {
              return { isWishlisted: true };
            }

            // If duplicate key error, treat as already wishlisted
            if (insertErr.code === '23505') {
              return { isWishlisted: true };
            }

            console.warn('[SupabaseWishlists] wishlist_items insert notice:', insertErr.message);
          }
        }
      }
    }

    // 3. Development persona or development fixture product -> isolated fixture store
    const userItems = devWishlistStore.get(userId) || [];
    const existingIndex = userItems.findIndex((w) => w.product_id === productId);

    if (existingIndex !== -1) {
      userItems.splice(existingIndex, 1);
      devWishlistStore.set(userId, userItems);
      return { isWishlisted: false };
    } else {
      userItems.push({
        id: `wish_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        user_id: userId,
        product_id: productId,
        created_at: new Date().toISOString(),
      });
      devWishlistStore.set(userId, userItems);
      return { isWishlisted: true };
    }
  },

  /**
   * Explicitly add product to wishlist (idempotent)
   */
  async addToWishlist(userId: string, productId: string): Promise<{ success: boolean; isWishlisted: boolean }> {
    const { product, isFixture } = await CatalogRepository.getProductById(productId);
    if (!product) {
      throw new Error('Product not found or inactive');
    }

    const isDev = this.isDevPersona(userId);
    if (!isDev && !isFixture) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const wishlistId = await this.getOrCreateWishlist(userId);
        if (wishlistId) {
          const { error } = await supabase.from('wishlist_items').upsert(
            { wishlist_id: wishlistId, product_id: productId },
            { onConflict: 'wishlist_id,product_id' }
          );
          if (!error) {
            return { success: true, isWishlisted: true };
          }
        }
      }
    }

    const userItems = devWishlistStore.get(userId) || [];
    if (!userItems.some((w) => w.product_id === productId)) {
      userItems.push({
        id: `wish_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        user_id: userId,
        product_id: productId,
        created_at: new Date().toISOString(),
      });
      devWishlistStore.set(userId, userItems);
    }
    return { success: true, isWishlisted: true };
  },

  /**
   * Explicitly remove product from wishlist (safe if non-existent)
   */
  async removeFromWishlist(userId: string, productId: string): Promise<{ success: boolean; isWishlisted: boolean }> {
    const isDev = this.isDevPersona(userId);
    if (!isDev) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const wishlistId = await this.getOrCreateWishlist(userId);
        if (wishlistId) {
          await supabase
            .from('wishlist_items')
            .delete()
            .eq('wishlist_id', wishlistId)
            .eq('product_id', productId);
        }
      }
    }

    const userItems = devWishlistStore.get(userId) || [];
    const filtered = userItems.filter((w) => w.product_id !== productId);
    devWishlistStore.set(userId, filtered);

    return { success: true, isWishlisted: false };
  },
};
