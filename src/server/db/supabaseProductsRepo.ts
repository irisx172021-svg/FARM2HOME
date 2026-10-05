import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient.js';
import { Product } from '../../types.js';

export interface SupabaseProductRow {
  product_id: string;
  farmer_id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  unit: string;
  organic: boolean;
  image_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  inventory?: {
    inventory_id: string;
    quantity: number;
    reserved_quantity: number;
    updated_at: string;
  } | {
    inventory_id: string;
    quantity: number;
    reserved_quantity: number;
    updated_at: string;
  }[];
  users?: {
    user_id: string;
    display_name: string;
    role?: string;
  } | null;
}

export interface MigrationResult {
  migratedProducts: string[];
  migratedInventory: string[];
  skippedProducts: { productId: string; reason: string; nothingWritten: boolean }[];
  skippedInventory: { productId: string; reason: string }[];
  foreignKeyBlockers: string[];
}

export const supabaseProductsRepo = {
  isAvailable(): boolean {
    return isSupabaseConfigured();
  },

  /**
   * Fetch all products from Supabase with inventory and farmer information
   */
  async getAllProducts(filters?: {
    category?: string;
    farmerId?: string;
    search?: string;
    organicOnly?: boolean;
  }): Promise<Product[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    let query = supabase
      .from('products')
      .select('*, inventory(inventory_id, quantity, reserved_quantity, updated_at), users(user_id, display_name)')
      .eq('status', 'active');

    if (filters?.farmerId) {
      query = query.eq('farmer_id', filters.farmerId);
    }
    if (filters?.category && filters.category !== 'All') {
      query = query.eq('category', filters.category);
    }
    if (filters?.organicOnly) {
      query = query.eq('organic', true);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('[SupabaseProducts] getAllProducts error:', error.message);
      return [];
    }

    if (!data) return [];

    const products: Product[] = data.map((r: any) => {
      const inv = Array.isArray(r.inventory) ? r.inventory[0] : r.inventory;
      const stock = inv?.quantity !== undefined ? Number(inv.quantity) : 0;
      return {
        id: r.product_id,
        farmer_id: r.farmer_id,
        farmer_name: r.users?.display_name || 'Farm2Home Verified Farmer',
        farmer_location: 'Telangana / Andhra Region',
        title: r.name,
        description: r.description || '',
        category: r.category,
        price: Number(r.price),
        unit: r.unit,
        stock,
        is_organic: Boolean(r.organic),
        image_url: r.image_url || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800',
        created_at: r.created_at,
      };
    });

    if (filters?.search) {
      const term = filters.search.toLowerCase();
      return products.filter(
        (p) =>
          p.title.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term) ||
          p.category.toLowerCase().includes(term) ||
          (p.farmer_name && p.farmer_name.toLowerCase().includes(term))
      );
    }

    return products;
  },

  /**
   * Get single product by product_id
   */
  async getProductById(productId: string): Promise<Product | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('products')
      .select('*, inventory(inventory_id, quantity, reserved_quantity, updated_at), users(user_id, display_name)')
      .eq('product_id', productId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const inv = Array.isArray(data.inventory) ? data.inventory[0] : data.inventory;
    const stock = inv?.quantity !== undefined ? Number(inv.quantity) : 0;

    return {
      id: data.product_id,
      farmer_id: data.farmer_id,
      farmer_name: data.users?.display_name || 'Farm2Home Verified Farmer',
      farmer_location: 'Telangana / Andhra Region',
      title: data.name,
      description: data.description || '',
      category: data.category,
      price: Number(data.price),
      unit: data.unit,
      stock,
      is_organic: Boolean(data.organic),
      image_url: data.image_url || '',
      created_at: data.created_at,
    };
  },

  /**
   * Create a new product and its corresponding inventory row in Supabase
   */
  async createProduct(params: {
    productId?: string;
    farmerId: string;
    title: string;
    description: string;
    category: string;
    price: number;
    unit: string;
    stock: number;
    isOrganic: boolean;
    imageUrl?: string;
    createdAt?: string;
  }): Promise<Product> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    const productId = params.productId || 'prod_' + Date.now();
    const now = params.createdAt || new Date().toISOString();

    // 1. Insert product
    const { error: prodError } = await supabase.from('products').insert({
      product_id: productId,
      farmer_id: params.farmerId,
      name: params.title.trim(),
      description: params.description ? params.description.trim() : null,
      category: params.category,
      price: params.price,
      unit: params.unit,
      organic: Boolean(params.isOrganic),
      image_url: params.imageUrl || null,
      status: 'active',
      created_at: now,
      updated_at: now,
    });

    if (prodError) {
      console.error('[SupabaseProducts] createProduct error:', prodError);
      throw new Error(`Failed to create product in Supabase: ${prodError.message}`);
    }

    // 2. Insert inventory
    const inventoryId = `inv_${productId}`;
    const { error: invError } = await supabase.from('inventory').insert({
      inventory_id: inventoryId,
      product_id: productId,
      quantity: params.stock,
      reserved_quantity: 0,
      updated_at: now,
    });

    if (invError) {
      console.error('[SupabaseProducts] createInventory error, rolling back product:', invError);
      await supabase.from('products').delete().eq('product_id', productId);
      throw new Error(`Failed to create inventory in Supabase: ${invError.message}`);
    }

    const created = await this.getProductById(productId);
    if (!created) {
      throw new Error('Failed to retrieve newly created product from Supabase');
    }
    return created;
  },

  /**
   * Update an existing product and its inventory in Supabase
   */
  async updateProduct(
    productId: string,
    updates: {
      title?: string;
      description?: string;
      category?: string;
      price?: number;
      unit?: string;
      stock?: number;
      is_organic?: boolean;
      image_url?: string;
    },
    farmerId: string
  ): Promise<Product> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    // 1. Authorization check
    const existing = await this.getProductById(productId);
    if (!existing) {
      throw new Error('Product not found in Supabase');
    }
    if (existing.farmer_id !== farmerId) {
      throw new Error('Forbidden: You can only edit your own crops');
    }

    const now = new Date().toISOString();
    const prodUpdates: any = { updated_at: now };

    if (updates.title !== undefined) prodUpdates.name = updates.title.trim();
    if (updates.description !== undefined) prodUpdates.description = updates.description.trim();
    if (updates.category !== undefined) prodUpdates.category = updates.category;
    if (updates.price !== undefined) prodUpdates.price = updates.price;
    if (updates.unit !== undefined) prodUpdates.unit = updates.unit;
    if (updates.is_organic !== undefined) prodUpdates.organic = Boolean(updates.is_organic);
    if (updates.image_url !== undefined) prodUpdates.image_url = updates.image_url;

    const { error: prodError } = await supabase
      .from('products')
      .update(prodUpdates)
      .eq('product_id', productId)
      .eq('farmer_id', farmerId);

    if (prodError) {
      throw new Error(`Failed to update product in Supabase: ${prodError.message}`);
    }

    // 2. Update inventory if stock is provided
    if (updates.stock !== undefined) {
      if (updates.stock < 0) {
        throw new Error('Stock quantity cannot be negative');
      }
      const { error: invError } = await supabase
        .from('inventory')
        .update({ quantity: updates.stock, updated_at: now })
        .eq('product_id', productId);

      if (invError) {
        throw new Error(`Failed to update inventory in Supabase: ${invError.message}`);
      }
    }

    const updated = await this.getProductById(productId);
    if (!updated) {
      throw new Error('Failed to retrieve updated product');
    }
    return updated;
  },

  /**
   * Update inventory stock quantity directly
   */
  async updateInventoryStock(
    productId: string,
    quantity: number,
    farmerId: string
  ): Promise<{ productId: string; quantity: number }> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    if (quantity < 0) {
      throw new Error('Stock quantity cannot be negative');
    }

    const existing = await this.getProductById(productId);
    if (!existing) {
      throw new Error('Product not found in Supabase');
    }
    if (existing.farmer_id !== farmerId) {
      throw new Error('Forbidden: You can only edit your own crop inventory');
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('inventory')
      .update({ quantity, updated_at: now })
      .eq('product_id', productId);

    if (error) {
      throw new Error(`Failed to update stock in Supabase: ${error.message}`);
    }

    return { productId, quantity };
  },

  /**
   * Delete a product and its inventory from Supabase
   */
  async deleteProduct(productId: string, farmerId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    const existing = await this.getProductById(productId);
    if (!existing) {
      return false;
    }
    if (existing.farmer_id !== farmerId) {
      throw new Error('Forbidden: You can only delete your own crops');
    }

    // Delete inventory first to be clean
    await supabase.from('inventory').delete().eq('product_id', productId);
    const { error } = await supabase.from('products').delete().eq('product_id', productId).eq('farmer_id', farmerId);

    if (error) {
      throw new Error(`Failed to delete product in Supabase: ${error.message}`);
    }

    return true;
  },

  /**
   * Controlled, idempotent migration function from JSON products
   * Strictly adheres to Sections 4 & 14 ownership rules.
   */
  async runProductsMigration(jsonProducts: any[]): Promise<MigrationResult> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    const result: MigrationResult = {
      migratedProducts: [],
      migratedInventory: [],
      skippedProducts: [],
      skippedInventory: [],
      foreignKeyBlockers: [],
    };

    // 1. Fetch all existing users in Supabase to verify foreign keys
    const { data: users, error: userError } = await supabase.from('users').select('user_id');
    if (userError) {
      throw new Error(`Cannot verify farmer ownership in Supabase: ${userError.message}`);
    }

    const existingUserIds = new Set((users || []).map((u: any) => u.user_id));

    for (const p of jsonProducts) {
      const farmerId = p.farmer_id || p.farmerId;
      const productId = p.id;

      // Ownership Check: Section 4 & 14
      if (!farmerId || !existingUserIds.has(farmerId)) {
        const blockerMsg = `Foreign-key constraint blocker: products.farmer_id (${farmerId}) does not exist in Supabase users table. Refusing to invent fake accounts or insert invalid foreign key.`;
        result.skippedProducts.push({
          productId,
          reason: blockerMsg,
          nothingWritten: true,
        });
        result.skippedInventory.push({
          productId,
          reason: `Inventory skipped because product ${productId} was not migrated due to farmer foreign-key blocker.`,
        });
        if (!result.foreignKeyBlockers.includes(blockerMsg)) {
          result.foreignKeyBlockers.push(blockerMsg);
        }
        continue;
      }

      // If farmer exists in Supabase users, perform idempotent upsert
      try {
        const now = p.created_at || new Date().toISOString();
        const { error: prodUpsertError } = await supabase.from('products').upsert(
          {
            product_id: productId,
            farmer_id: farmerId,
            name: p.title || p.name,
            description: p.description || null,
            category: p.category || 'Vegetables',
            price: Number(p.price) || 0,
            unit: p.unit || 'kg',
            organic: Boolean(p.is_organic),
            image_url: p.image_url || null,
            status: 'active',
            created_at: now,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'product_id' }
        );

        if (prodUpsertError) {
          result.skippedProducts.push({
            productId,
            reason: prodUpsertError.message,
            nothingWritten: true,
          });
          continue;
        }

        result.migratedProducts.push(productId);

        // Upsert inventory
        const inventoryId = `inv_${productId}`;
        const { error: invUpsertError } = await supabase.from('inventory').upsert(
          {
            inventory_id: inventoryId,
            product_id: productId,
            quantity: Number(p.stock) || 0,
            reserved_quantity: 0,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'inventory_id' }
        );

        if (invUpsertError) {
          result.skippedInventory.push({
            productId,
            reason: invUpsertError.message,
          });
        } else {
          result.migratedInventory.push(productId);
        }
      } catch (err: any) {
        result.skippedProducts.push({
          productId,
          reason: err.message,
          nothingWritten: true,
        });
      }
    }

    return result;
  },
};
