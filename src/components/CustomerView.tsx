import React, { useState } from 'react';
import {
  Search,
  Heart,
  ShoppingCart,
  CheckCircle2,
  Clock,
  Truck,
  MapPin,
  Leaf,
  ShieldCheck,
  PackageCheck,
  Phone,
  ArrowRight,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { Product, CartItem, WishlistItem, Order, BrowseHistoryItem, Profile, Language } from '../types';
import { getTranslation } from '../lib/translations';
import { formatQuantity, formatStock, formatOnlyLeft, normalizeUnit } from '../lib/quantity';

interface CustomerViewProps {
  currentProfile: Profile;
  language: Language;
  activeTab: 'shop' | 'orders' | 'wishlist';
  products: Product[];
  cartItems: CartItem[];
  wishlist: WishlistItem[];
  orders: Order[];
  browseHistory: BrowseHistoryItem[];
  onAddToCart: (product: Product) => Promise<void>;
  onToggleWishlist: (productId: string) => Promise<void>;
  onRefreshOrders: () => Promise<void>;
  onSelectProduct: (productId: string) => void;
  externalSearchTerm?: string;
  onSearchChange?: (term: string) => void;
}

export const CustomerView: React.FC<CustomerViewProps> = ({
  currentProfile,
  language,
  activeTab,
  products,
  cartItems,
  wishlist,
  orders,
  browseHistory,
  onAddToCart,
  onToggleWishlist,
  onRefreshOrders,
  onSelectProduct,
  externalSearchTerm,
  onSearchChange,
}) => {
  const t = getTranslation(language);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  const searchTerm = externalSearchTerm !== undefined ? externalSearchTerm : internalSearchTerm;
  const setSearchTerm = (term: string) => {
    setInternalSearchTerm(term);
    if (onSearchChange) onSearchChange(term);
  };
  const [organicOnly, setOrganicOnly] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const categories = [
    { id: 'All', label: t.categories.all },
    { id: 'Vegetables', label: t.categories.vegetables },
    { id: 'Fruits', label: t.categories.fruits },
    { id: 'Grains & Cereals', label: t.categories.grains },
    { id: 'Pulses & Spices', label: t.categories.pulses },
    { id: 'Dairy & Poultry', label: t.categories.dairy },
  ];

  const wishlistedIds = new Set(wishlist.map((w) => w.product_id));

  // Filter products based on search, category and organic toggle
  const filteredProducts = products.filter((p) => {
    if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;
    if (organicOnly && !p.is_organic) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matches =
        p.title.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        p.farmer_name.toLowerCase().includes(term) ||
        p.farmer_location.toLowerCase().includes(term);
      if (!matches) return false;
    }
    return true;
  });

  const handleAddToCart = async (product: Product) => {
    try {
      setAddingId(product.id);
      await onAddToCart(product);
    } finally {
      setAddingId(null);
    }
  };

  // Helper for Order timeline stages
  const orderStages: { key: Order['status']; label: string; step: number }[] = [
    { key: 'pending', label: t.customer.stagePending, step: 1 },
    { key: 'accepted', label: t.customer.stageAccepted, step: 2 },
    { key: 'out_for_delivery', label: t.customer.stageOutForDelivery, step: 3 },
    { key: 'delivered', label: t.customer.stageDelivered, step: 4 },
  ];

  const getStageIndex = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 1;
      case 'accepted':
        return 2;
      case 'out_for_delivery':
        return 3;
      case 'delivered':
        return 4;
      default:
        return 0; // cancelled
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. PRODUCE MARKETPLACE TAB */}
      {activeTab === 'shop' && (
        <>
          {/* Refined Agri-Tech Hero Banner */}
          <div className="rounded-2xl bg-gradient-to-br from-[#0e1713] via-[#0f1115] to-[#09090b] text-white p-6 sm:p-8 relative overflow-hidden shadow-2xl border border-emerald-500/20">
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-3 border border-emerald-500/30">
                <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t.header.zeroMiddleman}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                {t.customer.directSupplyChain}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
                {t.customer.heroSubtitle}
              </p>

              {/* Agri-Tech Key Highlights */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-4 pt-4 border-t border-white/[0.08] text-[11px] text-zinc-400">
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  {t.customer.fairPrice}
                </span>
                <span className="text-zinc-600">•</span>
                <span className="flex items-center gap-1 text-zinc-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  {t.customer.verifiedProducer}
                </span>
                <span className="text-zinc-600">•</span>
                <span className="flex items-center gap-1 text-zinc-300">
                  <Truck className="w-3.5 h-3.5 text-emerald-400" />
                  {t.delivery.transitSafety}
                </span>
              </div>
            </div>
            {/* Subtle natural backdrop graphic */}
            <div className="absolute -right-8 -bottom-10 opacity-5 pointer-events-none">
              <Leaf className="w-72 h-72 text-emerald-400" />
            </div>
          </div>

          {/* Clean Filters & Controls Bar */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              {/* Search Bar for Mobile / Secondary */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t.customer.searchProducePlaceholder}
                  className="w-full pl-10 pr-4 py-2 text-xs bg-[#121418] border border-white/[0.08] text-white rounded-xl placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Organic Only Filter */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOrganicOnly((prev) => !prev)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border shadow-2xs ${
                    organicOnly
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                      : 'bg-[#121418] border-white/[0.08] text-zinc-300 hover:border-white/[0.15]'
                  }`}
                >
                  <Leaf className={`w-3.5 h-3.5 ${organicOnly ? 'text-emerald-400' : 'text-zinc-400'}`} />
                  <span>{t.customer.onlyOrganicFilter}</span>
                </button>
              </div>
            </div>

            {/* Category Pills Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === c.id
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs font-bold'
                      : 'bg-[#121418] border border-white/[0.08] text-zinc-400 hover:text-white hover:border-white/[0.15]'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 bg-[#0f1115]/90 rounded-2xl border border-white/[0.08] p-8 shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center mx-auto mb-3 text-zinc-500 border border-white/[0.08]">
                <Leaf className="w-6 h-6 text-zinc-500" />
              </div>
              <h3 className="text-sm font-bold text-white">{t.farmer.noCropsListed}</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                {t.farmer.noCropsListedDesc}
              </p>
              <button
                onClick={() => {
                  setSelectedCategory('All');
                  setOrganicOnly(false);
                  setSearchTerm('');
                }}
                className="mt-4 px-4 py-2 bg-emerald-500 text-zinc-950 text-xs font-bold rounded-xl hover:bg-emerald-400 transition-colors"
              >
                {t.common.refresh}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredProducts.map((p) => {
                const isWishlisted = wishlistedIds.has(p.id);
                const isOutOfStock = p.stock <= 0;
                const isLowStock = p.stock > 0 && p.stock <= 10;

                return (
                  <div
                    key={p.id}
                    onClick={() => onSelectProduct(p.id)}
                    className="group bg-[#0f1115]/90 rounded-2xl border border-white/[0.08] overflow-hidden hover:border-emerald-500/35 hover:shadow-[0_8px_30px_rgba(0,0,0,0.6)] transition-all duration-300 flex flex-col justify-between cursor-pointer backdrop-blur-md"
                  >
                    <div>
                      {/* Product Image Area */}
                      <div className="relative aspect-4/3 overflow-hidden bg-zinc-900">
                        <img
                          src={p.image_url}
                          alt={p.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />

                        {/* Top Badges */}
                        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start">
                          {p.is_organic && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold tracking-wide uppercase flex items-center gap-1 shadow-2xs backdrop-blur-xs">
                              <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                              {t.categories.organic}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-md bg-zinc-900/80 border border-white/[0.08] text-zinc-300 text-[10px] font-medium backdrop-blur-xs">
                            {p.category}
                          </span>
                        </div>

                        {/* Wishlist Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleWishlist(p.id);
                          }}
                          className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-md transition-colors shadow-2xs border ${
                            isWishlisted
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                              : 'bg-zinc-900/80 text-zinc-400 hover:text-rose-400 border-white/[0.08]'
                          }`}
                          title={isWishlisted ? t.common.remove : t.customer.wishlist}
                        >
                          <Heart
                            className="w-4 h-4"
                            fill={isWishlisted ? 'currentColor' : 'none'}
                          />
                        </button>

                        {/* Out of stock overlay */}
                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-zinc-950/75 backdrop-blur-2xs flex items-center justify-center">
                            <span className="bg-rose-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-xs">
                              {t.customer.outOfStock}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Product Content Information */}
                      <div className="p-4 space-y-2">
                        {/* Farmer Provenance */}
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                          <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="truncate font-medium text-zinc-300">
                            {p.farmer_name} • {p.farmer_location}
                          </span>
                        </div>

                        {/* Product Title */}
                        <h3 className="font-bold text-sm text-white line-clamp-1 group-hover:text-emerald-400 transition-colors">
                          {p.title}
                        </h3>

                        {/* Product Short Description */}
                        <p className="text-xs text-zinc-400 line-clamp-2 min-h-[32px] leading-relaxed">
                          {p.description}
                        </p>

                        {/* Price & Stock Line */}
                        <div className="pt-2 flex items-baseline justify-between border-t border-white/[0.06]">
                          <div>
                            <span className="text-lg font-mono font-black text-white">₹{p.price}</span>
                            <span className="text-xs text-zinc-400 font-medium">/{normalizeUnit(p.unit)}</span>
                          </div>

                          <div>
                            {isOutOfStock ? (
                              <span className="text-[11px] font-semibold text-rose-400">
                                {t.customer.outOfStock}
                              </span>
                            ) : isLowStock ? (
                              <span className="text-[11px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30">
                                {formatOnlyLeft(p.stock, p.unit, language)}
                              </span>
                            ) : (
                              <span className="text-[11px] text-emerald-400 font-medium">
                                {formatStock(p.stock, p.unit, language)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Primary Action Button */}
                    <div className="p-4 pt-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(p);
                        }}
                        disabled={isOutOfStock || addingId === p.id}
                        className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md ${
                          isOutOfStock
                            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/[0.04]'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-[0_0_15px_rgba(16,185,129,0.15)] active:scale-98'
                        }`}
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>
                          {addingId === p.id
                            ? t.customer.addedToCart
                            : isOutOfStock
                            ? t.customer.outOfStock
                            : t.customer.addToCart}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Browse History Section */}
          {browseHistory.length > 0 && (
            <div className="pt-6 border-t border-white/[0.08]">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-zinc-500" />
                {t.customer.recentlyBrowsed}
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                {browseHistory.map((item) => {
                  const prod = item.product;
                  if (!prod) return null;
                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelectProduct(prod.id)}
                      className="w-44 shrink-0 bg-[#0f1115] rounded-xl border border-white/[0.08] p-2.5 cursor-pointer hover:border-emerald-500/40 transition-all"
                    >
                      <img
                        src={prod.image_url}
                        alt={prod.title}
                        className="w-full h-24 object-cover rounded-lg mb-2"
                      />
                      <h4 className="text-xs font-bold text-white truncate">{prod.title}</h4>
                      <p className="text-[11px] text-zinc-400 font-mono font-medium">₹{prod.price}/{normalizeUnit(prod.unit)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* 2. ORDERS TRACKING TAB */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">{t.customer.orders}</h2>
              <p className="text-xs text-zinc-400">
                {t.customer.orderOtpNote}
              </p>
            </div>
            <button
              onClick={onRefreshOrders}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 px-3 py-1.5 bg-emerald-500/10 rounded-lg transition-colors flex items-center gap-1 border border-emerald-500/30"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t.common.refresh}</span>
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-16 bg-[#0f1115] rounded-2xl border border-white/[0.08] p-8 shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center mx-auto mb-3 text-zinc-500 border border-white/[0.08]">
                <PackageCheck className="w-6 h-6 text-zinc-500" />
              </div>
              <h3 className="text-sm font-bold text-white">{t.customer.emptyOrdersTitle}</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                {t.customer.emptyOrdersDesc}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((ord) => {
                const currentStage = getStageIndex(ord.status);
                const isCancelled = ord.status === 'cancelled';

                return (
                  <div
                    key={ord.id}
                    className="bg-[#0f1115]/90 rounded-2xl border border-white/[0.08] p-5 shadow-xl space-y-4"
                  >
                    {/* Top Bar: Order ID, Status, Date */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white font-mono">{t.customer.orderNumber}: #{ord.id}</span>
                          {isCancelled && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              {t.statusCancelled}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          {t.customer.orderPlacedOn}: {new Date(ord.created_at).toLocaleString()}
                        </p>
                      </div>

                      {/* Delivery OTP Notice (Only if active and not delivered/cancelled) */}
                      {!isCancelled && ord.status !== 'delivered' && (
                        <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl px-3.5 py-1.5 flex items-center gap-2.5 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                          <div>
                            <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                              {t.customer.deliveryOtp}
                            </div>
                            <div className="text-base font-black tracking-widest text-amber-300 font-mono">
                              {ord.otp_code}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Visual Order Timeline */}
                    {!isCancelled && (
                      <div className="py-2 px-1">
                        <div className="grid grid-cols-4 relative">
                          {/* Horizontal connecting line */}
                          <div className="absolute top-3.5 left-[12%] right-[12%] h-0.5 bg-zinc-800 -z-0" />
                          <div
                            className="absolute top-3.5 left-[12%] h-0.5 bg-emerald-500 transition-all -z-0 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                            style={{
                              width: `${((Math.max(1, currentStage) - 1) / 3) * 76}%`,
                            }}
                          />

                          {orderStages.map((stage) => {
                            const isPassed = currentStage >= stage.step;
                            const isCurrent = currentStage === stage.step;

                            return (
                              <div key={stage.key} className="flex flex-col items-center text-center z-10">
                                <div
                                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                                    isCurrent
                                      ? 'bg-emerald-500 text-zinc-950 ring-4 ring-emerald-500/20'
                                      : isPassed
                                      ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                                      : 'bg-zinc-800 text-zinc-500 border border-white/[0.04]'
                                  }`}
                                >
                                  {isPassed ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                  ) : (
                                    <span>{stage.step}</span>
                                  )}
                                </div>
                                <span
                                  className={`text-[11px] mt-1.5 whitespace-nowrap font-medium ${
                                    isCurrent
                                      ? 'text-emerald-400 font-bold'
                                      : isPassed
                                      ? 'text-zinc-300'
                                      : 'text-zinc-600'
                                  }`}
                                >
                                  {stage.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Farmer Origin & Delivery Partner Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-[#121418] p-3.5 rounded-xl border border-white/[0.06]">
                      <div>
                        <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wide block">
                          {t.delivery.pickupFarm}
                        </span>
                        <span className="font-bold text-white">{ord.farmer_name}</span>
                        {ord.farmer_phone && (
                          <div className="text-zinc-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-emerald-400" />
                            <span>{ord.farmer_phone}</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wide block">
                          {t.delivery.deliveryDestination}
                        </span>
                        <div className="text-zinc-300 font-medium truncate">
                          {ord.delivery_partner_name
                            ? `${t.customer.deliveryTo}: ${ord.delivery_partner_name}`
                            : t.customer.stageAccepted}
                        </div>
                        <div className="text-zinc-400 flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="truncate">{ord.delivery_address}</span>
                        </div>
                      </div>
                    </div>

                    {/* Order Line Items */}
                    <div className="space-y-2 pt-1">
                      {ord.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs py-1">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={item.image_url || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=200'}
                              alt={item.title}
                              className="w-10 h-10 object-cover rounded-lg border border-white/[0.08]"
                            />
                            <div>
                              <span className="font-semibold text-white">{item.title}</span>
                              <span className="text-zinc-400 block text-[11px]">
                                {formatQuantity(item.quantity, item.unit, language)} × ₹{item.price}
                              </span>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-white">
                            ₹{item.price * item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Total Settlement */}
                    <div className="flex justify-between items-center pt-2 border-t border-white/[0.06]">
                      <span className="text-xs text-zinc-400">{t.customer.fairPrice}</span>
                      <div className="text-right">
                        <span className="text-xs text-zinc-500 mr-2">{t.customer.totalAmount}</span>
                        <span className="text-base font-mono font-black text-emerald-400">
                          ₹{ord.total_amount}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. WISHLIST TAB */}
      {activeTab === 'wishlist' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white">{t.customer.wishlist}</h2>
            <p className="text-xs text-zinc-400">
              {t.customer.emptyWishlistDesc}
            </p>
          </div>

          {wishlist.length === 0 ? (
            <div className="text-center py-16 bg-[#0f1115] rounded-2xl border border-white/[0.08] p-8 shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center mx-auto mb-3 text-zinc-500 border border-white/[0.08]">
                <Heart className="w-6 h-6 text-zinc-500" />
              </div>
              <h3 className="text-sm font-bold text-white">{t.customer.emptyWishlistTitle}</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                {t.customer.emptyWishlistDesc}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {wishlist.map((item) => {
                const prod = item.product;
                if (!prod) return null;
                const isOutOfStock = prod.stock <= 0;

                return (
                  <div
                    key={item.id}
                    className="bg-[#0f1115]/90 rounded-2xl border border-white/[0.08] overflow-hidden shadow-xl flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative aspect-4/3 bg-zinc-900">
                        <img
                          src={prod.image_url}
                          alt={prod.title}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => onToggleWishlist(prod.id)}
                          className="absolute top-2.5 right-2.5 p-2 rounded-full bg-zinc-900/80 border border-rose-500/40 text-rose-400 shadow-2xs hover:bg-zinc-900 transition-colors"
                          title={t.common.remove}
                        >
                          <Heart className="w-4 h-4" fill="currentColor" />
                        </button>
                      </div>

                      <div className="p-4 space-y-1">
                        <div className="text-[11px] text-zinc-400 font-medium">
                          {prod.farmer_name}
                        </div>
                        <h4 className="font-bold text-sm text-white line-clamp-1">
                          {prod.title}
                        </h4>
                        <div className="pt-2 flex items-baseline justify-between">
                          <span className="text-base font-mono font-black text-white">
                            ₹{prod.price}/{normalizeUnit(prod.unit)}
                          </span>
                          <span
                            className={`text-xs font-semibold ${
                              isOutOfStock ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            {formatStock(prod.stock, prod.unit, language)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 pt-0">
                      <button
                        type="button"
                        onClick={() => handleAddToCart(prod)}
                        disabled={isOutOfStock}
                        className="w-full py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-zinc-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>{isOutOfStock ? t.customer.outOfStock : t.customer.addToCart}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

