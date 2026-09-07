import React, { useState, useEffect } from 'react';
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
  AlertCircle,
  ExternalLink,
  Phone,
} from 'lucide-react';
import { Product, CartItem, WishlistItem, Order, BrowseHistoryItem, Profile, Language } from '../types';
import { translations } from '../lib/translations';
import { api } from '../lib/api';

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
  const t = translations[language];
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
    { id: 'All', label: t.categoriesAll },
    { id: 'Vegetables', label: t.vegetables },
    { id: 'Fruits', label: t.fruits },
    { id: 'Grains & Cereals', label: t.grains },
    { id: 'Pulses & Spices', label: t.pulses },
    { id: 'Dairy & Poultry', label: t.dairy },
  ];

  const wishlistedIds = new Set(wishlist.map((w) => w.product_id));

  // Filter products
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

  const renderStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <Clock className="w-3.5 h-3.5" />
            {t.statusPending}
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t.statusAccepted}
          </span>
        );
      case 'out_for_delivery':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 animate-pulse">
            <Truck className="w-3.5 h-3.5" />
            {t.statusOutForDelivery}
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t.statusDelivered}
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-200 text-stone-700">
            {t.statusCancelled}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. SHOP TAB */}
      {activeTab === 'shop' && (
        <>
          {/* Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-emerald-800 to-emerald-950 text-white p-6 sm:p-8 relative overflow-hidden shadow-sm">
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-700/80 text-emerald-200 text-xs font-medium mb-3">
                <Leaf className="w-3.5 h-3.5" />
                100% Direct Harvest • Zero Intermediaries
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Fresh From Local Farms To Your Kitchen
              </h1>
              <p className="text-sm text-emerald-100 mt-2 leading-relaxed">
                Connect directly with verified local farmers in Medak, Chittoor, and Vijayawada. Support sustainable agriculture while getting nutrient-rich seasonal produce delivered to your doorstep.
              </p>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Box */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-stone-200 rounded-xl focus:outline-emerald-600 shadow-2xs"
              />
            </div>

            {/* Organic Toggle */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer bg-white px-3.5 py-2 rounded-xl border border-stone-200 shadow-2xs text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors">
                <input
                  type="checkbox"
                  checked={organicOnly}
                  onChange={(e) => setOrganicOnly(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                {t.organicOnly}
              </label>
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === c.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
              <Leaf className="w-10 h-10 text-stone-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-stone-700">No crops found matching your criteria.</p>
              <p className="text-xs text-stone-400 mt-1">Try resetting search filters or category selection.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((p) => {
                const isWishlisted = wishlistedIds.has(p.id);
                const isOutOfStock = p.stock <= 0;
                const isLowStock = p.stock > 0 && p.stock <= 10;

                return (
                  <div
                    key={p.id}
                    onClick={() => onSelectProduct(p.id)}
                    className="group bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Image & Badges */}
                      <div className="relative aspect-4/3 overflow-hidden bg-stone-100">
                        <img
                          src={p.image_url}
                          alt={p.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />

                        {/* Top Badges */}
                        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start">
                          {p.is_organic && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-600/90 text-white text-[10px] font-bold tracking-wide uppercase backdrop-blur-xs flex items-center gap-1 shadow-xs">
                              <Leaf className="w-3 h-3" />
                              Organic
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-md bg-stone-900/70 text-white text-[10px] font-medium backdrop-blur-xs">
                            {p.category}
                          </span>
                        </div>

                        {/* Wishlist Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleWishlist(p.id);
                          }}
                          className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-md transition-colors shadow-xs ${
                            isWishlisted
                              ? 'bg-rose-50 text-rose-600'
                              : 'bg-white/80 text-stone-600 hover:bg-white hover:text-rose-600'
                          }`}
                          title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                        >
                          <Heart
                            className="w-4 h-4"
                            fill={isWishlisted ? 'currentColor' : 'none'}
                          />
                        </button>

                        {/* Stock Tag on Image if Out of stock */}
                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-2xs flex items-center justify-center">
                            <span className="bg-rose-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                              {t.outOfStock}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        {/* Farmer & Location */}
                        <div className="flex items-center gap-1 text-[11px] text-stone-500 mb-1">
                          <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="truncate font-medium text-stone-700">
                            {p.farmer_name}
                          </span>
                        </div>

                        <h3 className="font-bold text-sm text-stone-900 line-clamp-1 group-hover:text-emerald-700 transition-colors">
                          {p.title}
                        </h3>

                        <p className="text-xs text-stone-500 line-clamp-2 mt-1 min-h-[32px]">
                          {p.description}
                        </p>

                        {/* Price & Stock Indicator */}
                        <div className="mt-3 flex items-baseline justify-between">
                          <div>
                            <span className="text-lg font-extrabold text-stone-900">₹{p.price}</span>
                            <span className="text-xs text-stone-500 font-medium">/{p.unit}</span>
                          </div>

                          <div className="text-right">
                            {isOutOfStock ? (
                              <span className="text-[11px] font-semibold text-rose-600">
                                {t.outOfStock}
                              </span>
                            ) : isLowStock ? (
                              <span className="text-[11px] font-bold text-amber-600">
                                Only {p.stock} {p.unit} left!
                              </span>
                            ) : (
                              <span className="text-[11px] text-emerald-700 font-medium">
                                {p.stock} {p.unit} in stock
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="p-4 pt-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(p);
                        }}
                        disabled={isOutOfStock || addingId === p.id}
                        className={`w-full py-2.5 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs ${
                          isOutOfStock
                            ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white'
                        }`}
                      >
                        <ShoppingCart className="w-4 h-4" />
                        {addingId === p.id
                          ? 'Adding...'
                          : isOutOfStock
                          ? t.outOfStock
                          : t.addToCart}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Browse History Section */}
          {browseHistory.length > 0 && (
            <div className="pt-6 border-t border-stone-200">
              <h3 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-stone-400" />
                Recently Viewed Produce
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {browseHistory.map((item) => {
                  const prod = item.product;
                  if (!prod) return null;
                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelectProduct(prod.id)}
                      className="w-44 shrink-0 bg-white border border-stone-200 rounded-xl p-2.5 hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between"
                    >
                      <img
                        src={prod.image_url}
                        alt={prod.title}
                        className="w-full h-24 object-cover rounded-lg mb-2"
                      />
                      <div>
                        <h4 className="text-xs font-bold text-stone-900 truncate">{prod.title}</h4>
                        <div className="text-xs font-semibold text-emerald-700 mt-0.5">
                          ₹{prod.price}/{prod.unit}
                        </div>
                      </div>
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
              <h2 className="text-lg font-bold text-stone-900">Your Fresh Harvest Orders</h2>
              <p className="text-xs text-stone-500">
                Track status and verify deliveries with your secure 6-digit Delivery OTP.
              </p>
            </div>
            <button
              onClick={onRefreshOrders}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 p-2 bg-emerald-50 rounded-lg transition-colors"
            >
              Refresh Orders
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
              <PackageCheck className="w-12 h-12 text-stone-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-stone-700">{t.emptyOrders}</p>
              <p className="text-xs text-stone-400 mt-1">Place an order to enjoy fresh farm produce!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4"
                >
                  {/* Top Bar: Order ID, Status, Date */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-stone-900">Order #{ord.id}</span>
                        {renderStatusBadge(ord.status)}
                      </div>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        Placed on {new Date(ord.created_at).toLocaleString()}
                      </p>
                    </div>

                    {/* Delivery OTP Notice (Only if not cancelled or already delivered) */}
                    {ord.status !== 'cancelled' && (
                      <div className="bg-amber-50 border border-amber-300 rounded-xl px-3 py-1.5 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-amber-700" />
                        <div>
                          <div className="text-[10px] uppercase font-bold text-amber-700">
                            {t.deliveryOtp}
                          </div>
                          <div className="text-base font-black tracking-wider text-amber-900 font-mono">
                            {ord.otp_code}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Farmer and Delivery Contact Information */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-stone-50 p-3 rounded-xl">
                    <div>
                      <span className="text-stone-400 text-[11px] block">Farm Origin</span>
                      <span className="font-bold text-stone-800">{ord.farmer_name}</span>
                      {ord.farmer_phone && (
                        <div className="text-stone-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-emerald-600" />
                          {ord.farmer_phone}
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="text-stone-400 text-[11px] block">Delivery Partner</span>
                      <span className="font-bold text-stone-800">
                        {ord.delivery_partner_name || 'Awaiting Partner Assignment'}
                      </span>
                      <div className="text-stone-500 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="truncate">{ord.delivery_address}</span>
                      </div>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-2">
                    {ord.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-stone-50">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={item.image_url || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=200'}
                            alt={item.title}
                            className="w-10 h-10 object-cover rounded-lg border border-stone-200"
                          />
                          <div>
                            <span className="font-semibold text-stone-900">{item.title}</span>
                            <span className="text-stone-500 block text-[11px]">
                              {item.quantity} {item.unit} × ₹{item.price}
                            </span>
                          </div>
                        </div>
                        <span className="font-bold text-stone-900">
                          ₹{item.price * item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="flex justify-between items-center pt-2 border-t border-stone-100">
                    <span className="text-xs text-stone-500">Direct Farm Settlement</span>
                    <div className="text-right">
                      <span className="text-xs text-stone-400 mr-2">Total</span>
                      <span className="text-base font-extrabold text-emerald-700">
                        ₹{ord.total_amount}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. WISHLIST TAB */}
      {activeTab === 'wishlist' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-stone-900">Your Saved Crops & Farm Favorites</h2>

          {wishlist.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
              <Heart className="w-12 h-12 text-stone-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-stone-700">Your wishlist is currently empty.</p>
              <p className="text-xs text-stone-400 mt-1">Tap the heart icon on any crop to save for later.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {wishlist.map((item) => {
                const prod = item.product;
                if (!prod) return null;
                const isOutOfStock = prod.stock <= 0;

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative aspect-4/3 bg-stone-100">
                        <img
                          src={prod.image_url}
                          alt={prod.title}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => onToggleWishlist(prod.id)}
                          className="absolute top-2.5 right-2.5 p-2 rounded-full bg-white/90 text-rose-600 shadow-xs"
                          title="Remove from wishlist"
                        >
                          <Heart className="w-4 h-4" fill="currentColor" />
                        </button>
                      </div>

                      <div className="p-4">
                        <div className="text-[11px] text-stone-500 font-medium">
                          {prod.farmer_name}
                        </div>
                        <h4 className="font-bold text-sm text-stone-900 mt-0.5 line-clamp-1">
                          {prod.title}
                        </h4>
                        <div className="mt-2 flex items-baseline justify-between">
                          <span className="text-base font-extrabold text-stone-900">
                            ₹{prod.price}/{prod.unit}
                          </span>
                          <span
                            className={`text-xs font-semibold ${
                              isOutOfStock ? 'text-rose-600' : 'text-emerald-700'
                            }`}
                          >
                            {isOutOfStock ? t.outOfStock : `${prod.stock} ${prod.unit} in stock`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 pt-0">
                      <button
                        onClick={() => handleAddToCart(prod)}
                        disabled={isOutOfStock}
                        className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        {isOutOfStock ? t.outOfStock : t.addToCart}
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
