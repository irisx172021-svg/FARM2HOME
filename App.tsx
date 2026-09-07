import React, { useEffect, useState } from 'react';
import {
  Profile,
  Product,
  ProductCategory,
  CartItem,
  WishlistItem,
  Order,
  BrowseHistoryItem,
  LanguageCode,
  UserRole,
} from './types';
import { API } from './lib/api';
import { Header } from './components/Header';
import { RoleSelectionModal } from './components/RoleSelectionModal';
import { CustomerView } from './components/CustomerView';
import { FarmerView } from './components/FarmerView';
import { DeliveryView } from './components/DeliveryView';
import { WeatherWidget } from './components/WeatherWidget';
import { AiAssistantWidget } from './components/AiAssistantWidget';
import { CartDrawer } from './components/CartDrawer';
import { translations } from './lib/translations';

export default function App() {
  // Profiles & Auth State
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  // App Settings
  const [language, setLanguage] = useState<LanguageCode>('en');

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<string>('browse');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [organicOnly, setOrganicOnly] = useState(false);

  // Data Collections
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [browseHistory, setBrowseHistory] = useState<BrowseHistoryItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // UI Drawer / Modal Controls
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Load Initial Profiles & Products
  useEffect(() => {
    async function initData() {
      try {
        const profiles = await API.getProfiles();
        setAllProfiles(profiles);

        // Default active user is the first customer profile or first profile available
        if (profiles.length > 0) {
          const defaultUser = profiles.find((p) => p.role === 'customer') || profiles[0];
          setCurrentProfile(defaultUser);
        }
      } catch (err) {
        console.error('Failed to load initial profiles', err);
      }
    }
    initData();
  }, []);

  // Fetch Products based on filters
  const loadProducts = async () => {
    try {
      const data = await API.getProducts({
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        search: searchQuery || undefined,
        organicOnly: organicOnly || undefined,
      });
      setProducts(data);
    } catch (err) {
      console.error('Failed to fetch products', err);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [selectedCategory, searchQuery, organicOnly]);

  // Fetch User Specific Data whenever currentProfile changes
  const loadUserData = async () => {
    if (!currentProfile) return;

    try {
      if (currentProfile.role === 'customer') {
        const [c, w, h, o] = await Promise.all([
          API.getCart(currentProfile.id),
          API.getWishlist(currentProfile.id),
          API.getBrowseHistory(currentProfile.id),
          API.getOrders(currentProfile.id, 'customer'),
        ]);
        setCart(c);
        setWishlist(w);
        setBrowseHistory(h);
        setOrders(o);
      } else if (currentProfile.role === 'farmer') {
        const o = await API.getOrders(currentProfile.id, 'farmer');
        setOrders(o);
      } else if (currentProfile.role === 'delivery') {
        const o = await API.getOrders(currentProfile.id, 'delivery');
        setOrders(o);
      }
    } catch (err) {
      console.error('Error loading user state', err);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [currentProfile]);

  // Handle Cart Operations
  const handleAddToCart = async (productId: string, quantity = 1) => {
    if (!currentProfile) {
      setIsRoleModalOpen(true);
      return;
    }
    try {
      await API.addToCart(currentProfile.id, productId, quantity);
      await loadUserData();
      setIsCartOpen(true);
      showToast('Item added to cart!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to add item to cart', 'error');
    }
  };

  const handleUpdateCartQty = async (cartId: string, quantity: number) => {
    if (!currentProfile) return;
    try {
      if (quantity <= 0) {
        await API.removeFromCart(cartId, currentProfile.id);
      } else {
        await API.updateCartQuantity(cartId, currentProfile.id, quantity);
      }
      await loadUserData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update quantity', 'error');
    }
  };

  const handleRemoveFromCart = async (cartId: string) => {
    if (!currentProfile) return;
    try {
      await API.removeFromCart(cartId, currentProfile.id);
      await loadUserData();
      showToast('Item removed from cart', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to remove item', 'error');
    }
  };

  // Handle Wishlist Toggle
  const handleToggleWishlist = async (productId: string) => {
    if (!currentProfile) {
      setIsRoleModalOpen(true);
      return;
    }
    try {
      await API.toggleWishlist(currentProfile.id, productId);
      await loadUserData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update wishlist', 'error');
    }
  };

  // Handle Record Browse History
  const handleSelectProduct = async (product: Product) => {
    if (!currentProfile) return;
    try {
      await API.recordBrowseHistory(currentProfile.id, product.id);
      await loadUserData();
    } catch (err) {
      // Non-critical browse tracking failure
    }
  };

  // Handle Checkout
  const handleCheckout = async (deliveryAddress: string) => {
    if (!currentProfile) return;
    try {
      await API.createOrder(currentProfile.id, deliveryAddress);
      await Promise.all([loadUserData(), loadProducts()]);
      showToast('Order successfully placed! Direct farm harvest initiated.', 'success');
    } catch (err) {
      // Re-throw so CartDrawer can show the exact message directly in checkout view
      throw err;
    }
  };

  // Switch Active Role / Tab Sync
  const handleSwitchUser = (profile: Profile) => {
    setCurrentProfile(profile);
    if (profile.role === 'customer') {
      setActiveTab('browse');
    } else if (profile.role === 'farmer') {
      setActiveTab('farmer-crops');
    } else if (profile.role === 'delivery') {
      setActiveTab('delivery-jobs');
    }
  };

  const categoriesList: ProductCategory[] = [
    'Vegetables',
    'Fruits',
    'Grains & Cereals',
    'Pulses & Spices',
    'Dairy & Poultry',
    'Organic Special',
  ];

  return (
    <div className="min-h-screen bg-[#fdfcf9] text-[#21332a] flex flex-col font-sans selection:bg-[#40916c] selection:text-white">
      {/* Global Header */}
      <Header
        currentProfile={currentProfile}
        language={language}
        onLanguageChange={setLanguage}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        cartCount={cart.reduce((sum, i) => sum + i.quantity, 0)}
        wishlistCount={wishlist.length}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenRoleModal={() => setIsRoleModalOpen(true)}
        allProfiles={allProfiles}
        onSwitchUser={handleSwitchUser}
      />

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {/* Customer Views */}
        {currentProfile?.role === 'customer' &&
          (activeTab === 'browse' ||
            activeTab === 'orders' ||
            activeTab === 'wishlist' ||
            activeTab === 'history') && (
            <CustomerView
              products={products}
              categories={categoriesList}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              organicOnly={organicOnly}
              onToggleOrganicOnly={() => setOrganicOnly(!organicOnly)}
              cart={cart}
              wishlist={wishlist}
              browseHistory={browseHistory}
              orders={orders}
              currentProfile={currentProfile}
              language={language}
              onAddToCart={handleAddToCart}
              onUpdateCartQty={handleUpdateCartQty}
              onRemoveFromCart={handleRemoveFromCart}
              onToggleWishlist={handleToggleWishlist}
              onSelectProduct={handleSelectProduct}
              onCheckout={handleCheckout}
              activeCustomerSubTab={
                (activeTab as 'browse' | 'orders' | 'wishlist' | 'history') || 'browse'
              }
              onSubTabChange={(tab) => setActiveTab(tab)}
            />
          )}

        {/* Farmer Views */}
        {currentProfile?.role === 'farmer' &&
          (activeTab === 'farmer-crops' ||
            activeTab === 'farmer-orders' ||
            activeTab === 'farmer-analytics') && (
            <FarmerView
              products={products}
              orders={orders}
              currentProfile={currentProfile}
              language={language}
              onRefreshProducts={loadProducts}
              onRefreshOrders={loadUserData}
              activeFarmerTab={
                (activeTab as 'farmer-crops' | 'farmer-orders' | 'farmer-analytics') || 'farmer-crops'
              }
              onTabChange={(tab) => setActiveTab(tab)}
            />
          )}

        {/* Delivery Partner Views */}
        {currentProfile?.role === 'delivery' &&
          (activeTab === 'delivery-jobs' || activeTab === 'delivery-active') && (
            <DeliveryView
              orders={orders}
              currentProfile={currentProfile}
              language={language}
              onRefreshOrders={loadUserData}
              activeDeliveryTab={
                (activeTab as 'delivery-jobs' | 'delivery-active') || 'delivery-jobs'
              }
              onTabChange={(tab) => setActiveTab(tab)}
            />
          )}

        {/* Weather Forecast View */}
        {activeTab === 'weather' && <WeatherWidget language={language} />}

        {/* Dedicated AI Assistant Tab View */}
        {activeTab === 'assistant' && (
          <div className="max-w-3xl mx-auto py-4">
            <AiAssistantWidget
              language={language}
              role={currentProfile?.role || 'customer'}
              isOpen={true}
              onToggleOpen={() => setActiveTab('browse')}
            />
          </div>
        )}
      </main>

      {/* Floating AI Assistant Trigger */}
      {activeTab !== 'assistant' && (
        <AiAssistantWidget
          language={language}
          role={currentProfile?.role || 'customer'}
          isOpen={isAiOpen}
          onToggleOpen={() => setIsAiOpen(!isAiOpen)}
        />
      )}

      {/* Role & Account Switch Modal */}
      <RoleSelectionModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        currentProfile={currentProfile}
        onLoginSuccess={(prof) => {
          setAllProfiles((prev) => {
            const exists = prev.find((p) => p.id === prof.id);
            if (exists) return prev.map((p) => (p.id === prof.id ? prof : p));
            return [...prev, prof];
          });
          handleSwitchUser(prof);
        }}
        language={language}
      />

      {/* Cart & Checkout Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        currentProfile={currentProfile}
        language={language}
        onUpdateQty={handleUpdateCartQty}
        onRemoveItem={handleRemoveFromCart}
        onCheckout={handleCheckout}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-300 max-w-sm">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 text-xs font-bold ${
              toast.type === 'success'
                ? 'bg-[#1b4332] text-white border-[#74c69d]'
                : toast.type === 'error'
                ? 'bg-rose-700 text-white border-rose-500'
                : 'bg-[#21332a] text-white border-[#566960]'
            }`}
          >
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="p-1 text-white/70 hover:text-white rounded-lg cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-[#1b4332] text-[#d8f3dc]/80 border-t border-[#2d6a4f]/50 text-xs py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#74c69d] inline-block"></span>
            <p>© 2026 Farm2Home – Direct-to-Consumer Intelligent Agri Platform. All rights reserved.</p>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-[#b7e4c7]">
            <span>0% Commission Model</span>
            <span>•</span>
            <span>OTP Drop-off Verification</span>
            <span>•</span>
            <span>Strict User Data Isolation</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
