export type UserRole = 'customer' | 'farmer' | 'delivery';

export interface Profile {
  id: string; // matches auth.uid
  auth_method: 'phone' | 'email';
  phone_number?: string;
  email?: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  location: string;
  created_at: string;
  // Farmer specific fields
  farm_name?: string;
  approved?: boolean;
  certificate_url?: string;
}

export type ProductCategory = 
  | 'Vegetables'
  | 'Fruits'
  | 'Grains & Cereals'
  | 'Pulses & Spices'
  | 'Dairy & Poultry'
  | 'Organic Special';

export type ProductUnit = 'kg' | 'gram' | 'bunch' | 'liter' | 'piece';

export interface Product {
  id: string;
  farmer_id: string;
  farmer_name?: string;
  farmer_location?: string;
  title: string;
  description: string;
  category: ProductCategory;
  price: number;
  unit: ProductUnit;
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
}

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
}

export interface OrderItem {
  product_id: string;
  title: string;
  price: number;
  quantity: number;
  unit: ProductUnit;
  image_url: string;
}

export type OrderStatus = 'pending' | 'accepted' | 'out_for_delivery' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  farmer_id: string;
  farmer_name?: string;
  farmer_phone?: string;
  delivery_partner_id?: string | null;
  delivery_partner_name?: string;
  items: OrderItem[];
  total_amount: number;
  status: OrderStatus;
  delivery_address: string;
  otp_code: string;
  created_at: string;
}

export interface BrowseHistoryItem {
  id: string;
  user_id: string;
  product_id: string;
  viewed_at: string;
  product?: Product;
}

export interface Review {
  id: string;
  order_id: string;
  customer_id: string;
  customer_name?: string;
  farmer_id: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface DemandAnalytics {
  aov: number;
  totalOrders: number;
  totalRevenue: number;
  meanVolume: number;
  medianVolume: number;
  modeVolume: number;
  topCrops: { title: string; volume: number; revenue: number }[];
  seasonalTrends: { month: string; sales: number; cropName: string }[];
  plantingSuggestions: { crop: string; demandLevel: 'High' | 'Medium' | 'Critical Shortage'; reason: string }[];
}

export interface WeatherDay {
  day: string;
  date: string;
  tempMax: number;
  tempMin: number;
  condition: 'Sunny' | 'Partly Cloudy' | 'Light Rain' | 'Heavy Rain' | 'Thunderstorm';
  humidity: number;
  windKm: number;
  rainfallMm: number;
  advisory: string;
}

export type LanguageCode = 'en' | 'te' | 'hi' | 'ta';
