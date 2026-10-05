import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  Sprout,
  Truck,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  UserPlus,
  LogIn,
  KeyRound,
  Shield,
  ShieldCheck,
  Smartphone,
  Globe,
  Lock,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Fingerprint,
} from 'lucide-react';
import { Profile, Role, Language, AuthProvider, UserAccount } from '../types';
import { api } from '../lib/api';
import { getTranslation } from '../lib/translations';
import {
  getGoogleClientId,
  ensureGoogleIdentityInitialized,
  renderGoogleSignInButton,
  addGoogleCredentialListener,
} from '../lib/googleIdentity';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: Profile | null;
  onAuthSuccess: (profile: Profile, user?: UserAccount) => void;
  language: Language;
  initialMode?: 'auth' | 'onboarding' | 'account';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onAuthSuccess,
  language,
  initialMode = 'auth',
}) => {
  const t = getTranslation(language);

  // Modal mode: 'auth' (sign in / sign up) | 'onboarding' (select role) | 'account' (linked credentials)
  const [modalMode, setModalMode] = useState<'auth' | 'onboarding' | 'account'>(initialMode);
  const [authTab, setAuthTab] = useState<'signin' | 'signup' | 'test_accounts'>('signin');
  const [method, setMethod] = useState<AuthProvider>('phone');

  // Form states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Phone OTP state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneStep, setPhoneStep] = useState<1 | 2>(1);
  const [otpCode, setOtpCode] = useState('');
  const [otpTicket, setOtpTicket] = useState('');
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  // Email state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [location, setLocation] = useState('Hyderabad Metro Zone');
  const [farmName, setFarmName] = useState('');

  // Selected role for onboarding
  const [selectedRole, setSelectedRole] = useState<Role>('customer');
  const [onboardingFarmName, setOnboardingFarmName] = useState('');
  const [onboardingLocation, setOnboardingLocation] = useState('Telangana / Andhra Region');

  // Linked providers for current profile
  const [linkedProviders, setLinkedProviders] = useState<AuthProvider[]>([]);
  const [linkingMethod, setLinkingMethod] = useState<AuthProvider | null>(null);
  const [linkInput, setLinkInput] = useState('');
  const [linkPass, setLinkPass] = useState('');

  // Test personas
  const [testProfiles, setTestProfiles] = useState<Profile[]>([]);

  // Google button DOM container reference
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Single Google Credential Listener & Button renderer
  useEffect(() => {
    if (!isOpen || method !== 'google') return;

    const unregister = addGoogleCredentialListener(async (response) => {
      if (!response?.credential) return;
      setLoading(true);
      setError(null);
      try {
        const res = await api.loginGoogle({
          credential: response.credential,
          role: selectedRole,
        });
        onAuthSuccess(res.profile, res.user);
        onClose();
      } catch (err: any) {
        setError(err.message || 'Google authentication failed');
      } finally {
        setLoading(false);
      }
    });

    if (googleBtnRef.current) {
      renderGoogleSignInButton(googleBtnRef.current, { theme: 'outline', width: 380 });
    }

    return () => {
      unregister();
    };
  }, [isOpen, method, selectedRole]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);
      setModalMode(initialMode);

      // Load current profile's linked providers if logged in
      if (currentProfile) {
        api
          .getMe()
          .then((res) => {
            if (res.user?.linkedProviders) {
              setLinkedProviders(res.user.linkedProviders);
            }
          })
          .catch(() => {
            // fallback
            setLinkedProviders(['phone', 'email']);
          });
      }

      // Load test personas for the test tab
      api
        .getProfiles()
        .then((res) => setTestProfiles(res.profiles))
        .catch(() => {});
    }
  }, [isOpen, initialMode, currentProfile?.id]);

  if (!isOpen) return null;

  // --- 1. Phone OTP Handlers ---
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    const cleanPhone = phoneNumber.trim();
    if (!cleanPhone || cleanPhone.length < 8) {
      setError(t.auth.validPhoneError);
      return;
    }

    setLoading(true);
    try {
      const res = await api.sendPhoneOtp(cleanPhone);
      setOtpTicket(res.ticket);
      if (res.devOtp) {
        setDevOtpHint(res.devOtp);
        setOtpCode(res.devOtp); // pre-populate in dev for 1-click experience
      }
      setPhoneStep(2);
    } catch (err: any) {
      setError(err.message || t.common.somethingWentWrong);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setError(t.auth.invalidOtpError);
      return;
    }

    setLoading(true);
    try {
      const res = await api.verifyPhoneOtp({
        phone: phoneNumber.trim(),
        otp: otpCode.trim(),
        ticket: otpTicket,
        fullName: fullName.trim() || undefined,
        role: authTab === 'signup' ? selectedRole : undefined,
        location: location.trim() || undefined,
        farmName: authTab === 'signup' && selectedRole === 'farmer' ? farmName.trim() : undefined,
      });

      if (res.isNew || !res.profile.role) {
        // Needs role onboarding
        setModalMode('onboarding');
      } else {
        onAuthSuccess(res.profile, res.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || t.auth.invalidOtpError);
    } finally {
      setLoading(false);
    }
  };

  // --- 2. Email & Password Handlers ---
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError(t.auth.passwordMinLength);
      return;
    }

    if (authTab === 'signup') {
      if (password !== confirmPassword) {
        setError(t.auth.passwordMismatch);
        return;
      }
      if (!fullName.trim()) {
        setError('Please provide your full name.');
        return;
      }

      setLoading(true);
      try {
        const res = await api.registerEmail({
          email: cleanEmail,
          password,
          fullName: fullName.trim(),
          role: selectedRole,
          location: location.trim() || undefined,
          farmName: selectedRole === 'farmer' ? farmName.trim() || undefined : undefined,
        });
        onAuthSuccess(res.profile, res.user);
        onClose();
      } catch (err: any) {
        setError(err.message || 'Registration failed');
      } finally {
        setLoading(false);
      }
    } else {
      // Sign In
      setLoading(true);
      try {
        const res = await api.loginEmail({
          email: cleanEmail,
          password,
        });
        if (!res.profile.role) {
          setModalMode('onboarding');
        } else {
          onAuthSuccess(res.profile, res.user);
          onClose();
        }
      } catch (err: any) {
        setError(err.message || t.auth.invalidCredentials);
      } finally {
        setLoading(false);
      }
    }
  };

  // --- 3. Google Sign-In Fallback Handler ---
  const handleGoogleSignInFallback = async () => {
    setError(null);
    const clientId = getGoogleClientId();
    if (!clientId) {
      setError(
        'Google Sign-In is not configured. Missing VITE_GOOGLE_CLIENT_ID in environment variables. Please configure your Google OAuth 2.0 Web Client ID to enable Google authentication.'
      );
      return;
    }
    setLoading(true);
    try {
      const initialized = await ensureGoogleIdentityInitialized();
      if (!initialized) {
        setError('Google Sign-In service is temporarily unavailable. Please retry.');
        return;
      }
      if (googleBtnRef.current) {
        await renderGoogleSignInButton(googleBtnRef.current, { theme: 'outline', width: 380 });
      }
    } catch (err: any) {
      setError(err.message || 'Google authentication failed');
    } finally {
      setLoading(false);
    }
  };

  // --- 4. Passkey (WebAuthn) Handlers ---
  const handlePasskeyAuth = async () => {
    setError(null);
    setLoading(true);
    try {
      if (typeof window === 'undefined' || !window.PublicKeyCredential) {
        setError('Passkeys / WebAuthn are not supported by your current browser or device. Please sign in with Email & Password, Phone OTP, or a Test Persona.');
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
          setError('Passkey interaction was cancelled.');
        } else {
          setError(
            navErr.message ||
              'No passkey found for Farm2Home on this device. Please sign in with Email or Phone first, then register your passkey in Account Settings.'
          );
        }
        return;
      }

      if (!assertion) {
        setError('Passkey interaction was cancelled.');
        return;
      }

      // Passkey verify & login
      const loginRes = await api.loginPasskey({
        challenge: challengeRes.challenge,
        credential: { id: assertion.id },
      });

      onAuthSuccess(loginRes.profile, loginRes.user);
      onClose();
    } catch (err: any) {
      setError(
        err.message?.includes('not recognized')
          ? 'No account found for this passkey. Please sign in with phone or email first, then link your passkey in Account Settings.'
          : err.message || t.auth.passkeyNotSupported
      );
    } finally {
      setLoading(false);
    }
  };

  // --- 5. Role Onboarding Confirmation ---
  const handleConfirmRoleOnboarding = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.onboardRole({
        role: selectedRole,
        farmName: selectedRole === 'farmer' ? onboardingFarmName.trim() || undefined : undefined,
        location: onboardingLocation.trim() || undefined,
      });
      onAuthSuccess(res.profile, res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || t.common.somethingWentWrong);
    } finally {
      setLoading(false);
    }
  };

  // --- 6. Account Linking Handler ---
  const handleLinkMethod = async (providerToLink: AuthProvider) => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      let uid = linkInput.trim();
      let pass = linkPass.trim();

      if (providerToLink === 'google') {
        uid = `g_linked_${Date.now()}`;
      } else if (providerToLink === 'passkey') {
        uid = `passkey_linked_${Date.now()}`;
      } else if (!uid) {
        setError(`Please provide an identifier to link ${providerToLink}.`);
        setLoading(false);
        return;
      }

      const res = await api.linkIdentity({
        provider: providerToLink,
        providerUid: uid,
        password: providerToLink === 'email' && pass ? pass : undefined,
      });

      setLinkedProviders(res.linkedProviders);
      setSuccessMsg(`${providerToLink.toUpperCase()} linked successfully!`);
      setLinkingMethod(null);
      setLinkInput('');
      setLinkPass('');
    } catch (err: any) {
      setError(err.message || t.auth.methodAlreadyLinked);
    } finally {
      setLoading(false);
    }
  };

  // --- 7. Test Persona Instant Login ---
  const handleSelectTestPersona = async (personaId: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.devLogin(personaId);
      onAuthSuccess(res.profile, res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate persona');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0f1115] rounded-3xl border border-white/[0.1] shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh] text-white">
        
        {/* Top Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-[#121418]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              {modalMode === 'onboarding' ? (
                <Sparkles className="w-5 h-5 text-emerald-400" />
              ) : modalMode === 'account' ? (
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              ) : (
                <Sprout className="w-5 h-5 text-emerald-400" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {modalMode === 'onboarding'
                  ? t.auth.roleOnboardingTitle
                  : modalMode === 'account'
                  ? t.auth.accountSettings
                  : t.auth.accessAccount}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                {modalMode === 'onboarding'
                  ? t.auth.roleOnboardingSubtitle
                  : modalMode === 'account'
                  ? 'Manage your Farm2Home canonical identity & linked sign-in methods.'
                  : t.auth.accountDesc}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            title={t.common.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Feedback Banners */}
        {error && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-rose-300 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-4 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-300 animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className="flex-1">{successMsg}</span>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODE A: ROLE ONBOARDING                                        */}
        {/* ============================================================== */}
        {modalMode === 'onboarding' ? (
          <div className="p-6 overflow-y-auto space-y-5">
            <div className="space-y-3">
              {/* Customer Card */}
              <button
                type="button"
                onClick={() => setSelectedRole('customer')}
                className={`w-full p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 ${
                  selectedRole === 'customer'
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/40'
                    : 'border-white/[0.08] bg-[#14161b] hover:bg-[#181b22] text-zinc-300'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">{t.auth.customerRole}</span>
                    {selectedRole === 'customer' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{t.auth.customerRoleDesc}</p>
                </div>
              </button>

              {/* Farmer Card */}
              <button
                type="button"
                onClick={() => setSelectedRole('farmer')}
                className={`w-full p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 ${
                  selectedRole === 'farmer'
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/40'
                    : 'border-white/[0.08] bg-[#14161b] hover:bg-[#181b22] text-zinc-300'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Sprout className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">{t.auth.farmerRole}</span>
                    {selectedRole === 'farmer' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{t.auth.farmerRoleDesc}</p>
                </div>
              </button>

              {/* Delivery Partner Card */}
              <button
                type="button"
                onClick={() => setSelectedRole('delivery')}
                className={`w-full p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 ${
                  selectedRole === 'delivery'
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/40'
                    : 'border-white/[0.08] bg-[#14161b] hover:bg-[#181b22] text-zinc-300'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Truck className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">{t.auth.deliveryRole}</span>
                    {selectedRole === 'delivery' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{t.auth.deliveryRoleDesc}</p>
                </div>
              </button>
            </div>

            {/* Extra details if Farmer selected */}
            {selectedRole === 'farmer' && (
              <div className="p-4 bg-[#14161b] rounded-2xl border border-white/[0.06] space-y-3 animate-in fade-in duration-150">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">{t.auth.farmName}</label>
                  <input
                    type="text"
                    value={onboardingFarmName}
                    onChange={(e) => setOnboardingFarmName(e.target.value)}
                    placeholder="e.g. Green Earth Organic Acres"
                    className="w-full px-3 py-2 bg-[#09090b] border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">{t.auth.cityRegion}</label>
                  <input
                    type="text"
                    value={onboardingLocation}
                    onChange={(e) => setOnboardingLocation(e.target.value)}
                    placeholder="e.g. Medak, Telangana"
                    className="w-full px-3 py-2 bg-[#09090b] border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleConfirmRoleOnboarding}
              disabled={loading}
              className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{t.auth.confirmRole}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        ) : modalMode === 'account' ? (
          /* ============================================================== */
          /* MODE B: ACCOUNT & LINKED AUTH METHODS                          */
          /* ============================================================== */
          <div className="p-6 overflow-y-auto space-y-6">
            {/* Identity Card */}
            <div className="p-4 rounded-2xl bg-[#14161b] border border-white/[0.08] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Canonical User ID</span>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  {currentProfile?.id}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Name</span>
                <span className="font-semibold text-white">{currentProfile?.full_name}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Role</span>
                <span className="font-bold uppercase tracking-wider text-emerald-400">
                  {currentProfile?.role}
                </span>
              </div>
              {currentProfile?.email && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Email</span>
                  <span className="text-zinc-300">{currentProfile?.email}</span>
                </div>
              )}
              {currentProfile?.phone_number && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Phone</span>
                  <span className="text-zinc-300">{currentProfile?.phone_number}</span>
                </div>
              )}
            </div>

            {/* Linked Methods Section */}
            <div>
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-3">
                {t.auth.linkedMethods}
              </h4>
              <div className="grid grid-cols-2 gap-2.5">
                {/* Google */}
                <div className="p-3 bg-[#14161b] rounded-xl border border-white/[0.08] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <Globe className="w-4 h-4 text-emerald-400" />
                    <span>Google</span>
                  </div>
                  {linkedProviders.includes('google') ? (
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      Linked
                    </span>
                  ) : (
                    <button
                      onClick={() => handleLinkMethod('google')}
                      disabled={loading}
                      className="text-[10px] text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded"
                    >
                      + Link
                    </button>
                  )}
                </div>

                {/* Phone */}
                <div className="p-3 bg-[#14161b] rounded-xl border border-white/[0.08] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span>Phone OTP</span>
                  </div>
                  {linkedProviders.includes('phone') ? (
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      Linked
                    </span>
                  ) : (
                    <button
                      onClick={() => setLinkingMethod('phone')}
                      className="text-[10px] text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded"
                    >
                      + Link
                    </button>
                  )}
                </div>

                {/* Email */}
                <div className="p-3 bg-[#14161b] rounded-xl border border-white/[0.08] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <Mail className="w-4 h-4 text-emerald-400" />
                    <span>Email & Pass</span>
                  </div>
                  {linkedProviders.includes('email') ? (
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      Linked
                    </span>
                  ) : (
                    <button
                      onClick={() => setLinkingMethod('email')}
                      className="text-[10px] text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded"
                    >
                      + Link
                    </button>
                  )}
                </div>

                {/* Passkey */}
                <div className="p-3 bg-[#14161b] rounded-xl border border-white/[0.08] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <Fingerprint className="w-4 h-4 text-emerald-400" />
                    <span>Passkey</span>
                  </div>
                  {linkedProviders.includes('passkey') ? (
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      Linked
                    </span>
                  ) : (
                    <button
                      onClick={() => handleLinkMethod('passkey')}
                      disabled={loading}
                      className="text-[10px] text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded"
                    >
                      + Link
                    </button>
                  )}
                </div>
              </div>

              {/* Dynamic Linking Input Box */}
              {linkingMethod && (
                <div className="mt-3 p-3 bg-[#14161b] rounded-xl border border-emerald-500/30 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs font-bold text-white">
                    <span>Link {linkingMethod.toUpperCase()}</span>
                    <button onClick={() => setLinkingMethod(null)} className="text-zinc-500 hover:text-white">
                      Cancel
                    </button>
                  </div>
                  <input
                    type={linkingMethod === 'phone' ? 'tel' : 'email'}
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    placeholder={linkingMethod === 'phone' ? '+91 98765 43210' : 'user@example.com'}
                    className="w-full px-3 py-1.5 bg-[#09090b] border border-white/10 rounded-lg text-xs text-white"
                  />
                  {linkingMethod === 'email' && (
                    <input
                      type="password"
                      value={linkPass}
                      onChange={(e) => setLinkPass(e.target.value)}
                      placeholder="Set password for email"
                      className="w-full px-3 py-1.5 bg-[#09090b] border border-white/10 rounded-lg text-xs text-white"
                    />
                  )}
                  <button
                    onClick={() => handleLinkMethod(linkingMethod)}
                    disabled={loading}
                    className="w-full py-1.5 bg-emerald-500 text-zinc-950 font-bold text-xs rounded-lg cursor-pointer"
                  >
                    Confirm Link
                  </button>
                </div>
              )}
            </div>

            {/* Sign Out Button */}
            <div className="pt-2 border-t border-white/[0.08]">
              <button
                onClick={async () => {
                  await api.logout();
                  window.location.reload();
                }}
                className="w-full py-2.5 px-4 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4 rotate-180 text-rose-400" />
                <span>{t.auth.signOut}</span>
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* MODE C: PRIMARY AUTHENTICATION (SIGN IN & REGISTER)            */
          /* ============================================================== */
          <div>
            {/* Top Navigation Tabs: Sign In / Create Account / Test Accounts */}
            <div className="flex border-b border-white/[0.08] px-6 pt-3 bg-[#09090b]/50 gap-6 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setAuthTab('signin');
                  setError(null);
                }}
                className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                  authTab === 'signin'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>{t.auth.signIn}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthTab('signup');
                  setError(null);
                }}
                className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                  authTab === 'signup'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>{t.auth.signUp}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthTab('test_accounts');
                  setError(null);
                }}
                className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ml-auto ${
                  authTab === 'test_accounts'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
                <span>Test Personas</span>
              </button>
            </div>

            {/* TAB CONTENT 1: TEST ACCOUNTS */}
            {authTab === 'test_accounts' ? (
              <div className="p-6 space-y-4">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-zinc-300">
                  <p className="font-semibold text-emerald-400">Authentic Server Session Generator</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Click any test persona below to create a verified server session token and inspect isolated data.
                  </p>
                </div>

                <div className="space-y-2">
                  {testProfiles.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectTestPersona(p.id)}
                      disabled={loading}
                      className="w-full p-3 rounded-2xl bg-[#14161b] hover:bg-[#181b22] border border-white/[0.08] hover:border-emerald-500/30 flex items-center justify-between text-left transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={p.avatar_url || 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=100'}
                          alt={p.full_name}
                          className="w-9 h-9 rounded-xl object-cover border border-white/10"
                        />
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>{p.full_name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-white/5 rounded text-zinc-400">
                              {p.role}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400">{p.email || p.phone_number}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-zinc-500" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* TAB CONTENT 2: REAL PRODUCTION AUTHENTICATION */
              <div className="p-6 space-y-5">
                {/* Method Switcher Pills */}
                <div className="grid grid-cols-4 gap-1.5 p-1 bg-[#14161b] rounded-2xl border border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => {
                      setMethod('phone');
                      setError(null);
                    }}
                    className={`py-2 px-1 text-[11px] font-bold rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                      method === 'phone'
                        ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Phone OTP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMethod('email');
                      setError(null);
                    }}
                    className={`py-2 px-1 text-[11px] font-bold rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                      method === 'email'
                        ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMethod('google');
                      setError(null);
                    }}
                    className={`py-2 px-1 text-[11px] font-bold rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                      method === 'google'
                        ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Google</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMethod('passkey');
                      setError(null);
                    }}
                    className={`py-2 px-1 text-[11px] font-bold rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                      method === 'passkey'
                        ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Fingerprint className="w-3.5 h-3.5" />
                    <span>Passkey</span>
                  </button>
                </div>

                {/* --- METHOD 1: PHONE OTP --- */}
                {method === 'phone' && (
                  <div>
                    {phoneStep === 1 ? (
                      <form onSubmit={handleSendOtp} className="space-y-4">
                        {authTab === 'signup' && (
                          <div>
                            <label className="block text-xs font-bold text-zinc-300 mb-1">{t.auth.fullName}</label>
                            <input
                              type="text"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              placeholder="e.g. Ramesh Kumar"
                              className="w-full px-3.5 py-2.5 bg-[#14161b] border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                              required
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-bold text-zinc-300 mb-1">{t.auth.mobileNumber}</label>
                          <div className="relative">
                            <input
                              type="tel"
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              placeholder="+91 98765 43210"
                              className="w-full pl-10 pr-3.5 py-2.5 bg-[#14161b] border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                              required
                            />
                            <Phone className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {loading ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <span>{t.auth.sendOtp}</span>
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </form>
                    ) : (
                      /* Phone Step 2: Enter OTP */
                      <form onSubmit={handleVerifyOtp} className="space-y-4">
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between text-xs">
                          <div>
                            <span className="text-zinc-400">{t.auth.weSentCode}</span>
                            <span className="font-semibold text-white ml-1.5">{phoneNumber}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPhoneStep(1)}
                            className="text-emerald-400 hover:underline font-bold text-[11px]"
                          >
                            {t.auth.changeNumber}
                          </button>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-zinc-300 mb-1">{t.auth.enterOtpCode}</label>
                          <input
                            type="text"
                            maxLength={6}
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                            placeholder="6-digit code"
                            className="w-full text-center tracking-[0.4em] font-mono font-bold text-base px-3.5 py-2.5 bg-[#14161b] border border-white/10 rounded-xl text-emerald-400 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                            required
                          />
                          {devOtpHint && (
                            <p className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              <span>Dev OTP Code: <strong className="text-white">{devOtpHint}</strong> (pre-filled)</span>
                            </p>
                          )}
                        </div>

                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {loading ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <span>{t.auth.verifyAndEnter}</span>
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </form>
                    )}
                  </div>
                )}

                {/* --- METHOD 2: EMAIL & PASSWORD --- */}
                {method === 'email' && (
                  <form onSubmit={handleEmailAuth} className="space-y-3.5">
                    {authTab === 'signup' && (
                      <div>
                        <label className="block text-xs font-bold text-zinc-300 mb-1">{t.auth.fullName}</label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Ramesh Kumar"
                          className="w-full px-3.5 py-2.5 bg-[#14161b] border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                          required
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1">{t.auth.emailAddress}</label>
                      <div className="relative">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-[#14161b] border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                          required
                        />
                        <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1">{t.auth.password}</label>
                      <div className="relative">
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-[#14161b] border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                          required
                        />
                        <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                      </div>
                    </div>

                    {authTab === 'signup' && (
                      <div>
                        <label className="block text-xs font-bold text-zinc-300 mb-1">{t.auth.confirmPassword}</label>
                        <div className="relative">
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full pl-10 pr-3.5 py-2.5 bg-[#14161b] border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                            required
                          />
                          <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                    >
                      {loading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span>{authTab === 'signup' ? t.auth.signUp : t.auth.signIn}</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* --- METHOD 3: GOOGLE SIGN-IN --- */}
                {method === 'google' && (
                  <div className="space-y-4 py-2">
                    <div className="p-4 bg-[#14161b] rounded-2xl border border-white/[0.08] text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-emerald-400">
                        <Globe className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">One-Click Google Authentication</h4>
                        <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                          Sign in or register instantly using your verified Google credentials.
                        </p>
                      </div>
                    </div>

                    <div className="relative w-full group overflow-hidden rounded-xl">
                      <button
                        type="button"
                        onClick={handleGoogleSignInFallback}
                        disabled={loading}
                        className="w-full py-3 px-4 bg-white hover:bg-zinc-100 text-zinc-950 font-bold text-xs rounded-xl shadow-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                      >
                        {loading ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                          </>
                        )}
                      </button>
                      <div
                        ref={googleBtnRef}
                        className="absolute inset-0 w-full h-full opacity-[0.0001] cursor-pointer z-10 flex items-center justify-center overflow-hidden [&_iframe]:w-full [&_iframe]:min-w-full [&_iframe]:min-h-full [&_iframe]:scale-125 pointer-events-auto"
                        title={t.auth.continueWithGoogle}
                      />
                    </div>
                  </div>
                )}

                {/* --- METHOD 4: PASSKEY (WEBAUTHN) --- */}
                {method === 'passkey' && (
                  <div className="space-y-4 py-2">
                    <div className="p-4 bg-[#14161b] rounded-2xl border border-white/[0.08] text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                        <Fingerprint className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Biometric Passkey Authentication</h4>
                        <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                          Sign in securely with Touch ID, Face ID, Windows Hello, or device pin.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handlePasskeyAuth}
                      disabled={loading}
                      className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {loading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <KeyRound className="w-4 h-4" />
                          <span>{t.auth.usePasskey}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Aliased for backwards compatibility
export const RoleSelectionModal = AuthModal;
