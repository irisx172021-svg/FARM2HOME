import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sprout,
  ShieldCheck,
  Truck,
  Home,
  Store,
  ArrowRight,
  Phone,
  Mail,
  Fingerprint,
  Languages,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  ShoppingBag,
  Sparkles,
  RefreshCw,
  X,
  ChevronRight,
  Menu,
  Navigation,
  Bot,
  Layers,
  Thermometer,
  Clock,
  Compass,
  Cpu,
  BadgeCheck,
  TrendingUp,
  MapPin,
  Calendar,
  CloudSun,
} from 'lucide-react';
import { Language, UserRole, Profile } from '../types.js';
import { getTranslation } from '../lib/translations.js';
import { api } from '../lib/api.js';
import { SplineHeroCanvas } from './SplineHeroCanvas.js';
import { AuthModal } from './AuthModal.js';

interface AuthLandingPageProps {
  language: Language;
  onSelectLanguage: (lang: Language) => void;
  onAuthSuccess: (profile: Profile, token: string) => void;
  availableProducts?: any[];
  onExploreMarketplace?: () => void;
  onOpenAuthModal?: (mode?: 'auth' | 'onboarding' | 'account') => void;
}

export const AuthLandingPage: React.FC<AuthLandingPageProps> = ({
  language,
  onSelectLanguage,
  onAuthSuccess,
  availableProducts = [],
  onExploreMarketplace,
  onOpenAuthModal,
}) => {
  const t = getTranslation(language);

  // Scroll tracking for navigation compactness
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Internal Auth Modal state if parent does not provide onOpenAuthModal
  const [internalAuthModalOpen, setInternalAuthModalOpen] = useState(false);
  const [internalAuthMode, setInternalAuthMode] = useState<'auth' | 'onboarding' | 'account'>('auth');
  const [initialRoleChoice, setInitialRoleChoice] = useState<'customer' | 'farmer' | 'delivery'>('customer');

  // Interactive sections state
  const [activeJourneyStep, setActiveJourneyStep] = useState(0);
  const [showDevPersonas, setShowDevPersonas] = useState(false);
  const [loadingPersona, setLoadingPersona] = useState<string | null>(null);

  // Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const openAuth = (mode: 'auth' | 'onboarding' | 'account' = 'auth', role: 'customer' | 'farmer' | 'delivery' = 'customer') => {
    setInitialRoleChoice(role);
    if (onOpenAuthModal) {
      onOpenAuthModal(mode);
    } else {
      setInternalAuthMode(mode);
      setInternalAuthModalOpen(true);
    }
  };

  const handleExploreAction = () => {
    if (onExploreMarketplace) {
      onExploreMarketplace();
    } else {
      const el = document.getElementById('marketplace');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handlePersonaLogin = async (personaId: string) => {
    setLoadingPersona(personaId);
    try {
      const res = await api.devLogin(personaId);
      if (res.profile && res.sessionToken) {
        onAuthSuccess(res.profile, res.sessionToken);
      }
    } catch (err) {
      console.error('Failed to log in with persona:', err);
    } finally {
      setLoadingPersona(null);
    }
  };

  // Sample products for live preview if products are empty
  const previewProducts = availableProducts.length > 0 ? availableProducts.slice(0, 4) : [
    {
      id: 'prod_banga_mango',
      title: 'Banganapalli Mangoes',
      category: 'fruits',
      price: 140,
      unit: 'kg',
      stock: 45,
      farmer_name: 'Saraswathi Devi',
      farmer_location: 'Chittoor District',
      is_organic: true,
      image_url: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=500&auto=format&fit=crop&q=60',
      description: 'Naturally ripened, export grade mangoes freshly plucked at dawn.',
    },
    {
      id: 'prod_desi_tomato',
      title: 'Organic Country Tomatoes',
      category: 'vegetables',
      price: 36,
      unit: 'kg',
      stock: 120,
      farmer_name: 'Ramesh Reddy',
      farmer_location: 'Rangareddy Cluster',
      is_organic: true,
      image_url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop&q=60',
      description: 'Vine-ripened heritage country tomatoes with rich natural acidity.',
    },
    {
      id: 'prod_sona_rice',
      title: 'Aged Sona Masoori Rice',
      category: 'grains',
      price: 78,
      unit: 'kg',
      stock: 250,
      farmer_name: 'Saraswathi Devi',
      farmer_location: 'Nellore Basin',
      is_organic: false,
      image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=60',
      description: 'Traditional 12-month aged single-origin grain with light texture.',
    },
    {
      id: 'prod_fresh_palak',
      title: 'Hydro-Washed Organic Palak',
      category: 'vegetables',
      price: 25,
      unit: 'bunch',
      stock: 35,
      farmer_name: 'Ramesh Reddy',
      farmer_location: 'Medak Agri Zone',
      is_organic: true,
      image_url: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=500&auto=format&fit=crop&q=60',
      description: 'Crisp green leaves harvested at 5:00 AM, zero chemical residues.',
    },
  ];

  const journeySteps = [
    {
      num: '01',
      title: 'HARVEST',
      desc: 'Farmers list fresh produce directly from their farms.',
      tag: 'DAWN HARVEST',
      detail: 'Registered farmers upload batch inventory with harvest timestamps, quality grade, and unit pricing directly from the field.',
      icon: Sprout,
    },
    {
      num: '02',
      title: 'DISCOVER',
      desc: 'Customers discover products with freshness, stock, farmer and organic information.',
      tag: 'REAL-TIME CATALOG',
      detail: 'Search regional harvest batches with complete grower provenance, real-time inventory counts, and organic certification badges.',
      icon: Store,
    },
    {
      num: '03',
      title: 'CONNECT',
      desc: 'Orders move through an intelligent fulfillment workflow.',
      tag: 'SMART DISPATCH',
      detail: 'Orders automatically allocate to hyper-local fulfillment nodes, minimizing transit duration and preserving peak produce nutrition.',
      icon: Cpu,
    },
    {
      num: '04',
      title: 'DELIVER',
      desc: 'Delivery partners handle verified handoffs and delivery tracking.',
      tag: 'COLD-CHAIN ROUTE',
      detail: 'Delivery fleet accepts optimized route manifests with real-time temperature tracking and verified 6-digit OTP handoff protocols.',
      icon: Truck,
    },
    {
      num: '05',
      title: 'HOME',
      desc: 'Fresh agricultural products reach the customer.',
      tag: 'ZERO INTERMEDIARIES',
      detail: 'Peak-fresh nutrition arrives at customer doorsteps within hours of picking, returning 100% of fair agricultural value to growers.',
      icon: Home,
    },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] text-white selection:bg-emerald-500/30 selection:text-emerald-300 relative overflow-x-hidden font-sans">
      {/* Background Architectural Ambient Glows */}
      <div className="pointer-events-none fixed -top-40 left-1/4 w-[650px] h-[650px] bg-emerald-500/[0.035] blur-[160px] rounded-full -z-10" />
      <div className="pointer-events-none fixed top-1/3 -right-24 w-[550px] h-[550px] bg-teal-500/[0.025] blur-[150px] rounded-full -z-10" />
      <div className="pointer-events-none fixed -bottom-40 left-1/3 w-[500px] h-[500px] bg-emerald-600/[0.02] blur-[140px] rounded-full -z-10" />

      {/* TOP NAVIGATION: Clean 3-zone Top Bar Contract */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-200 border-b ${
          isScrolled
            ? 'bg-[#09090b]/90 border-white/[0.08] backdrop-blur-xl py-3 shadow-2xl shadow-black/40'
            : 'bg-transparent border-transparent py-4 sm:py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Zone 1: Single Element Brand Wordmark */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:border-emerald-500/60 transition-colors">
              <Sprout className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-base font-bold tracking-tight text-white flex items-center">
              Farm<span className="text-emerald-400">2</span>Home
            </span>
          </a>

          {/* Zone 2: Clean Text Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-zinc-400">
            <a
              href="#marketplace"
              className="hover:text-white transition-colors"
            >
              Marketplace
            </a>
            <a
              href="#how-it-works"
              className="hover:text-white transition-colors"
            >
              How It Works
            </a>
            <a
              href="#farmers"
              className="hover:text-white transition-colors"
            >
              For Farmers
            </a>
            <a
              href="#delivery"
              className="hover:text-white transition-colors"
            >
              For Delivery
            </a>
            <a
              href="#agronomist"
              className="hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Bot className="w-3.5 h-3.5 text-emerald-400" />
              <span>AI Agronomist</span>
            </a>
          </nav>

          {/* Zone 3: Primary Actions + Language Selector */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Language Selector */}
            <div className="relative flex items-center">
              <Languages className="w-3.5 h-3.5 absolute left-2.5 text-zinc-400 pointer-events-none" />
              <select
                value={language}
                onChange={(e) => onSelectLanguage(e.target.value as Language)}
                aria-label="Select interface language"
                className="pl-7 pr-3 py-1.5 bg-[#121418] hover:bg-[#181b22] border border-white/[0.08] focus:border-emerald-500/50 rounded-lg text-xs font-semibold text-zinc-200 focus:outline-none cursor-pointer transition-colors"
              >
                <option value="en" className="bg-[#09090b] text-white">EN</option>
                <option value="te" className="bg-[#09090b] text-white">తెలుగు</option>
                <option value="hi" className="bg-[#09090b] text-white">हिन्दी</option>
                <option value="ta" className="bg-[#09090b] text-white">தமிழ்</option>
              </select>
            </div>

            {/* Sandbox Tester Trigger */}
            <button
              onClick={() => setShowDevPersonas((prev) => !prev)}
              type="button"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 rounded-lg text-[11px] font-mono text-zinc-400 hover:text-white transition-all cursor-pointer"
              title="Test development personas"
            >
              <User className="w-3 h-3 text-emerald-400" />
              <span>Sandbox</span>
            </button>

            {/* Sign In Button */}
            <button
              type="button"
              onClick={() => openAuth('auth')}
              className="px-3.5 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              Sign In
            </button>

            {/* Get Started Button */}
            <button
              type="button"
              onClick={() => openAuth('auth')}
              className="px-3.5 py-1.5 text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-sm shadow-emerald-500/20 transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]"
            >
              Get Started
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden p-1.5 text-zinc-400 hover:text-white rounded-lg focus:outline-none"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-[#0e1117] border-b border-white/10 px-4 py-4 space-y-3"
            >
              <nav className="flex flex-col gap-2.5 text-sm font-medium text-zinc-300">
                <a
                  href="#marketplace"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-2 py-1.5 hover:text-white transition-colors"
                >
                  Marketplace
                </a>
                <a
                  href="#how-it-works"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-2 py-1.5 hover:text-white transition-colors"
                >
                  How It Works
                </a>
                <a
                  href="#farmers"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-2 py-1.5 hover:text-white transition-colors"
                >
                  For Farmers
                </a>
                <a
                  href="#delivery"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-2 py-1.5 hover:text-white transition-colors"
                >
                  For Delivery
                </a>
                <a
                  href="#agronomist"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-2 py-1.5 hover:text-white transition-colors"
                >
                  AI Agronomist
                </a>
              </nav>
              <div className="pt-2 border-t border-white/10 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openAuth('auth');
                  }}
                  className="flex-1 py-2 text-center text-xs font-semibold text-zinc-950 bg-emerald-400 rounded-lg"
                >
                  Sign In / Register
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowDevPersonas(true);
                  }}
                  className="px-3 py-2 text-center text-xs font-mono text-zinc-400 bg-white/5 border border-white/10 rounded-lg"
                >
                  Sandbox
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Developer Sandbox Persona Drawer */}
      <AnimatePresence>
        {showDevPersonas && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="fixed top-16 left-0 right-0 z-30 bg-[#10131a] border-b border-emerald-500/20 px-4 sm:px-8 py-3.5 shadow-2xl"
          >
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-400 font-mono">
                    DEVELOPMENT PERSONA SANDBOX
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    · Instant isolated test sessions across roles
                  </span>
                </div>
                <button
                  onClick={() => setShowDevPersonas(false)}
                  className="text-xs text-zinc-500 hover:text-white p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => handlePersonaLogin('usr_rahul_customer')}
                  disabled={loadingPersona !== null}
                  className="p-2.5 bg-[#161a22] hover:bg-emerald-950/20 border border-white/10 hover:border-emerald-500/40 rounded-xl text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-bold text-white group-hover:text-emerald-300">Rahul Verma</span>
                    <span className="text-[9px] font-mono text-emerald-400">Customer</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 truncate">Hyderabad · Regular Consumer</p>
                </button>

                <button
                  type="button"
                  onClick={() => handlePersonaLogin('usr_ramesh_farmer')}
                  disabled={loadingPersona !== null}
                  className="p-2.5 bg-[#161a22] hover:bg-emerald-950/20 border border-white/10 hover:border-emerald-500/40 rounded-xl text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-bold text-white group-hover:text-emerald-300">Ramesh Reddy</span>
                    <span className="text-[9px] font-mono text-emerald-400">Farmer</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 truncate">Rangareddy · 12 Acres</p>
                </button>

                <button
                  type="button"
                  onClick={() => handlePersonaLogin('usr_saraswathi_farmer')}
                  disabled={loadingPersona !== null}
                  className="p-2.5 bg-[#161a22] hover:bg-emerald-950/20 border border-white/10 hover:border-emerald-500/40 rounded-xl text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-bold text-white group-hover:text-emerald-300">Saraswathi Devi</span>
                    <span className="text-[9px] font-mono text-emerald-400">Farmer</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 truncate">Chittoor · Mango Orchards</p>
                </button>

                <button
                  type="button"
                  onClick={() => handlePersonaLogin('usr_vikram_delivery')}
                  disabled={loadingPersona !== null}
                  className="p-2.5 bg-[#161a22] hover:bg-emerald-950/20 border border-white/10 hover:border-emerald-500/40 rounded-xl text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-bold text-white group-hover:text-emerald-300">Vikram Singh</span>
                    <span className="text-[9px] font-mono text-emerald-400">Delivery</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 truncate">Transit Fleet · OTP verified</p>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. CINEMATIC FULL-SCREEN SPLINE HERO SECTION */}
      <section className="relative min-h-[92vh] sm:min-h-screen flex items-center pt-24 pb-16 overflow-hidden">
        {/* Interactive 3D Spline Canvas Backdrop */}
        <div className="absolute inset-0 z-0 pointer-events-auto">
          <SplineHeroCanvas />
        </div>

        {/* Ambient bottom fade into next section */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#09090b] to-transparent pointer-events-none z-10" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pointer-events-none">
          <div className="max-w-2xl space-y-7 pointer-events-auto">
            {/* System Status Telemetry Indicator */}
            <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-white/[0.03] border border-emerald-500/30 text-emerald-400 text-xs font-mono backdrop-blur-md shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="tracking-wide">FARM2HOME NETWORK • ONLINE</span>
            </div>

            {/* Primary Cinematic Headline */}
            <div className="space-y-1">
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08] text-balance">
                From Farm.<br />
                To Home.<br />
                <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200 bg-clip-text text-transparent">
                  Intelligently.
                </span>
              </h1>
            </div>

            {/* Supporting Value Proposition */}
            <p className="text-base sm:text-lg text-zinc-300 leading-relaxed max-w-xl text-balance">
              Farm2Home connects farmers, customers, and delivery partners through one intelligent agricultural marketplace.
            </p>

            {/* Hero CTA Button Cluster */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {/* Primary CTA: Explore Marketplace */}
              <button
                type="button"
                onClick={handleExploreAction}
                className="px-6 py-3.5 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                <span>Explore Marketplace</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Secondary CTA: How It Works */}
              <a
                href="#how-it-works"
                className="px-5 py-3.5 bg-[#141820]/90 hover:bg-[#1a202c] border border-white/10 hover:border-white/20 text-white font-semibold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer backdrop-blur-md"
              >
                <span>How It Works</span>
              </a>

              {/* Authentication CTA: Sign In */}
              <button
                type="button"
                onClick={() => openAuth('auth')}
                className="px-5 py-3.5 text-zinc-300 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Sign In
              </button>
            </div>

            {/* Hero Monospace Telemetry Pills */}
            <div className="pt-6 border-t border-white/[0.08] flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-mono text-zinc-400">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                FRESH HARVEST
              </span>
              <span className="text-zinc-600">·</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                REAL-TIME STOCK
              </span>
              <span className="text-zinc-600">·</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                SMART ROUTING
              </span>
              <span className="text-zinc-600">·</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                AI AGRONOMY
              </span>
              <span className="text-zinc-600">·</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                TRACEABLE BATCH
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. HOW IT WORKS: CINEMATIC JOURNEY PIPELINE */}
      <section id="how-it-works" className="py-24 border-t border-white/[0.06] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-16 space-y-3">
            <div className="text-[11px] font-mono text-emerald-400 tracking-wider uppercase">
              THE FULL-CYCLE ARCHITECTURE
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              The Intelligent Farm-to-Home Cycle
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Eliminating intermediaries through automated consignment workflows, real-time inventory synchronization, and cryptographic OTP handovers.
            </p>
          </div>

          {/* Interactive 5-Step Journey Pipeline */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
            {journeySteps.map((step, idx) => {
              const StepIcon = step.icon;
              const isActive = activeJourneyStep === idx;
              return (
                <div
                  key={step.num}
                  onMouseEnter={() => setActiveJourneyStep(idx)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer relative group flex flex-col justify-between ${
                    isActive
                      ? 'bg-[#121620] border-emerald-500/50 shadow-xl shadow-emerald-950/20'
                      : 'bg-[#0e1117] border-white/[0.06] hover:border-white/20'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Step Number & Tag */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-emerald-400">
                        {step.num}
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <StepIcon className="w-4 h-4" />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white mb-1.5 flex items-center gap-1.5">
                        {step.title}
                      </h3>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-white/[0.06] text-[10px] font-mono text-zinc-500">
                    {step.tag}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Step Deep-Dive Display */}
          <div className="mt-8 p-6 bg-[#0e1117] border border-white/[0.08] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">
                STAGE {journeySteps[activeJourneyStep].num} IN-DEPTH
              </span>
              <h4 className="text-base font-bold text-white">
                {journeySteps[activeJourneyStep].title} — {journeySteps[activeJourneyStep].desc}
              </h4>
              <p className="text-xs text-zinc-400 max-w-3xl leading-relaxed">
                {journeySteps[activeJourneyStep].detail}
              </p>
            </div>
            <button
              type="button"
              onClick={() => openAuth('auth')}
              className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0"
            >
              Start Experience →
            </button>
          </div>
        </div>
      </section>

      {/* 3. FARMER SECTION: BUILT FOR THE PEOPLE WHO GROW IT */}
      <section id="farmers" className="py-24 border-t border-white/[0.06] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Narrative */}
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                <Sprout className="w-3.5 h-3.5" />
                <span>FOR GROWERS & PRODUCERS</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Built for the people who grow it.
              </h2>

              <p className="text-sm text-zinc-400 leading-relaxed">
                Direct market access with guaranteed transparency. Farm2Home equips farmers with real-time demand forecasts, automated crop-cycle planning, micro-climate weather advisories, and direct customer relationships with 0% middleman deduction.
              </p>

              {/* Core Farmer Highlights List */}
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Crop Planning & Harvest Timing</h4>
                    <p className="text-xs text-zinc-400">Plan seed-to-harvest cycles with regional crop calendars for Andhra & Telangana.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Inventory Intelligence</h4>
                    <p className="text-xs text-zinc-400">Manage real-time inventory with unit-level precision across kg, quintal, and crate.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Direct Market Analytics</h4>
                    <p className="text-xs text-zinc-400">Live price realization curves without commission cuts or delayed mandi payments.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">AI Agronomist Grounding</h4>
                    <p className="text-xs text-zinc-400">24/7 localized crop pathology, soil enrichment, and weather risk guidance.</p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => openAuth('auth', 'farmer')}
                  className="px-6 py-3 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>Join as Farmer</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right: Dashboard-Inspired Architectural UI Preview */}
            <div className="lg:col-span-7">
              <div className="bg-[#0e1117] border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden space-y-5">
                {/* Dashboard Header Bar */}
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
                      SD
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">Saraswathi Devi</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          VERIFIED PRODUCER
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">Green Organic Orchards · Chittoor, AP</p>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-xs font-bold text-white">₹42,850</span>
                    <p className="text-[10px] text-emerald-400">0% Commission Cut</p>
                  </div>
                </div>

                {/* Dashboard Metrics Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-[#131720] border border-white/[0.06] rounded-xl">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">ACTIVE CROPS</span>
                    <p className="text-base font-bold text-white mt-1">4 Plots</p>
                    <p className="text-[10px] text-emerald-400 mt-0.5">Mango, Paddy, Palak</p>
                  </div>
                  <div className="p-3 bg-[#131720] border border-white/[0.06] rounded-xl">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">BATCH INVENTORY</span>
                    <p className="text-base font-bold text-white mt-1">415 kg</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Synchronized live</p>
                  </div>
                  <div className="p-3 bg-[#131720] border border-white/[0.06] rounded-xl">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">DISPATCH STATUS</span>
                    <p className="text-base font-bold text-emerald-400 mt-1">Ready</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Transit allocated</p>
                  </div>
                </div>

                {/* Active Harvest Inventory Table Preview */}
                <div className="border border-white/[0.06] rounded-xl overflow-hidden">
                  <div className="bg-[#131720] px-3.5 py-2 border-b border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-zinc-400">
                    <span>LIVE HARVEST BATCHES</span>
                    <span>PRICE / UNIT</span>
                  </div>
                  <div className="divide-y divide-white/[0.06] bg-[#0c0e13]">
                    <div className="px-3.5 py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-white">Banganapalli Mangoes</span>
                        <span className="text-zinc-500 text-[10px] ml-2">Export Grade A · 45 kg left</span>
                      </div>
                      <span className="font-mono text-emerald-400 font-bold">₹140 / kg</span>
                    </div>
                    <div className="px-3.5 py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-white">Organic Country Tomatoes</span>
                        <span className="text-zinc-500 text-[10px] ml-2">Vine Harvested · 120 kg left</span>
                      </div>
                      <span className="font-mono text-emerald-400 font-bold">₹36 / kg</span>
                    </div>
                    <div className="px-3.5 py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-white">Aged Sona Masoori Rice</span>
                        <span className="text-zinc-500 text-[10px] ml-2">12 Month Aged · 250 kg left</span>
                      </div>
                      <span className="font-mono text-emerald-400 font-bold">₹78 / kg</span>
                    </div>
                  </div>
                </div>

                {/* Weather Advisory Snippet */}
                <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <CloudSun className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-bold text-emerald-300">Chittoor Region Advisory</span>
                      <p className="text-[11px] text-zinc-400">Clear morning conditions optimal for dawn mango picking.</p>
                    </div>
                  </div>
                  <span className="font-mono text-emerald-400 text-xs">28°C · 64% RH</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CUSTOMER SECTION: KNOW WHAT YOU'RE BUYING */}
      <section id="marketplace" className="py-24 border-t border-white/[0.06] relative bg-[#09090b]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div className="max-w-2xl space-y-3">
              <div className="text-[11px] font-mono text-emerald-400 tracking-wider uppercase">
                CONSUMER INTELLIGENCE & FRESHNESS
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Know what you're buying.
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Direct traceability for every item. Transparent harvest timestamps, verified grower locations, and real-time inventory counts straight from regional agricultural clusters.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleExploreAction}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Browse Full Catalog</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Real Products Live Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {previewProducts.map((product: any) => (
              <div
                key={product.id}
                className="bg-[#0e1117] border border-white/[0.08] hover:border-emerald-500/40 rounded-2xl overflow-hidden transition-all duration-200 group flex flex-col justify-between"
              >
                <div>
                  {/* Product Visual Container with Fallback */}
                  <div className="relative h-44 w-full bg-[#141820] overflow-hidden">
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        // Fallback gradient if external url fails
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    {/* Fallback styling overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0e1117] via-transparent to-transparent opacity-90" />

                    {/* Organic Badge */}
                    {product.is_organic && (
                      <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-emerald-500/90 text-zinc-950 font-bold text-[10px] tracking-wide flex items-center gap-1 shadow-md">
                        <BadgeCheck className="w-3 h-3" />
                        <span>ORGANIC</span>
                      </div>
                    )}

                    {/* Freshness / Stock Badge */}
                    <div className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-emerald-400 font-mono text-[10px]">
                      {product.stock > 0 ? `${product.stock} ${product.unit} left` : 'Out of Stock'}
                    </div>

                    {/* Harvest Date Tag */}
                    <div className="absolute bottom-2 left-3 text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-400" />
                      <span>Harvested 5:00 AM Today</span>
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="p-4 space-y-2">
                    <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                      {product.title}
                    </h3>
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>

                    {/* Farmer Attribution */}
                    <div className="pt-2 flex items-center gap-2 text-[11px] text-zinc-400 border-t border-white/[0.06]">
                      <Sprout className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">
                        {product.farmer_name} · {product.farmer_location}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="p-4 pt-0 flex items-center justify-between">
                  <div className="font-mono">
                    <span className="text-base font-extrabold text-white">₹{product.price}</span>
                    <span className="text-xs text-zinc-500"> / {product.unit}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openAuth('auth')}
                    className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Add to Basket
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Transparency Guarantees Grid */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-[#0e1117] border border-white/[0.06] rounded-xl">
              <span className="font-mono text-emerald-400 text-xs font-bold block mb-1">0% CHEMICAL RESIDUES</span>
              <span className="text-xs text-zinc-400">Regular organic testing on verified batches</span>
            </div>
            <div className="p-4 bg-[#0e1117] border border-white/[0.06] rounded-xl">
              <span className="font-mono text-emerald-400 text-xs font-bold block mb-1">6-DIGIT OTP HANDOFF</span>
              <span className="text-xs text-zinc-400">Cryptographically verified delivery signoff</span>
            </div>
            <div className="p-4 bg-[#0e1117] border border-white/[0.06] rounded-xl">
              <span className="font-mono text-emerald-400 text-xs font-bold block mb-1">PROVENANCE LOGS</span>
              <span className="text-xs text-zinc-400">Inspect exact harvest field coordinates</span>
            </div>
            <div className="p-4 bg-[#0e1117] border border-white/[0.06] rounded-xl">
              <span className="font-mono text-emerald-400 text-xs font-bold block mb-1">ZERO EXCESS MARKUP</span>
              <span className="text-xs text-zinc-400">Direct farm gate pricing passed to customers</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. DELIVERY SECTION: EVERY ORDER HAS A PATH */}
      <section id="delivery" className="py-24 border-t border-white/[0.06] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left: Route Telemetry Visualization */}
            <div className="lg:col-span-7 order-2 lg:order-1">
              <div className="bg-[#0e1117] border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-6">
                {/* Consignment Header */}
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">CONSIGNMENT #F2H-8921</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          IN TRANSIT
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">Cold Chain Active · Target ETA: 42 mins</p>
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <span className="text-emerald-400 font-bold">4.2°C</span>
                    <p className="text-[10px] text-zinc-500">Cabin Temp</p>
                  </div>
                </div>

                {/* Abstract Visual Route Path */}
                <div className="space-y-4">
                  <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                    TRANSIT WAYPOINTS
                  </div>

                  <div className="space-y-3 relative pl-6 border-l border-white/[0.12] ml-3">
                    <div className="relative">
                      <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-emerald-500/20 border-2 border-emerald-400" />
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs font-bold text-white">Farm Origin · Chittoor Cluster</span>
                        <span className="font-mono text-[10px] text-zinc-500">06:15 AM · Picked</span>
                      </div>
                      <p className="text-[11px] text-zinc-400">Batch #SD-39 loaded from Green Organic Orchards</p>
                    </div>

                    <div className="relative">
                      <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-cyan-500/20 border-2 border-cyan-400 animate-pulse" />
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs font-bold text-white">Regional Transit Corridor</span>
                        <span className="font-mono text-[10px] text-cyan-400">In Transit · 48 km/h</span>
                      </div>
                      <p className="text-[11px] text-zinc-400">NH-44 Express transit corridor, temperature controlled</p>
                    </div>

                    <div className="relative">
                      <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-zinc-700 border-2 border-zinc-500" />
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs font-bold text-zinc-400">Customer Doorstep · Hyderabad</span>
                        <span className="font-mono text-[10px] text-zinc-500">ETA 08:30 AM</span>
                      </div>
                      <p className="text-[11px] text-zinc-500">Pending 6-Digit OTP Handover Verification</p>
                    </div>
                  </div>
                </div>

                {/* Driver Benefits Summary */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="p-3 bg-[#131720] border border-white/[0.06] rounded-xl text-center">
                    <span className="text-[10px] font-mono text-zinc-400 block">OPTIMIZED PATHS</span>
                    <span className="text-xs font-bold text-white mt-1 block">Zero Backhauls</span>
                  </div>
                  <div className="p-3 bg-[#131720] border border-white/[0.06] rounded-xl text-center">
                    <span className="text-[10px] font-mono text-zinc-400 block">INSTANT PAYOUTS</span>
                    <span className="text-xs font-bold text-emerald-400 mt-1 block">Direct UPI</span>
                  </div>
                  <div className="p-3 bg-[#131720] border border-white/[0.06] rounded-xl text-center">
                    <span className="text-[10px] font-mono text-zinc-400 block">OTP PROTOCOL</span>
                    <span className="text-xs font-bold text-white mt-1 block">100% Verified</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Narrative */}
            <div className="lg:col-span-5 space-y-6 order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono">
                <Truck className="w-3.5 h-3.5" />
                <span>INTELLIGENT TRANSIT FLEET</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Every order has a path.
              </h2>

              <p className="text-sm text-zinc-400 leading-relaxed">
                Empowering transit partners with structured consignments, verified handoffs, and real-time navigation. Every delivery is protected by two-party 6-digit OTP verification, eliminating delivery disputes and ensuring immediate automated payouts.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-md bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Assigned Consignments & Manifests</h4>
                    <p className="text-xs text-zinc-400">Pre-batched multi-drop routes optimized for cold-chain preservation.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-md bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Cryptographic OTP Handoff</h4>
                    <p className="text-xs text-zinc-400">Cryptographically secure handoff codes eliminate false delivery claims.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-md bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Earnings Transparency</h4>
                    <p className="text-xs text-zinc-400">Fixed rate cards and direct settlement upon OTP verification.</p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => openAuth('auth', 'delivery')}
                  className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>Deliver with Farm2Home</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. AI AGRONOMIST SECTION: INTELLIGENCE FOR EVERY HARVEST */}
      <section id="agronomist" className="py-24 border-t border-white/[0.06] relative bg-[#09090b]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center space-y-3 mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
              <Bot className="w-3.5 h-3.5" />
              <span>FIELD-LEVEL AGRICULTURAL REASONING</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Intelligence for every harvest.
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed text-balance">
              Localized agricultural assistance grounded in regional weather patterns, soil diagnostics, and multi-crop planning. Safe, organic-first practices without chemical overuse.
            </p>
          </div>

          {/* Floating AI Agronomist Interactive Mockup */}
          <div className="max-w-4xl mx-auto bg-[#0e1117] border border-emerald-500/30 rounded-2xl shadow-2xl shadow-emerald-950/20 overflow-hidden">
            {/* Chat Window Header */}
            <div className="bg-[#131720] px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    Farm2Home AI Agronomist
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      GROUNDED
                    </span>
                  </h4>
                  <p className="text-[10px] text-zinc-400 font-mono">
                    Context: Chittoor Micro-Cluster · Tomato & Mango Orchards
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>READY</span>
              </div>
            </div>

            {/* Chat Body Simulation */}
            <div className="p-6 space-y-4 font-sans text-xs">
              {/* Farmer Message */}
              <div className="flex items-start gap-3 justify-end">
                <div className="bg-[#181d28] border border-white/10 rounded-2xl rounded-tr-sm p-4 text-zinc-200 max-w-lg leading-relaxed">
                  <span className="text-[10px] font-mono text-zinc-400 block mb-1">Ramesh Reddy (Farmer · Chittoor)</span>
                  Tomato crop showing early leaf yellowing and brown concentric rings after the continuous rainfall yesterday. What should I inspect first?
                </div>
                <div className="w-7 h-7 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-400 text-xs font-bold shrink-0">
                  RR
                </div>
              </div>

              {/* AI Agronomist Response */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-xs font-bold shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-[#11141c] border border-emerald-500/25 rounded-2xl rounded-tl-sm p-4 text-zinc-200 max-w-xl space-y-2 leading-relaxed">
                  <span className="text-[10px] font-mono text-emerald-400 block">AI Agronomist (Diagnostic Guidance)</span>
                  <p>
                    Continuous rainfall with ambient temperatures around 28°C frequently triggers <strong>Early Blight (Alternaria solani)</strong> or localized root zone nitrogen leaching.
                  </p>
                  <div className="bg-[#090b0e] p-3 rounded-xl border border-white/[0.06] space-y-1.5 text-zinc-300">
                    <p className="font-semibold text-white">Recommended Immediate Actions:</p>
                    <p>1. <strong>Field Drainage:</strong> Clear standing water from trenches to prevent root asphyxiation.</p>
                    <p>2. <strong>Foliar Inspection:</strong> Check lower canopy leaves for target-like concentric rings.</p>
                    <p>3. <strong>Natural Treatment:</strong> Spray cold-pressed 5% Neem Seed Kernel Extract (NSKE) or copper-free bio-fungicide (Trichoderma viride) during dry evening hours.</p>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    Grounding: Telangana/AP Kharif horticulture advisory schedule · Non-chemical organic preference.
                  </p>
                </div>
              </div>
            </div>

            {/* AI Capability Tags Footer */}
            <div className="bg-[#121620] px-6 py-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-zinc-400">
              <div className="flex items-center gap-4">
                <span>✓ MULTILINGUAL NLP</span>
                <span>✓ WEATHER-AWARE</span>
                <span>✓ CROP-PLAN CONTEXT</span>
                <span>✓ SAFE DOSING</span>
              </div>
              <button
                type="button"
                onClick={() => openAuth('auth')}
                className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors cursor-pointer"
              >
                Consult Agronomist in Telugu, Hindi or English →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 7. TRUST / SYSTEM TELEMETRY MATRIX */}
      <section className="py-20 border-t border-white/[0.06] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-[11px] font-mono text-emerald-400 tracking-wider uppercase mb-8 text-center">
            PLATFORM CAPABILITIES & SYSTEM ARCHITECTURE
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-4 bg-[#0e1117] border border-white/[0.06] rounded-xl text-center space-y-1">
              <span className="font-mono text-xs font-bold text-white block">REAL-TIME INVENTORY</span>
              <p className="text-[10px] text-zinc-400">Continuous stock synchronization across farm clusters</p>
            </div>

            <div className="p-4 bg-[#0e1117] border border-white/[0.06] rounded-xl text-center space-y-1">
              <span className="font-mono text-xs font-bold text-white block">ROLE-AWARE ACCESS</span>
              <p className="text-[10px] text-zinc-400">Distinct workspaces for Farmers, Customers & Fleets</p>
            </div>

            <div className="p-4 bg-[#0e1117] border border-white/[0.06] rounded-xl text-center space-y-1">
              <span className="font-mono text-xs font-bold text-white block">TRACEABLE ORDERS</span>
              <p className="text-[10px] text-zinc-400">Provenance tracking from harvest to doorstep</p>
            </div>

            <div className="p-4 bg-[#0e1117] border border-white/[0.06] rounded-xl text-center space-y-1">
              <span className="font-mono text-xs font-bold text-white block">AI-ASSISTED AGRONOMY</span>
              <p className="text-[10px] text-zinc-400">Grounded crop plans with localized micro-climate data</p>
            </div>

            <div className="p-4 bg-[#0e1117] border border-white/[0.06] rounded-xl text-center space-y-1">
              <span className="font-mono text-xs font-bold text-white block">MULTILINGUAL</span>
              <p className="text-[10px] text-zinc-400">Native support for Telugu, Hindi, Tamil & English</p>
            </div>

            <div className="p-4 bg-[#0e1117] border border-white/[0.06] rounded-xl text-center space-y-1">
              <span className="font-mono text-xs font-bold text-white block">SECURE SESSIONS</span>
              <p className="text-[10px] text-zinc-400">Google OAuth, Phone OTP & Passkeys integration</p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FINAL CINEMATIC FULL-WIDTH CTA SECTION */}
      <section className="py-24 border-t border-white/[0.06] relative overflow-hidden bg-gradient-to-b from-[#0c1017] to-[#09090b]">
        {/* Glow halo */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-500/[0.08] blur-[140px] rounded-full" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-7 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-emerald-500/30 text-emerald-400 text-xs font-mono">
            <span>FARM2HOME AGRI-TECH ECOSYSTEM</span>
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Grow smarter.<br />
            Deliver better.<br />
            <span className="text-emerald-400">Live fresher.</span>
          </h2>

          <p className="text-base text-zinc-300 max-w-xl mx-auto leading-relaxed">
            One intelligent platform connecting the agricultural journey from harvest to home.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleExploreAction}
              className="px-6 py-3.5 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <span>Explore Farm2Home</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => openAuth('auth')}
              className="px-6 py-3.5 bg-[#141820] hover:bg-[#1a202c] border border-white/10 hover:border-white/20 text-white font-semibold text-xs rounded-xl transition-all cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* 9. MINIMAL PREMIUM FOOTER */}
      <footer className="border-t border-white/[0.06] py-12 bg-[#09090b]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Brand Wordmark & Tag */}
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Sprout className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <span className="text-sm font-bold tracking-tight text-white">
                Farm<span className="text-emerald-400">2</span>Home
              </span>
              <span className="text-xs text-zinc-500 ml-2">
                · Direct Agricultural Infrastructure
              </span>
            </div>

            {/* Navigation links */}
            <div className="flex flex-wrap items-center gap-6 text-xs text-zinc-400">
              <a href="#marketplace" className="hover:text-white transition-colors">Marketplace</a>
              <a href="#farmers" className="hover:text-white transition-colors">Farmers</a>
              <a href="#delivery" className="hover:text-white transition-colors">Delivery</a>
              <a href="#agronomist" className="hover:text-white transition-colors">AI Agronomist</a>
              <button
                type="button"
                onClick={() => openAuth('auth')}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Sign In
              </button>
            </div>

            {/* Language Selector in Footer */}
            <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Network Active</span>
              <span className="text-zinc-600">·</span>
              <span>© {new Date().getFullYear()} Farm2Home</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Internal Auth Modal Instance (Preserving All Auth Providers) */}
      <AuthModal
        isOpen={internalAuthModalOpen}
        onClose={() => setInternalAuthModalOpen(false)}
        currentProfile={null}
        initialMode={internalAuthMode}
        onAuthSuccess={(profile, userOrToken) => {
          setInternalAuthModalOpen(false);
          onAuthSuccess(profile, typeof userOrToken === 'string' ? userOrToken : (userOrToken as any)?.sessionToken || '');
        }}
        language={language}
      />
    </div>
  );
};
