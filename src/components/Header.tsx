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
} from 'lucide-react';
import { Profile, Language } from '../types';
import { getTranslation } from '../lib/translations';

interface HeaderProps {
  currentProfile: Profile;
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
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
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
  searchQuery = '',
  onSearchChange,
}) => {
  const t = getTranslation(language);

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
    if (currentProfile.role === 'customer' && onSelectCustomerTab) {
      if (tabKey === 'shop' || tabKey === 'orders' || tabKey === 'wishlist') {
        onSelectCustomerTab(tabKey);
      }
    }
  };

  const currentActiveTab = activeRoleTab || (currentProfile.role === 'customer' ? activeCustomerTab : '');

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

            {/* Persona Switcher Dropdown */}
            <div className="flex items-center gap-0.5 bg-[#121418] border border-white/[0.08] rounded-lg p-0.5 hover:border-white/[0.15] transition-colors">
              <select
                value={currentProfile.id}
                onChange={(e) => {
                  const found = profiles.find((p) => p.id === e.target.value);
                  if (found) onSelectProfile(found);
                }}
                className="py-1 px-2 bg-transparent text-xs font-bold text-zinc-200 focus:outline-none cursor-pointer max-w-[125px] sm:max-w-[160px] truncate"
                title={t.header.switchPersona}
              >
                <optgroup label={t.header.farmersGroup} className="bg-[#09090b] text-white font-normal">
                  {profiles
                    .filter((p) => p.role === 'farmer')
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        🌾 {p.full_name}
                      </option>
                    ))}
                </optgroup>
                <optgroup label={t.header.customersGroup} className="bg-[#09090b] text-white font-normal">
                  {profiles
                    .filter((p) => p.role === 'customer')
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        🛒 {p.full_name}
                      </option>
                    ))}
                </optgroup>
                <optgroup label={t.header.deliveryGroup} className="bg-[#09090b] text-white font-normal">
                  {profiles
                    .filter((p) => p.role === 'delivery')
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        🚚 {p.full_name}
                      </option>
                    ))}
                </optgroup>
              </select>

              {onOpenRoleModal && (
                <button
                  onClick={onOpenRoleModal}
                  className="p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-white/5 rounded-md transition-colors"
                  title={t.header.switchAccount}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Wishlist Button (Customer Role Only) */}
            {currentProfile.role === 'customer' && (
              <button
                onClick={() => {
                  if (onSelectCustomerTab) onSelectCustomerTab('wishlist');
                  if (onOpenWishlist) onOpenWishlist();
                }}
                className="relative p-2 rounded-lg bg-[#121418] hover:bg-[#181b20] border border-white/[0.08] hover:border-emerald-500/30 text-zinc-300 hover:text-white transition-colors"
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

            {/* Cart Button (Customer Role Only) */}
            {currentProfile.role === 'customer' && (
              <button
                onClick={onOpenCart}
                className="relative p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 transition-all shadow-[0_0_10px_rgba(16,185,129,0.1)]"
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
            {/* CUSTOMER TABS */}
            {currentProfile.role === 'customer' && (
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

            {/* FARMER TABS */}
            {currentProfile.role === 'farmer' && (
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

            {/* DELIVERY TABS */}
            {currentProfile.role === 'delivery' && (
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
