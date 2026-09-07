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
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { Profile, Role, Language } from '../types';
import { translations } from '../lib/translations';

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
  const t = translations[language];

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
    <header className="sticky top-0 z-40 bg-[#1b4332] text-white shadow-md border-b border-[#2d6a4f]">
      {/* 1. TOP BAR (Desktop & Mobile) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-[#2d6a4f] text-[#74c69d] flex items-center justify-center shadow-xs border border-[#40916c]/40">
              <Sprout className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white flex items-center gap-1">
                Farm<span className="text-[#74c69d]">2</span>Home
              </span>
              <p className="text-[11px] text-[#d8f3dc]/80 hidden sm:block font-medium">
                Direct Farm Marketplace
              </p>
            </div>
          </div>

          {/* Search Input Bar (Center) */}
          <div className="flex-1 max-w-md mx-2 hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#74c69d]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-[#2d6a4f]/70 border border-[#40916c]/50 rounded-xl text-white placeholder:text-[#d8f3dc]/60 focus:outline-none focus:ring-1 focus:ring-[#74c69d]"
              />
            </div>
          </div>

          {/* Right Tools: 0% Commission, Language, Persona Switcher, Cart */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* 0% Commission Pill */}
            <div className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#2d6a4f] text-[#74c69d] border border-[#40916c]/50 text-xs font-bold whitespace-nowrap">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              0% Middlemen Commission
            </div>

            {/* Language Selector */}
            <div className="relative flex items-center">
              <Languages className="w-3.5 h-3.5 absolute left-2 text-[#74c69d] pointer-events-none" />
              <select
                value={language}
                onChange={(e) => onSelectLanguage(e.target.value as Language)}
                className="pl-6 pr-2 py-1.5 bg-[#2d6a4f]/80 border border-[#40916c]/50 rounded-lg text-xs font-bold text-[#d8f3dc] focus:outline-none focus:ring-1 focus:ring-[#74c69d] cursor-pointer"
                title="Select Language"
              >
                <option value="en" className="bg-[#1b4332] text-white">EN</option>
                <option value="te" className="bg-[#1b4332] text-white">తెలుగు</option>
                <option value="hi" className="bg-[#1b4332] text-white">हिन्दी</option>
                <option value="ta" className="bg-[#1b4332] text-white">தமிழ்</option>
              </select>
            </div>

            {/* Persona Switcher Dropdown */}
            <div className="flex items-center gap-1 bg-[#2d6a4f]/80 border border-[#40916c]/50 rounded-lg p-0.5">
              <select
                value={currentProfile.id}
                onChange={(e) => {
                  const found = profiles.find((p) => p.id === e.target.value);
                  if (found) onSelectProfile(found);
                }}
                className="py-1 px-2 bg-transparent text-xs font-bold text-[#d8f3dc] focus:outline-none cursor-pointer max-w-[130px] sm:max-w-[170px] truncate"
                title="Switch Demo Persona"
              >
                <optgroup label="Farmers (Sellers)" className="bg-[#1b4332] text-white">
                  {profiles
                    .filter((p) => p.role === 'farmer')
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        🌾 {p.full_name}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Customers (Consumers)" className="bg-[#1b4332] text-white">
                  {profiles
                    .filter((p) => p.role === 'customer')
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        🛒 {p.full_name}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Delivery Fleet" className="bg-[#1b4332] text-white">
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
                  className="p-1 text-[#74c69d] hover:text-white hover:bg-white/10 rounded transition-colors"
                  title="Open Full Role Switcher & Sign In Modal"
                >
                  <UserCheck className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Wishlist Button (Customer) */}
            {currentProfile.role === 'customer' && (
              <button
                onClick={() => {
                  if (onSelectCustomerTab) onSelectCustomerTab('wishlist');
                  if (onOpenWishlist) onOpenWishlist();
                }}
                className="relative p-2 rounded-lg bg-[#2d6a4f]/70 border border-[#40916c]/40 text-[#d8f3dc] hover:bg-[#2d6a4f] transition-colors"
                title="Saved Wishlist"
              >
                <Heart className="w-4 h-4 text-[#74c69d]" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </button>
            )}

            {/* Cart Button (Customer) */}
            {currentProfile.role === 'customer' && (
              <button
                onClick={onOpenCart}
                className="relative p-2 rounded-lg bg-[#2d6a4f] border border-[#74c69d]/50 text-white hover:bg-[#40916c] transition-colors"
                title="View Cart"
              >
                <ShoppingCart className="w-4 h-4 text-amber-300" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-[#74c69d] text-[#1b4332] text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. BOTTOM BAR: Role Navigation Tabs */}
      <div className="bg-[#143225] border-t border-[#2d6a4f]/60 px-4 sm:px-6 lg:px-8 overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto flex items-center gap-1 sm:gap-2 py-1.5 text-xs font-semibold">
          {/* CUSTOMER TABS */}
          {currentProfile.role === 'customer' && (
            <>
              <button
                onClick={() => handleTabClick('shop')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  currentActiveTab === 'shop'
                    ? 'bg-[#2d6a4f] text-white shadow-xs font-bold ring-1 ring-[#74c69d]/50'
                    : 'text-[#d8f3dc]/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <Sprout className="w-3.5 h-3.5 text-[#74c69d]" />
                Browse Produce
              </button>

              <button
                onClick={() => handleTabClick('orders')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  currentActiveTab === 'orders'
                    ? 'bg-[#2d6a4f] text-white shadow-xs font-bold ring-1 ring-[#74c69d]/50'
                    : 'text-[#d8f3dc]/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <PackageCheck className="w-3.5 h-3.5 text-[#74c69d]" />
                {t.orders}
              </button>

              <button
                onClick={() => handleTabClick('wishlist')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  currentActiveTab === 'wishlist'
                    ? 'bg-[#2d6a4f] text-white shadow-xs font-bold ring-1 ring-[#74c69d]/50'
                    : 'text-[#d8f3dc]/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <Heart className="w-3.5 h-3.5 text-[#74c69d]" />
                {t.wishlist}
              </button>
            </>
          )}

          {/* FARMER TABS */}
          {currentProfile.role === 'farmer' && (
            <>
              <button
                onClick={() => handleTabClick('crops')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  currentActiveTab === 'crops'
                    ? 'bg-[#2d6a4f] text-white shadow-xs font-bold ring-1 ring-[#74c69d]/50'
                    : 'text-[#d8f3dc]/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-[#74c69d]" />
                My Crop Listings
              </button>

              <button
                onClick={() => handleTabClick('orders')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  currentActiveTab === 'orders'
                    ? 'bg-[#2d6a4f] text-white shadow-xs font-bold ring-1 ring-[#74c69d]/50'
                    : 'text-[#d8f3dc]/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <PackageCheck className="w-3.5 h-3.5 text-[#74c69d]" />
                Incoming Orders
              </button>

              <button
                onClick={() => handleTabClick('analytics')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  currentActiveTab === 'analytics'
                    ? 'bg-[#2d6a4f] text-white shadow-xs font-bold ring-1 ring-[#74c69d]/50'
                    : 'text-[#d8f3dc]/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-[#74c69d]" />
                Demand Analytics
              </button>
            </>
          )}

          {/* DELIVERY TABS */}
          {currentProfile.role === 'delivery' && (
            <>
              <button
                onClick={() => handleTabClick('available')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  currentActiveTab === 'available'
                    ? 'bg-[#2d6a4f] text-white shadow-xs font-bold ring-1 ring-[#74c69d]/50'
                    : 'text-[#d8f3dc]/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <PackageCheck className="w-3.5 h-3.5 text-[#74c69d]" />
                Available Jobs
              </button>

              <button
                onClick={() => handleTabClick('active')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  currentActiveTab === 'active'
                    ? 'bg-[#2d6a4f] text-white shadow-xs font-bold ring-1 ring-[#74c69d]/50'
                    : 'text-[#d8f3dc]/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <Truck className="w-3.5 h-3.5 text-[#74c69d]" />
                Active Route
              </button>
            </>
          )}

          {/* COMMON SHARED TABS ACROSS ROLES: Weather & AI Specialist */}
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => handleTabClick('weather')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                isWeatherOpen
                  ? 'bg-amber-600/90 text-white shadow-xs font-bold'
                  : 'text-[#d8f3dc]/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <SunMedium className="w-3.5 h-3.5 text-amber-300" />
              Weather
            </button>

            <button
              onClick={() => handleTabClick('assistant')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                isAiOpen
                  ? 'bg-[#2d6a4f] text-white shadow-xs font-bold ring-1 ring-[#74c69d]'
                  : 'text-[#d8f3dc]/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-[#74c69d]" />
              AI Specialist
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
