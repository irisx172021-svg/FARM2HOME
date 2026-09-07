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
  ShieldCheck,
  UserPlus,
  LogIn,
} from 'lucide-react';
import { Profile, Role, Language } from '../types';
import { api } from '../lib/api';

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

  // New account form state
  const [role, setRole] = useState<Role>('customer');
  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('phone');
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
      setError('Please provide a valid phone number or email address.');
      return;
    }

    if (authMethod === 'phone' && phoneStep === 1) {
      if (identifier.trim().length < 6) {
        setError('Please enter a valid mobile number.');
        return;
      }
      setPhoneStep(2);
      return;
    }

    if (authMethod === 'phone' && phoneStep === 2) {
      const cleanOtp = enteredOtp.trim();
      if (cleanOtp !== '123456' && cleanOtp !== '654321') {
        setError('Invalid OTP code. Please enter test code: 123456 or 654321');
        return;
      }
    }

    setLoading(true);
    try {
      const res = await api.login({
        authMethod,
        identifier: identifier.trim(),
        role,
        fullName: fullName.trim() || undefined,
        farmName: role === 'farmer' ? farmName.trim() || undefined : undefined,
        location: location.trim() || undefined,
      });

      onLoginSuccess(res.profile);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-[#2d6a4f] flex items-center justify-between bg-[#1b4332] text-white">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2 text-white">
              <Sprout className="w-5 h-5 text-[#74c69d]" />
              Access Farm2Home Account
            </h3>
            <p className="text-xs text-[#d8f3dc]/80 mt-0.5">
              Experience Farm2Home from the perspective of Customers, Farmers, or Delivery Partners
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#d8f3dc]/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-stone-200 px-6 pt-3 bg-stone-50/30 gap-4">
          <button
            onClick={() => setActiveTab('switch')}
            className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'switch'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <LogIn className="w-4 h-4" />
            Verified Demo Personas
          </button>
          <button
            onClick={() => setActiveTab('new')}
            className={`pb-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'new'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Sign In or Register
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          {activeTab === 'switch' && (
            <div className="space-y-4">
              {/* Category Group 1: Customers */}
              <div>
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block mb-2">
                  1. Consumer & Shopper Personas
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
                              ? 'border-emerald-500 bg-emerald-50/60 shadow-xs ring-1 ring-emerald-500'
                              : 'border-stone-200 bg-white hover:border-emerald-300 hover:bg-stone-50'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm shrink-0">
                              <User className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-stone-900 truncate">
                                {prof.full_name}
                              </div>
                              <div className="text-[11px] text-stone-500 truncate flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                                {prof.location || 'Metro'}
                              </div>
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Category Group 2: Farmers */}
              <div>
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block mb-2">
                  2. Verified Local Farmers
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
                              ? 'border-emerald-500 bg-emerald-50/60 shadow-xs ring-1 ring-emerald-500'
                              : 'border-stone-200 bg-white hover:border-emerald-300 hover:bg-stone-50'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm shrink-0">
                              <Sprout className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-stone-900 truncate">
                                {prof.full_name}
                              </div>
                              <div className="text-[11px] text-emerald-700 font-medium truncate">
                                {prof.farm_name || 'Green Acres'}
                              </div>
                              <div className="text-[10px] text-stone-400 truncate">
                                {prof.location}
                              </div>
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Category Group 3: Delivery Partners */}
              <div>
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block mb-2">
                  3. Delivery & Transit Fleet
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
                              ? 'border-emerald-500 bg-emerald-50/60 shadow-xs ring-1 ring-emerald-500'
                              : 'border-stone-200 bg-white hover:border-purple-300 hover:bg-stone-50'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-sm shrink-0">
                              <Truck className="w-5 h-5 text-purple-600" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-stone-900 truncate">
                                {prof.full_name}
                              </div>
                              <div className="text-[11px] text-purple-700 font-medium truncate">
                                Verified Partner
                              </div>
                              <div className="text-[10px] text-stone-400 truncate">
                                {prof.location}
                              </div>
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />}
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
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Phone className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-stone-900">Verify Mobile OTP</h4>
                    <p className="text-xs text-stone-500">
                      We sent a verification code to <span className="font-semibold text-stone-800">{identifier}</span>
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1 text-center">
                      Enter 6-Digit OTP Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      autoFocus
                      placeholder="• • • • • •"
                      value={enteredOtp}
                      onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-center text-xl font-black tracking-widest px-4 py-3 border border-stone-300 rounded-xl focus:outline-emerald-600 font-mono bg-stone-50"
                    />
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] flex items-center justify-between">
                    <span>Demo Test OTP:</span>
                    <span className="font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded cursor-pointer" onClick={() => setEnteredOtp('123456')}>
                      123456
                    </span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setPhoneStep(1)}
                      className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl"
                    >
                      Change Number
                    </button>
                    <button
                      type="submit"
                      disabled={loading || enteredOtp.length < 6}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition-colors"
                    >
                      {loading ? 'Verifying...' : 'Verify & Enter'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1.5">Select Role</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setRole('customer')}
                        className={`p-3 rounded-xl border text-center font-bold flex flex-col items-center gap-1.5 ${
                          role === 'customer'
                            ? 'border-blue-600 bg-blue-50 text-blue-900'
                            : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        <User className="w-4 h-4 text-blue-600" />
                        Customer
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole('farmer')}
                        className={`p-3 rounded-xl border text-center font-bold flex flex-col items-center gap-1.5 ${
                          role === 'farmer'
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                            : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        <Sprout className="w-4 h-4 text-emerald-600" />
                        Organic Farmer
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole('delivery')}
                        className={`p-3 rounded-xl border text-center font-bold flex flex-col items-center gap-1.5 ${
                          role === 'delivery'
                            ? 'border-purple-600 bg-purple-50 text-purple-900'
                            : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        <Truck className="w-4 h-4 text-purple-600" />
                        Delivery Partner
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1.5">Sign In Method</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMethod('phone');
                          setPhoneStep(1);
                        }}
                        className={`flex-1 py-2 rounded-lg border font-bold flex items-center justify-center gap-1.5 ${
                          authMethod === 'phone'
                            ? 'bg-stone-900 text-white border-stone-900'
                            : 'bg-white text-stone-600 border-stone-200'
                        }`}
                      >
                        <Phone className="w-3.5 h-3.5" />
                        Phone Number
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthMethod('email')}
                        className={`flex-1 py-2 rounded-lg border font-bold flex items-center justify-center gap-1.5 ${
                          authMethod === 'email'
                            ? 'bg-stone-900 text-white border-stone-900'
                            : 'bg-white text-stone-600 border-stone-200'
                        }`}
                      >
                        <Mail className="w-3.5 h-3.5" />
                        Email Address
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      {authMethod === 'phone' ? 'Mobile Number' : 'Email Address'}
                    </label>
                    <input
                      type={authMethod === 'phone' ? 'tel' : 'email'}
                      required
                      placeholder={authMethod === 'phone' ? '+91 98765 43210' : 'name@example.com'}
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Patel"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-emerald-600"
                    />
                  </div>

                  {role === 'farmer' && (
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Farm / Estate Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Green Valley Organic Acres"
                        value={farmName}
                        onChange={(e) => setFarmName(e.target.value)}
                        className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-emerald-600"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">City / Region</label>
                    <input
                      type="text"
                      placeholder="e.g. Medak, Telangana"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-emerald-600"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
                    >
                      {authMethod === 'phone' ? 'Send OTP Verification Code' : (loading ? 'Authenticating...' : 'Enter Farm2Home Portal')}
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
