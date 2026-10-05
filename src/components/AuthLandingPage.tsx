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
  Eye,
  EyeOff,
  User,
  ShoppingBag,
  Sparkles,
  RefreshCw,
  X,
} from 'lucide-react';
import { Language, UserRole, Profile } from '../types.js';
import { getTranslation, interpolate } from '../lib/translations.js';
import { api } from '../lib/api.js';
import {
  getGoogleClientId,
  ensureGoogleIdentityInitialized,
  renderGoogleSignInButton,
  addGoogleCredentialListener,
} from '../lib/googleIdentity.js';

interface AuthLandingPageProps {
  language: Language;
  onSelectLanguage: (lang: Language) => void;
  onAuthSuccess: (profile: Profile, token: string) => void;
  availableProducts?: any[];
}

type AuthView = 'signin' | 'signup' | 'phone' | 'passkey';

export const AuthLandingPage: React.FC<AuthLandingPageProps> = ({
  language,
  onSelectLanguage,
  onAuthSuccess,
}) => {
  const t = getTranslation(language);

  // Active View State
  const [view, setView] = useState<AuthView>('signin');

  // Sign In & Sign Up Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('customer');

  // Phone OTP States
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpTicket, setOtpTicket] = useState('');
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [otpStep, setOtpStep] = useState<'request' | 'verify'>('request');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Status & UI States
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDevPersonas, setShowDevPersonas] = useState(false);

  // Google button DOM container reference
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Google Sign-In Credential Listener and Button Rendering
  useEffect(() => {
    const unregister = addGoogleCredentialListener(async (response) => {
      if (!response?.credential) return;
      setLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      try {
        const res = await api.loginGoogle({
          credential: response.credential,
          role: selectedRole,
        });
        if (res.profile && res.sessionToken) {
          onAuthSuccess(res.profile, res.sessionToken);
        } else {
          setErrorMessage('Failed to sign in with Google');
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Google authentication failed');
      } finally {
        setLoading(false);
      }
    });

    if (googleBtnRef.current) {
      renderGoogleSignInButton(googleBtnRef.current, { theme: 'filled_black', width: 380 });
    }

    return () => {
      unregister();
    };
  }, [selectedRole]);

  // Reset errors on view switch
  const switchView = (nextView: AuthView) => {
    setView(nextView);
    setErrorMessage(null);
    setSuccessMessage(null);
    if (nextView === 'phone') {
      setOtpStep('request');
      setOtpCode('');
    }
  };

  // Resend OTP countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // 1. Email & Password Sign In
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMessage(t.auth.phoneRequiredError || 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.loginEmail({
        email: cleanEmail,
        password,
      });
      if (res.profile && res.sessionToken) {
        onAuthSuccess(res.profile, res.sessionToken);
      } else {
        setErrorMessage(t.auth.invalidCredentials);
      }
    } catch (err: any) {
      setErrorMessage(err.message || t.auth.invalidCredentials);
    } finally {
      setLoading(false);
    }
  };

  // 2. Email & Password Sign Up
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage(t.auth.passwordMinLength);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage(t.auth.passwordMismatch);
      return;
    }

    setLoading(true);
    try {
      const res = await api.registerEmail({
        email: cleanEmail,
        password,
        fullName: cleanName,
        role: selectedRole,
        preferredLanguage: language,
        location: selectedRole === 'farmer' ? 'Andhra & Telangana Agri Region' : 'Hyderabad Metro Zone',
        farmName: selectedRole === 'farmer' ? 'Green Organic Acres' : undefined,
      });

      if (res.profile && res.sessionToken) {
        onAuthSuccess(res.profile, res.sessionToken);
      } else {
        setErrorMessage('Failed to create account. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during account creation.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Google Sign-In Fallback Handler
  const handleGoogleSignInFallback = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const clientId = getGoogleClientId();
    if (!clientId) {
      setErrorMessage(
        'Google Sign-In is not configured. Missing VITE_GOOGLE_CLIENT_ID in environment variables. Please configure your Google OAuth 2.0 Web Client ID to enable Google authentication.'
      );
      return;
    }
    setLoading(true);
    try {
      const initialized = await ensureGoogleIdentityInitialized();
      if (!initialized) {
        setErrorMessage('Google Sign-In service is temporarily unavailable. Please retry.');
        return;
      }
      if (googleBtnRef.current) {
        await renderGoogleSignInButton(googleBtnRef.current, { theme: 'filled_black', width: 380 });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Google authentication failed');
    } finally {
      setLoading(false);
    }
  };

  // 4. Phone OTP: Step 1 (Request OTP)
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage(t.auth.validPhoneError);
      return;
    }

    setLoading(true);
    try {
      const res = await api.sendPhoneOtp(phone.trim());
      setOtpTicket(res.ticket);
      setDevOtpHint(res.devOtp || null);
      setOtpStep('verify');
      setResendCooldown(60);
      setSuccessMessage(`${t.auth.weSentCode} +91 ${cleanPhone.slice(-10)}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to dispatch verification code');
    } finally {
      setLoading(false);
    }
  };

  // 4. Phone OTP: Step 2 (Verify OTP)
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanOtp = otpCode.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setErrorMessage(t.auth.invalidOtpError);
      return;
    }

    setLoading(true);
    try {
      const res = await api.verifyPhoneOtp({
        phone: phone.trim(),
        ticket: otpTicket,
        otp: cleanOtp,
        fullName: fullName.trim() || undefined,
        role: selectedRole,
        preferredLanguage: language,
        location: 'Hyderabad Metro Zone',
      });

      if (res.profile && res.sessionToken) {
        onAuthSuccess(res.profile, res.sessionToken);
      } else {
        setErrorMessage(t.auth.invalidOtpError);
      }
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('expired')) {
        setErrorMessage(t.auth.otpExpired);
      } else if (msg.includes('Too many') || msg.includes('rate')) {
        setErrorMessage(t.auth.rateLimitedError);
      } else {
        setErrorMessage(t.auth.invalidOtpError);
      }
    } finally {
      setLoading(false);
    }
  };

  // 5. Passkey / WebAuthn
  const handlePasskeyAuth = async () => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (typeof window === 'undefined' || !window.PublicKeyCredential) {
        setErrorMessage(
          'Passkeys / WebAuthn are not supported by your current browser or device. Please sign in with Email & Password, Phone OTP, or a Test Persona.'
        );
        return;
      }

      const challengeRes = await api.getPasskeyChallenge();
      const rawChallenge = Uint8Array.from(
        atob(challengeRes.challenge.replace(/-/g, '+').replace(/_/g, '/')),
        (c) => c.charCodeAt(0)
      );

      let assertion: any;
      try {
        assertion = await navigator.credentials.get({
          publicKey: {
            challenge: rawChallenge,
            timeout: 60000,
            userVerification: 'preferred',
            rpId: window.location.hostname,
          },
        });
      } catch (navErr: any) {
        if (navErr.name === 'NotAllowedError') {
          setErrorMessage('Passkey interaction was cancelled.');
        } else {
          setErrorMessage(
            navErr.message ||
              'No passkey found for Farm2Home on this device. Please sign in with Email or Phone first, then register your passkey in Account Settings.'
          );
        }
        return;
      }

      if (!assertion) {
        setErrorMessage('Passkey interaction was cancelled.');
        return;
      }

      const loginRes = await api.loginPasskey({
        challenge: challengeRes.challenge,
        credential: { id: assertion.id },
      });

      if (loginRes.profile && loginRes.sessionToken) {
        onAuthSuccess(loginRes.profile, loginRes.sessionToken);
      } else {
        setErrorMessage(t.auth.passkeyNotSupported);
      }
    } catch (err: any) {
      setErrorMessage(
        err.message?.includes('not recognized')
          ? 'No registered account found for this passkey. Please sign up or sign in with email/phone first.'
          : err.message || t.auth.passkeyNotSupported
      );
    } finally {
      setLoading(false);
    }
  };

  // 6. Test Persona Quick Login
  const handlePersonaLogin = async (personaId: string) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.devLogin(personaId);
      if (res.profile && res.sessionToken) {
        onAuthSuccess(res.profile, res.sessionToken);
      }
    } catch (err: any) {
      setErrorMessage(err.message || t.common.somethingWentWrong);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-300 relative overflow-hidden font-sans">
      {/* Background Architectural Lighting & Agri-Grid Texture */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.035] -z-10"
        style={{
          backgroundImage: `radial-gradient(#10b981 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />
      <div className="pointer-events-none fixed -top-32 left-1/4 w-[600px] h-[600px] bg-emerald-500/[0.03] blur-[150px] rounded-full -z-10" />
      <div className="pointer-events-none fixed bottom-0 right-10 w-[500px] h-[500px] bg-teal-500/[0.025] blur-[140px] rounded-full -z-10" />

      {/* TOP HEADER: Clean Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#09090b]/85 border-b border-white/[0.06] backdrop-blur-xl px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
              <Sprout className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-black tracking-tight text-white flex items-center">
                Farm<span className="text-emerald-400">2</span>Home
              </span>
              <span className="hidden sm:inline text-[11px] text-zinc-500 font-medium">
                · {t.landing.headline}
              </span>
            </div>
          </div>

          {/* Right Controls: Telemetry indicator & Language Selector */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Live Network Status Indicator */}
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/[0.02] border border-white/[0.06] text-[11px] font-mono text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-zinc-300">Live Agri Grid</span>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-500">0% Middleman</span>
            </div>

            {/* Language Selector */}
            <div className="relative flex items-center">
              <Languages className="w-3.5 h-3.5 absolute left-2.5 text-zinc-400 pointer-events-none" />
              <select
                value={language}
                onChange={(e) => onSelectLanguage(e.target.value as Language)}
                aria-label={t.header.selectLanguage}
                className="pl-7 pr-3 py-1.5 bg-[#121418] hover:bg-[#181b20] border border-white/[0.08] focus:border-emerald-500/50 rounded-xl text-xs font-semibold text-zinc-200 focus:outline-none cursor-pointer transition-colors"
              >
                <option value="en" className="bg-[#09090b] text-white">English</option>
                <option value="te" className="bg-[#09090b] text-white">తెలుగు (Telugu)</option>
                <option value="hi" className="bg-[#09090b] text-white">हिन्दी (Hindi)</option>
                <option value="ta" className="bg-[#09090b] text-white">தமிழ் (Tamil)</option>
              </select>
            </div>

            {/* Developer Test Personas Toggle (Discreet, internal testing) */}
            <button
              onClick={() => setShowDevPersonas((prev) => !prev)}
              type="button"
              className="px-2.5 py-1.5 bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 rounded-xl text-[11px] font-mono text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer flex items-center gap-1.5"
              title="Development Testing Personas"
            >
              <User className="w-3.5 h-3.5 text-emerald-400/80" />
              <span className="hidden sm:inline">Sandbox</span>
            </button>
          </div>
        </div>
      </header>

      {/* Discreet Developer Sandbox Drawer */}
      <AnimatePresence>
        {showDevPersonas && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#10131a] border-b border-emerald-500/20 px-4 sm:px-8 py-3.5 z-20"
          >
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-400 font-mono">
                    {t.auth.devSandboxTitle}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    · {t.auth.devSandboxNote}
                  </span>
                </div>
                <button
                  onClick={() => setShowDevPersonas(false)}
                  className="text-xs text-zinc-500 hover:text-white p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => handlePersonaLogin('usr_rahul_customer')}
                  disabled={loading}
                  className="p-2.5 bg-[#161a22] hover:bg-emerald-950/20 border border-white/10 hover:border-emerald-500/40 rounded-xl text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-bold text-white group-hover:text-emerald-300">Rahul Verma</span>
                    <span className="text-[9px] font-mono text-emerald-400">Customer</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 truncate">Hitech City · Ready Cart</p>
                </button>

                <button
                  type="button"
                  onClick={() => handlePersonaLogin('usr_ramesh_farmer')}
                  disabled={loading}
                  className="p-2.5 bg-[#161a22] hover:bg-emerald-950/20 border border-white/10 hover:border-emerald-500/40 rounded-xl text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-bold text-white group-hover:text-emerald-300">Ramesh Kumar</span>
                    <span className="text-[9px] font-mono text-emerald-400">Farmer</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 truncate">Medak · Organic Farm</p>
                </button>

                <button
                  type="button"
                  onClick={() => handlePersonaLogin('usr_saraswathi_farmer')}
                  disabled={loading}
                  className="p-2.5 bg-[#161a22] hover:bg-emerald-950/20 border border-white/10 hover:border-emerald-500/40 rounded-xl text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-bold text-white group-hover:text-emerald-300">Saraswathi Devi</span>
                    <span className="text-[9px] font-mono text-emerald-400">Farmer</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 truncate">Chittoor · Orchards</p>
                </button>

                <button
                  type="button"
                  onClick={() => handlePersonaLogin('usr_vikram_delivery')}
                  disabled={loading}
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

      {/* MAIN TWO-COLUMN BALANCED DESKTOP EXPERIENCE */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-12 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* LEFT SIDE: Restrained Farm2Home Visual / Journey Area */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-3">
              {/* Brand mark */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Direct Agricultural Infrastructure</span>
              </div>

              {/* Tagline */}
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                From Farm to Home,<br />
                <span className="text-emerald-400">Smarter.</span>
              </h1>

              <p className="text-sm text-zinc-400 leading-relaxed max-w-md">
                Connecting growers, conscious consumers, and temperature-controlled transit across Andhra & Telangana. 0% middleman deduction.
              </p>
            </div>

            {/* Farm2Home Journey Flow: Farm → Marketplace → Delivery → Home */}
            <div className="bg-[#0f1115]/90 border border-white/[0.07] rounded-2xl p-4 sm:p-5 shadow-lg space-y-3.5">
              <div className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <span>The Direct Supply Journey</span>
                <span className="h-px flex-1 bg-white/[0.08]" />
              </div>

              <div className="grid grid-cols-4 gap-2 text-center relative">
                {/* Step 1: Farm */}
                <div className="space-y-1.5">
                  <div className="w-9 h-9 mx-auto rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm">
                    🌾
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{t.auth.journeyFarm}</p>
                    <p className="text-[10px] text-zinc-500 leading-tight mt-0.5 hidden sm:block">
                      Dawn harvest
                    </p>
                  </div>
                </div>

                {/* Step 2: Marketplace */}
                <div className="space-y-1.5">
                  <div className="w-9 h-9 mx-auto rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 text-sm">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{t.auth.journeyMarketplace}</p>
                    <p className="text-[10px] text-zinc-500 leading-tight mt-0.5 hidden sm:block">
                      Fair pricing
                    </p>
                  </div>
                </div>

                {/* Step 3: Delivery */}
                <div className="space-y-1.5">
                  <div className="w-9 h-9 mx-auto rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-sm">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{t.auth.journeyDelivery}</p>
                    <p className="text-[10px] text-zinc-500 leading-tight mt-0.5 hidden sm:block">
                      Cold chain
                    </p>
                  </div>
                </div>

                {/* Step 4: Home */}
                <div className="space-y-1.5">
                  <div className="w-9 h-9 mx-auto rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-sm">
                    <Home className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{t.auth.journeyHome}</p>
                    <p className="text-[10px] text-zinc-500 leading-tight mt-0.5 hidden sm:block">
                      6-digit OTP
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Subtle verification guarantees */}
            <div className="flex items-center gap-5 text-xs text-zinc-400 pt-1">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verified Producers</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>6-Digit Handover</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>AI Agronomy</span>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Main Authentication Card */}
          <div className="lg:col-span-6">
            <div className="bg-[#0f1115]/95 border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80 backdrop-blur-xl relative">
              
              {/* Alert Banners */}
              {errorMessage && (
                <div
                  role="alert"
                  className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span className="leading-relaxed flex-1">{errorMessage}</span>
                  <button
                    onClick={() => setErrorMessage(null)}
                    className="text-rose-400 hover:text-white text-xs p-0.5"
                    aria-label="Dismiss error"
                  >
                    ✕
                  </button>
                </div>
              )}

              {successMessage && (
                <div
                  role="status"
                  className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-2.5 animate-fadeIn"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  <span className="leading-relaxed flex-1">{successMessage}</span>
                  <button
                    onClick={() => setSuccessMessage(null)}
                    className="text-emerald-400 hover:text-white text-xs p-0.5"
                    aria-label="Dismiss message"
                  >
                    ✕
                  </button>
                </div>
              )}

              <AnimatePresence mode="wait">
                {/* 1. SIGN IN VIEW (DEFAULT) */}
                {view === 'signin' && (
                  <motion.div
                    key="signin"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.16 }}
                    className="space-y-5"
                  >
                    {/* Header */}
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-white">
                        {t.auth.welcomeBack}
                      </h2>
                      <p className="text-xs text-zinc-400 mt-1">
                        {t.auth.signInToContinue}
                      </p>
                    </div>

                    {/* Primary Option 1: Google Continue */}
                    <div className="relative w-full group overflow-hidden rounded-xl">
                      <button
                        type="button"
                        onClick={handleGoogleSignInFallback}
                        disabled={loading}
                        className="w-full py-2.5 px-4 bg-[#141820] hover:bg-[#1a1f2c] border border-white/10 hover:border-emerald-500/30 rounded-xl text-xs font-semibold text-white transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-sm active:scale-[0.99]"
                      >
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                        <span>{t.auth.continueWithGoogle}</span>
                      </button>
                      <div
                        ref={googleBtnRef}
                        className="absolute inset-0 w-full h-full opacity-[0.0001] cursor-pointer z-10 flex items-center justify-center overflow-hidden [&_iframe]:w-full [&_iframe]:min-w-full [&_iframe]:min-h-full [&_iframe]:scale-125 pointer-events-auto"
                        title={t.auth.continueWithGoogle}
                      />
                    </div>

                    {/* Divider */}
                    <div className="relative flex items-center justify-center my-3">
                      <div className="w-full border-t border-white/[0.08]" />
                      <span className="absolute bg-[#0f1115] px-3 text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
                        {t.auth.orContinueWithEmail}
                      </span>
                    </div>

                    {/* Email & Password Form */}
                    <form onSubmit={handleEmailSignIn} className="space-y-3.5">
                      <div>
                        <label
                          htmlFor="signin-email"
                          className="text-xs font-semibold text-zinc-300 mb-1.5 block"
                        >
                          {t.auth.emailAddress}
                        </label>
                        <input
                          id="signin-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          required
                          autoComplete="email"
                          className="w-full px-3.5 py-2.5 bg-[#141820] border border-white/10 rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label
                            htmlFor="signin-password"
                            className="text-xs font-semibold text-zinc-300"
                          >
                            {t.auth.password}
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setErrorMessage(
                                'To reset your password, please contact Farm2Home support or sign in instantly with Phone OTP.'
                              )
                            }
                            className="text-[11px] text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer"
                          >
                            {t.auth.forgotPassword}
                          </button>
                        </div>
                        <div className="relative">
                          <input
                            id="signin-password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            required
                            autoComplete="current-password"
                            className="w-full pl-3.5 pr-10 py-2.5 bg-[#141820] border border-white/10 rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Primary Sign In Button */}
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-zinc-950 font-bold rounded-xl text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                        ) : (
                          <span>{t.auth.signIn}</span>
                        )}
                      </button>
                    </form>

                    {/* Secondary Actions (Phone OTP & Passkey) */}
                    <div className="pt-2 border-t border-white/[0.06] space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => switchView('phone')}
                          disabled={loading}
                          className="py-2 px-3 bg-[#141820] hover:bg-[#1b212c] border border-white/10 rounded-xl text-[11px] font-semibold text-zinc-300 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Phone OTP</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => switchView('passkey')}
                          disabled={loading}
                          className="py-2 px-3 bg-[#141820] hover:bg-[#1b212c] border border-white/10 rounded-xl text-[11px] font-semibold text-zinc-300 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Fingerprint className="w-3.5 h-3.5 text-amber-400" />
                          <span>Passkey</span>
                        </button>
                      </div>

                      {/* Toggle to Sign Up */}
                      <div className="text-center pt-2 text-xs text-zinc-400">
                        <span>{t.auth.newToFarm2Home} </span>
                        <button
                          type="button"
                          onClick={() => switchView('signup')}
                          className="text-emerald-400 hover:text-emerald-300 font-bold underline-offset-2 hover:underline cursor-pointer"
                        >
                          {t.auth.createAccountLink}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 2. SIGN UP VIEW (CREATE ACCOUNT) */}
                {view === 'signup' && (
                  <motion.div
                    key="signup"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.16 }}
                    className="space-y-4"
                  >
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-white">
                        {t.auth.createYourAccount}
                      </h2>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {t.auth.joinFarm2Home}
                      </p>
                    </div>

                    <form onSubmit={handleEmailSignUp} className="space-y-3">
                      <div>
                        <label
                          htmlFor="signup-name"
                          className="text-xs font-semibold text-zinc-300 mb-1 block"
                        >
                          {t.auth.fullName}
                        </label>
                        <input
                          id="signup-name"
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Ramesh Kumar"
                          required
                          autoComplete="name"
                          className="w-full px-3.5 py-2 bg-[#141820] border border-white/10 rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="signup-email"
                          className="text-xs font-semibold text-zinc-300 mb-1 block"
                        >
                          {t.auth.emailAddress}
                        </label>
                        <input
                          id="signup-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          required
                          autoComplete="email"
                          className="w-full px-3.5 py-2 bg-[#141820] border border-white/10 rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label
                            htmlFor="signup-password"
                            className="text-xs font-semibold text-zinc-300 mb-1 block"
                          >
                            {t.auth.password}
                          </label>
                          <div className="relative">
                            <input
                              id="signup-password"
                              type={showPassword ? 'text' : 'password'}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="Min 6 characters"
                              required
                              autoComplete="new-password"
                              className="w-full pl-3 pr-8 py-2 bg-[#141820] border border-white/10 rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              aria-label={showPassword ? 'Hide password' : 'Show password'}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                            >
                              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label
                            htmlFor="signup-confirm"
                            className="text-xs font-semibold text-zinc-300 mb-1 block"
                          >
                            {t.auth.confirmPassword}
                          </label>
                          <div className="relative">
                            <input
                              id="signup-confirm"
                              type={showConfirmPassword ? 'text' : 'password'}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Confirm password"
                              required
                              autoComplete="new-password"
                              className="w-full pl-3 pr-8 py-2 bg-[#141820] border border-white/10 rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                            >
                              {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* ROLE SELECTION: Clean Three-Option Selector */}
                      <div>
                        <span className="text-xs font-semibold text-zinc-300 mb-1.5 block">
                          {t.auth.selectRole}
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                          {/* Customer */}
                          <button
                            type="button"
                            onClick={() => setSelectedRole('customer')}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                              selectedRole === 'customer'
                                ? 'bg-emerald-500/15 border-emerald-500 text-white ring-1 ring-emerald-500/30'
                                : 'bg-[#141820] border-white/[0.08] text-zinc-400 hover:text-white'
                            }`}
                          >
                            <span className="text-base">🛒</span>
                            <span className="text-xs font-bold mt-1 block">Customer</span>
                            <span className="text-[10px] text-zinc-400 leading-tight block mt-0.5">
                              Buy fresh produce
                            </span>
                          </button>

                          {/* Farmer */}
                          <button
                            type="button"
                            onClick={() => setSelectedRole('farmer')}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                              selectedRole === 'farmer'
                                ? 'bg-emerald-500/15 border-emerald-500 text-white ring-1 ring-emerald-500/30'
                                : 'bg-[#141820] border-white/[0.08] text-zinc-400 hover:text-white'
                            }`}
                          >
                            <span className="text-base">🌾</span>
                            <span className="text-xs font-bold mt-1 block">Farmer</span>
                            <span className="text-[10px] text-zinc-400 leading-tight block mt-0.5">
                              Sell & manage harvest
                            </span>
                          </button>

                          {/* Delivery Partner */}
                          <button
                            type="button"
                            onClick={() => setSelectedRole('delivery')}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                              selectedRole === 'delivery'
                                ? 'bg-emerald-500/15 border-emerald-500 text-white ring-1 ring-emerald-500/30'
                                : 'bg-[#141820] border-white/[0.08] text-zinc-400 hover:text-white'
                            }`}
                          >
                            <span className="text-base">🚚</span>
                            <span className="text-xs font-bold mt-1 block">Delivery</span>
                            <span className="text-[10px] text-zinc-400 leading-tight block mt-0.5">
                              Deliver & transit jobs
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Primary Create Account Button */}
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-zinc-950 font-bold rounded-xl text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                        ) : (
                          <span>{t.auth.signUp}</span>
                        )}
                      </button>
                    </form>

                    {/* Toggle back to Sign In */}
                    <div className="text-center pt-2 border-t border-white/[0.06] text-xs text-zinc-400">
                      <span>{t.auth.alreadyHaveAccount} </span>
                      <button
                        type="button"
                        onClick={() => switchView('signin')}
                        className="text-emerald-400 hover:text-emerald-300 font-bold underline-offset-2 hover:underline cursor-pointer"
                      >
                        {t.auth.signIn}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* 3. PHONE OTP VIEW */}
                {view === 'phone' && (
                  <motion.div
                    key="phone"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.16 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                          <Phone className="w-4 h-4 text-emerald-400" />
                          <span>{otpStep === 'request' ? t.auth.otpStep1Title : t.auth.otpStep2Title}</span>
                        </h2>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {otpStep === 'request'
                            ? 'Instant verification with 6-digit code'
                            : `Code sent to +91 ${phone.replace(/\D/g, '').slice(-10)}`}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => switchView('signin')}
                        className="text-xs text-zinc-400 hover:text-white"
                      >
                        {t.auth.backToSignIn}
                      </button>
                    </div>

                    {otpStep === 'request' ? (
                      <form onSubmit={handleSendOtp} className="space-y-4">
                        <div>
                          <label
                            htmlFor="phone-number"
                            className="text-xs font-semibold text-zinc-300 mb-1.5 block"
                          >
                            {t.auth.mobileNumber}
                          </label>
                          <div className="relative flex items-center">
                            <span className="absolute left-3 text-xs font-mono font-bold text-zinc-400">
                              +91
                            </span>
                            <input
                              id="phone-number"
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="98765 43210"
                              required
                              autoFocus
                              className="w-full pl-12 pr-3.5 py-2.5 bg-[#141820] border border-white/10 rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-zinc-950 font-bold rounded-xl text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                          ) : (
                            <span>{t.auth.sendOtp}</span>
                          )}
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleVerifyOtp} className="space-y-4">
                        <div>
                          <label
                            htmlFor="otp-code"
                            className="text-xs font-semibold text-zinc-300 mb-1.5 block"
                          >
                            {t.auth.enterOtpCode}
                          </label>
                          <input
                            id="otp-code"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                            placeholder="••••••"
                            required
                            autoFocus
                            className="w-full text-center tracking-[0.5em] font-mono text-lg font-bold py-2.5 bg-[#141820] border border-emerald-500/40 rounded-xl text-emerald-400 focus:outline-none focus:border-emerald-500 transition-all"
                          />
                        </div>

                        {/* Development Sandbox OTP Display (clearly designated as test) */}
                        {devOtpHint && (
                          <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15 text-center">
                            <span className="text-[11px] text-zinc-400 font-mono">
                              Development Sandbox Code: <strong className="text-emerald-400">{devOtpHint}</strong>
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                          <button
                            type="button"
                            onClick={() => {
                              setOtpStep('request');
                              setOtpCode('');
                            }}
                            className="text-zinc-400 hover:text-white underline-offset-2 hover:underline"
                          >
                            {t.auth.changeNumber}
                          </button>

                          {resendCooldown > 0 ? (
                            <span className="font-mono text-zinc-500 text-[11px]">
                              {interpolate(t.auth.resendInSeconds, { seconds: resendCooldown })}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={handleSendOtp}
                              disabled={loading}
                              className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                            >
                              {t.auth.resendOtp}
                            </button>
                          )}
                        </div>

                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-zinc-950 font-bold rounded-xl text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                          ) : (
                            <span>{t.auth.verifyAndEnter}</span>
                          )}
                        </button>
                      </form>
                    )}
                  </motion.div>
                )}

                {/* 4. PASSKEY VIEW */}
                {view === 'passkey' && (
                  <motion.div
                    key="passkey"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.16 }}
                    className="space-y-5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                          <Fingerprint className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                          <h2 className="text-base font-bold tracking-tight text-white">
                            {t.auth.passkeyHeadline}
                          </h2>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {t.auth.passkeySubhead}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => switchView('signin')}
                        className="text-xs text-zinc-400 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="p-4 rounded-xl bg-[#141820] border border-white/[0.06] space-y-2 text-xs text-zinc-300">
                      <p>
                        Passkeys allow biometric authentication with Face ID, Touch ID, or security hardware keys without needing to remember a password.
                      </p>
                      <p className="text-zinc-500 text-[11px]">
                        Requires a passkey previously registered in your Farm2Home account security settings.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handlePasskeyAuth}
                      disabled={loading}
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-zinc-950 font-bold rounded-xl text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                      ) : (
                        <span>{t.auth.passkeyButton}</span>
                      )}
                    </button>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => switchView('signin')}
                        className="text-xs text-zinc-400 hover:text-white underline-offset-2 hover:underline"
                      >
                        {t.auth.backToSignIn}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>
      </main>

      {/* FOOTER: Minimal & Professional */}
      <footer className="border-t border-white/[0.06] bg-[#09090b] py-4 text-xs text-zinc-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <p>© {new Date().getFullYear()} Farm2Home · Intelligent Agri-Tech Infrastructure</p>
          <div className="flex items-center gap-4 text-zinc-500">
            <span>Direct Farm Sourcing</span>
            <span>·</span>
            <span>Cold-Chain Assurance</span>
            <span>·</span>
            <span>6-Digit Verified Handover</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
