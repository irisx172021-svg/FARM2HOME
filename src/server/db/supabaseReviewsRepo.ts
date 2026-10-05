import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Review, UserRole } from '../../types.js';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient.js';
import { CatalogRepository } from './catalogRepository.js';
import { supabaseOrdersRepo } from './supabaseOrdersRepo.js';

// Development personas list
const DEV_PERSONAS = ['usr_rahul_customer', 'usr_ramesh_farmer', 'usr_saraswathi_farmer', 'usr_vikram_delivery'];

// Isolated in-memory store for development fixture reviews (does not mutate farm2home.json)
let devReviewsCache: Review[] | null = null;

function loadInitialDevReviews(): Review[] {
  if (devReviewsCache) return devReviewsCache;
  try {
    const jsonPath = path.join(process.cwd(), 'data', 'farm2home.json');
    if (fs.existsSync(jsonPath)) {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      if (Array.isArray(data.reviews)) {
        devReviewsCache = JSON.parse(JSON.stringify(data.reviews));
        return devReviewsCache!;
      }
    }
  } catch (err) {
    console.warn('[SupabaseReviews] Failed to load legacy dev reviews from JSON:', err);
  }
  devReviewsCache = [];
  return devReviewsCache;
}

export const supabaseReviewsRepo = {
  isAvailable(): boolean {
    return isSupabaseConfigured();
  },

  isDevPersona(userId: string): boolean {
    return DEV_PERSONAS.includes(userId);
  },

  isDevReview(reviewId: string): boolean {
    return reviewId.startsWith('rev_') || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reviewId);
  },

  /**
   * Create a review for a delivered order + product with strict eligibility validation
   */
  async createReview(params: {
    userId: string;
    customerName: string;
    orderId: string;
    productId: string;
    rating: number;
    comment: string;
  }): Promise<{ success: boolean; review: Review }> {
    const { userId, customerName, orderId, productId, rating, comment } = params;

    // 1. Parameter format validations
    if (!orderId || typeof orderId !== 'string' || !orderId.trim()) {
      throw new Error('Valid orderId is required');
    }
    if (!productId || typeof productId !== 'string' || !productId.trim()) {
      throw new Error('Valid productId is required');
    }
    const cleanOrderId = orderId.trim();
    const cleanProductId = productId.trim();

    const numRating = Number(rating);
    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      throw new Error('Rating must be an integer between 1 and 5');
    }

    if (!comment || typeof comment !== 'string' || comment.trim().length < 3) {
      throw new Error('Review comment must be at least 3 characters long');
    }
    if (comment.trim().length > 1000) {
      throw new Error('Review comment cannot exceed 1000 characters');
    }
    const cleanComment = comment.trim();

    // 2. Validate product exists in catalog
    const { product, isFixture } = await CatalogRepository.getProductById(cleanProductId);
    if (!product) {
      throw new Error('Product not found or inactive');
    }

    // 3. Review eligibility check against orders
    const isDev = this.isDevPersona(userId);
    const customerOrders = await supabaseOrdersRepo.getOrders(userId, 'customer');
    const order = customerOrders.find((o) => o.id === cleanOrderId);

    if (!order) {
      throw new Error('Order not found or does not belong to you');
    }

    // Customer must be the owner of the order
    if (order.customer_id !== userId) {
      throw new Error('Forbidden: You can only review your own orders');
    }

    // Order must be in completed 'delivered' state
    if (order.status !== 'delivered') {
      throw new Error(`Only delivered orders can be reviewed. Current order status: "${order.status}"`);
    }

    // Order must contain the specified product
    const orderItem = order.items.find((item) => item.product_id === cleanProductId);
    if (!orderItem) {
      throw new Error(`This order does not contain product "${product.title}"`);
    }

    const farmerId = product.farmer_id || order.farmer_id;
    const now = new Date().toISOString();

    // 4. Duplicate review prevention
    if (isDev || isFixture) {
      const devStore = loadInitialDevReviews();
      const duplicate = devStore.find(
        (r) =>
          r.customer_id === userId &&
          r.order_id === cleanOrderId &&
          (r.product_id === cleanProductId || r.farmer_id === farmerId)
      );
      if (duplicate) {
        throw new Error('You have already submitted a review for this product in this order');
      }

      const devReview: Review = {
        id: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        order_id: cleanOrderId,
        customer_id: userId,
        customer_name: customerName || 'Customer',
        farmer_id: farmerId,
        product_id: cleanProductId,
        rating: numRating,
        comment: cleanComment,
        created_at: now,
      };

      devStore.unshift(devReview);
      return { success: true, review: devReview };
    }

    // Real authenticated user with real product & order -> Supabase
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Database client unavailable');
    }

    // Check duplicate in Supabase
    const { data: existingRev, error: dupCheckErr } = await supabase
      .from('reviews')
      .select('review_id')
      .eq('user_id', userId)
      .eq('order_id', cleanOrderId)
      .eq('product_id', cleanProductId)
      .maybeSingle();

    if (dupCheckErr) {
      console.warn('[SupabaseReviews] Duplicate check error:', dupCheckErr.message);
    }
    if (existingRev) {
      throw new Error('You have already submitted a review for this product in this order');
    }

    const reviewId = crypto.randomUUID();
    const { error: insErr } = await supabase.from('reviews').insert({
      review_id: reviewId,
      user_id: userId,
      product_id: cleanProductId,
      order_id: cleanOrderId,
      rating: numRating,
      review_text: cleanComment,
      created_at: now,
      updated_at: now,
    });

    if (insErr) {
      console.error('[SupabaseReviews] Insert error:', insErr.message);
      throw new Error(`Failed to save review in database: ${insErr.message}`);
    }

    const createdReview: Review = {
      id: reviewId,
      order_id: cleanOrderId,
      customer_id: userId,
      customer_name: customerName || 'Verified Customer',
      farmer_id: farmerId,
      product_id: cleanProductId,
      rating: numRating,
      comment: cleanComment,
      created_at: now,
    };

    return { success: true, review: createdReview };
  },

  /**
   * Retrieve reviews for a product (sanitized for public viewing)
   */
  async getReviewsByProduct(productId: string): Promise<Review[]> {
    const supabase = getSupabaseClient();
    const realReviews: Review[] = [];

    if (supabase) {
      try {
        const { data: rows, error } = await supabase
          .from('reviews')
          .select(`
            review_id,
            user_id,
            product_id,
            order_id,
            rating,
            review_text,
            created_at,
            user:users!reviews_user_id_fkey(user_id, display_name)
          `)
          .eq('product_id', productId)
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('[SupabaseReviews] Error fetching product reviews:', error.message);
        } else if (rows) {
          const { product } = await CatalogRepository.getProductById(productId);
          for (const row of rows) {
            realReviews.push({
              id: row.review_id,
              order_id: row.order_id || '',
              customer_id: row.user_id,
              customer_name: (row.user as any)?.display_name || 'Verified Customer',
              farmer_id: product?.farmer_id || '',
              product_id: row.product_id,
              rating: Number(row.rating),
              comment: row.review_text || '',
              created_at: row.created_at,
            });
          }
        }
      } catch (err) {
        console.error('[SupabaseReviews] Exception getting product reviews:', err);
      }
    }

    // Merge with dev reviews matching product
    const devStore = loadInitialDevReviews();
    const devMatching = devStore.filter((r) => r.product_id === productId);

    const combined = [...realReviews, ...devMatching];
    combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return combined;
  },

  /**
   * Retrieve reviews for a farmer's products (authorized for farmer view)
   */
  async getReviewsByFarmer(farmerId: string): Promise<Review[]> {
    const supabase = getSupabaseClient();
    const realReviews: Review[] = [];

    if (supabase) {
      try {
        // Query products belonging to this farmer
        const { data: farmerProducts } = await supabase
          .from('products')
          .select('product_id')
          .eq('farmer_id', farmerId);

        const productIds = (farmerProducts || []).map((p) => p.product_id);

        if (productIds.length > 0) {
          const { data: rows, error } = await supabase
            .from('reviews')
            .select(`
              review_id,
              user_id,
              product_id,
              order_id,
              rating,
              review_text,
              created_at,
              user:users!reviews_user_id_fkey(user_id, display_name)
            `)
            .in('product_id', productIds)
            .order('created_at', { ascending: false });

          if (error) {
            console.warn('[SupabaseReviews] Error fetching farmer reviews:', error.message);
          } else if (rows) {
            for (const row of rows) {
              realReviews.push({
                id: row.review_id,
                order_id: row.order_id || '',
                customer_id: row.user_id,
                customer_name: (row.user as any)?.display_name || 'Verified Customer',
                farmer_id: farmerId,
                product_id: row.product_id,
                rating: Number(row.rating),
                comment: row.review_text || '',
                created_at: row.created_at,
              });
            }
          }
        }
      } catch (err) {
        console.error('[SupabaseReviews] Exception getting farmer reviews:', err);
      }
    }

    // Merge with dev reviews for this farmer
    const devStore = loadInitialDevReviews();
    const devMatching = devStore.filter((r) => r.farmer_id === farmerId);

    const combined = [...realReviews, ...devMatching];
    combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return combined;
  },

  /**
   * Retrieve all reviews (sanitized)
   */
  async getAllReviews(): Promise<Review[]> {
    const supabase = getSupabaseClient();
    const realReviews: Review[] = [];

    if (supabase) {
      try {
        const { data: rows, error } = await supabase
          .from('reviews')
          .select(`
            review_id,
            user_id,
            product_id,
            order_id,
            rating,
            review_text,
            created_at,
            user:users!reviews_user_id_fkey(user_id, display_name)
          `)
          .order('created_at', { ascending: false });

        if (!error && rows) {
          for (const row of rows) {
            realReviews.push({
              id: row.review_id,
              order_id: row.order_id || '',
              customer_id: row.user_id,
              customer_name: (row.user as any)?.display_name || 'Verified Customer',
              farmer_id: '',
              product_id: row.product_id,
              rating: Number(row.rating),
              comment: row.review_text || '',
              created_at: row.created_at,
            });
          }
        }
      } catch (err) {
        console.error('[SupabaseReviews] Exception in getAllReviews:', err);
      }
    }

    const devStore = loadInitialDevReviews();
    const combined = [...realReviews, ...devStore];
    combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return combined;
  },
};
