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
import { getTranslation } from './lib/translations';
import { LanguageProvider } from './context/LanguageContext';
import { Loader2, CheckCircle2 } from 'lucide-react';

const STORAGE_LANG_KEY = 'farm2home_language';

export const AppContent: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LANG_KEY);
      if (saved && (saved === 'en' || saved === 'te' || saved === 'hi' || saved === 'ta')) {
        return saved as Language;
      }
    } catch {
      // ignore
    }
    return 'en';
  });

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(STORAGE_LANG_KEY, newLang);
    } catch {
      // ignore
    }
  };

  const tDict = getTranslation(language);

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
  const [activeFarmerTab, setActiveFarmerTab] = useState<string>('overview');
  const [activeDeliveryTab, setActiveDeliveryTab] = useState<string>('history');
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
      showToast(tDict.customer.addedToCart.replace('{item}', product.title));
    } catch (err: any) {
      alert(err.message || tDict.common.somethingWentWrong);
    }
  };

  const handleUpdateCartQuantity = async (cartItemId: string, newQty: number) => {
    if (!currentProfile) return;
    try {
      await api.updateCartQuantity(cartItemId, currentProfile.id, newQty);
      const res = await api.getCart(currentProfile.id);
      setCartItems(res.cart);
    } catch (err: any) {
      alert(err.message || tDict.common.somethingWentWrong);
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
      showToast(`${tDict.orderPlaced} ${tDict.customer.orderOtpNote}`);
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
      <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          <p className="text-sm font-semibold text-zinc-400 tracking-wide">Connecting to Farm2Home Agri-Tech Grid...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-white selection:bg-emerald-500/30 selection:text-emerald-300 relative overflow-x-hidden">
      {/* Ambient background glows for depth without distracting */}
      <div className="pointer-events-none fixed -top-40 left-1/4 w-[650px] h-[650px] bg-emerald-500/[0.035] blur-[150px] rounded-full -z-10" />
      <div className="pointer-events-none fixed top-1/3 -right-24 w-[550px] h-[550px] bg-teal-500/[0.025] blur-[140px] rounded-full -z-10" />
      <div className="pointer-events-none fixed -bottom-40 left-1/3 w-[500px] h-[500px] bg-emerald-600/[0.02] blur-[130px] rounded-full -z-10" />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#0f1115]/95 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-2 text-xs font-semibold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
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
          if (p.role === 'farmer') setActiveFarmerTab('overview');
          if (p.role === 'delivery') setActiveDeliveryTab('history');
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
      {isWeatherOpen && <WeatherWidget onClose={() => setIsWeatherOpen(false)} language={language} />}

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
            onOpenFullAi={() => setIsAiOpen(true)}
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
      <footer className="mt-auto border-t border-white/[0.06] bg-[#0c0d12]/90 py-6 text-center text-xs text-zinc-500 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} Farm2Home — Direct-to-Consumer Agri-Tech Infrastructure.</p>
          <p className="text-zinc-500 flex items-center gap-1.5 justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Empowering Indian farmers • Fresh harvest • 6-Digit OTP Delivery Verification</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
};

export default App;
