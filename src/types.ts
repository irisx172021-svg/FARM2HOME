export type UserRole = 'customer' | 'farmer' | 'delivery';
export type Role = UserRole;

export type AuthStatus = 'AUTH_LOADING' | 'PROFILE_LOADING' | 'AUTHENTICATED' | 'UNAUTHENTICATED';

export type LanguageCode = 'en' | 'te' | 'hi' | 'ta';
export type Language = LanguageCode;

export type AuthProvider = 'google' | 'phone' | 'email' | 'passkey';

export interface AuthIdentityInfo {
  provider: AuthProvider;
  providerUid: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface UserAccount {
  userId: string;
  displayName: string;
  email?: string;
  phone?: string;
  role?: UserRole;
  preferredLanguage?: LanguageCode;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  linkedProviders: AuthProvider[];
}

export type ProductCategory =
  | 'Vegetables'
  | 'Fruits'
  | 'Grains & Cereals'
  | 'Pulses & Spices'
  | 'Dairy & Poultry'
  | 'Organic Special';

export type ProductUnit = 'kg' | 'gram' | 'bunch' | 'liter' | 'piece';

export type OrderStatus = 'pending' | 'accepted' | 'out_for_delivery' | 'delivered' | 'cancelled';

export interface Profile {
  id: string; // canonical userId
  user_id?: string;
  auth_method: 'phone' | 'email' | string;
  phone_number?: string;
  email?: string;
  full_name: string;
  fullName?: string;
  name?: string;
  role: UserRole;
  preferred_language?: LanguageCode;
  avatar_url?: string;
  location?: string;
  created_at: string;
  updated_at?: string;
  // Farmer specific fields
  farm_name?: string;
  approved?: boolean;
  certificate_url?: string;
  // Linked auth methods
  linked_providers?: AuthProvider[];
}

export interface Product {
  id: string;
  farmer_id: string;
  farmer_name?: string;
  farmer_location?: string;
  title: string;
  description: string;
  category: ProductCategory | string;
  price: number;
  unit: ProductUnit | string;
  stock: number;
  is_organic: boolean;
  image_url: string;
  created_at: string;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  added_at: string;
  product?: Product;
  is_available?: boolean;
  stock_exceeded?: boolean;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
}

export interface BrowseHistoryItem {
  id: string;
  user_id: string;
  product_id: string;
  viewed_at: string;
  product?: Product;
}

export interface OrderItem {
  product_id: string;
  title: string;
  price: number;
  quantity: number;
  unit: string;
  image_url: string;
}

export interface Order {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone?: string;
  farmer_id: string;
  farmer_name: string;
  farmer_phone?: string;
  delivery_partner_id: string | null;
  delivery_partner_name?: string;
  items: OrderItem[];
  total_amount: number;
  status: OrderStatus;
  delivery_address: string;
  otp_code: string;
  created_at: string;
  delivery_fare?: number;
  completed_at?: string;
  distance_km?: number;
}

export interface Review {
  id: string;
  order_id: string;
  customer_id: string;
  customer_name: string;
  farmer_id: string;
  rating: number;
  comment: string;
  created_at: string;
  product_id?: string;
}

export interface CropPlan {
  id: string;
  farmer_id: string;
  crop_name: string;
  season?: string;
  planting_date?: string;
  expected_harvest_date?: string;
  area_acres?: number;
  notes?: string;
  status: 'PLANNED' | 'GROWING' | 'HARVESTED' | 'CANCELLED' | string;
  created_at: string;
  updated_at?: string;
}

export interface DemandAnalytics {
  aov: number;
  totalOrders: number;
  totalRevenue: number;
  meanVolume: number;
  medianVolume: number;
  modeVolume: number;
  topCrops: { title: string; volume: number; revenue: number; unit?: string }[];
  seasonalTrends: { month: string; sales: number; cropName: string }[];
  plantingSuggestions: { crop: string; demandLevel: 'High' | 'Critical Shortage' | 'Medium'; reason: string }[];
}

export interface WeatherDay {
  day: string;
  date: string;
  tempMax: number;
  tempMin: number;
  condition: string;
  humidity: number;
  windKm: number;
  rainfallMm: number;
  advisory: string;
  rainProbability?: number;
}

export interface CropActionPlan {
  prepare: string;
  plant: string;
  monitor: string;
  respondToWeather: string;
  harvest: string;
}

export interface CropSuggestion {
  id?: string;
  cropName: string;
  whySuitable: string;
  suitableSoil: string;
  soilSuitabilityDetail?: string;
  areaSuitabilityDetail?: string;
  seasonWeatherDetail?: string;
  growingDuration: string;
  waterRequirement: string;
  suitableSeason: string;
  weatherSuitability: string;
  importantRisks: string;
  expectedCareLevel: 'Low' | 'Moderate' | 'High';
  basicCareRequirements?: string;
  suggestedNextSteps: string[];
  actionPlan: CropActionPlan;
}

export interface CropPlannerInputs {
  landArea: number | '';
  areaUnit: 'acres' | 'hectares';
  soilType: string;
  location: string;
  waterAvailability?: string;
  currentSeason?: string;
  previousCrop?: string;
  farmingGoal?: string;
  organicPreference?: string;
}

export interface AssistantResponse {
  answer: string;
  language?: string;
  category?: string;
  confidence?: 'high' | 'medium' | 'low';
  needs_more_information?: boolean;
  follow_up_questions?: string[];
  warnings?: string[];
}

export interface AiConversation {
  id: string;
  user_id: string;
  role: string;
  title?: string;
  language?: string;
  created_at: string;
  updated_at: string;
}

export interface AiMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'model' | 'system' | 'assistant';
  content: string;
  language?: string;
  metadata?: any;
  created_at: string;
}

