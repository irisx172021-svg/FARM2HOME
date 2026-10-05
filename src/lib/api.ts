import {
  Profile,
  Product,
  CartItem,
  WishlistItem,
  Order,
  BrowseHistoryItem,
  Review,
  CropPlan,
  AiConversation,
  AiMessage,
  DemandAnalytics,
  WeatherDay,
  Role,
  Language,
  AssistantResponse,
  AuthProvider,
  UserAccount,
} from '../types';

const TOKEN_KEY = 'f2h_auth_session_token';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {}
}

export function clearAuthToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

function authHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extraHeaders || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  getAuthToken,
  setAuthToken,
  clearAuthToken,

  // 1. Current Authenticated Session & Profile
  async getMe(): Promise<{ profile: Profile; user: UserAccount }> {
    const res = await fetch('/api/auth/me', {
      headers: authHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Session not authenticated');
    }
    return res.json();
  },

  // 2. Email & Password Authentication
  async registerEmail(data: {
    email: string;
    password: string;
    fullName: string;
    role?: Role;
    preferredLanguage?: Language;
    location?: string;
    farmName?: string;
  }): Promise<{ sessionToken: string; profile: Profile; user: UserAccount }> {
    const res = await fetch('/api/auth/register-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Registration failed');
    }
    const result = await res.json();
    if (result.sessionToken) {
      setAuthToken(result.sessionToken);
    }
    return result;
  },

  async loginEmail(data: {
    email: string;
    password: string;
  }): Promise<{ sessionToken: string; profile: Profile; user: UserAccount }> {
    const res = await fetch('/api/auth/login-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Invalid email or password');
    }
    const result = await res.json();
    if (result.sessionToken) {
      setAuthToken(result.sessionToken);
    }
    return result;
  },

  // 3. Phone OTP Authentication
  async sendPhoneOtp(phone: string): Promise<{
    success: boolean;
    ticket: string;
    devOtp?: string;
    expiresAt: number;
    message: string;
  }> {
    const res = await fetch('/api/auth/phone/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to send OTP code');
    }
    return res.json();
  },

  async verifyPhoneOtp(data: {
    phone: string;
    otp: string;
    ticket: string;
    fullName?: string;
    role?: Role;
    preferredLanguage?: Language;
    location?: string;
    farmName?: string;
  }): Promise<{ sessionToken: string; profile: Profile; isNew: boolean; user: UserAccount }> {
    const res = await fetch('/api/auth/phone/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'OTP verification failed');
    }
    const result = await res.json();
    if (result.sessionToken) {
      setAuthToken(result.sessionToken);
    }
    return result;
  },

  // 4. Google Sign-In
  async loginGoogle(data: {
    credential?: string;
    email?: string;
    name?: string;
    picture?: string;
    sub?: string;
    role?: Role;
  }): Promise<{ sessionToken: string; profile: Profile; isNew: boolean; user: UserAccount }> {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Google authentication failed');
    }
    const result = await res.json();
    if (result.sessionToken) {
      setAuthToken(result.sessionToken);
    }
    return result;
  },

  // 5. Passkey (WebAuthn)
  async getPasskeyChallenge(): Promise<{
    challenge: string;
    rp: { name: string; id: string };
    user?: { id: string; name: string; displayName: string };
  }> {
    const res = await fetch('/api/auth/passkey/generate-challenge', {
      method: 'POST',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to generate passkey challenge');
    return res.json();
  },

  async registerPasskey(data: {
    challenge: string;
    credential: { id: string; rawId?: string; type?: string; response?: any };
  }): Promise<{ success: boolean; linkedProviders: AuthProvider[] }> {
    const res = await fetch('/api/auth/passkey/register', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to register passkey');
    }
    return res.json();
  },

  async loginPasskey(data: {
    challenge: string;
    credential: { id: string; response?: any };
  }): Promise<{ sessionToken: string; profile: Profile; user: UserAccount }> {
    const res = await fetch('/api/auth/passkey/verify-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Passkey verification failed');
    }
    const result = await res.json();
    if (result.sessionToken) {
      setAuthToken(result.sessionToken);
    }
    return result;
  },

  // 6. Role Onboarding
  async onboardRole(data: {
    role: Role;
    farmName?: string;
    location?: string;
  }): Promise<{ success: boolean; profile: Profile; user: UserAccount }> {
    const res = await fetch('/api/auth/onboard-role', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update account role');
    }
    return res.json();
  },

  // 7. Account Linking
  async linkIdentity(data: {
    provider: AuthProvider;
    providerUid: string;
    password?: string;
  }): Promise<{ success: boolean; linkedProviders: AuthProvider[] }> {
    const res = await fetch('/api/auth/link-identity', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to link authentication method');
    }
    return res.json();
  },

  // 8. Development Persona Login (Produces authentic server session)
  async devLogin(personaId: string): Promise<{
    sessionToken: string;
    profile: Profile;
    user: UserAccount;
  }> {
    const res = await fetch('/api/auth/dev-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personaId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Persona login failed');
    }
    const result = await res.json();
    if (result.sessionToken) {
      setAuthToken(result.sessionToken);
    }
    return result;
  },

  // 9. Sign Out / Invalidate Session
  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: authHeaders(),
      });
    } catch {
      // ignore
    } finally {
      clearAuthToken();
    }
  },

  // 10. Legacy Profiles & Auth API (Kept for backwards compatibility)
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
  }): Promise<{ profile: Profile; isNew: boolean; sessionToken?: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Login failed');
    }
    const result = await res.json();
    if (result.sessionToken) {
      setAuthToken(result.sessionToken);
    }
    return result;
  },

  async updateProfile(id: string, updates: Partial<Profile>): Promise<{ profile: Profile }> {
    const res = await fetch(`/api/profiles/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update profile');
    return res.json();
  },

  // 11. Products
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
    farmerId?: string;
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
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to list product');
    }
    return res.json();
  },

  async updateProduct(id: string, data: Partial<Product> & { farmerId?: string }): Promise<{ product: Product }> {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update product');
    }
    return res.json();
  },

  async deleteProduct(id: string, farmerId?: string): Promise<{ success: boolean; deletedId: string }> {
    const query = farmerId ? `?farmerId=${farmerId}` : '';
    const res = await fetch(`/api/products/${id}${query}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete product');
    }
    return res.json();
  },

  // 12. Cart
  async getCart(userId?: string): Promise<{ cart: CartItem[] }> {
    const query = userId ? `?userId=${userId}` : '';
    const res = await fetch(`/api/cart${query}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch cart');
    return res.json();
  },

  async addToCart(userId: string, productId: string, quantity: number = 1): Promise<{ success: boolean }> {
    const res = await fetch('/api/cart', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ userId, productId, quantity }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to add to cart');
    }
    return res.json();
  },

  async updateCartQuantity(cartItemId: string, userId: string, quantity: number): Promise<{ success: boolean; removed?: boolean }> {
    const res = await fetch(`/api/cart/${cartItemId}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ userId, quantity }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update cart');
    }
    return res.json();
  },

  async removeFromCart(cartItemId: string, userId?: string): Promise<{ success: boolean }> {
    const query = userId ? `?userId=${userId}` : '';
    const res = await fetch(`/api/cart/${cartItemId}${query}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to remove cart item');
    return res.json();
  },

  // 13. Wishlist
  async getWishlist(userId?: string): Promise<{ wishlist: WishlistItem[] }> {
    const query = userId ? `?userId=${userId}` : '';
    const res = await fetch(`/api/wishlist${query}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch wishlist');
    return res.json();
  },

  async toggleWishlist(userId: string, productId: string): Promise<{ isWishlisted: boolean }> {
    const res = await fetch('/api/wishlist/toggle', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ userId, productId }),
    });
    if (!res.ok) throw new Error('Failed to toggle wishlist');
    return res.json();
  },

  // 14. Browse History
  async getBrowseHistory(userId?: string): Promise<{ history: BrowseHistoryItem[] }> {
    const query = userId ? `?userId=${userId}` : '';
    const res = await fetch(`/api/browse-history${query}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch browse history');
    return res.json();
  },

  async recordBrowse(userId: string, productId: string): Promise<{ success: boolean }> {
    const res = await fetch('/api/browse-history', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ userId, productId }),
    });
    if (!res.ok) throw new Error('Failed to record browse history');
    return res.json();
  },

  // 15. Orders
  async getOrders(userId?: string, role?: Role): Promise<{ orders: Order[] }> {
    const query = new URLSearchParams();
    if (userId) query.set('userId', userId);
    if (role) query.set('role', role);
    const res = await fetch(`/api/orders?${query.toString()}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch orders');
    return res.json();
  },

  async checkout(userId: string, deliveryAddress: string): Promise<{ success: boolean; orders: Order[] }> {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: authHeaders(),
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
    data: { userId?: string; role?: Role; status: string; otpCode?: string }
  ): Promise<{ order: Order }> {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update order status');
    }
    return res.json();
  },

  // 15.5. Reviews
  async getReviews(filter?: { productId?: string; farmerId?: string }): Promise<{ reviews: Review[] }> {
    const query = new URLSearchParams();
    if (filter?.productId) query.set('productId', filter.productId);
    if (filter?.farmerId) query.set('farmerId', filter.farmerId);
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`/api/reviews${qs}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch reviews');
    return res.json();
  },

  async createReview(data: {
    orderId: string;
    productId: string;
    rating: number;
    comment: string;
  }): Promise<{ success: boolean; review: Review }> {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit review');
    }
    return res.json();
  },

  // 15.6. Farmer Crop Plans
  async getCropPlans(): Promise<{ cropPlans: CropPlan[] }> {
    const res = await fetch('/api/farmer/crop-plans', {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch crop plans');
    return res.json();
  },

  async getCropPlanById(id: string): Promise<{ cropPlan: CropPlan }> {
    const res = await fetch(`/api/farmer/crop-plans/${id}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch crop plan');
    return res.json();
  },

  async createCropPlan(data: {
    cropName: string;
    season?: string;
    plantingDate?: string;
    expectedHarvestDate?: string;
    areaAcres?: number;
    notes?: string;
    status?: string;
  }): Promise<{ success: boolean; plan: CropPlan }> {
    const res = await fetch('/api/farmer/crop-plans', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create crop plan');
    }
    return res.json();
  },

  async updateCropPlan(
    id: string,
    data: Partial<{
      cropName: string;
      season: string;
      plantingDate: string;
      expectedHarvestDate: string;
      areaAcres: number;
      notes: string;
      status: string;
    }>
  ): Promise<{ success: boolean; plan: CropPlan }> {
    const res = await fetch(`/api/farmer/crop-plans/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update crop plan');
    }
    return res.json();
  },

  async deleteCropPlan(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/farmer/crop-plans/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete crop plan');
    }
    return res.json();
  },

  // 16. Farmer Analytics
  async getFarmerAnalytics(farmerId: string): Promise<{ analytics: DemandAnalytics }> {
    const res = await fetch(`/api/farmer/analytics/${farmerId}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  // 17. Weather
  async getWeather(): Promise<{ forecast: WeatherDay[] }> {
    const res = await fetch('/api/weather');
    if (!res.ok) throw new Error('Failed to fetch weather forecast');
    return res.json();
  },

  // 18. AI Assistant (Farm2Home Agronomist Brain)
  async askAiAssistant(
    prompt: string,
    language: string = 'en',
    role: Role = 'customer',
    options?: {
      userId?: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
      image?: { inlineData: { mimeType: string; data: string } };
    }
  ): Promise<AssistantResponse> {
    const res = await fetch('/api/ai/assistant', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        prompt,
        language,
        role,
        userId: options?.userId,
        history: options?.history,
        image: options?.image,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.answer || 'AI Assistant consultation failed');
    }
    return res.json();
  },

  // 18.5. AI Conversation Management
  async getAiConversations(): Promise<{ conversations: AiConversation[] }> {
    const res = await fetch('/api/ai/conversations', {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch AI conversations');
    return res.json();
  },

  async getAiConversationMessages(id: string): Promise<{ messages: AiMessage[] }> {
    const res = await fetch(`/api/ai/conversations/${id}/messages`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch AI conversation messages');
    return res.json();
  },

  async deleteAiConversation(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/ai/conversations/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete AI conversation');
    return res.json();
  },
};

export const API = {
  ...api,
  createOrder: api.checkout,
  recordBrowseHistory: api.recordBrowse,
  updateCartQty: api.updateCartQuantity,
};
