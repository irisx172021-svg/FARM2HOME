import { Product, Order, WeatherDay, Role, Language } from '../../types.js';

export type AuthenticatedRole = 'CUSTOMER' | 'FARMER' | 'DELIVERY_PARTNER';

export interface DeliveryJobContext {
  id: string;
  pickupFarm: string;
  pickupLocation?: string;
  destinationAddress: string;
  customerName: string;
  customerPhone?: string;
  itemsSummary: string;
  status: string;
  deliveryFare?: number;
  completedAt?: string;
  otpCode?: string;
}

export interface DeliveryEarningsContext {
  todayEarnings: number;
  thisWeekEarnings: number;
  thisMonthEarnings: number;
  totalEarnings: number;
  completedRidesCount: number;
  avgFarePerRide: number;
}

export interface AssistantContext {
  role?: AuthenticatedRole | Role;
  userId?: string;
  userName?: string;
  language?: Language;
  // Farmer specific context
  farmName?: string;
  location?: string;
  landArea?: string;
  soilType?: string;
  waterAvailability?: string;
  currentSeason?: string;
  farmerProducts?: Product[];
  farmerOrders?: Order[];
  // Customer specific context
  availableMarketProducts?: Product[];
  customerOrders?: Order[];
  // Delivery Partner specific context
  activeDeliveries?: DeliveryJobContext[];
  completedDeliveries?: DeliveryJobContext[];
  availablePickupJobs?: DeliveryJobContext[];
  deliveryEarnings?: DeliveryEarningsContext;
  // Shared weather telemetry
  weatherForecast?: WeatherDay[];
}

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantResponseMetadata {
  answer: string;
  language: string;
  category: string;
  confidence: 'high' | 'medium' | 'low';
  needs_more_information: boolean;
  follow_up_questions?: string[];
  warnings?: string[];
  providerUsed?: 'groq' | 'gemini';
  modelUsed?: string;
}

export interface ImageAttachment {
  inlineData: {
    mimeType: string;
    data: string; // base64 encoded
  };
}

export interface ErrorClassification {
  isTransient: boolean;
  statusCode?: number;
  statusText?: string;
  reason: string;
}

export interface ProviderExecutionResult {
  metadata: AssistantResponseMetadata;
  modelUsed: string;
}

export interface AIProvider {
  readonly providerName: 'groq' | 'gemini';
  readonly modelName: string;
  isConfigured(): boolean;
  generateResponse(params: {
    systemInstruction: string;
    prompt: string;
    history?: ConversationTurn[];
    image?: ImageAttachment;
    context: AssistantContext;
  }): Promise<AssistantResponseMetadata>;
  classifyError(error: unknown): ErrorClassification;
}
