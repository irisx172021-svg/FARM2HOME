import {
  Profile,
  Product,
  CartItem,
  WishlistItem,
  Order,
  BrowseHistoryItem,
  DemandAnalytics,
  WeatherDay,
  Role,
} from '../types';

export const api = {
  // Profiles & Auth
  async getProfiles(): Promise<{ profiles: Profile[] }> {
    const res = await fetch('/api/profiles');
    if (!res.ok) throw new Error('Failed to fetch profiles');
    return res.json();
  },

  async login(data: {
    authMethod: 'phone' | 'email';
    identifier: string;
    role?: Role;
    fullName?: string;
    farmName?: string;
    location?: string;
  }): Promise<{ profile: Profile; isNew: boolean }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Login failed');
    }
    return res.json();
  },

  async updateProfile(id: string, updates: Partial<Profile>): Promise<{ profile: Profile }> {
    const res = await fetch(`/api/profiles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update profile');
    return res.json();
  },

  // Products
  async getProducts(params?: {
    category?: string;
    farmerId?: string;
    search?: string;
    organicOnly?: boolean;
  }): Promise<{ products: Product[] }> {
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'All') query.set('category', params.category);
    if (params?.farmerId) query.set('farmerId', params.farmerId);
    if (params?.search) query.set('search', params.search);
    if (params?.organicOnly) query.set('organicOnly', 'true');

    const res = await fetch(`/api/products?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch products');
    return res.json();
  },

  async createProduct(data: {
    farmerId: string;
    title: string;
    description: string;
    category: string;
    price: number;
    unit: string;
    stock: number;
    isOrganic: boolean;
    imageUrl?: string;
  }): Promise<{ product: Product }> {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to list product');
    }
    return res.json();
  },

  async updateProduct(id: string, data: Partial<Product> & { farmerId: string }): Promise<{ product: Product }> {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update product');
    }
    return res.json();
  },

  async deleteProduct(id: string, farmerId: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/products/${id}?farmerId=${farmerId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete product');
    }
    return res.json();
  },

  // Cart
  async getCart(userId: string): Promise<{ cart: CartItem[] }> {
    const res = await fetch(`/api/cart?userId=${userId}`);
    if (!res.ok) throw new Error('Failed to fetch cart');
    return res.json();
  },

  async addToCart(userId: string, productId: string, quantity: number = 1): Promise<{ success: boolean }> {
    const res = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, productId, quantity }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to add item to cart');
    }
    return res.json();
  },

  async updateCartQuantity(cartItemId: string, userId: string, quantity: number): Promise<{ success: boolean; removed?: boolean }> {
    const res = await fetch(`/api/cart/${cartItemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, quantity }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update cart');
    }
    return res.json();
  },

  async removeFromCart(cartItemId: string, userId: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/cart/${cartItemId}?userId=${userId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to remove cart item');
    return res.json();
  },

  // Wishlist
  async getWishlist(userId: string): Promise<{ wishlist: WishlistItem[] }> {
    const res = await fetch(`/api/wishlist?userId=${userId}`);
    if (!res.ok) throw new Error('Failed to fetch wishlist');
    return res.json();
  },

  async toggleWishlist(userId: string, productId: string): Promise<{ isWishlisted: boolean }> {
    const res = await fetch('/api/wishlist/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, productId }),
    });
    if (!res.ok) throw new Error('Failed to update wishlist');
    return res.json();
  },

  // Browse History
  async getBrowseHistory(userId: string): Promise<{ history: BrowseHistoryItem[] }> {
    const res = await fetch(`/api/browse-history?userId=${userId}`);
    if (!res.ok) throw new Error('Failed to fetch browse history');
    return res.json();
  },

  async recordBrowse(userId: string, productId: string): Promise<{ success: boolean }> {
    const res = await fetch('/api/browse-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, productId }),
    });
    if (!res.ok) throw new Error('Failed to record browse history');
    return res.json();
  },

  // Orders
  async getOrders(userId: string, role: Role): Promise<{ orders: Order[] }> {
    const res = await fetch(`/api/orders?userId=${userId}&role=${role}`);
    if (!res.ok) throw new Error('Failed to fetch orders');
    return res.json();
  },

  async checkout(userId: string, deliveryAddress: string): Promise<{ success: boolean; orders: Order[] }> {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, deliveryAddress }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to place order');
    }
    return res.json();
  },

  async updateOrderStatus(
    orderId: string,
    data: { userId: string; role: Role; status: string; otpCode?: string }
  ): Promise<{ order: Order }> {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update order status');
    }
    return res.json();
  },

  // Farmer Analytics
  async getFarmerAnalytics(farmerId: string): Promise<{ analytics: DemandAnalytics }> {
    const res = await fetch(`/api/farmer/analytics/${farmerId}`);
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  // Weather
  async getWeather(): Promise<{ forecast: WeatherDay[] }> {
    const res = await fetch('/api/weather');
    if (!res.ok) throw new Error('Failed to fetch weather forecast');
    return res.json();
  },

  // AI Assistant
  async askAiAssistant(prompt: string, language: string = 'en', role: Role = 'customer'): Promise<{ answer: string }> {
    const res = await fetch('/api/ai/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, language, role }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'AI Assistant consultation failed');
    }
    return res.json();
  },
};

// Backwards-compatible alias for uppercase API
export const API = {
  ...api,
  createOrder: api.checkout,
  recordBrowseHistory: api.recordBrowse,
  updateCartQty: api.updateCartQuantity,
};
