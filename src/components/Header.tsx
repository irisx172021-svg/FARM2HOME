import React from 'react';
import {
  Sprout,
  ShoppingCart,
  UserCheck,
  Languages,
  Heart,
  PackageCheck,
  SunMedium,
  Bot,
  Search,
  Truck,
  TrendingUp,
  Layers,
  Sparkles,
  History,
  CloudSun,
  LogIn,
  Loader2,
} from 'lucide-react';
import { Profile, Language, AuthStatus, Role } from '../types';
import { getTranslation } from '../lib/translations';

interface HeaderProps {
  authStatus?: AuthStatus;
  currentProfile: Profile | null;
  profiles: Profile[];
  onSelectProfile: (profile: Profile) => void;
  language: Language;
  onSelectLanguage: (lang: Language) => void;
  cartCount: number;
  wishlistCount?: number;
  onOpenCart: () => void;
  onOpenWishlist?: () => void;
  onToggleAi: () => void;
  isAiOpen: boolean;
  onToggleWeather: () => void;
  isWeatherOpen: boolean;
  activeCustomerTab?: 'shop' | 'orders' | 'wishlist';
  onSelectCustomerTab?: (tab: 'shop' | 'orders' | 'wishlist') => void;
  activeRoleTab?: string;
  onSelectRoleTab?: (tab: string) => void;
  onOpenRoleModal?: () => void;
  onOpenAuthModal?: (mode?: 'auth' | 'onboarding' | 'account') => void;
  onLogout?: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  authStatus = 'AUTHENTICATED',
  currentProfile,
  profiles,
  onSelectProfile,
  language,
  onSelectLanguage,
  cartCount,
  wishlistCount = 0,
  onOpenCart,
  onOpenWishlist,
  onToggleAi,
  isAiOpen,
  onToggleWeather,
  isWeatherOpen,
  activeCustomerTab = 'shop',
  onSelectCustomerTab,
  activeRoleTab,
  onSelectRoleTab,
  onOpenRoleModal,
  onOpenAuthModal,
  onLogout,
  searchQuery = '',
  onSearchChange,
}) => {
  const t = getTranslation(language);

  // Explicit Auth State Derivations
  const isAuthLoading = authStatus === 'AUTH_LOADING' || authStatus === 'PROFILE_LOADING';
  const isAuthenticated = authStatus === 'AUTHENTICATED' && !!currentProfile?.role;
  const isUnauthenticated = authStatus === 'UNAUTHENTICATED' || (!isAuthLoading && !currentProfile);

  const currentRole: Role | null = isAuthenticated && currentProfile ? currentProfile.role : null;

  const handleTabClick = (tabKey: string) => {
    if (tabKey === 'weather') {
      onToggleWeather();
      return;
    }
    if (tabKey === 'assistant') {
      onToggleAi();
      return;
    }

    if (onSelectRoleTab) {
      onSelectRoleTab(tabKey);
    }
    if (currentRole === 'customer' && onSelectCustomerTab) {
      if (tabKey === 'shop' || tabKey === 'orders' || tabKey === 'wishlist') {
        onSelectCustomerTab(tabKey);
      }
    }
  };

  const currentActiveTab = activeRoleTab || (currentRole === 'customer' ? activeCustomerTab : '');

  return (
    <header className="sticky top-0 z-40 bg-[#09090b]/85 text-white shadow-xl shadow-black/40 border-b border-white/[0.08] backdrop-blur-xl">
      {/* 1. TOP BAR */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <Sprout className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tracking-tight text-white flex items-center gap-0.5">
                  Farm<span className="text-emerald-400">2</span>Home
                </span>
                <span className="text-[9px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {t.header.brandTag}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 hidden sm:block font-medium -mt-0.5">
                {t.header.subTagline}
              </p>
            </div>
          </div>

          {/* Central Search Bar */}
          <div className="flex-1 max-w-md mx-2 hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full pl-10 pr-8 py-2 text-xs bg-[#121418]/90 hover:bg-[#181b20] focus:bg-[#121418] border border-white/[0.08] focus:border-emerald-500/50 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange && onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Right Tools Group */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* 0% Commission Indicator */}
            <div className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/[0.08] text-emerald-300 border border-emerald-500/20 text-xs font-semibold whitespace-nowrap">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t.header.zeroMiddleman}</span>
            </div>

            {/* Language Selector */}
            <div className="relative flex items-center">
              <Languages className="w-3.5 h-3.5 absolute left-2.5 text-zinc-400 pointer-events-none" />
              <select
                value={language}
                onChange={(e) => onSelectLanguage(e.target.value as Language)}
                className="pl-7 pr-2.5 py-1.5 bg-[#121418] hover:bg-[#181b20] border border-white/[0.08] rounded-lg text-xs font-bold text-zinc-200 focus:outline-none focus:border-emerald-500/50 cursor-pointer transition-colors"
                title={t.header.selectLanguage}
              >
                <option value="en" className="bg-[#09090b] text-white">English</option>
                <option value="te" className="bg-[#09090b] text-white">తెలుగు (Telugu)</option>
                <option value="hi" className="bg-[#09090b] text-white">हिन्दी (Hindi)</option>
                <option value="ta" className="bg-[#09090b] text-white">தமிழ் (Tamil)</option>
              </select>
            </div>

            {/* User Account / Authentication Action */}
            {isAuthLoading ? (
              <div className="flex items-center gap-2 py-1.5 px-3 bg-[#121418] border border-white/[0.08] rounded-xl animate-pulse">
                <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                <span className="text-[11px] text-zinc-400 font-medium hidden sm:inline">Loading...</span>
              </div>
            ) : isAuthenticated && currentProfile ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => (onOpenAuthModal ? onOpenAuthModal('account') : onOpenRoleModal && onOpenRoleModal())}
                  className="flex items-center gap-2 py-1 px-2.5 bg-[#121418] hover:bg-[#181b20] border border-white/[0.08] hover:border-emerald-500/40 rounded-xl transition-all cursor-pointer group"
                  title={t.auth.accountSettings}
                >
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-black">
                    {currentRole === 'farmer' ? '🌾' : currentRole === 'customer' ? '🛒' : '🚚'}
                  </div>
                  <div className="text-left hidden sm:block max-w-[130px] truncate">
                    <p className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                      {currentProfile.full_name}
                    </p>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                      {currentRole === 'farmer'
                        ? t.auth.farmerRole
                        : currentRole === 'customer'
                        ? t.auth.customerRole
                        : t.auth.deliveryRole}
                    </p>
                  </div>
                </button>

                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors border border-transparent hover:border-rose-500/20 cursor-pointer"
                    title={t.auth.signOut}
                  >
                    <LogIn className="w-4 h-4 rotate-180" />
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => (onOpenAuthModal ? onOpenAuthModal('auth') : onOpenRoleModal && onOpenRoleModal())}
                className="py-1.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{t.auth.signIn}</span>
              </button>
            )}

            {/* Wishlist Button (Authenticated Customer Role Only) */}
            {isAuthenticated && currentRole === 'customer' && (
              <button
                onClick={() => {
                  if (onSelectCustomerTab) onSelectCustomerTab('wishlist');
                  if (onOpenWishlist) onOpenWishlist();
                }}
                className="relative p-2 rounded-lg bg-[#121418] hover:bg-[#181b20] border border-white/[0.08] hover:border-emerald-500/30 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title={t.header.savedWishlist}
              >
                <Heart className="w-4 h-4 text-zinc-400 hover:text-rose-400" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-[#09090b]">
                    {wishlistCount}
                  </span>
                )}
              </button>
            )}

            {/* Cart Button (Authenticated Customer Role Only) */}
            {isAuthenticated && currentRole === 'customer' && (
              <button
                onClick={onOpenCart}
                className="relative p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 transition-all shadow-[0_0_10px_rgba(16,185,129,0.1)] cursor-pointer"
                title={t.header.viewCart}
              >
                <ShoppingCart className="w-4 h-4 text-emerald-400" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-zinc-950 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-[#09090b]">
                    {cartCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. BOTTOM BAR: Role Navigation Tabs */}
      <div className="bg-[#0c0d12]/95 border-t border-white/[0.06] px-4 sm:px-6 lg:px-8 overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 py-1.5 text-xs">
          {/* Main Role Tabs */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* 1. Loading State */}
            {isAuthLoading && (
              <div className="flex items-center gap-2 py-1 px-2 text-xs text-zinc-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400 shrink-0" />
                <span className="text-[11px] font-medium text-zinc-400">
                  {authStatus === 'AUTH_LOADING' ? 'Connecting to Agri-Grid...' : 'Authenticating profile...'}
                </span>
              </div>
            )}

            {/* 2. Unauthenticated State */}
            {isUnauthenticated && (
              <div className="flex items-center gap-2 text-xs text-zinc-400 py-0.5">
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <Sprout className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Farm2Home Marketplace</span>
                </span>
                <span className="text-zinc-600 hidden sm:inline">•</span>
                <span className="text-zinc-500 text-[11px] hidden sm:inline">
                  Direct harvest from verified Indian farms • 0% middleman fees
                </span>
              </div>
            )}

            {/* 3. Authenticated State: CUSTOMER TABS */}
            {isAuthenticated && currentRole === 'customer' && (
              <>
                <button
                  onClick={() => handleTabClick('shop')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap text-xs ${
                    currentActiveTab === 'shop'
                      ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 shadow-xs'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.04] font-medium'
                  }`}
                >
                  <Sprout className="w-3.5 h-3.5 text-emerald-400" />
                  {t.header.browseProduce}
                </button>

                <button
                  onClick={() => handleTabClick('orders')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap text-xs ${
                    currentActiveTab === 'orders'
                      ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 shadow-xs'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.04] font-medium'
                  }`}
                >
                  <PackageCheck className="w-3.5 h-3.5 text-emerald-400" />
                  {t.orders}
                </button>

                <button
                  onClick={() => handleTabClick('wishlist')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap text-xs ${
                    currentActiveTab === 'wishlist'
                      ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 shadow-xs'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.04] font-medium'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5 text-emerald-400" />
                  {t.wishlist}
                </button>
              </>
            )}

            {/* 4. Authenticated State: FARMER TABS */}
            {isAuthenticated && currentRole === 'farmer' && (
              <>
                <button
                  onClick={() => handleTabClick('overview')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap text-xs ${
                    currentActiveTab === 'overview' || currentActiveTab === 'crops'
                      ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 shadow-xs'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.04] font-medium'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  {t.header.farmWorkspace}
                </button>

                <button
                  onClick={() => handleTabClick('planner')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap text-xs ${
                    currentActiveTab === 'planner'
                      ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 shadow-xs'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.04] font-medium'
                  }`}
                >
                  <Sprout className="w-3.5 h-3.5 text-emerald-400" />
                  {t.header.cropPlanner}
                </button>

                <button
                  onClick={() => handleTabClick('weather')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap text-xs ${
                    currentActiveTab === 'weather'
                      ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 shadow-xs'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.04] font-medium'
                  }`}
                >
                  <CloudSun className="w-3.5 h-3.5 text-emerald-400" />
                  {t.header.weatherAdvisory}
                </button>

                <button
                  onClick={() => handleTabClick('agronomist')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap text-xs ${
                    currentActiveTab === 'agronomist'
                      ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 shadow-xs'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.04] font-medium'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  {t.header.aiAgronomist}
                </button>

                <button
                  onClick={() => handleTabClick('orders')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap text-xs ${
                    currentActiveTab === 'orders'
                      ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 shadow-xs'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.04] font-medium'
                  }`}
                >
                  <PackageCheck className="w-3.5 h-3.5 text-emerald-400" />
                  {t.header.ordersQueue}
                </button>
              </>
            )}

            {/* 5. Authenticated State: DELIVERY TABS */}
            {isAuthenticated && currentRole === 'delivery' && (
              <>
                <button
                  onClick={() => handleTabClick('history')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap text-xs ${
                    currentActiveTab === 'history' || currentActiveTab === 'completed'
                      ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 shadow-xs'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.04] font-medium'
                  }`}
                >
                  <History className="w-3.5 h-3.5 text-emerald-400" />
                  {t.header.rideHistory}
                </button>

                <button
                  onClick={() => handleTabClick('active')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap text-xs ${
                    currentActiveTab === 'active'
                      ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 shadow-xs'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.04] font-medium'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5 text-emerald-400" />
                  {t.header.activeRoutes}
                </button>

                <button
                  onClick={() => handleTabClick('available')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap text-xs ${
                    currentActiveTab === 'available'
                      ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 shadow-xs'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.04] font-medium'
                  }`}
                >
                  <PackageCheck className="w-3.5 h-3.5 text-emerald-400" />
                  {t.header.availablePickups}
                </button>
              </>
            )}
          </div>

          {/* Shared Tools: Weather & AI Specialist */}
          <div className="flex items-center gap-1 pl-2 border-l border-white/[0.08]">
            <button
              onClick={() => handleTabClick('weather')}
              className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap text-xs ${
                isWeatherOpen
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 shadow-xs'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04] font-medium'
              }`}
            >
              <SunMedium className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.header.weather}</span>
            </button>

            <button
              onClick={() => handleTabClick('assistant')}
              className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap text-xs ${
                isAiOpen
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 shadow-xs'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04] font-medium'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t.header.aiSpecialist}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

