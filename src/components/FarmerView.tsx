import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  BarChart3,
  Calendar,
  Sparkles,
  MapPin,
  Leaf,
  AlertTriangle,
  RefreshCw,
  Layers,
  ArrowUpRight,
  Sprout,
  CloudSun,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Truck,
  Phone,
  HelpCircle,
  AlertCircle,
  DollarSign,
  CheckSquare,
  ArrowRight,
  Send,
  Loader2,
  Search,
} from 'lucide-react';
import { Product, Order, Profile, Language, DemandAnalytics, WeatherDay, AssistantResponse } from '../types';
import { getTranslation } from '../lib/translations';
import { api } from '../lib/api';
import {
  formatQuantity,
  formatStock,
  formatOnlyLeft,
  normalizeUnit,
  formatOrderItemSummary,
  isValidQuantityForUnit,
} from '../lib/quantity';
import { CropPlannerSection } from './CropPlannerSection';
import { WeatherCropAdvisory } from './WeatherCropAdvisory';
import { FarmerAiAdvisoryCard } from './FarmerAiAdvisoryCard';
import { MarkdownRenderer } from './MarkdownRenderer';

const CROP_IMAGE_PRESETS = [
  { label: 'Tomatoes', url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800' },
  { label: 'Mangoes', url: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=800' },
  { label: 'Spinach', url: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=800' },
  { label: 'Basmati Rice', url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800' },
  { label: 'Turmeric Spices', url: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=800' },
  { label: 'Fresh Milk', url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800' },
];

export type FarmerTab = 'overview' | 'crops' | 'orders' | 'weather' | 'planner' | 'agronomist' | 'analytics';

interface FarmerViewProps {
  currentProfile: Profile;
  language: Language;
  onRefreshAll: () => Promise<void>;
  externalTab?: string;
  onSelectTab?: (tab: any) => void;
  onOpenFullAi?: () => void;
}

export const FarmerView: React.FC<FarmerViewProps> = ({
  currentProfile,
  language,
  onRefreshAll,
  externalTab,
  onSelectTab,
  onOpenFullAi,
}) => {
  const t = getTranslation(language);
  const [internalTab, setInternalTab] = useState<FarmerTab>('overview');

  // Map externalTab safely with support for all distinct sections
  const activeTab: FarmerTab = useMemo(() => {
    if (externalTab === 'overview') return 'overview';
    if (externalTab === 'crops') return 'crops';
    if (externalTab === 'orders') return 'orders';
    if (externalTab === 'weather') return 'weather';
    if (externalTab === 'planner') return 'planner';
    if (externalTab === 'agronomist') return 'agronomist';
    if (externalTab === 'analytics') return 'analytics';
    return internalTab;
  }, [externalTab, internalTab]);

  const setActiveTab = (tab: FarmerTab) => {
    setInternalTab(tab);
    if (onSelectTab) onSelectTab(tab);
  };

  const [farmerProducts, setFarmerProducts] = useState<Product[]>([]);
  const [farmerOrders, setFarmerOrders] = useState<Order[]>([]);
  const [forecast, setForecast] = useState<WeatherDay[]>([]);
  const [analytics, setAnalytics] = useState<DemandAnalytics>({
    totalRevenue: 0,
    totalOrders: 0,
    aov: 0,
    meanVolume: 0,
    medianVolume: 0,
    modeVolume: 0,
    topCrops: [],
    seasonalTrends: [],
    plantingSuggestions: [],
  });
  const [loading, setLoading] = useState(true);

  // Progressive Disclosure: Detailed Analytics expandable drawer on overview
  const [showDetailedAnalytics, setShowDetailedAnalytics] = useState(false);

  // Modal State for Add / Edit Crop
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Vegetables',
    price: 40,
    unit: 'kg',
    stock: 50,
    isOrganic: true,
    imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800',
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Inventory filtering state in crops tab
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryCategory, setInventoryCategory] = useState<string>('all');

  // Compact AI card state on dashboard
  const [quickAiQuery, setQuickAiQuery] = useState('');
  const [quickAiLoading, setQuickAiLoading] = useState(false);
  const [quickAiAnswer, setQuickAiAnswer] = useState<string | null>(null);

  const loadFarmerData = async () => {
    try {
      setLoading(true);
      const [prodsRes, ordersRes, analyticsRes, weatherRes] = await Promise.all([
        api.getProducts(),
        api.getOrders(currentProfile.id, 'farmer'),
        api.getFarmerAnalytics(currentProfile.id),
        api.getWeather().catch(() => ({ forecast: [] })),
      ]);

      setFarmerProducts(prodsRes.products.filter((p) => p.farmer_id === currentProfile.id));
      setFarmerOrders(ordersRes.orders);
      setAnalytics(analyticsRes.analytics);
      if (weatherRes?.forecast?.length) {
        setForecast(weatherRes.forecast);
      }
    } catch (err) {
      console.error('Failed to load farmer data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFarmerData();
  }, [currentProfile.id]);

  // Derived Overview Metrics
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const todaysOrders = useMemo(() => {
    return farmerOrders.filter((o) => new Date(o.created_at).getTime() >= startOfToday);
  }, [farmerOrders, startOfToday]);

  const pendingOrders = useMemo(() => {
    return farmerOrders.filter((o) => o.status === 'pending');
  }, [farmerOrders]);

  const stockSummaryByUnit = useMemo(() => {
    const summary: Record<string, number> = {};
    for (const p of farmerProducts) {
      const u = normalizeUnit(p.unit);
      summary[u] = (summary[u] || 0) + p.stock;
    }
    const entries = Object.entries(summary);
    if (entries.length === 0) return '0 items';
    return entries.map(([u, qty]) => formatQuantity(qty, u, language)).join(' · ');
  }, [farmerProducts, language]);

  const totalCurrentStockUnits = useMemo(() => {
    return farmerProducts.reduce((sum, p) => sum + p.stock, 0);
  }, [farmerProducts]);

  const lowStockProducts = useMemo(() => {
    return farmerProducts.filter((p) => p.stock <= 10);
  }, [farmerProducts]);

  const upcomingDeliveries = useMemo(() => {
    return farmerOrders.filter((o) => o.status === 'out_for_delivery' || o.status === 'accepted');
  }, [farmerOrders]);

  // Real Marketplace Demand - only if real product & order data exists
  const realMarketDemand = useMemo(() => {
    if (farmerProducts.length === 0 || farmerOrders.length === 0) return [];

    return farmerProducts
      .map((p) => {
        const productOrders = farmerOrders.filter((o) =>
          o.items.some((item) => item.product_id === p.id)
        );
        const activeOrders = productOrders.filter(
          (o) => o.status === 'pending' || o.status === 'accepted' || o.status === 'out_for_delivery'
        );
        const deliveredOrders = productOrders.filter((o) => o.status === 'delivered');

        return {
          productId: p.id,
          title: p.title,
          category: p.category,
          currentOrders: activeOrders.length,
          totalOrdersCount: productOrders.length,
          deliveredCount: deliveredOrders.length,
          unit: p.unit,
          stock: p.stock,
          recentDemandTrend:
            activeOrders.length > 0
              ? `${activeOrders.length} active order${activeOrders.length > 1 ? 's' : ''}`
              : deliveredOrders.length > 0
              ? `${deliveredOrders.length} fulfilled recently`
              : 'No active orders',
        };
      })
      .filter((d) => d.totalOrdersCount > 0);
  }, [farmerProducts, farmerOrders]);

  // Weather pattern detection & action-oriented guidance
  const todayWeatherDetail = useMemo(() => {
    const today = forecast && forecast.length > 0 ? forecast[0] : null;
    const isRain = today ? today.rainfallMm >= 10 || (today.rainProbability || 0) >= 60 : false;
    const isHeat = today ? today.tempMax >= 32 : false;
    const isHighHumidity = today ? today.humidity >= 80 : false;

    if (isRain) {
      return {
        badge: 'Rain Alert · Drainage Action',
        happening: today
          ? `Precipitation (${today.rainfallMm}mm) expected with ${today.rainProbability || 65}% rain probability.`
          : 'High probability of rain showers across your agricultural zone.',
        means: 'Root zone saturation risk; standing water can cause root asphyxiation and nutrient runoff.',
        todo: 'Inspect furrow drainage channels immediately and suspend evening irrigation cycles.',
      };
    }

    if (isHeat) {
      return {
        badge: 'High Heat · Moisture Conservation',
        happening: today
          ? `High afternoon temperatures peaking at ${today.tempMax}°C with elevated evaporation.`
          : 'Elevated daytime heat and dry surface conditions.',
        means: 'Rapid transpiration risk; shallow root vegetables may face temporary wilting and blossom drop.',
        todo: 'Run light drip irrigation early morning and withhold mid-day foliar sprays.',
      };
    }

    if (isHighHumidity) {
      return {
        badge: 'High Humidity · Fungal Guard',
        happening: today
          ? `Relative humidity elevated at ${today.humidity}% with dense morning dew.`
          : 'High atmospheric moisture with slow surface evaporation.',
        means: 'Extended leaf wetness period promotes fungal spore germination in tomatoes and cucurbits.',
        todo: 'Prune lower yellowing leaves to maximize airflow through the crop canopy.',
      };
    }

    return {
      badge: 'Optimal Weather Window',
      happening: today
        ? `${today.condition}, ${today.tempMin}°C to ${today.tempMax}°C with gentle breeze.`
        : 'Favorable temperature and sunshine across field plots.',
      means: 'Ideal photosynthesis conditions for rapid vegetative growth and mature crop harvesting.',
      todo: today?.advisory || 'Continue scheduled irrigation and inspect crops for natural pest predators.',
    };
  }, [forecast]);

  // Localized AI Agronomist prompts for quick questions
  const localizedQuickAiPrompts = useMemo(() => {
    if (language === 'te') {
      return [
        'టమాటాలో ఆకుముడుత తెగులు సహజ నివారణ ఎలా?',
        'వర్షం తర్వాత భూమికి జీవామృతం ఎలా అందించాలి?',
        'ప్రస్తుత వాతావరణానికి ఏ పంట అనువైనది?',
      ];
    }
    if (language === 'hi') {
      return [
        'टमाटर में लीफ कर्ल वायरस की रोकथाम कैसे करें?',
        'बारिश के बाद खेत में जीवामृत का प्रयोग कैसे करें?',
        'वर्तमान मौसम में कौन सी फसल लगाना सर्वोत्तम होगा?',
      ];
    }
    if (language === 'ta') {
      return [
        'தக்காளியில் இலை சுருட்டல் நோயை இயற்கை முறையில் தடுப்பது எப்படி?',
        'மழைக்குப் பின் மண்ணிற்கு ஜீவாமிர்தம் இடுவது எப்படி?',
        'தற்போதைய வானிலைக்கு ஏற்ற சிறந்த பயிர் எது?',
      ];
    }
    return [
      'How to prevent leaf curl in organic tomatoes naturally?',
      'How to apply Jeevamrutha to soil after rainfall?',
      'Which crop is best suited for planting in current weather?',
    ];
  }, [language]);

  const handleAskQuickAi = async (questionText: string) => {
    const q = questionText.trim();
    if (!q) return;
    try {
      setQuickAiLoading(true);
      setQuickAiQuery(q);
      const res = await api.askAiAssistant(q, language, 'farmer', { userId: currentProfile.id });
      setQuickAiAnswer(res.answer);
    } catch (err: any) {
      setQuickAiAnswer(err.message || 'Unable to consult Agronomist at this moment.');
    } finally {
      setQuickAiLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      title: '',
      description: '',
      category: 'Vegetables',
      price: 40,
      unit: 'kg',
      stock: 50,
      isOrganic: true,
      imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      title: p.title,
      description: p.description,
      category: p.category,
      price: p.price,
      unit: p.unit,
      stock: p.stock,
      isOrganic: p.is_organic,
      imageUrl: p.image_url,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveCrop = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.title.trim()) {
      setFormError(t.farmer.cropNameRequired);
      return;
    }

    const stockNum = Number(formData.stock);
    const stockVal = isValidQuantityForUnit(stockNum, formData.unit);
    if (!stockVal.valid) {
      setFormError(stockVal.error || 'Invalid stock quantity for the selected unit');
      return;
    }

    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, {
          farmerId: currentProfile.id,
          title: formData.title,
          description: formData.description,
          category: formData.category,
          price: Number(formData.price),
          unit: formData.unit,
          stock: Number(formData.stock),
          is_organic: formData.isOrganic,
          image_url: formData.imageUrl,
        });
      } else {
        await api.createProduct({
          farmerId: currentProfile.id,
          title: formData.title,
          description: formData.description,
          category: formData.category,
          price: Number(formData.price),
          unit: formData.unit,
          stock: Number(formData.stock),
          isOrganic: formData.isOrganic,
          imageUrl: formData.imageUrl,
        });
      }

      setIsModalOpen(false);
      await loadFarmerData();
      await onRefreshAll();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save crop listing');
    }
  };

  const handleDeleteCrop = async (id: string) => {
    if (!window.confirm(t.farmer.deleteCropConfirm)) return;
    try {
      await api.deleteProduct(id, currentProfile.id);
      await loadFarmerData();
      await onRefreshAll();
    } catch (err: any) {
      alert(err.message || 'Failed to delete crop');
    }
  };

  const handleOrderStatusUpdate = async (orderId: string, status: 'accepted' | 'cancelled') => {
    try {
      await api.updateOrderStatus(orderId, {
        userId: currentProfile.id,
        role: 'farmer',
        status,
      });
      await loadFarmerData();
      await onRefreshAll();
    } catch (err: any) {
      alert(err.message || 'Failed to update order status');
    }
  };

  // Filtered products for dedicated crops/inventory tab
  const filteredInventory = useMemo(() => {
    return farmerProducts.filter((p) => {
      const matchesSearch =
        p.title.toLowerCase().includes(inventorySearch.toLowerCase()) ||
        p.category.toLowerCase().includes(inventorySearch.toLowerCase());
      const matchesCategory =
        inventoryCategory === 'all' || p.category.toLowerCase() === inventoryCategory.toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }, [farmerProducts, inventorySearch, inventoryCategory]);

  return (
    <div className="space-y-6">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          TOP FARMER IDENTITY & WORKSPACE NAVIGATION
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-[#0f1115]/90 border border-white/[0.08] rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 shadow-md">
            <Sprout className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">{currentProfile.full_name}</h1>
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{currentProfile.farm_name || t.customer.verifiedProducer}</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
              <span>{currentProfile.phone_number || currentProfile.email}</span>
              <span aria-hidden="true" className="text-zinc-600">·</span>
              <span className="flex items-center gap-1 text-zinc-400">
                <MapPin className="w-3 h-3 text-zinc-500" />
                {currentProfile?.location || 'Warangal, Telangana'}
              </span>
            </div>
          </div>
        </div>

        {/* Clean Segmented Sub-Navigation Bar */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#121418] border border-white/[0.08] rounded-xl text-xs font-semibold text-zinc-400 self-stretch md:self-auto overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold shadow-xs'
                : 'hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t.farmer.overviewTab}</span>
          </button>

          <button
            onClick={() => setActiveTab('crops')}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'crops'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold shadow-xs'
                : 'hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Package className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t.farmer.inventoryTab}</span>
            {lowStockProducts.length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'orders'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold shadow-xs'
                : 'hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t.farmer.ordersQueueTitle}</span>
            {pendingOrders.length > 0 && (
              <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                {pendingOrders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('weather')}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'weather'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold shadow-xs'
                : 'hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <CloudSun className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t.header.weatherAdvisory}</span>
          </button>

          <button
            onClick={() => setActiveTab('planner')}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'planner'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold shadow-xs'
                : 'hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Sprout className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t.header.cropPlanner}</span>
          </button>

          <button
            onClick={() => setActiveTab('agronomist')}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'agronomist'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold shadow-xs'
                : 'hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t.header.aiAgronomist}</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold shadow-xs'
                : 'hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t.farmer.analyticsTab}</span>
          </button>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FOCUSED FARMER LANDING DASHBOARD
          Hierarchy: NOW → FARM → WEATHER → PLAN → AI → ANALYTICS
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 1. NOW: TODAY / IMPORTANT (What needs my attention?) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  {t.farmer.todayActions}
                </h2>
              </div>
              <span className="text-[11px] font-mono text-zinc-500">
                {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Card 1: Orders Requiring Attention */}
              <div
                className={`rounded-2xl border p-4 shadow-md flex flex-col justify-between space-y-3 transition-all ${
                  pendingOrders.length > 0
                    ? 'bg-[#14120e] border-amber-500/30 hover:border-amber-500/50'
                    : 'bg-[#0f1115]/90 border-white/[0.08]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">
                      {t.farmer.pendingOrders}
                    </span>
                    <Clock className={`w-4 h-4 ${pendingOrders.length > 0 ? 'text-amber-400' : 'text-zinc-500'}`} />
                  </div>
                  <div className="mt-2">
                    <div className="text-2xl font-bold font-mono text-white">
                      {pendingOrders.length}
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                      {pendingOrders.length > 0
                        ? `${pendingOrders.length} order${pendingOrders.length > 1 ? 's' : ''} awaiting harvest confirmation`
                        : t.farmer.allOrdersConfirmed}
                    </p>
                  </div>
                </div>

                {/* Inline 1-click preview if 1 pending order exists */}
                {pendingOrders.length > 0 && (
                  <div className="pt-2 border-t border-amber-500/20 space-y-2">
                    <div className="text-[11px] text-amber-200/90 truncate">
                      #{pendingOrders[0].id.replace('ord_', 'FH')} · ₹{pendingOrders[0].total_amount} ({pendingOrders[0].customer_name})
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOrderStatusUpdate(pendingOrders[0].id, 'accepted')}
                        className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-lg transition-colors"
                      >
                        {t.farmer.acceptOrder}
                      </button>
                      <button
                        onClick={() => setActiveTab('orders')}
                        className="text-xs font-semibold text-amber-300 hover:text-amber-200 flex items-center gap-1 ml-auto"
                      >
                        <span>{t.farmer.viewOrders}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {pendingOrders.length === 0 && (
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 self-start pt-1"
                  >
                    <span>{t.farmer.viewOrders}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Card 2: Inventory & Stock Health */}
              <div
                className={`rounded-2xl border p-4 shadow-md flex flex-col justify-between space-y-3 transition-all ${
                  lowStockProducts.length > 0
                    ? 'bg-[#14120e] border-amber-500/30 hover:border-amber-500/50'
                    : 'bg-[#0f1115]/90 border-white/[0.08]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">
                      {t.farmer.stockAvailability}
                    </span>
                    <Package className={`w-4 h-4 ${lowStockProducts.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
                  </div>
                  <div className="mt-2">
                    <div className="text-2xl font-bold font-mono text-white">
                      {lowStockProducts.length > 0 ? `${lowStockProducts.length} low` : `${farmerProducts.length} crops`}
                      <span className="text-xs font-normal text-zinc-500 ml-1.5">
                        {lowStockProducts.length > 0 ? 'need restock' : 'active'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed truncate">
                      {lowStockProducts.length > 0
                        ? lowStockProducts.map((p) => `${p.title} (${formatQuantity(p.stock, p.unit, language)})`).join(', ')
                        : stockSummaryByUnit}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                  <button
                    onClick={() => {
                      if (lowStockProducts.length > 0) {
                        handleOpenEditModal(lowStockProducts[0]);
                      } else {
                        setActiveTab('crops');
                      }
                    }}
                    className={`text-xs font-semibold flex items-center gap-1 ${
                      lowStockProducts.length > 0 ? 'text-amber-300 hover:text-amber-200' : 'text-emerald-400 hover:text-emerald-300'
                    }`}
                  >
                    <span>{lowStockProducts.length > 0 ? t.farmer.restockCrop : t.farmer.viewInventory}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleOpenAddModal}
                    className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{t.farmer.listNewCrop}</span>
                  </button>
                </div>
              </div>

              {/* Card 3: Weather Alert & Field Action */}
              <div className="rounded-2xl border bg-[#0e1412] border-emerald-500/20 hover:border-emerald-500/40 p-4 shadow-md flex flex-col justify-between space-y-3 transition-all">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wide">
                      {todayWeatherDetail.badge}
                    </span>
                    <CloudSun className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="mt-2">
                    <div className="text-sm font-bold text-white">
                      {todayWeatherDetail.todo}
                    </div>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed line-clamp-2">
                      {todayWeatherDetail.happening}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                  <button
                    onClick={() => setActiveTab('weather')}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                  >
                    <span>{t.farmer.viewAdvisory}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setActiveTab('agronomist')}
                    className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    <span>{t.farmer.consultAgronomist}</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* 2. FARM: FARM OVERVIEW (What is happening on my farm?) */}
          <section className="bg-[#0f1115]/90 border border-white/[0.08] rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  <Sprout className="w-4 h-4 text-emerald-400" />
                  <span>{t.farmer.farmOverview}</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {currentProfile?.farm_name || 'Sustainable Agro Plot'} · {currentProfile?.location || 'Warangal, Telangana'}
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={() => setActiveTab('crops')}
                  className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>{t.farmer.viewInventory}</span>
                </button>
                <button
                  onClick={handleOpenAddModal}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t.farmer.listNewCrop}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Field & Cultivation Summary */}
              <div className="bg-[#121418] rounded-xl border border-white/[0.06] p-4 space-y-3">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide block">
                  {t.farmer.landAndField}
                </span>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                    <span className="text-zinc-400">{t.farmer.currentSeason}</span>
                    <span className="text-white font-medium">Kharif / Monsoon 2026 (Active Harvest)</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                    <span className="text-zinc-400">Total Cultivated Area</span>
                    <span className="text-white font-mono font-medium">3.5 {t.farmer.acres} · Red Sandy Loam</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                    <span className="text-zinc-400">Irrigation Setup</span>
                    <span className="text-white font-medium">Drip System + Groundwater Bore</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-zinc-400">Standards & Methods</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <Leaf className="w-3.5 h-3.5" />
                      100% Certified Organic (Zero Chemical)
                    </span>
                  </div>
                </div>
              </div>

              {/* Active Crops & Inventory Summary */}
              <div className="bg-[#121418] rounded-xl border border-white/[0.06] p-4 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide">
                      {t.farmer.inventorySummary}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {farmerProducts.length} {t.farmer.activeCropsCount.replace('{count}', '')}
                    </span>
                  </div>

                  {farmerProducts.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-3">{t.farmer.noCropsListed}</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-xs text-zinc-300 leading-relaxed">
                        {farmerProducts.map((p, idx) => (
                          <span key={p.id}>
                            <span className="text-white font-medium">{p.title}</span>
                            <span className="text-zinc-500 font-mono ml-1">({formatQuantity(p.stock, p.unit, language)})</span>
                            {idx < farmerProducts.length - 1 && (
                              <span aria-hidden="true" className="text-zinc-600 mx-2">·</span>
                            )}
                          </span>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.04] text-[11px]">
                        <div>
                          <span className="text-zinc-500 block">Total Harvest Volume</span>
                          <span className="text-white font-mono font-bold">{stockSummaryByUnit}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block">Healthy vs Low Stock</span>
                          <span className="text-zinc-300 font-mono">
                            {farmerProducts.length - lowStockProducts.length} normal · {lowStockProducts.length} low
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-white/[0.04]">
                  <button
                    onClick={() => setActiveTab('crops')}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                  >
                    <span>Manage harvest catalog & stock</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* 3. WEATHER: ACTION-ORIENTED ADVISORY (What should I do next?) */}
          <section className="bg-[#0f1115]/90 border border-white/[0.08] rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                  <CloudSun className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">{t.header.weatherAdvisory}</h3>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                    <span>Warangal Microclimate Station</span>
                    <span aria-hidden="true" className="text-zinc-600">·</span>
                    <span className="text-zinc-300 font-mono font-medium">
                      {forecast[0] ? `${forecast[0].tempMin}°C–${forecast[0].tempMax}°C · ${forecast[0].condition}` : '22°C–31°C · Partly Cloudy'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('weather')}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 self-start sm:self-auto"
              >
                <span>{t.farmer.view7DayGuidance}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 3 Action Pillars: What is happening, What it means, What to do next */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
              <div className="bg-[#121418] rounded-xl border border-white/[0.06] p-3.5 space-y-1.5">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide block">
                  {t.farmer.whatsHappening}
                </span>
                <p className="text-zinc-200 leading-relaxed font-medium">
                  {todayWeatherDetail.happening}
                </p>
              </div>

              <div className="bg-[#121418] rounded-xl border border-white/[0.06] p-3.5 space-y-1.5">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide block">
                  {t.farmer.whatItMeans}
                </span>
                <p className="text-zinc-300 leading-relaxed">
                  {todayWeatherDetail.means}
                </p>
              </div>

              <div className="bg-[#121418] rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-3.5 space-y-1.5">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide block">
                  {t.farmer.whatToDo}
                </span>
                <p className="text-emerald-200 font-semibold leading-relaxed">
                  {todayWeatherDetail.todo}
                </p>
              </div>
            </div>
          </section>

          {/* 4. PLAN & 5. AI (Side-by-side on desktop, stacked on mobile) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 4. PLAN: Crop Planner Entry Point */}
            <section className="bg-[#0f1115]/90 border border-white/[0.08] rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Sprout className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-tight">{t.header.cropPlanner}</h3>
                      <p className="text-[11px] text-zinc-400">Seasonal Soil Rotation & Profit Optimizer</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Kharif Rotation
                  </span>
                </div>

                <div className="mt-3.5 space-y-2.5 text-xs">
                  <p className="text-zinc-300 leading-relaxed">
                    Based on your 3.5 acres of Red Sandy Loam and current monsoon moisture levels, optimal rotational sequences are ready for review.
                  </p>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="p-2.5 bg-[#121418] rounded-xl border border-white/[0.06] text-center">
                      <span className="text-white font-bold block truncate">Green Gram</span>
                      <span className="text-[10px] text-emerald-400 font-medium">Nitrogen Fixing</span>
                    </div>
                    <div className="p-2.5 bg-[#121418] rounded-xl border border-white/[0.06] text-center">
                      <span className="text-white font-bold block truncate">Tomato (Arka)</span>
                      <span className="text-[10px] text-amber-400 font-medium">High Profit</span>
                    </div>
                    <div className="p-2.5 bg-[#121418] rounded-xl border border-white/[0.06] text-center">
                      <span className="text-white font-bold block truncate">Turmeric</span>
                      <span className="text-[10px] text-sky-400 font-medium">Cash Harvest</span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('planner')}
                className="w-full mt-2 py-2.5 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:text-emerald-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
              >
                <span>{t.farmer.openCropPlanner}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </section>

            {/* 5. AI: AI Agronomist (Easily accessible, compact, not dominating) */}
            <section className="bg-[#0f1115]/90 border border-white/[0.08] rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-tight">{t.header.aiAgronomist}</h3>
                      <p className="text-[11px] text-zinc-400">Natural Farming & Protection Intelligence</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('agronomist')}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                  >
                    <span>Full Workspace</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Quick 1-click questions */}
                <div className="mt-3 space-y-2">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide block">
                    Quick Consultation
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {localizedQuickAiPrompts.slice(0, 2).map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAskQuickAi(prompt)}
                        className="text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-[#121418] hover:bg-[#181c22] border border-white/[0.06] text-zinc-300 hover:text-white transition-colors truncate max-w-full"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>

                  {/* AI response display if answered */}
                  {quickAiLoading && (
                    <div className="p-3 bg-[#121418] rounded-xl border border-white/[0.06] flex items-center gap-2 text-xs text-zinc-400">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                      <span>{t.thinking}</span>
                    </div>
                  )}

                  {quickAiAnswer && !quickAiLoading && (
                    <div className="p-3 bg-[#121418] rounded-xl border border-emerald-500/20 text-xs text-zinc-300 max-h-36 overflow-y-auto space-y-1">
                      <MarkdownRenderer content={quickAiAnswer} />
                    </div>
                  )}
                </div>
              </div>

              {/* Single-line question input */}
              <div className="relative mt-2">
                <input
                  type="text"
                  value={quickAiQuery}
                  onChange={(e) => setQuickAiQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAskQuickAi(quickAiQuery);
                  }}
                  placeholder={t.askAiPlaceholder}
                  className="w-full py-2 pl-3 pr-10 bg-[#121418] border border-white/[0.08] text-white rounded-xl text-xs focus:outline-none focus:border-emerald-500/50"
                />
                <button
                  onClick={() => handleAskQuickAi(quickAiQuery)}
                  disabled={quickAiLoading || !quickAiQuery.trim()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-emerald-400 hover:text-emerald-300 disabled:opacity-40 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </section>
          </div>

          {/* 6. ANALYTICS: SECONDARY PROGRESSIVE DISCLOSURE */}
          <section className="pt-2">
            <div className="bg-[#0f1115]/90 border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
              <button
                onClick={() => setShowDetailedAnalytics((prev) => !prev)}
                className="w-full p-4 hover:bg-[#14171d] text-left flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      {t.farmer.secondaryAnalyticsTitle}
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Revenue ₹{analytics.totalRevenue} · {analytics.totalOrders} total orders · Volume metrics & demand trends
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
                  <span>{showDetailedAnalytics ? t.farmer.collapseAnalytics : t.farmer.expandAnalytics}</span>
                  {showDetailedAnalytics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {showDetailedAnalytics && (
                <div className="p-5 border-t border-white/[0.06] bg-[#0c0e12] space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-[#121418] rounded-xl border border-white/[0.06]">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold block">{t.farmer.aovTitle}</span>
                      <span className="text-lg font-bold font-mono text-emerald-400">₹{analytics.aov}</span>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{t.farmer.aovSubtitle}</p>
                    </div>

                    <div className="p-3 bg-[#121418] rounded-xl border border-white/[0.06]">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold block">{t.farmer.meanVolumeTitle}</span>
                      <span className="text-lg font-bold font-mono text-white">{analytics.meanVolume} {t.common.units}</span>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{t.farmer.meanVolumeSubtitle}</p>
                    </div>

                    <div className="p-3 bg-[#121418] rounded-xl border border-white/[0.06]">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold block">{t.farmer.medianVolumeTitle}</span>
                      <span className="text-lg font-bold font-mono text-white">{analytics.medianVolume} {t.common.units}</span>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{t.farmer.medianVolumeSubtitle}</p>
                    </div>

                    <div className="p-3 bg-[#121418] rounded-xl border border-white/[0.06]">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold block">{t.farmer.modeVolumeTitle}</span>
                      <span className="text-lg font-bold font-mono text-white">{analytics.modeVolume} {t.common.units}</span>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{t.farmer.modeVolumeSubtitle}</p>
                    </div>
                  </div>

                  {/* Top Sellers Bar Chart */}
                  {analytics.topCrops.length > 0 && (
                    <div className="p-3.5 bg-[#121418] rounded-xl border border-white/[0.06] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white block">{t.farmer.topSellingProduce}</span>
                        <button
                          onClick={() => setActiveTab('analytics')}
                          className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                        >
                          <span>Full Analytics Tab</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="space-y-2 pt-1">
                        {analytics.topCrops.map((tc, idx) => (
                          <div key={idx} className="space-y-1 text-xs">
                            <div className="flex justify-between text-zinc-300">
                              <span>{tc.title}</span>
                              <span className="text-zinc-400 font-mono">{formatQuantity(tc.volume, tc.unit, language)} • ₹{tc.revenue}</span>
                            </div>
                            <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-emerald-500 h-1.5 rounded-full"
                                style={{
                                  width: `${Math.min(100, (tc.volume / (analytics.topCrops[0]?.volume || 1)) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          DEDICATED SECTION TABS (Opened on request)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

      {/* 1. DEDICATED INVENTORY & CROPS TAB */}
      {activeTab === 'crops' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">{t.farmer.activeHarvestInventory}</h2>
              <p className="text-xs text-zinc-400">
                {t.farmer.managePricingStock}
              </p>
            </div>
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 self-start sm:self-auto shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>{t.farmer.listNewCrop}</span>
            </button>
          </div>

          {/* Search & Category Filter Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                placeholder="Search crops by name or category..."
                className="w-full pl-9 pr-3 py-2 bg-[#121418] border border-white/[0.08] text-white rounded-xl text-xs focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
              {['all', 'Vegetables', 'Fruits', 'Grains & Cereals', 'Pulses & Spices', 'Dairy & Poultry'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setInventoryCategory(cat)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    inventoryCategory === cat
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {cat === 'all' ? t.common.all : cat}
                </button>
              ))}
            </div>
          </div>

          {filteredInventory.length === 0 ? (
            <div className="bg-[#0f1115] rounded-2xl border border-white/[0.08] p-12 text-center shadow-xl space-y-2">
              <Leaf className="w-10 h-10 text-zinc-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">{t.farmer.noCropsListed}</h4>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                {t.farmer.noCropsListedDesc}
              </p>
              <button
                onClick={handleOpenAddModal}
                className="mt-3 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>{t.farmer.listNewCrop}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredInventory.map((p) => {
                const isOutOfStock = p.stock <= 0;
                const isLowStock = p.stock > 0 && p.stock <= 10;

                return (
                  <div
                    key={p.id}
                    className="bg-[#0f1115]/90 rounded-2xl border border-white/[0.08] p-4 shadow-xl flex flex-col justify-between hover:border-emerald-500/30 transition-all space-y-3"
                  >
                    <div className="flex gap-3">
                      <img
                        src={p.image_url}
                        alt={p.title}
                        className="w-16 h-16 object-cover rounded-xl border border-white/[0.08] shrink-0 bg-zinc-900"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            {p.category}
                          </span>
                          {p.is_organic && (
                            <span className="text-[10px] font-bold text-emerald-300 flex items-center gap-0.5">
                              <Leaf className="w-3 h-3 text-emerald-400" />
                              {t.categories.organic}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-white mt-1 truncate">{p.title}</h4>
                        <div className="mt-1 text-xs font-mono font-black text-white">
                          ₹{p.price} <span className="text-[11px] font-normal text-zinc-400">/{normalizeUnit(p.unit)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-xs">
                      <div>
                        <span className="text-zinc-500 block text-[10px] uppercase font-bold">{t.farmer.stockAvailability}</span>
                        <span
                          className={`font-bold text-xs font-mono ${
                            isOutOfStock
                              ? 'text-rose-400'
                              : isLowStock
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {formatStock(p.stock, p.unit, language)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors border border-white/[0.08]"
                          title={t.common.edit}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCrop(p.id)}
                          className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-white/[0.08]"
                          title={t.common.delete}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. DEDICATED ORDERS QUEUE TAB */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">{t.farmer.ordersQueueTitle}</h2>
              <p className="text-xs text-zinc-400">
                {pendingOrders.length} pending · {farmerOrders.length} total orders recorded
              </p>
            </div>
            <button
              onClick={loadFarmerData}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 px-3 py-1.5 bg-emerald-500/10 rounded-lg flex items-center gap-1 border border-emerald-500/30"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t.common.refresh}</span>
            </button>
          </div>

          {farmerOrders.length === 0 ? (
            <div className="bg-[#0f1115] rounded-2xl border border-white/[0.08] p-12 text-center text-zinc-500 shadow-xl space-y-2">
              <Clock className="w-10 h-10 mx-auto opacity-40 text-zinc-500" />
              <p className="text-sm font-bold text-white">{t.customer.emptyOrdersTitle}</p>
              <p className="text-xs text-zinc-500">
                {t.customer.emptyOrdersDesc}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {farmerOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-[#0f1115]/90 rounded-2xl border border-white/[0.08] p-4 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white font-mono">
                        {t.customer.orderNumber}: #{ord.id.replace('ord_', 'FH')}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          ord.status === 'pending'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : ord.status === 'accepted'
                            ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                            : ord.status === 'out_for_delivery'
                            ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                            : ord.status === 'delivered'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-zinc-800 text-zinc-400 border border-white/[0.04]'
                        }`}
                      >
                        {ord.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <p className="text-zinc-300">
                      {t.auth.customerRole}: <span className="font-semibold text-white">{ord.customer_name}</span> ({ord.customer_phone || 'No phone'})
                    </p>

                    <div className="text-zinc-400">
                      {t.customer.allProduce}: {ord.items.map((i) => formatOrderItemSummary(i.title, i.quantity, i.unit, language)).join(', ')}
                    </div>

                    <p className="text-[11px] text-zinc-500">
                      {t.delivery.deliveryDestination}: {ord.delivery_address}
                    </p>
                  </div>

                  {/* Pricing & Order Actions */}
                  <div className="flex items-center gap-4 self-stretch md:self-auto justify-between border-t md:border-t-0 border-white/[0.06] pt-2 md:pt-0">
                    <div className="text-right">
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold">
                        {t.customer.fairPrice}
                      </span>
                      <span className="text-base font-mono font-black text-emerald-400">₹{ord.total_amount}</span>
                    </div>

                    {ord.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOrderStatusUpdate(ord.id, 'accepted')}
                          className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-md"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{t.farmer.acceptOrder}</span>
                        </button>
                        <button
                          onClick={() => handleOrderStatusUpdate(ord.id, 'cancelled')}
                          className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>{t.farmer.rejectOrder}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. DEDICATED WEATHER TAB */}
      {activeTab === 'weather' && (
        <WeatherCropAdvisory
          forecast={forecast}
          language={language}
          onConsultAgronomist={() => setActiveTab('agronomist')}
        />
      )}

      {/* 4. DEDICATED CROP PLANNER TAB */}
      {activeTab === 'planner' && (
        <CropPlannerSection
          weatherForecast={forecast}
          farmerLocation={currentProfile?.location}
          language={language}
        />
      )}

      {/* 5. DEDICATED AI AGRONOMIST TAB */}
      {activeTab === 'agronomist' && (
        <FarmerAiAdvisoryCard
          currentProfile={currentProfile}
          language={language}
          onOpenFullChat={onOpenFullAi}
        />
      )}

      {/* 6. DEDICATED ANALYTICS TAB */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">{t.farmer.secondaryAnalyticsTitle}</h2>
              <p className="text-xs text-zinc-400">
                Total Revenue ₹{analytics.totalRevenue} across {analytics.totalOrders} consumer orders
              </p>
            </div>
            <button
              onClick={loadFarmerData}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 px-3 py-1.5 bg-emerald-500/10 rounded-lg flex items-center gap-1 border border-emerald-500/30"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t.common.refresh}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-4 bg-[#121418] rounded-xl border border-white/[0.06]">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">{t.farmer.aovTitle}</span>
              <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">₹{analytics.aov}</span>
              <p className="text-[10px] text-zinc-500 mt-1">{t.farmer.aovSubtitle}</p>
            </div>

            <div className="p-4 bg-[#121418] rounded-xl border border-white/[0.06]">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">{t.farmer.meanVolumeTitle}</span>
              <span className="text-xl font-bold font-mono text-white mt-1 block">{analytics.meanVolume} {t.common.units}</span>
              <p className="text-[10px] text-zinc-500 mt-1">{t.farmer.meanVolumeSubtitle}</p>
            </div>

            <div className="p-4 bg-[#121418] rounded-xl border border-white/[0.06]">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">{t.farmer.medianVolumeTitle}</span>
              <span className="text-xl font-bold font-mono text-white mt-1 block">{analytics.medianVolume} {t.common.units}</span>
              <p className="text-[10px] text-zinc-500 mt-1">{t.farmer.medianVolumeSubtitle}</p>
            </div>

            <div className="p-4 bg-[#121418] rounded-xl border border-white/[0.06]">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">{t.farmer.modeVolumeTitle}</span>
              <span className="text-xl font-bold font-mono text-white mt-1 block">{analytics.modeVolume} {t.common.units}</span>
              <p className="text-[10px] text-zinc-500 mt-1">{t.farmer.modeVolumeSubtitle}</p>
            </div>
          </div>

          {/* Real Marketplace Demand */}
          {realMarketDemand.length > 0 && (
            <div className="bg-[#121418] border border-white/[0.08] rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{t.farmer.realMarketDemand}</span>
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    {t.farmer.realDemandSubtitle}
                  </p>
                </div>
                <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                  {realMarketDemand.length} {t.farmer.activeCropsCount.replace('{count}', '')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {realMarketDemand.map((item) => (
                  <div
                    key={item.productId}
                    className="p-3.5 bg-[#09090b]/80 border border-white/[0.04] rounded-xl flex flex-col justify-between space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-white tracking-tight">{item.title}</span>
                      <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        {item.recentDemandTrend}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-white/[0.04]">
                      <div>
                        <span className="text-zinc-500 block text-[10px] uppercase font-bold">{t.farmer.currentOrdersTransit}</span>
                        <span className="text-white font-mono font-bold">{item.currentOrders}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[10px] uppercase font-bold">{t.farmer.stockAvailability}</span>
                        <span className="text-emerald-400 font-mono font-bold">{formatQuantity(item.stock, item.unit, language)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Selling Produce */}
          {analytics.topCrops.length > 0 && (
            <div className="p-5 bg-[#121418] rounded-2xl border border-white/[0.08] space-y-3 shadow-xl">
              <span className="text-sm font-bold text-white block">{t.farmer.topSellingProduce}</span>
              <div className="space-y-3 pt-1">
                {analytics.topCrops.map((tc, idx) => (
                  <div key={idx} className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-zinc-300">
                      <span className="font-medium text-white">{tc.title}</span>
                      <span className="text-zinc-400 font-mono">{formatQuantity(tc.volume, tc.unit, language)} • ₹{tc.revenue}</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-2 rounded-full"
                        style={{
                          width: `${Math.min(100, (tc.volume / (analytics.topCrops[0]?.volume || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          CROP ADD / EDIT MODAL
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0f1115] rounded-2xl border border-white/[0.12] max-w-lg w-full p-6 shadow-2xl space-y-4 text-white">
            <h3 className="text-base font-bold text-white">
              {editingProduct ? t.farmer.editCropTitle : t.farmer.addNewCropTitle}
            </h3>

            {formError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveCrop} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-zinc-300 mb-1">{t.farmer.cropNameLabel}</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={t.farmer.cropNameLabel}
                  className="w-full p-2.5 bg-[#121418] border border-white/[0.08] text-white rounded-xl focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-zinc-300 mb-1">{t.farmer.categoryLabel}</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2.5 bg-[#121418] border border-white/[0.08] text-white rounded-xl focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="Vegetables" className="bg-[#09090b]">{t.categories.vegetables}</option>
                    <option value="Fruits" className="bg-[#09090b]">{t.categories.fruits}</option>
                    <option value="Grains & Cereals" className="bg-[#09090b]">{t.categories.grains}</option>
                    <option value="Pulses & Spices" className="bg-[#09090b]">{t.categories.pulses}</option>
                    <option value="Dairy & Poultry" className="bg-[#09090b]">{t.categories.dairy}</option>
                    <option value="Organic Special" className="bg-[#09090b]">{t.categories.organic}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-zinc-300 mb-1">{t.farmer.unitLabel}</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full p-2.5 bg-[#121418] border border-white/[0.08] text-white rounded-xl focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="kg" className="bg-[#09090b]">kg (Kilogram)</option>
                    <option value="g" className="bg-[#09090b]">g (Gram)</option>
                    <option value="piece" className="bg-[#09090b]">piece (Count)</option>
                    <option value="bunch" className="bg-[#09090b]">bunch (Bundle)</option>
                    <option value="crate" className="bg-[#09090b]">crate (Bulk crate)</option>
                    <option value="box" className="bg-[#09090b]">box (Pack box)</option>
                    <option value="unit" className="bg-[#09090b]">unit (Item)</option>
                    <option value="L" className="bg-[#09090b]">L (Litre)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-zinc-300 mb-1">{t.farmer.pricePerUnitLabel}</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full p-2.5 bg-[#121418] border border-white/[0.08] text-white rounded-xl focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-300 mb-1">{t.farmer.stockQuantityLabel}</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                    className="w-full p-2.5 bg-[#121418] border border-white/[0.08] text-white rounded-xl focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-300 mb-1">{t.farmer.cropDescriptionLabel}</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t.farmer.cropDescriptionLabel}
                  className="w-full p-2.5 bg-[#121418] border border-white/[0.08] text-white rounded-xl focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-300 mb-1">{t.farmer.imageUrlLabel}</label>
                <input
                  type="url"
                  required
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full p-2.5 bg-[#121418] border border-white/[0.08] text-white rounded-xl focus:outline-none focus:border-emerald-500/50 font-mono text-[11px]"
                />
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  {CROP_IMAGE_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormData({ ...formData, imageUrl: preset.url })}
                      className="px-2 py-1 rounded bg-[#121418] border border-white/[0.08] hover:border-emerald-500/40 text-[10px] text-zinc-400 hover:text-white transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isOrganic"
                  checked={formData.isOrganic}
                  onChange={(e) => setFormData({ ...formData, isOrganic: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 bg-zinc-900 border-white/[0.1]"
                />
                <label htmlFor="isOrganic" className="text-zinc-200 font-medium cursor-pointer">
                  {t.farmer.certifiedOrganicCheck}
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white text-xs font-semibold"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl text-xs font-bold transition-all shadow-md"
                >
                  {editingProduct ? t.common.save : t.farmer.saveCropListing}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
