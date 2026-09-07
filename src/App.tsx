import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { CustomerView } from './components/CustomerView';
import { FarmerView } from './components/FarmerView';
import { DeliveryView } from './components/DeliveryView';
import { CartDrawer } from './components/CartDrawer';
import { WeatherWidget } from './components/WeatherWidget';
import { AiAssistantWidget } from './components/AiAssistantWidget';
import { RoleSelectionModal } from './components/RoleSelectionModal';
import { Profile, Product, CartItem, WishlistItem, Order, BrowseHistoryItem, Language, Role } from './types';
import { api } from './lib/api';
import { Loader2, CheckCircle2 } from 'lucide-react';

export const App: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [language, setLanguage] = useState<Language>('en');

  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [browseHistory, setBrowseHistory] = useState<BrowseHistoryItem[]>([]);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWeatherOpen, setIsWeatherOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [activeCustomerTab, setActiveCustomerTab] = useState<'shop' | 'orders' | 'wishlist'>('shop');
  const [activeFarmerTab, setActiveFarmerTab] = useState<'crops' | 'orders' | 'analytics'>('crops');
  const [activeDeliveryTab, setActiveDeliveryTab] = useState<'available' | 'active' | 'completed'>('available');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // 1. Initial Load: Profiles
  useEffect(() => {
    api
      .getProfiles()
      .then((res) => {
        setProfiles(res.profiles);
        // Default to Rahul Verma (Customer) or first customer profile
        const defaultCustomer = res.profiles.find((p) => p.role === 'customer') || res.profiles[0];
        setCurrentProfile(defaultCustomer);
      })
      .catch((err) => {
        console.error('Failed to load profiles:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // 2. Load User Specific Data whenever currentProfile changes
  const refreshUserData = async () => {
    if (!currentProfile) return;
    try {
      const [prodRes, cartRes, wishRes, ordRes, histRes] = await Promise.all([
        api.getProducts(),
        currentProfile.role === 'customer' ? api.getCart(currentProfile.id) : Promise.resolve({ cart: [] }),
        currentProfile.role === 'customer' ? api.getWishlist(currentProfile.id) : Promise.resolve({ wishlist: [] }),
        api.getOrders(currentProfile.id, currentProfile.role),
        currentProfile.role === 'customer' ? api.getBrowseHistory(currentProfile.id) : Promise.resolve({ history: [] }),
      ]);

      setProducts(prodRes.products);
      setCartItems(cartRes.cart);
      setWishlist(wishRes.wishlist);
      setOrders(ordRes.orders);
      setBrowseHistory(histRes.history);
    } catch (err) {
      console.error('Failed to refresh user data:', err);
    }
  };

  useEffect(() => {
    if (currentProfile) {
      refreshUserData();
    }
  }, [currentProfile?.id, currentProfile?.role]);

  // Cart operations
  const handleAddToCart = async (product: Product) => {
    if (!currentProfile) return;
    try {
      await api.addToCart(currentProfile.id, product.id, 1);
      const res = await api.getCart(currentProfile.id);
      setCartItems(res.cart);
      showToast(`Added ${product.title} to your cart!`);
    } catch (err: any) {
      alert(err.message || 'Failed to add crop to cart');
    }
  };

  const handleUpdateCartQuantity = async (cartItemId: string, newQty: number) => {
    if (!currentProfile) return;
    try {
      await api.updateCartQuantity(cartItemId, currentProfile.id, newQty);
      const res = await api.getCart(currentProfile.id);
      setCartItems(res.cart);
    } catch (err: any) {
      alert(err.message || 'Failed to update quantity');
    }
  };

  const handleRemoveCartItem = async (cartItemId: string) => {
    if (!currentProfile) return;
    try {
      await api.removeFromCart(cartItemId, currentProfile.id);
      const res = await api.getCart(currentProfile.id);
      setCartItems(res.cart);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleCheckout = async (deliveryAddress: string) => {
    if (!currentProfile) return;
    setIsCheckingOut(true);
    try {
      const res = await api.checkout(currentProfile.id, deliveryAddress);
      setIsCartOpen(false);
      await refreshUserData();
      setActiveCustomerTab('orders');
      showToast('Order placed successfully! Keep your 6-digit delivery OTP ready.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleToggleWishlist = async (productId: string) => {
    if (!currentProfile) return;
    try {
      await api.toggleWishlist(currentProfile.id, productId);
      const res = await api.getWishlist(currentProfile.id);
      setWishlist(res.wishlist);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSelectProduct = async (productId: string) => {
    if (!currentProfile || currentProfile.role !== 'customer') return;
    try {
      await api.recordBrowse(currentProfile.id, productId);
      const res = await api.getBrowseHistory(currentProfile.id);
      setBrowseHistory(res.history);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || !currentProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-sm font-semibold text-stone-700">Loading Farm2Home Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900 selection:bg-emerald-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-700 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs font-semibold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <Header
        currentProfile={currentProfile}
        profiles={profiles}
        onSelectProfile={(p) => {
          setCurrentProfile(p);
          if (p.role === 'customer') setActiveCustomerTab('shop');
          if (p.role === 'farmer') setActiveFarmerTab('crops');
          if (p.role === 'delivery') setActiveDeliveryTab('available');
        }}
        language={language}
        onSelectLanguage={setLanguage}
        cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
        wishlistCount={wishlist.length}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenWishlist={() => setActiveCustomerTab('wishlist')}
        onToggleAi={() => setIsAiOpen((prev) => !prev)}
        isAiOpen={isAiOpen}
        onToggleWeather={() => setIsWeatherOpen((prev) => !prev)}
        isWeatherOpen={isWeatherOpen}
        activeCustomerTab={activeCustomerTab}
        onSelectCustomerTab={setActiveCustomerTab}
        activeRoleTab={
          currentProfile.role === 'customer'
            ? activeCustomerTab
            : currentProfile.role === 'farmer'
            ? activeFarmerTab
            : activeDeliveryTab
        }
        onSelectRoleTab={(tab) => {
          if (currentProfile.role === 'customer') setActiveCustomerTab(tab as any);
          if (currentProfile.role === 'farmer') setActiveFarmerTab(tab as any);
          if (currentProfile.role === 'delivery') setActiveDeliveryTab(tab as any);
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenRoleModal={() => setIsRoleModalOpen(true)}
      />

      {/* Weather Advisory Panel */}
      {isWeatherOpen && <WeatherWidget onClose={() => setIsWeatherOpen(false)} />}

      {/* Main Content Area based on User Role */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentProfile.role === 'customer' && (
          <CustomerView
            currentProfile={currentProfile}
            language={language}
            activeTab={activeCustomerTab}
            products={products}
            cartItems={cartItems}
            wishlist={wishlist}
            orders={orders}
            browseHistory={browseHistory}
            onAddToCart={handleAddToCart}
            onToggleWishlist={handleToggleWishlist}
            onRefreshOrders={refreshUserData}
            onSelectProduct={handleSelectProduct}
            externalSearchTerm={searchQuery}
            onSearchChange={setSearchQuery}
          />
        )}

        {currentProfile.role === 'farmer' && (
          <FarmerView
            currentProfile={currentProfile}
            language={language}
            onRefreshAll={refreshUserData}
            externalTab={activeFarmerTab}
            onSelectTab={setActiveFarmerTab}
          />
        )}

        {currentProfile.role === 'delivery' && (
          <DeliveryView
            currentProfile={currentProfile}
            language={language}
            onRefreshAll={refreshUserData}
            externalTab={activeDeliveryTab}
            onSelectTab={setActiveDeliveryTab}
          />
        )}
      </main>

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        currentProfile={currentProfile}
        language={language}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onCheckout={handleCheckout}
        isCheckingOut={isCheckingOut}
      />

      {/* Role & Persona Switcher Modal */}
      <RoleSelectionModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        currentProfile={currentProfile}
        onLoginSuccess={(prof) => {
          setProfiles((prev) => {
            const exists = prev.find((p) => p.id === prof.id);
            if (exists) return prev.map((p) => (p.id === prof.id ? prof : p));
            return [...prev, prof];
          });
          setCurrentProfile(prof);
          if (prof.role === 'customer') {
            setActiveCustomerTab('shop');
          }
        }}
        language={language}
      />

      {/* Multilingual Gemini AI Specialist Assistant Widget */}
      {isAiOpen && (
        <AiAssistantWidget
          onClose={() => setIsAiOpen(false)}
          language={language}
          currentProfile={currentProfile}
        />
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-stone-200 bg-white py-6 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} Farm2Home — Direct-to-Consumer Agricultural Platform.</p>
          <p className="text-stone-400">
            Empowering Indian farmers • Fresh harvest • Protected with 6-Digit OTP Delivery
          </p>
        </div>
      </footer>
    </div>
  );
};
export default App;
