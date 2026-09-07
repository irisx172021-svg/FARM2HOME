import React, { useState, useEffect } from 'react';
import {
  Truck,
  MapPin,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Package,
  ArrowRight,
  AlertCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { Order, Profile, Language } from '../types';
import { translations } from '../lib/translations';
import { api } from '../lib/api';

interface DeliveryViewProps {
  currentProfile: Profile;
  language: Language;
  onRefreshAll: () => Promise<void>;
  externalTab?: 'available' | 'active' | 'completed';
  onSelectTab?: (tab: 'available' | 'active' | 'completed') => void;
}

export const DeliveryView: React.FC<DeliveryViewProps> = ({
  currentProfile,
  language,
  onRefreshAll,
  externalTab,
  onSelectTab,
}) => {
  const t = translations[language];
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTabState, setActiveTabState] = useState<'available' | 'active' | 'completed'>('available');
  const activeTab = externalTab || activeTabState;
  const setActiveTab = (tab: 'available' | 'active' | 'completed') => {
    setActiveTabState(tab);
    if (onSelectTab) onSelectTab(tab);
  };
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
  const [otpErrors, setOtpErrors] = useState<Record<string, string>>({});

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await api.getOrders(currentProfile.id, 'delivery');
      setOrders(res.orders);
    } catch (err) {
      console.error('Failed to load delivery orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [currentProfile.id]);

  // Open farm jobs: status is 'accepted' and no partner assigned yet
  const availableJobs = orders.filter((o) => o.status === 'accepted' && !o.delivery_partner_id);

  // Active jobs for this partner: out_for_delivery
  const activeDeliveries = orders.filter(
    (o) => o.status === 'out_for_delivery' && o.delivery_partner_id === currentProfile.id
  );

  // Completed deliveries: delivered
  const completedDeliveries = orders.filter(
    (o) => o.status === 'delivered' && o.delivery_partner_id === currentProfile.id
  );

  const handleClaimJob = async (orderId: string) => {
    try {
      await api.updateOrderStatus(orderId, {
        userId: currentProfile.id,
        role: 'delivery',
        status: 'out_for_delivery',
      });
      await loadOrders();
      await onRefreshAll();
      setActiveTab('active');
    } catch (err: any) {
      alert(err.message || 'Failed to claim delivery job');
    }
  };

  const handleVerifyOtp = async (orderId: string) => {
    const code = otpInputs[orderId];
    if (!code || code.trim().length !== 6) {
      setOtpErrors((prev) => ({ ...prev, [orderId]: 'Enter 6-digit customer OTP' }));
      return;
    }

    try {
      setOtpErrors((prev) => ({ ...prev, [orderId]: '' }));
      await api.updateOrderStatus(orderId, {
        userId: currentProfile.id,
        role: 'delivery',
        status: 'delivered',
        otpCode: code.trim(),
      });
      await loadOrders();
      await onRefreshAll();
      setActiveTab('completed');
    } catch (err: any) {
      setOtpErrors((prev) => ({ ...prev, [orderId]: err.message || 'OTP verification failed' }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Delivery Partner Profile Card */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
            <Truck className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-stone-900">{currentProfile.full_name}</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified Delivery Partner
              </span>
            </div>
            <p className="text-sm font-medium text-purple-800">
              {currentProfile.phone_number || currentProfile.email}
            </p>
            <p className="text-xs text-stone-500">{currentProfile.location}</p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl text-xs font-semibold text-stone-600 self-stretch md:self-auto">
          <button
            onClick={() => setActiveTab('available')}
            className={`flex-1 md:flex-none px-3.5 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'available'
                ? 'bg-white text-purple-900 shadow-xs font-bold'
                : 'hover:text-stone-900'
            }`}
          >
            <Package className="w-4 h-4" />
            Farm Pickups ({availableJobs.length})
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 md:flex-none px-3.5 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'active'
                ? 'bg-white text-purple-900 shadow-xs font-bold'
                : 'hover:text-stone-900'
            }`}
          >
            <Truck className="w-4 h-4" />
            Out for Delivery ({activeDeliveries.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 md:flex-none px-3.5 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'completed'
                ? 'bg-white text-purple-900 shadow-xs font-bold'
                : 'hover:text-stone-900'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Completed ({completedDeliveries.length})
          </button>
        </div>
      </div>

      {/* 1. AVAILABLE PICKUP JOBS */}
      {activeTab === 'available' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-stone-900">Available Farm Pickup Orders</h2>
              <p className="text-xs text-stone-500">
                Orders accepted and packed by local farmers ready for metro route transit.
              </p>
            </div>
            <button
              onClick={loadOrders}
              className="text-xs font-semibold text-purple-700 hover:text-purple-800 p-2 bg-purple-50 rounded-lg flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          {availableJobs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-400">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-40 text-stone-400" />
              <p className="text-sm font-semibold text-stone-700">No open pickup jobs right now.</p>
              <p className="text-xs text-stone-400 mt-1">
                As farmers accept incoming customer orders, new pickup routes will show up here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableJobs.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-sm text-stone-900">Order #{ord.id}</span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        ₹{ord.total_amount} value
                      </span>
                    </div>

                    {/* Farm Origin */}
                    <div className="text-xs bg-stone-50 p-2.5 rounded-xl space-y-1">
                      <div className="text-stone-400 font-semibold text-[10px] uppercase">
                        1. Farm Pickup Point
                      </div>
                      <div className="font-bold text-stone-800">{ord.farmer_name}</div>
                      {ord.farmer_phone && (
                        <div className="text-stone-500 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-emerald-600" />
                          {ord.farmer_phone}
                        </div>
                      )}
                    </div>

                    {/* Customer Destination */}
                    <div className="text-xs bg-stone-50 p-2.5 rounded-xl space-y-1">
                      <div className="text-stone-400 font-semibold text-[10px] uppercase">
                        2. Customer Delivery Destination
                      </div>
                      <div className="font-bold text-stone-800">{ord.customer_name}</div>
                      <div className="text-stone-500 flex items-start gap-1">
                        <MapPin className="w-3 h-3 text-purple-600 shrink-0 mt-0.5" />
                        <span>{ord.delivery_address}</span>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="text-xs text-stone-600 pt-1">
                      <span className="font-semibold text-stone-700">Cargo:</span>{' '}
                      {ord.items.map((i) => `${i.title} (${i.quantity} ${i.unit})`).join(', ')}
                    </div>
                  </div>

                  <button
                    onClick={() => handleClaimJob(ord.id)}
                    className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Truck className="w-4 h-4" />
                    {t.claimDelivery}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. ACTIVE DELIVERIES TAB (WITH OTP VERIFICATION) */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-stone-900">Your Active Transit Deliveries</h2>
              <p className="text-xs text-stone-500">
                Collect secret 6-digit OTP from customer upon handover to finalize delivery.
              </p>
            </div>
            <button
              onClick={loadOrders}
              className="text-xs font-semibold text-purple-700 hover:text-purple-800 p-2 bg-purple-50 rounded-lg flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          {activeDeliveries.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-400">
              <Truck className="w-12 h-12 mx-auto mb-2 opacity-40 text-stone-400" />
              <p className="text-sm font-semibold text-stone-700">No active deliveries in transit.</p>
              <p className="text-xs text-stone-400 mt-1">Claim a pickup job from the first tab to start transit.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeDeliveries.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white rounded-2xl border border-purple-200 p-5 shadow-xs space-y-4 ring-1 ring-purple-100"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-stone-900">Order #{ord.id}</span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 animate-pulse">
                          Out for Delivery
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        Claimed at {new Date(ord.created_at).toLocaleTimeString()}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-stone-500">Settlement Payout</span>
                      <div className="text-base font-extrabold text-emerald-700">₹{ord.total_amount}</div>
                    </div>
                  </div>

                  {/* Customer Handover Destination */}
                  <div className="bg-stone-50 rounded-xl p-3 text-xs space-y-1.5">
                    <div className="font-bold text-stone-900 flex items-center justify-between">
                      <span>Customer: {ord.customer_name}</span>
                      {ord.customer_phone && (
                        <span className="text-stone-500 flex items-center gap-1 font-normal">
                          <Phone className="w-3 h-3 text-emerald-600" />
                          {ord.customer_phone}
                        </span>
                      )}
                    </div>
                    <div className="flex items-start gap-1.5 text-stone-600">
                      <MapPin className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                      <span>{ord.delivery_address}</span>
                    </div>
                  </div>

                  {/* OTP Verification Handshake Box */}
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                      <ShieldCheck className="w-4 h-4 text-amber-700" />
                      Customer Handover Verification
                    </div>
                    <p className="text-[11px] text-stone-600">
                      Ask the customer for their secret 6-digit Delivery OTP (visible on their order tracking screen).
                    </p>

                    {otpErrors[ord.id] && (
                      <div className="text-xs text-rose-600 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {otpErrors[ord.id]}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={otpInputs[ord.id] || ''}
                        onChange={(e) =>
                          setOtpInputs((prev) => ({
                            ...prev,
                            [ord.id]: e.target.value.replace(/\D/g, ''),
                          }))
                        }
                        placeholder="Enter 6-digit OTP"
                        className="flex-1 max-w-xs px-3 py-2 bg-white border border-amber-300 rounded-xl font-mono text-center tracking-widest text-sm font-bold focus:outline-purple-600"
                      />
                      <button
                        onClick={() => handleVerifyOtp(ord.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1 shadow-2xs"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {t.verifyOtp}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. COMPLETED DELIVERIES HISTORY */}
      {activeTab === 'completed' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-stone-900">Fulfilled Deliveries Archive</h2>

          {completedDeliveries.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-400">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-40 text-stone-400" />
              <p className="text-sm font-semibold text-stone-700">No deliveries completed yet.</p>
              <p className="text-xs text-stone-400 mt-1">Verified deliveries will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedDeliveries.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white rounded-2xl border border-stone-200 p-4 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-stone-900">Order #{ord.id}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                        Delivered
                      </span>
                    </div>
                    <p className="text-stone-500">Delivered to {ord.customer_name} ({ord.delivery_address})</p>
                    <p className="text-[11px] text-stone-400">
                      From {ord.farmer_name} • OTP Verified
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-stone-400 uppercase font-bold block">Order Value</span>
                    <span className="text-sm font-black text-emerald-700">₹{ord.total_amount}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
