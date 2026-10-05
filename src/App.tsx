import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { CustomerView } from './components/CustomerView';
import { FarmerView } from './components/FarmerView';
import { DeliveryView } from './components/DeliveryView';
import { CartDrawer } from './components/CartDrawer';
import { WeatherWidget } from './components/WeatherWidget';
import { AiAssistantWidget } from './components/AiAssistantWidget';
import { AuthModal } from './components/AuthModal';
import { AuthLandingPage } from './components/AuthLandingPage';
import { Profile, Product, CartItem, WishlistItem, Order, BrowseHistoryItem, Language, Role, AuthStatus } from './types';
import { api } from './lib/api';
import { getTranslation } from './lib/translations';
import { LanguageProvider } from './context/LanguageContext';
import { Loader2, CheckCircle2, ShieldCheck, Sprout, LogIn, Sparkles, Truck } from 'lucide-react';

const STORAGE_LANG_KEY = 'farm2home_language';

export const AppContent: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('AUTH_LOADING');
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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'auth' | 'onboarding' | 'account'>('auth');
  const [isGuestMarketplace, setIsGuestMarketplace] = useState(false);
  const [activeCustomerTab, setActiveCustomerTab] = useState<'shop' | 'orders' | 'wishlist'>('shop');
  const [activeFarmerTab, setActiveFarmerTab] = useState<string>('overview');
  const [activeDeliveryTab, setActiveDeliveryTab] = useState<string>('history');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // 1. Initial Session Load: Explicit AUTH_LOADING -> PROFILE_LOADING -> AUTHENTICATED / UNAUTHENTICATED
  useEffect(() => {
    async function initSession() {
      setAuthStatus('AUTH_LOADING');
      try {
        // Fetch marketplace profiles
        const profRes = await api.getProfiles().catch(() => ({ profiles: [] }));
        setProfiles(profRes.profiles);

        // Check for stored session token and explicit logout flag
        const existingToken = api.getAuthToken();
        const hasExplicitlyLoggedOut = localStorage.getItem('f2h_logged_out') === 'true';

        if (existingToken && !hasExplicitlyLoggedOut) {
          setAuthStatus('PROFILE_LOADING');
          try {
            const meRes = await api.getMe();
            if (meRes.profile) {
              setCurrentProfile(meRes.profile);
              setAuthStatus('AUTHENTICATED');
              if (!meRes.profile.role) {
                setAuthModalMode('onboarding');
                setIsAuthModalOpen(true);
              }
              return;
            }
          } catch (e) {
            console.warn('Stored session invalid or expired, refreshing token:', e);
            api.clearAuthToken();
          }
        }

        // If no active session or explicit logout, present the unauthenticated landing experience
        setCurrentProfile(null);
        setAuthStatus('UNAUTHENTICATED');
      } catch (err) {
        console.error('Failed to initialize session:', err);
        setCurrentProfile(null);
        setAuthStatus('UNAUTHENTICATED');
      }
    }

    initSession();
  }, []);

  // 2. Load User Specific Data whenever currentProfile changes
  const refreshUserData = async () => {
    try {
      const prodRes = await api.getProducts();
      setProducts(prodRes.products);

      if (currentProfile && authStatus === 'AUTHENTICATED') {
        const [cartRes, wishRes, ordRes, histRes] = await Promise.all([
          currentProfile.role === 'customer' ? api.getCart(currentProfile.id) : Promise.resolve({ cart: [] }),
          currentProfile.role === 'customer' ? api.getWishlist(currentProfile.id) : Promise.resolve({ wishlist: [] }),
          api.getOrders(currentProfile.id, currentProfile.role),
          currentProfile.role === 'customer' ? api.getBrowseHistory(currentProfile.id) : Promise.resolve({ history: [] }),
        ]);

        setCartItems(cartRes.cart);
        setWishlist(wishRes.wishlist);
        setOrders(ordRes.orders);
        setBrowseHistory(histRes.history);
      } else {
        setCartItems([]);
        setWishlist([]);
        setOrders([]);
        setBrowseHistory([]);
      }
    } catch (err) {
      console.error('Failed to refresh user data:', err);
    }
  };

  useEffect(() => {
    refreshUserData();
  }, [currentProfile?.id, currentProfile?.role, authStatus]);

  // Auth Handlers
  const handleAuthSuccess = (profile: Profile, tokenOrUser?: any) => {
    if (typeof tokenOrUser === 'string') {
      api.setAuthToken(tokenOrUser);
    }
    localStorage.removeItem('f2h_logged_out');
    setIsGuestMarketplace(false);
    setCurrentProfile(profile);
    setAuthStatus('AUTHENTICATED');
    setIsAuthModalOpen(false);

    if (profile.preferred_language) {
      setLanguage(profile.preferred_language as Language);
    }

    if (!profile.role) {
      setAuthModalMode('onboarding');
      setIsAuthModalOpen(true);
      return;
    }

    if (profile.role === 'customer') setActiveCustomerTab('shop');
    if (profile.role === 'farmer') setActiveFarmerTab('overview');
    if (profile.role === 'delivery') setActiveDeliveryTab('history');

    showToast(`Welcome, ${profile.full_name}!`);
    refreshUserData();
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (e) {
      console.error('Logout error:', e);
    }
    localStorage.setItem('f2h_logged_out', 'true');
    api.clearAuthToken();
    setCurrentProfile(null);
    setAuthStatus('UNAUTHENTICATED');
    setCartItems([]);
    setWishlist([]);
    setOrders([]);
    setBrowseHistory([]);
    setAuthModalMode('auth');
    setIsAuthModalOpen(false);
    showToast('Signed out successfully.');
  };

  // Cart operations
  const handleAddToCart = async (product: Product) => {
    if (!currentProfile || authStatus !== 'AUTHENTICATED' || currentProfile.id === 'guest_customer') {
      setAuthModalMode('auth');
      setIsAuthModalOpen(true);
      return;
    }
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
    if (!currentProfile || authStatus !== 'AUTHENTICATED' || currentProfile.id === 'guest_customer') {
      setAuthModalMode('auth');
      setIsAuthModalOpen(true);
      return;
    }
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

  // 1. Initial Neutral Loading State while checking session (mounts immediately without blocking)
  if (authStatus === 'AUTH_LOADING' || authStatus === 'PROFILE_LOADING') {
    return (
      <div className="min-h-screen flex flex-col bg-[#09090b] text-white selection:bg-emerald-500/30 selection:text-emerald-300 relative overflow-x-hidden">
        <div className="pointer-events-none fixed -top-40 left-1/4 w-[650px] h-[650px] bg-emerald-500/[0.035] blur-[150px] rounded-full -z-10" />
        <Header
          authStatus={authStatus}
          currentProfile={null}
          profiles={profiles}
          onSelectProfile={() => {}}
          language={language}
          onSelectLanguage={setLanguage}
          cartCount={0}
          wishlistCount={0}
          onOpenCart={() => {}}
          onOpenWishlist={() => {}}
          onToggleAi={() => {}}
          isAiOpen={false}
          onToggleWeather={() => {}}
          isWeatherOpen={false}
          activeCustomerTab="shop"
          onSelectCustomerTab={() => {}}
          searchQuery=""
          onSearchChange={() => {}}
          onOpenRoleModal={() => {}}
          onOpenAuthModal={() => {}}
          onLogout={() => {}}
        />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col items-center justify-center min-h-[60vh]">
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            <p className="text-sm font-semibold text-zinc-400 tracking-wide">
              {authStatus === 'AUTH_LOADING'
                ? 'Connecting to Farm2Home Agri-Tech Grid...'
                : 'Loading Farm2Home profile & role authorization...'}
            </p>
          </div>
        </main>
      </div>
    );
  }

  // 2. Unauthenticated Visitors Experience (Premium Full-Screen Agri-Tech Landing)
  if (authStatus === 'UNAUTHENTICATED' && !isGuestMarketplace) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white">
        <AuthLandingPage
          language={language}
          onSelectLanguage={setLanguage}
          onAuthSuccess={handleAuthSuccess}
          availableProducts={products}
          onExploreMarketplace={() => setIsGuestMarketplace(true)}
          onOpenAuthModal={(mode) => {
            setAuthModalMode(mode || 'auth');
            setIsAuthModalOpen(true);
          }}
        />
        {/* Multipurpose Multi-Provider Auth Modal if triggered */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          currentProfile={currentProfile}
          initialMode={authModalMode}
          onAuthSuccess={handleAuthSuccess}
          language={language}
        />
      </div>
    );
  }

  const guestCustomerProfile: Profile = {
    id: 'guest_customer',
    full_name: 'Guest Explorer',
    role: 'customer',
    auth_method: 'phone',
    location: 'Hyderabad Metro Zone',
    preferred_language: language,
    created_at: new Date().toISOString(),
  };

  const activeProfile = currentProfile || (isGuestMarketplace ? guestCustomerProfile : null);

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-white selection:bg-emerald-500/30 selection:text-emerald-300 relative overflow-x-hidden">
      {/* Ambient background glows for depth without distracting */}
      <div className="pointer-events-none fixed -top-40 left-1/4 w-[650px] h-[650px] bg-emerald-500/[0.035] blur-[150px] rounded-full -z-10" />
      <div className="pointer-events-none fixed top-1/3 -right-24 w-[550px] h-[550px] bg-teal-500/[0.025] blur-[140px] rounded-full -z-10" />
      <div className="pointer-events-none fixed -bottom-40 left-1/3 w-[500px] h-[500px] bg-emerald-600/[0.02] blur-[130px] rounded-full -z-10" />

      {/* Guest Marketplace Preview Banner */}
      {isGuestMarketplace && authStatus === 'UNAUTHENTICATED' && (
        <div className="bg-[#121620] border-b border-emerald-500/25 px-4 py-2.5 text-xs text-zinc-300 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-50 shadow-md">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-white">Guest Marketplace Preview</span>
            <span className="text-zinc-600 hidden sm:inline">·</span>
            <span className="text-zinc-400 hidden sm:inline">Browsing live harvest inventory directly from producers</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setAuthModalMode('auth');
                setIsAuthModalOpen(true);
              }}
              className="px-3 py-1 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold text-xs rounded-lg cursor-pointer transition-colors"
            >
              Sign In to Order
            </button>
            <button
              onClick={() => setIsGuestMarketplace(false)}
              className="text-zinc-400 hover:text-white cursor-pointer transition-colors"
            >
              ← Back to Overview
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#0f1115]/95 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-2 text-xs font-semibold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <Header
        authStatus={authStatus}
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
        onOpenCart={() => {
          if (!currentProfile || authStatus !== 'AUTHENTICATED') {
            setAuthModalMode('auth');
            setIsAuthModalOpen(true);
            return;
          }
          setIsCartOpen(true);
        }}
        onOpenWishlist={() => {
          if (!currentProfile || authStatus !== 'AUTHENTICATED') {
            setAuthModalMode('auth');
            setIsAuthModalOpen(true);
            return;
          }
          setActiveCustomerTab('wishlist');
        }}
        onToggleAi={() => setIsAiOpen((prev) => !prev)}
        isAiOpen={isAiOpen}
        onToggleWeather={() => setIsWeatherOpen((prev) => !prev)}
        isWeatherOpen={isWeatherOpen}
        activeCustomerTab={activeCustomerTab}
        onSelectCustomerTab={setActiveCustomerTab}
        activeRoleTab={
          !currentProfile || !currentProfile.role
            ? undefined
            : currentProfile.role === 'customer'
            ? activeCustomerTab
            : currentProfile.role === 'farmer'
            ? activeFarmerTab
            : activeDeliveryTab
        }
        onSelectRoleTab={(tab) => {
          if (currentProfile?.role === 'customer') setActiveCustomerTab(tab as any);
          if (currentProfile?.role === 'farmer') setActiveFarmerTab(tab as any);
          if (currentProfile?.role === 'delivery') setActiveDeliveryTab(tab as any);
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenRoleModal={() => {
          setAuthModalMode(currentProfile && authStatus === 'AUTHENTICATED' ? 'account' : 'auth');
          setIsAuthModalOpen(true);
        }}
        onOpenAuthModal={(mode) => {
          setAuthModalMode(mode || (currentProfile && authStatus === 'AUTHENTICATED' ? 'account' : 'auth'));
          setIsAuthModalOpen(true);
        }}
        onLogout={handleLogout}
      />

      {/* Weather Advisory Panel */}
      {isWeatherOpen && <WeatherWidget onClose={() => setIsWeatherOpen(false)} language={language} />}

      {/* Main Content Area based on User Role & Auth Status */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Authenticated Role Views or Guest Marketplace */}
        {((authStatus === 'AUTHENTICATED' && currentProfile) || (isGuestMarketplace && activeProfile)) && (
          <>
            {activeProfile.role === 'customer' && (
              <CustomerView
                currentProfile={activeProfile}
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
          </>
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

      {/* Production Auth & Multi-Provider Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentProfile={currentProfile}
        initialMode={authModalMode}
        onAuthSuccess={handleAuthSuccess}
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
