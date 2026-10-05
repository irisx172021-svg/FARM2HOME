import crypto from 'crypto';
import { CartItem, Product } from '../../types.js';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient.js';
import { CatalogRepository, ALLOWED_DEV_FARMERS } from './catalogRepository.js';
import { isValidQuantityForUnit, formatQuantity } from '../../lib/quantity.js';

export interface SupabaseCartRow {
  cart_id: string;
  user_id: string;
  updated_at: string;
}

export interface SupabaseCartItemRow {
  cart_item_id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
}

// Development fixture cart store (isolated in-memory store)
const devCartStore: Map<string, CartItem[]> = new Map();

export const supabaseCartsRepo = {
  isAvailable(): boolean {
    return isSupabaseConfigured();
  },

  isDevPersona(userId: string): boolean {
    const devPersonas = ['usr_rahul_customer', 'usr_ramesh_farmer', 'usr_saraswathi_farmer', 'usr_vikram_delivery'];
    return devPersonas.includes(userId);
  },

  /**
   * Get or create a Supabase cart row for a real user
   */
  async getOrCreateSupabaseCart(userId: string): Promise<string | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    try {
      const { data: existing } = await supabase
        .from('carts')
        .select('cart_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing?.cart_id) {
        return existing.cart_id;
      }

      const newCartId = crypto.randomUUID();
      const { error: insertErr } = await supabase.from('carts').insert({
        cart_id: newCartId,
        user_id: userId,
        updated_at: new Date().toISOString(),
      });

      if (insertErr) {
        console.warn('[SupabaseCarts] Failed to insert cart row:', insertErr.message);
        return null;
      }

      return newCartId;
    } catch (err) {
      console.warn('[SupabaseCarts] getOrCreateSupabaseCart exception:', err);
      return null;
    }
  },

  /**
   * Get cart for a user (real user -> Supabase, dev persona -> isolated fixture cart)
   */
  async getCart(userId: string): Promise<CartItem[]> {
    if (this.isDevPersona(userId)) {
      const items = devCartStore.get(userId) || [];
      const hydrated: CartItem[] = [];
      for (const item of items) {
        const { product } = await CatalogRepository.getProductById(item.product_id);
        hydrated.push({
          ...item,
          product: product || undefined,
          is_available: Boolean(product && product.stock > 0),
          stock_exceeded: Boolean(product && item.quantity > product.stock),
        });
      }
      return hydrated;
    }

    const supabase = getSupabaseClient();
    if (!supabase) return [];

    try {
      const cartId = await this.getOrCreateSupabaseCart(userId);
      if (!cartId) {
        // Fallback to devCartStore if user does not exist in users table
        const items = devCartStore.get(userId) || [];
        return items;
      }

      const { data: dbItems, error: itemsErr } = await supabase
        .from('cart_items')
        .select('*')
        .eq('cart_id', cartId);

      if (itemsErr) {
        console.warn('[SupabaseCarts] Error fetching cart_items:', itemsErr.message);
        return devCartStore.get(userId) || [];
      }

      const result: CartItem[] = [];
      const seenProductIds = new Set<string>();

      for (const row of dbItems || []) {
        const { product } = await CatalogRepository.getProductById(row.product_id);
        seenProductIds.add(row.product_id);
        result.push({
          id: row.cart_item_id,
          user_id: userId,
          product_id: row.product_id,
          quantity: Number(row.quantity),
          added_at: new Date().toISOString(),
          product: product || undefined,
          is_available: Boolean(product && product.stock > 0),
          stock_exceeded: Boolean(product && Number(row.quantity) > product.stock),
        });
      }

      // Also include any development fixture items stored in user's fixture overlay
      const overlayItems = devCartStore.get(userId) || [];
      for (const item of overlayItems) {
        if (!seenProductIds.has(item.product_id)) {
          const { product } = await CatalogRepository.getProductById(item.product_id);
          result.push({
            ...item,
            product: product || undefined,
            is_available: Boolean(product && product.stock > 0),
            stock_exceeded: Boolean(product && item.quantity > product.stock),
          });
        }
      }

      return result;
    } catch (err) {
      console.error('[SupabaseCarts] getCart error:', err);
      return devCartStore.get(userId) || [];
    }
  },

  /**
   * Add item to cart with complete server-side stock and product validation
   */
  async addItem(userId: string, productId: string, quantity = 1): Promise<{ success: boolean }> {
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new Error('Quantity must be a positive number');
    }

    // 1. Authoritative product validation from CatalogRepository
    const { product, isFixture } = await CatalogRepository.getProductById(productId);
    if (!product) {
      throw new Error('Product not found or inactive');
    }

    const val = isValidQuantityForUnit(qty, product.unit);
    if (!val.valid) {
      throw new Error(val.error || `Invalid quantity for ${product.unit}`);
    }

    if (product.stock <= 0) {
      throw new Error(`"${product.title}" is currently out of stock`);
    }

    // Check existing quantity in user's cart
    const currentCart = await this.getCart(userId);
    const existing = currentCart.find((c) => c.product_id === productId);
    const targetQty = (existing ? existing.quantity : 0) + qty;

    if (targetQty > product.stock) {
      throw new Error(
        `Cannot add ${formatQuantity(qty, product.unit)}. Only ${formatQuantity(product.stock, product.unit)} available in stock${
          existing ? ` (you already have ${formatQuantity(existing.quantity, product.unit)} in cart)` : ''
        }.`
      );
    }

    // 2. Real user + real product -> persist to Supabase carts and cart_items
    if (!this.isDevPersona(userId) && !isFixture) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const cartId = await this.getOrCreateSupabaseCart(userId);
        if (cartId) {
          const now = new Date().toISOString();
          const itemId = existing?.id || crypto.randomUUID();

          const { error: upsertErr } = await supabase.from('cart_items').upsert(
            {
              cart_item_id: itemId,
              cart_id: cartId,
              product_id: productId,
              quantity: targetQty,
            },
            { onConflict: 'cart_item_id' }
          );

          if (!upsertErr) {
            await supabase.from('carts').update({ updated_at: now }).eq('cart_id', cartId);
            return { success: true };
          }
          console.warn('[SupabaseCarts] cart_items upsert notice, using overlay:', upsertErr.message);
        }
      }
    }

    // 3. Development persona or development fixture product -> isolated fixture cart
    const userItems = devCartStore.get(userId) || [];
    const idx = userItems.findIndex((c) => c.product_id === productId);
    if (idx !== -1) {
      userItems[idx].quantity = targetQty;
    } else {
      userItems.push({
        id: `ci_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        user_id: userId,
        product_id: productId,
        quantity: qty,
        added_at: new Date().toISOString(),
      });
    }
    devCartStore.set(userId, userItems);

    return { success: true };
  },

  /**
   * Update cart item quantity
   */
  async updateQuantity(
    userId: string,
    cartItemId: string,
    quantity: number
  ): Promise<{ success: boolean; removed?: boolean }> {
    const numQty = Number(quantity);

    if (numQty <= 0) {
      return await this.removeItem(userId, cartItemId);
    }

    if (!Number.isFinite(numQty)) {
      throw new Error('Quantity must be a valid number');
    }

    const currentCart = await this.getCart(userId);
    const item = currentCart.find((c) => c.id === cartItemId);
    if (!item) {
      throw new Error('Cart item not found or not owned by user');
    }

    const { product } = await CatalogRepository.getProductById(item.product_id);
    if (!product) {
      await this.removeItem(userId, cartItemId);
      throw new Error('Product is no longer available and was removed from your cart');
    }

    const val = isValidQuantityForUnit(numQty, product.unit);
    if (!val.valid) {
      throw new Error(val.error || `Invalid quantity for ${product.unit}`);
    }

    if (numQty > product.stock) {
      throw new Error(
        `Requested quantity (${formatQuantity(numQty, product.unit)}) exceeds available stock (${formatQuantity(product.stock, product.unit)}).`
      );
    }

    // Update in Supabase if real user
    if (!this.isDevPersona(userId)) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: numQty })
          .eq('cart_item_id', cartItemId);

        if (!error) {
          return { success: true };
        }
      }
    }

    // Update in devCartStore
    const userItems = devCartStore.get(userId) || [];
    const idx = userItems.findIndex((c) => c.id === cartItemId);
    if (idx !== -1) {
      userItems[idx].quantity = numQty;
      devCartStore.set(userId, userItems);
    }

    return { success: true };
  },

  /**
   * Remove item from cart
   */
  async removeItem(userId: string, cartItemId: string): Promise<{ success: boolean; removed: boolean }> {
    if (!this.isDevPersona(userId)) {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('cart_items').delete().eq('cart_item_id', cartItemId);
      }
    }

    const userItems = devCartStore.get(userId) || [];
    const filtered = userItems.filter((c) => c.id !== cartItemId);
    devCartStore.set(userId, filtered);

    return { success: true, removed: true };
  },

  /**
   * Clear all items from a user's cart
   */
  async clearCart(userId: string): Promise<{ success: boolean }> {
    if (!this.isDevPersona(userId)) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const cartId = await this.getOrCreateSupabaseCart(userId);
        if (cartId) {
          await supabase.from('cart_items').delete().eq('cart_id', cartId);
        }
      }
    }

    devCartStore.delete(userId);
    return { success: true };
  },
};
