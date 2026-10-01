import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Profile, Role, Language } from '../types';
import { api } from '../lib/api';
import { getTranslation } from '../lib/translations';

interface RoleSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: Profile | null;
  onLoginSuccess: (profile: Profile) => void;
  language: Language;
}

export const RoleSelectionModal: React.FC<RoleSelectionModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onLoginSuccess,
  language,
}) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeTab, setActiveTab] = useState<'switch' | 'new'>('switch');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = getTranslation(language);

  // New account form state
  const [role, setRole] = useState<Role>('customer');
  const [authMethod, setAuthMethod] = useState<'phone' | 'email' | 'google' | 'passkey'>('phone');
  const [identifier, setIdentifier] = useState('');
  const [fullName, setFullName] = useState('');
  const [farmName, setFarmName] = useState('');
  const [location, setLocation] = useState('');
  const [phoneStep, setPhoneStep] = useState<1 | 2>(1);
  const [enteredOtp, setEnteredOtp] = useState('');

  useEffect(() => {
    if (isOpen) {
      api
        .getProfiles()
        .then((res) => setProfiles(res.profiles))
        .catch((err) => console.error('Failed to load profiles:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectExisting = (profile: Profile) => {
    onLoginSuccess(profile);
    onClose();
  };

  const handleCreateOrLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!identifier.trim()) {
      setError(t.auth.phoneRequiredError);
      return;
    }

    if (authMethod === 'phone' && phoneStep === 1) {
      if (identifier.trim().length < 6) {
        setError(t.auth.validPhoneError);
        return;
      }
      setPhoneStep(2);
      return;
    }

    if (authMethod === 'phone' && phoneStep === 2) {
      const cleanOtp = enteredOtp.trim();
      if (cleanOtp !== '123456' && cleanOtp !== '654321') {
        setError(t.auth.invalidOtpError);
        return;
      }
    }

    setLoading(true);
    try {
      const res = await api.login({
        authMethod: authMethod === 'google' || authMethod === 'passkey' ? 'email' : authMethod,
        identifier: identifier.trim(),
        role,
        fullName: fullName.trim() || undefined,
        farmName: role === 'farmer' ? farmName.trim() || undefined : undefined,
        location: location.trim() || undefined,
      });

      onLoginSuccess(res.profile);
      onClose();
    } catch (err: any) {
      setError(err.message || t.common.somethingWentWrong);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0f1115] rounded-3xl border border-white/[0.1] shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh] text-white">
        {/* Header */}
        <div className="p-6 border-b border-white/[0.08] flex items-center justify-between bg-[#121418]">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2 text-white">
              <Sprout className="w-5 h-5 text-emerald-400" />
              {t.auth.accessAccount}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {t.auth.accountDesc}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            title={t.common.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-white/[0.08] px-6 pt-3 bg-[#09090b]/50 gap-4">
          <button
            onClick={() => setActiveTab('switch')}
            className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'switch'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <LogIn className="w-4 h-4" />
            {t.auth.verifiedPersonas}
          </button>
          <button
            onClick={() => setActiveTab('new')}
            className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'new'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            {t.auth.signInOrRegister}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          {activeTab === 'switch' && (
            <div className="space-y-4">
              {/* Category Group 1: Customers */}
              <div>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                  {t.auth.consumerPersonas}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {profiles
                    .filter((p) => p.role === 'customer')
                    .map((prof) => {
                      const isSelected = currentProfile?.id === prof.id;
                      return (
                        <button
                          key={prof.id}
                          onClick={() => handleSelectExisting(prof)}
                          className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-500/15 ring-1 ring-emerald-500 shadow-md'
                              : 'border-white/[0.08] bg-[#121418] hover:border-emerald-500/40 hover:bg-white/[0.02]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                              <User className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-white truncate">
                                {prof.full_name}
                              </div>
                              <div className="text-[11px] text-zinc-400 truncate flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-zinc-500 shrink-0" />
                                {prof.location || 'Metro'}
                              </div>
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Category Group 2: Farmers */}
              <div>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                  {t.auth.farmerPersonas}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {profiles
                    .filter((p) => p.role === 'farmer')
                    .map((prof) => {
                      const isSelected = currentProfile?.id === prof.id;
                      return (
                        <button
                          key={prof.id}
                          onClick={() => handleSelectExisting(prof)}
                          className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-500/15 ring-1 ring-emerald-500 shadow-md'
                              : 'border-white/[0.08] bg-[#121418] hover:border-emerald-500/40 hover:bg-white/[0.02]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                              <Sprout className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-white truncate">
                                {prof.full_name}
                              </div>
                              <div className="text-[11px] text-emerald-400 font-medium truncate">
                                {prof.farm_name || 'Green Acres'}
                              </div>
                              <div className="text-[10px] text-zinc-500 truncate">
                                {prof.location}
                              </div>
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Category Group 3: Delivery Partners */}
              <div>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                  {t.auth.deliveryPersonas}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {profiles
                    .filter((p) => p.role === 'delivery')
                    .map((prof) => {
                      const isSelected = currentProfile?.id === prof.id;
                      return (
                        <button
                          key={prof.id}
                          onClick={() => handleSelectExisting(prof)}
                          className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-500/15 ring-1 ring-emerald-500 shadow-md'
                              : 'border-white/[0.08] bg-[#121418] hover:border-purple-500/40 hover:bg-white/[0.02]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center font-bold text-sm shrink-0">
                              <Truck className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-white truncate">
                                {prof.full_name}
                              </div>
                              <div className="text-[11px] text-purple-300 font-medium truncate">
                                {t.auth.deliveryRole}
                              </div>
                              <div className="text-[10px] text-zinc-500 truncate">
                                {prof.location}
                              </div>
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'new' && (
            <form onSubmit={handleCreateOrLogin} className="space-y-4 text-xs">
              {authMethod === 'phone' && phoneStep === 2 ? (
                <div className="space-y-4 py-2">
                  <div className="text-center space-y-1">
                    <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Phone className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-white">{t.auth.verifyMobileOtp}</h4>
                    <p className="text-xs text-zinc-400">
                      {t.auth.weSentCode} <span className="font-semibold text-white">{identifier}</span>
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-300 mb-1 text-center">
                      {t.auth.enterOtpCode}
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      autoFocus
                      placeholder="• • • • • •"
                      value={enteredOtp}
                      onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-center text-xl font-black tracking-widest px-4 py-3 border border-white/[0.1] rounded-xl focus:outline-none focus:border-emerald-500 font-mono bg-[#09090b] text-white"
                    />
                  </div>

                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-[11px] flex items-center justify-between">
                    <span>{t.auth.demoOtp}</span>
                    <span className="font-mono font-bold text-amber-200 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded cursor-pointer" onClick={() => setEnteredOtp('123456')}>
                      123456
                    </span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setPhoneStep(1)}
                      className="flex-1 py-2.5 bg-[#121418] hover:bg-white/[0.06] text-zinc-300 border border-white/[0.08] font-semibold rounded-xl transition-colors"
                    >
                      {t.auth.changeNumber}
                    </button>
                    <button
                      type="submit"
                      disabled={loading || enteredOtp.length < 6}
                      className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold rounded-xl shadow-md transition-all"
                    >
                      {loading ? t.common.loading : t.auth.verifyAndEnter}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block font-bold text-zinc-300 mb-1.5">{t.auth.selectRole}</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setRole('customer')}
                        className={`p-3 rounded-xl border text-center font-bold flex flex-col items-center gap-1.5 transition-all ${
                          role === 'customer'
                            ? 'border-blue-500 bg-blue-500/15 text-blue-300'
                            : 'border-white/[0.08] bg-[#121418] text-zinc-400 hover:text-white'
                        }`}
                      >
                        <User className="w-4 h-4 text-blue-400" />
                        {t.auth.customerRole}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole('farmer')}
                        className={`p-3 rounded-xl border text-center font-bold flex flex-col items-center gap-1.5 transition-all ${
                          role === 'farmer'
                            ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                            : 'border-white/[0.08] bg-[#121418] text-zinc-400 hover:text-white'
                        }`}
                      >
                        <Sprout className="w-4 h-4 text-emerald-400" />
                        {t.auth.farmerRole}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole('delivery')}
                        className={`p-3 rounded-xl border text-center font-bold flex flex-col items-center gap-1.5 transition-all ${
                          role === 'delivery'
                            ? 'border-purple-500 bg-purple-500/15 text-purple-300'
                            : 'border-white/[0.08] bg-[#121418] text-zinc-400 hover:text-white'
                        }`}
                      >
                        <Truck className="w-4 h-4 text-purple-400" />
                        {t.auth.deliveryRole}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-300 mb-1.5">{t.auth.signInMethod}</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMethod('phone');
                          setPhoneStep(1);
                        }}
                        className={`py-2 px-2 rounded-lg border font-bold flex items-center justify-center gap-1 transition-all text-[11px] ${
                          authMethod === 'phone'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-[#121418] text-zinc-400 border-white/[0.08] hover:text-white'
                        }`}
                      >
                        <Phone className="w-3 h-3" />
                        {t.auth.phoneNumber}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthMethod('email')}
                        className={`py-2 px-2 rounded-lg border font-bold flex items-center justify-center gap-1 transition-all text-[11px] ${
                          authMethod === 'email'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-[#121418] text-zinc-400 border-white/[0.08] hover:text-white'
                        }`}
                      >
                        <Mail className="w-3 h-3" />
                        {t.auth.emailAddress}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMethod('google');
                          setIdentifier('user@gmail.com');
                        }}
                        className={`py-2 px-2 rounded-lg border font-bold flex items-center justify-center gap-1 transition-all text-[11px] ${
                          authMethod === 'google'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-[#121418] text-zinc-400 border-white/[0.08] hover:text-white'
                        }`}
                      >
                        Google
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMethod('passkey');
                          setIdentifier('passkey-user@farm2home');
                        }}
                        className={`py-2 px-2 rounded-lg border font-bold flex items-center justify-center gap-1 transition-all text-[11px] ${
                          authMethod === 'passkey'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-[#121418] text-zinc-400 border-white/[0.08] hover:text-white'
                        }`}
                      >
                        <KeyRound className="w-3 h-3" />
                        Passkey
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-300 mb-1">
                      {authMethod === 'phone' ? t.auth.mobileNumber : t.auth.emailAddress}
                    </label>
                    <input
                      type={authMethod === 'phone' ? 'tel' : 'email'}
                      required
                      placeholder={authMethod === 'phone' ? '+91 98765 43210' : 'name@example.com'}
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full px-3 py-2 border border-white/[0.1] bg-[#09090b] text-white rounded-xl focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-300 mb-1">{t.auth.fullName}</label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Patel"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 border border-white/[0.1] bg-[#09090b] text-white rounded-xl focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {role === 'farmer' && (
                    <div>
                      <label className="block font-bold text-zinc-300 mb-1">{t.auth.farmName}</label>
                      <input
                        type="text"
                        placeholder="e.g. Green Valley Organic Acres"
                        value={farmName}
                        onChange={(e) => setFarmName(e.target.value)}
                        className="w-full px-3 py-2 border border-white/[0.1] bg-[#09090b] text-white rounded-xl focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-zinc-300 mb-1">{t.auth.cityRegion}</label>
                    <input
                      type="text"
                      placeholder="e.g. Medak, Telangana"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full px-3 py-2 border border-white/[0.1] bg-[#09090b] text-white rounded-xl focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.25)] transition-all"
                    >
                      {authMethod === 'phone'
                        ? t.auth.sendOtp
                        : loading
                        ? t.common.loading
                        : t.auth.enterPortal}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
