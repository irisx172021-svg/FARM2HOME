import { Product } from '../../types.js';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient.js';
import { supabaseProductsRepo } from './supabaseProductsRepo.js';
import { DEVELOPMENT_PRODUCTS } from './developmentFixtures.js';

export const ALLOWED_DEV_FARMERS = ['usr_ramesh_farmer', 'usr_saraswathi_farmer', 'usr_anil_farmer'];

export interface ProductFilters {
  category?: string;
  farmerId?: string;
  search?: string;
  organicOnly?: boolean;
}

export interface SeedResult {
  strategy: string;
  productsSeeded: number;
  inventorySeeded: number;
  isIdempotent: boolean;
  blocker?: string;
  error?: string;
}

// In-memory runtime overlay for development fixtures
const devProductOverlay: Map<string, Partial<Product>> = new Map();
const devInventoryOverlay: Map<string, number> = new Map();
const devDeletedProductIds: Set<string> = new Set();

/**
 * CatalogRepository
 * Unified backend abstraction isolating production Supabase catalog from development fixtures.
 */
export const CatalogRepository = {
  /**
   * Helper to load canonical development fixture products from typed TypeScript constants
   */
  getDevelopmentFixtureProducts(): Product[] {
    const rawProducts: Product[] = DEVELOPMENT_PRODUCTS;

    return rawProducts
      .filter((p) => !devDeletedProductIds.has(p.id))
      .map((p) => {
        const overrides = devProductOverlay.get(p.id);
        const stockOverride = devInventoryOverlay.get(p.id);
        return {
          ...p,
          ...(overrides || {}),
          stock: stockOverride !== undefined ? stockOverride : (overrides?.stock ?? p.stock),
        };
      });
  },

  /**
   * Check if Supabase has the dedicated development_seed_products table
   */
  async isSupabaseFixtureTableAvailable(): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('development_seed_products').select('product_id').limit(0);
      return !error;
    } catch {
      return false;
    }
  },

  /**
   * Unified catalog read path
   */
  async getCatalogProducts(filters?: ProductFilters, effectiveUserId?: string): Promise<Product[]> {
    let realProducts: Product[] = [];
    if (supabaseProductsRepo.isAvailable()) {
      try {
        realProducts = await supabaseProductsRepo.getAllProducts(filters);
      } catch (err) {
        console.warn('[CatalogRepository] Error fetching real Supabase products:', err);
      }
    }

    // Load development fixture products
    let devFixtures: Product[] = [];
    const hasDbFixtures = await this.isSupabaseFixtureTableAvailable();

    if (hasDbFixtures) {
      const supabase = getSupabaseClient()!;
      let query = supabase.from('development_seed_products').select('*, development_seed_inventory(quantity)');
      if (filters?.farmerId) {
        query = query.eq('farmer_id', filters.farmerId);
      }
      if (filters?.category && filters.category !== 'All') {
        query = query.eq('category', filters.category);
      }
      if (filters?.organicOnly) {
        query = query.eq('is_organic', true);
      }
      const { data } = await query;
      if (data) {
        devFixtures = data.map((d: any) => ({
          id: d.product_id,
          farmer_id: d.farmer_id,
          farmer_name: d.farmer_name,
          farmer_location: d.farmer_location,
          title: d.title,
          description: d.description || '',
          category: d.category,
          price: Number(d.price),
          unit: d.unit,
          stock: Number(d.development_seed_inventory?.[0]?.quantity ?? d.stock ?? 0),
          is_organic: Boolean(d.is_organic),
          image_url: d.image_url || '',
          created_at: d.created_at,
        }));
      }
    } else {
      // Fallback to local development fixtures
      devFixtures = this.getDevelopmentFixtureProducts();
      if (filters?.farmerId) {
        devFixtures = devFixtures.filter((p) => p.farmer_id === filters.farmerId);
      }
      if (filters?.category && filters.category !== 'All') {
        devFixtures = devFixtures.filter((p) => p.category === filters.category);
      }
      if (filters?.organicOnly) {
        devFixtures = devFixtures.filter((p) => p.is_organic);
      }
    }

    if (filters?.search) {
      const term = filters.search.toLowerCase();
      devFixtures = devFixtures.filter(
        (p) =>
          p.title.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term) ||
          p.category.toLowerCase().includes(term) ||
          (p.farmer_name && p.farmer_name.toLowerCase().includes(term))
      );
    }

    // Deduplicate IDs
    const realIds = new Set(realProducts.map((p) => p.id));
    const uniqueDev = devFixtures.filter((p) => !realIds.has(p.id));

    return [...realProducts, ...uniqueDev];
  },

  /**
   * Get single product by ID
   */
  async getProductById(productId: string): Promise<{ product: Product | null; isFixture: boolean }> {
    // Check real Supabase products first
    if (supabaseProductsRepo.isAvailable()) {
      const real = await supabaseProductsRepo.getProductById(productId);
      if (real) {
        return { product: real, isFixture: false };
      }
    }

    // Check Supabase development fixtures if available
    const hasDbFixtures = await this.isSupabaseFixtureTableAvailable();
    if (hasDbFixtures) {
      const supabase = getSupabaseClient()!;
      const { data } = await supabase
        .from('development_seed_products')
        .select('*, development_seed_inventory(quantity)')
        .eq('product_id', productId)
        .maybeSingle();

      if (data) {
        const stock = Number(data.development_seed_inventory?.[0]?.quantity ?? data.stock ?? 0);
        return {
          product: {
            id: data.product_id,
            farmer_id: data.farmer_id,
            farmer_name: data.farmer_name,
            farmer_location: data.farmer_location,
            title: data.title,
            description: data.description || '',
            category: data.category,
            price: Number(data.price),
            unit: data.unit,
            stock,
            is_organic: Boolean(data.is_organic),
            image_url: data.image_url || '',
            created_at: data.created_at,
          },
          isFixture: true,
        };
      }
    }

    // Check fixtures fallback
    const fixtures = this.getDevelopmentFixtureProducts();
    const fix = fixtures.find((p) => p.id === productId);
    if (fix) {
      return { product: fix, isFixture: true };
    }

    return { product: null, isFixture: false };
  },

  /**
   * Update product via repository abstraction
   */
  async updateProduct(
    productId: string,
    updates: Partial<Product>,
    farmerId: string
  ): Promise<Product> {
    const { product, isFixture } = await this.getProductById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    // Ownership check
    if (product.farmer_id !== farmerId) {
      throw new Error('Forbidden: You can only edit your own crops');
    }

    if (!isFixture && supabaseProductsRepo.isAvailable()) {
      return await supabaseProductsRepo.updateProduct(productId, updates, farmerId);
    }

    // Fixture update
    const hasDbFixtures = await this.isSupabaseFixtureTableAvailable();
    if (hasDbFixtures) {
      const supabase = getSupabaseClient()!;
      await supabase
        .from('development_seed_products')
        .update({
          title: updates.title,
          description: updates.description,
          category: updates.category,
          price: updates.price,
          unit: updates.unit,
          stock: updates.stock,
          is_organic: updates.is_organic,
          image_url: updates.image_url,
          updated_at: new Date().toISOString(),
        })
        .eq('product_id', productId)
        .eq('farmer_id', farmerId);

      if (updates.stock !== undefined) {
        await supabase
          .from('development_seed_inventory')
          .update({ quantity: updates.stock, updated_at: new Date().toISOString() })
          .eq('product_id', productId);
      }
    } else {
      // Runtime overlay update
      const existing = devProductOverlay.get(productId) || {};
      devProductOverlay.set(productId, { ...existing, ...updates });
      if (updates.stock !== undefined) {
        devInventoryOverlay.set(productId, updates.stock);
      }
    }

    const updated = (await this.getProductById(productId)).product;
    return updated!;
  },

  /**
   * Update inventory stock via repository abstraction
   */
  async updateInventoryStock(
    productId: string,
    quantity: number,
    farmerId: string
  ): Promise<{ productId: string; stock: number }> {
    if (quantity < 0) {
      throw new Error('Stock quantity cannot be negative');
    }

    const { product, isFixture } = await this.getProductById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    if (product.farmer_id !== farmerId) {
      throw new Error('Forbidden: You can only update your own crop inventory');
    }

    if (!isFixture && supabaseProductsRepo.isAvailable()) {
      await supabaseProductsRepo.updateInventoryStock(productId, quantity, farmerId);
      return { productId, stock: quantity };
    }

    // Fixture update
    const hasDbFixtures = await this.isSupabaseFixtureTableAvailable();
    if (hasDbFixtures) {
      const supabase = getSupabaseClient()!;
      await supabase
        .from('development_seed_inventory')
        .update({ quantity, updated_at: new Date().toISOString() })
        .eq('product_id', productId);
    } else {
      devInventoryOverlay.set(productId, quantity);
    }

    return { productId, stock: quantity };
  },

  /**
   * Delete product
   */
  async deleteProduct(productId: string, farmerId: string): Promise<boolean> {
    const { product, isFixture } = await this.getProductById(productId);
    if (!product) {
      return false;
    }

    if (product.farmer_id !== farmerId) {
      throw new Error('Forbidden: You can only delete your own crops');
    }

    if (!isFixture && supabaseProductsRepo.isAvailable()) {
      return await supabaseProductsRepo.deleteProduct(productId, farmerId);
    }

    const hasDbFixtures = await this.isSupabaseFixtureTableAvailable();
    if (hasDbFixtures) {
      const supabase = getSupabaseClient()!;
      await supabase.from('development_seed_inventory').delete().eq('product_id', productId);
      await supabase.from('development_seed_products').delete().eq('product_id', productId);
    } else {
      devDeletedProductIds.add(productId);
    }

    return true;
  },

  /**
   * Real user isolation check
   */
  isRealFarmer(farmerId: string): boolean {
    return !ALLOWED_DEV_FARMERS.includes(farmerId);
  },

  /**
   * Attempt development seed into Supabase development-fixture tables
   */
  async seedDevelopmentFixtures(): Promise<SeedResult> {
    if (process.env.NODE_ENV === 'production') {
      return {
        strategy: 'none',
        productsSeeded: 0,
        inventorySeeded: 0,
        isIdempotent: true,
        blocker: 'Development seed is disabled in production environment.',
      };
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        strategy: 'none',
        productsSeeded: 0,
        inventorySeeded: 0,
        isIdempotent: true,
        blocker: 'Supabase client is not configured.',
      };
    }

    const available = await this.isSupabaseFixtureTableAvailable();
    if (!available) {
      return {
        strategy: 'isolated_fixture_tables',
        productsSeeded: 0,
        inventorySeeded: 0,
        isIdempotent: true,
        blocker:
          'Supabase schema blocker: Dedicated tables "development_seed_products" and "development_seed_inventory" do not exist yet in PostgreSQL. PostgREST REST API does not permit arbitrary DDL execution. Creation must occur via PostgreSQL migration/SQL Editor.',
      };
    }

    // Seed into Supabase development_seed_products and development_seed_inventory
    const fixtures = this.getDevelopmentFixtureProducts();
    let pCount = 0;
    let iCount = 0;

    for (const p of fixtures) {
      const { error: pErr } = await supabase.from('development_seed_products').upsert(
        {
          product_id: p.id,
          farmer_id: p.farmer_id,
          farmer_name: p.farmer_name || 'Farmer',
          farmer_location: p.farmer_location || 'Telangana',
          title: p.title,
          description: p.description,
          category: p.category,
          price: p.price,
          unit: p.unit,
          stock: p.stock,
          is_organic: p.is_organic,
          image_url: p.image_url,
          status: 'active',
          created_at: p.created_at,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'product_id' }
      );

      if (!pErr) pCount++;

      const { error: iErr } = await supabase.from('development_seed_inventory').upsert(
        {
          inventory_id: `inv_${p.id}`,
          product_id: p.id,
          farmer_id: p.farmer_id,
          quantity: p.stock,
          reserved_quantity: 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'product_id' }
      );

      if (!iErr) iCount++;
    }

    return {
      strategy: 'isolated_fixture_tables',
      productsSeeded: pCount,
      inventorySeeded: iCount,
      isIdempotent: true,
    };
  },
};
