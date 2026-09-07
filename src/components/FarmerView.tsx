import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  TrendingUp,
  BarChart3,
  Leaf,
  Layers,
  Sparkles,
  Package,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { Product, Order, DemandAnalytics, Profile, Language } from '../types';
import { translations } from '../lib/translations';
import { api } from '../lib/api';

interface FarmerViewProps {
  currentProfile: Profile;
  language: Language;
  onRefreshAll: () => Promise<void>;
  externalTab?: 'crops' | 'orders' | 'analytics';
  onSelectTab?: (tab: 'crops' | 'orders' | 'analytics') => void;
}

const CROP_IMAGE_PRESETS = [
  { label: 'Tomatoes', url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=600' },
  { label: 'Mangoes', url: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=600' },
  { label: 'Spinach', url: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&q=80&w=600' },
  { label: 'Basmati Rice', url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=600' },
  { label: 'Turmeric Spices', url: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=600' },
  { label: 'Fresh Milk', url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=600' },
];

export const FarmerView: React.FC<FarmerViewProps> = ({
  currentProfile,
  language,
  onRefreshAll,
  externalTab,
  onSelectTab,
}) => {
  const t = translations[language];
  const [activeTabState, setActiveTabState] = useState<'crops' | 'orders' | 'analytics'>('crops');
  const activeTab = externalTab || activeTabState;
  const setActiveTab = (tab: 'crops' | 'orders' | 'analytics') => {
    setActiveTabState(tab);
    if (onSelectTab) onSelectTab(tab);
  };
  const [farmerProducts, setFarmerProducts] = useState<Product[]>([]);
  const [farmerOrders, setFarmerOrders] = useState<Order[]>([]);
  const [analytics, setAnalytics] = useState<DemandAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  // Crop Form State (Add / Edit)
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
    imageUrl: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  const loadFarmerData = async () => {
    setLoading(true);
    try {
      const [prodRes, ordRes, analyticsRes] = await Promise.all([
        api.getProducts({ farmerId: currentProfile.id }),
        api.getOrders(currentProfile.id, 'farmer'),
        api.getFarmerAnalytics(currentProfile.id),
      ]);
      setFarmerProducts(prodRes.products);
      setFarmerOrders(ordRes.orders);
      setAnalytics(analyticsRes.analytics);
    } catch (err) {
      console.error('Failed to load farmer data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFarmerData();
  }, [currentProfile.id]);

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
      setFormError('Crop name is required');
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
      setFormError(err.message || 'Failed to save crop');
    }
  };

  const handleDeleteCrop = async (id: string) => {
    if (!confirm('Are you sure you want to remove this crop from your listings?')) return;
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

  return (
    <div className="space-y-6">
      {/* Farmer Farm Profile Header */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-4">
          <img
            src={currentProfile.avatar_url || 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=200'}
            alt={currentProfile.full_name}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-xs"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-stone-900">{currentProfile.full_name}</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified Organic Farmer
              </span>
            </div>
            <p className="text-sm font-medium text-emerald-700">
              {currentProfile.farm_name || 'Green Acres'}
            </p>
            <p className="text-xs text-stone-500">{currentProfile.location}</p>
          </div>
        </div>

        {/* Quick Nav Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl text-xs font-semibold text-stone-600 self-stretch md:self-auto">
          <button
            onClick={() => setActiveTab('crops')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'crops'
                ? 'bg-white text-emerald-800 shadow-xs font-bold'
                : 'hover:text-stone-900'
            }`}
          >
            <Package className="w-4 h-4" />
            {t.cropManagement} ({farmerProducts.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'orders'
                ? 'bg-white text-emerald-800 shadow-xs font-bold'
                : 'hover:text-stone-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            Orders (
            {farmerOrders.filter((o) => o.status === 'pending').length} pending)
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'analytics'
                ? 'bg-white text-emerald-800 shadow-xs font-bold'
                : 'hover:text-stone-900'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            {t.demandAnalytics}
          </button>
        </div>
      </div>

      {/* 1. CROPS MANAGEMENT TAB */}
      {activeTab === 'crops' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-stone-900">Your Harvest Catalog</h2>
              <p className="text-xs text-stone-500">
                Update prices, restock harvested produce, and add new crops for consumers.
              </p>
            </div>
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              {t.addCrop}
            </button>
          </div>

          {farmerProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
              <Leaf className="w-12 h-12 text-emerald-500 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-stone-800">You haven't listed any crops yet.</p>
              <p className="text-xs text-stone-400 mt-1">Tap 'List New Crop' to publish your farm produce.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {farmerProducts.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs flex flex-col justify-between"
                >
                  <div className="p-4">
                    <div className="flex gap-3">
                      <img
                        src={p.image_url}
                        alt={p.title}
                        className="w-20 h-20 object-cover rounded-xl border border-stone-200 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            {p.category}
                          </span>
                          {p.is_organic && (
                            <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-0.5">
                              <Leaf className="w-3 h-3" />
                              Organic
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-stone-900 mt-1 truncate">{p.title}</h3>
                        <p className="text-xs text-stone-500 line-clamp-1 mt-0.5">{p.description}</p>
                        <div className="mt-2 text-sm font-black text-stone-900">
                          ₹{p.price} <span className="text-xs font-normal text-stone-500">/{p.unit}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-stone-400 block text-[10px]">Available Stock</span>
                        <span
                          className={`font-bold ${
                            p.stock <= 0
                              ? 'text-rose-600'
                              : p.stock <= 10
                              ? 'text-amber-600'
                              : 'text-emerald-700'
                          }`}
                        >
                          {p.stock} {p.unit}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          className="p-1.5 text-stone-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-stone-200"
                          title="Edit Crop"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCrop(p.id)}
                          className="p-1.5 text-stone-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-stone-200"
                          title="Delete Crop"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. ORDERS QUEUE TAB */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-stone-900">Incoming Farm Orders</h2>
              <p className="text-xs text-stone-500">
                Accept or reject orders. Cancelling/rejecting an order automatically returns inventory to stock.
              </p>
            </div>
            <button
              onClick={loadFarmerData}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 p-2 bg-emerald-50 rounded-lg flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          {farmerOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-400">
              <Clock className="w-12 h-12 mx-auto mb-2 opacity-40 text-stone-400" />
              <p className="text-sm font-semibold text-stone-700">No incoming orders yet.</p>
              <p className="text-xs text-stone-400 mt-1">Orders placed by customers will appear here in real time.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {farmerOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-stone-900">Order #{ord.id}</span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          ord.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : ord.status === 'accepted'
                            ? 'bg-blue-100 text-blue-800'
                            : ord.status === 'out_for_delivery'
                            ? 'bg-purple-100 text-purple-800'
                            : ord.status === 'delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-stone-200 text-stone-700'
                        }`}
                      >
                        {ord.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <p className="text-xs text-stone-600">
                      Customer: <span className="font-semibold">{ord.customer_name}</span> ({ord.customer_phone || 'No phone'})
                    </p>

                    <div className="text-xs text-stone-500">
                      Items:{' '}
                      {ord.items.map((i) => `${i.title} (${i.quantity} ${i.unit})`).join(', ')}
                    </div>

                    <p className="text-[11px] text-stone-400">
                      {new Date(ord.created_at).toLocaleString()}
                    </p>
                  </div>

                  {/* Revenue & Action Buttons */}
                  <div className="flex items-center gap-4 self-stretch md:self-auto justify-between border-t md:border-t-0 pt-2 md:pt-0">
                    <div className="text-right">
                      <span className="text-[10px] text-stone-400 block uppercase font-bold">Total Payout</span>
                      <span className="text-base font-extrabold text-emerald-700">₹{ord.total_amount}</span>
                    </div>

                    {ord.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOrderStatusUpdate(ord.id, 'accepted')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-2xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Accept Order
                        </button>
                        <button
                          onClick={() => handleOrderStatusUpdate(ord.id, 'cancelled')}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject & Restock
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

      {/* 3. DEMAND ANALYTICS TAB */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                Total Farm Revenue
              </span>
              <div className="text-2xl font-black text-stone-900 mt-1">₹{analytics.totalRevenue}</div>
              <span className="text-[11px] text-emerald-600 font-medium">Direct earnings</span>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                Total Orders Fulfilled
              </span>
              <div className="text-2xl font-black text-stone-900 mt-1">{analytics.totalOrders}</div>
              <span className="text-[11px] text-stone-500 font-medium">Completed deliveries</span>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                Average Order Value
              </span>
              <div className="text-2xl font-black text-emerald-700 mt-1">₹{analytics.aov}</div>
              <span className="text-[11px] text-stone-500 font-medium">Per consumer basket</span>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                Crop Volume Stats
              </span>
              <div className="text-xs font-semibold text-stone-700 mt-2 space-y-0.5">
                <div>Mean Volume: <span className="font-bold text-emerald-700">{analytics.meanVolume} units</span></div>
                <div>Median: <span className="font-bold text-stone-900">{analytics.medianVolume} units</span></div>
                <div>Mode: <span className="font-bold text-stone-900">{analytics.modeVolume} units</span></div>
              </div>
            </div>
          </div>

          {/* Top Crops Sales Distribution */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs">
            <h3 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              Top Selling Produce Volume & Revenue
            </h3>

            {analytics.topCrops.length === 0 ? (
              <p className="text-xs text-stone-500 py-4">No completed crop sales records yet.</p>
            ) : (
              <div className="space-y-3">
                {analytics.topCrops.map((tc, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-stone-800">
                      <span>{tc.title}</span>
                      <span>
                        {tc.volume} units sold • ₹{tc.revenue}
                      </span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-2 rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            (tc.volume / (analytics.topCrops[0]?.volume || 1)) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Seasonal Projections & Planting Suggestions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Seasonal Trends */}
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs">
              <h3 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Seasonal Demand Projections
              </h3>
              <div className="space-y-2.5">
                {analytics.seasonalTrends.map((st, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-stone-900">{st.month}</span>
                      <p className="text-[11px] text-stone-500">{st.cropName}</p>
                    </div>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                      {st.sales} units demand
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Smart Planting Suggestions */}
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs">
              <h3 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Next Cycle Crop Planting Recommendations
              </h3>
              <div className="space-y-2.5">
                {analytics.plantingSuggestions.map((ps, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-stone-50 border border-stone-100 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900">{ps.crop}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          ps.demandLevel === 'Critical Shortage'
                            ? 'bg-rose-100 text-rose-800'
                            : ps.demandLevel === 'High'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {ps.demandLevel}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-600">{ps.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CROP ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-stone-900">
              {editingProduct ? 'Edit Crop Listing' : 'List New Fresh Farm Crop'}
            </h3>

            {formError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveCrop} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Crop Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Vine-Ripened Organic Tomatoes"
                  className="w-full p-2 border border-stone-300 rounded-xl focus:outline-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded-xl focus:outline-emerald-600"
                  >
                    <option value="Vegetables">Vegetables</option>
                    <option value="Fruits">Fruits</option>
                    <option value="Grains & Cereals">Grains & Cereals</option>
                    <option value="Pulses & Spices">Pulses & Spices</option>
                    <option value="Dairy & Poultry">Dairy & Poultry</option>
                    <option value="Organic Special">Organic Special</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded-xl focus:outline-emerald-600"
                  >
                    <option value="kg">kg (Kilogram)</option>
                    <option value="bunch">bunch (Leafy greens)</option>
                    <option value="piece">piece (Fruit/Coconut)</option>
                    <option value="liter">liter (A2 Milk/Oil)</option>
                    <option value="gram">gram (Spices)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Price (₹ per unit)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 rounded-xl focus:outline-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Harvest Stock</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 rounded-xl focus:outline-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Crop Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Harvest details, natural aroma, seed origin, pesticide-free verification..."
                  className="w-full p-2 border border-stone-300 rounded-xl focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Crop Image (Select Quick Preset or Custom URL)
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 mb-2">
                  {CROP_IMAGE_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setFormData({ ...formData, imageUrl: preset.url })}
                      className={`group p-1 border rounded-lg text-center transition-all flex flex-col items-center gap-1 ${
                        formData.imageUrl === preset.url
                          ? 'border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600'
                          : 'border-stone-200 hover:border-emerald-300 bg-white'
                      }`}
                      title={preset.label}
                    >
                      <img
                        src={preset.url}
                        alt={preset.label}
                        className="w-full h-10 object-cover rounded-sm"
                      />
                      <span className="text-[10px] font-medium text-stone-700 group-hover:text-emerald-700 truncate w-full">
                        {preset.label}
                      </span>
                    </button>
                  ))}
                </div>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full p-2 border border-stone-300 rounded-xl focus:outline-emerald-600"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={formData.isOrganic}
                  onChange={(e) => setFormData({ ...formData, isOrganic: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span className="font-semibold text-stone-700">Certified Organic / Chemical Free Produce</span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
                >
                  {editingProduct ? 'Update Crop' : 'Publish Crop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
