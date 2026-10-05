import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  MapPin,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Package,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Calendar,
  Clock,
  ChevronRight,
  History,
} from 'lucide-react';
import { Order, Profile, Language } from '../types';
import { getTranslation } from '../lib/translations';
import { api } from '../lib/api';
import { formatOrderItemSummary } from '../lib/quantity';

interface DeliveryViewProps {
  currentProfile: Profile;
  language: Language;
  onRefreshAll: () => Promise<void>;
  externalTab?: string;
  onSelectTab?: (tab: any) => void;
}

export const DeliveryView: React.FC<DeliveryViewProps> = ({
  currentProfile,
  language,
  onRefreshAll,
  externalTab,
  onSelectTab,
}) => {
  const t = getTranslation(language);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [internalTab, setInternalTab] = useState<'available' | 'active' | 'history'>('history');
  
  // Map 'completed' to 'history' for backward compatibility
  const normalizedExternal = externalTab === 'completed' ? 'history' : externalTab;
  const activeTab = normalizedExternal || internalTab;

  const setActiveTab = (tab: 'available' | 'active' | 'history') => {
    setInternalTab(tab);
    if (onSelectTab) onSelectTab(tab);
  };

  const [historyPeriod, setHistoryPeriod] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
  const [otpErrors, setOtpErrors] = useState<Record<string, string>>({});
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

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
  const availableJobs = useMemo(() => {
    return orders.filter((o) => o.status === 'accepted' && !o.delivery_partner_id);
  }, [orders]);

  // Active jobs for this partner: out_for_delivery
  const activeDeliveries = useMemo(() => {
    return orders.filter(
      (o) => o.status === 'out_for_delivery' && o.delivery_partner_id === currentProfile.id
    );
  }, [orders, currentProfile.id]);

  // Completed deliveries: delivered by this partner
  const completedDeliveries = useMemo(() => {
    return orders.filter(
      (o) => o.status === 'delivered' && o.delivery_partner_id === currentProfile.id
    );
  }, [orders, currentProfile.id]);

  // Helper date boundaries
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = new Date(now.getTime() - 7 * 86400000).getTime();
  const startOfMonth = new Date(now.getTime() - 30 * 86400000).getTime();

  // Completed Today
  const completedTodayList = useMemo(() => {
    return completedDeliveries.filter((o) => {
      const time = o.completed_at ? new Date(o.completed_at).getTime() : new Date(o.created_at).getTime();
      return time >= startOfToday;
    });
  }, [completedDeliveries, startOfToday]);

  const todayEarnings = useMemo(() => {
    return completedTodayList.reduce((sum, o) => sum + (o.delivery_fare || 180), 0);
  }, [completedTodayList]);

  // Earnings calculations across periods
  const thisWeekDeliveries = useMemo(() => {
    return completedDeliveries.filter((o) => {
      const time = o.completed_at ? new Date(o.completed_at).getTime() : new Date(o.created_at).getTime();
      return time >= startOfWeek;
    });
  }, [completedDeliveries, startOfWeek]);

  const thisMonthDeliveries = useMemo(() => {
    return completedDeliveries.filter((o) => {
      const time = o.completed_at ? new Date(o.completed_at).getTime() : new Date(o.created_at).getTime();
      return time >= startOfMonth;
    });
  }, [completedDeliveries, startOfMonth]);

  const totalFaresEarned = useMemo(() => {
    return completedDeliveries.reduce((sum, o) => sum + (o.delivery_fare || 180), 0);
  }, [completedDeliveries]);

  const thisWeekEarnings = useMemo(() => {
    return thisWeekDeliveries.reduce((sum, o) => sum + (o.delivery_fare || 180), 0);
  }, [thisWeekDeliveries]);

  const thisMonthEarnings = useMemo(() => {
    return thisMonthDeliveries.reduce((sum, o) => sum + (o.delivery_fare || 180), 0);
  }, [thisMonthDeliveries]);

  const avgFarePerRide = useMemo(() => {
    if (completedDeliveries.length === 0) return 0;
    return Math.round(totalFaresEarned / completedDeliveries.length);
  }, [totalFaresEarned, completedDeliveries.length]);

  // Distance tracking - only when reliable data exists in existing orders
  const hasReliableDistance = useMemo(() => {
    return completedDeliveries.some((o) => typeof o.distance_km === 'number' && o.distance_km > 0);
  }, [completedDeliveries]);

  const totalDistanceKm = useMemo(() => {
    if (!hasReliableDistance) return 0;
    return completedDeliveries.reduce((sum, o) => sum + (o.distance_km || 0), 0);
  }, [completedDeliveries, hasReliableDistance]);

  const avgDistanceKm = useMemo(() => {
    if (!hasReliableDistance || completedDeliveries.length === 0) return 0;
    return Number((totalDistanceKm / completedDeliveries.length).toFixed(1));
  }, [totalDistanceKm, completedDeliveries.length, hasReliableDistance]);

  // Filtered ride history by period selector (Today | This Week | This Month | All Time)
  const filteredHistory = useMemo(() => {
    if (historyPeriod === 'today') return completedTodayList;
    if (historyPeriod === 'week') return thisWeekDeliveries;
    if (historyPeriod === 'month') return thisMonthDeliveries;
    return completedDeliveries;
  }, [historyPeriod, completedTodayList, thisWeekDeliveries, thisMonthDeliveries, completedDeliveries]);

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
      setOtpErrors((prev) => ({ ...prev, [orderId]: 'Please enter the valid 6-digit customer OTP' }));
      return;
    }

    try {
      setVerifyingId(orderId);
      setOtpErrors((prev) => ({ ...prev, [orderId]: '' }));
      await api.updateOrderStatus(orderId, {
        userId: currentProfile.id,
        role: 'delivery',
        status: 'delivered',
        otpCode: code.trim(),
      });
      await loadOrders();
      await onRefreshAll();
      setActiveTab('history');
    } catch (err: any) {
      setOtpErrors((prev) => ({ ...prev, [orderId]: err.message || 'Invalid OTP. Please ask the customer.' }));
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. DELIVERY PROFILE & STATUS HEADER */}
      <div className="bg-[#0f1115]/90 border border-white/[0.08] rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-md">
            <Truck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">{currentProfile.full_name}</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 text-xs font-semibold flex items-center gap-1 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                {t.delivery.workspaceSubtitle}
              </span>
            </div>
            <p className="text-xs font-medium text-zinc-400 mt-0.5">
              {currentProfile.phone_number || currentProfile.email}
            </p>
            {currentProfile.location ? (
              <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-zinc-500" />
                {currentProfile.location}
              </p>
            ) : null}
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 p-1 bg-[#121418] border border-white/[0.08] rounded-xl text-xs font-semibold text-zinc-400 self-stretch md:self-auto">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 md:flex-none px-3.5 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold shadow-xs'
                : 'hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <History className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t.delivery.rideHistoryTab} ({completedDeliveries.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 md:flex-none px-3.5 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'active'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold shadow-xs'
                : 'hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t.delivery.activeRoutesTab} {activeDeliveries.length > 0 && `(${activeDeliveries.length})`}</span>
          </button>
          <button
            onClick={() => setActiveTab('available')}
            className={`flex-1 md:flex-none px-3.5 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'available'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold shadow-xs'
                : 'hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Package className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t.delivery.availablePickupsTab} ({availableJobs.length})</span>
          </button>
        </div>
      </div>

      {/* 2. DELIVERY OVERVIEW SUMMARY CARDS (Required at the top) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Active Rides */}
        <div className="bg-[#0f1115]/90 rounded-2xl border border-white/[0.08] p-4 shadow-xl hover:border-emerald-500/30 transition-all backdrop-blur-md">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">
            {t.delivery.activeRoutesTab}
          </span>
          <div className="text-2xl font-black font-mono text-white mt-1">{activeDeliveries.length}</div>
          <span className="text-[11px] text-sky-400 font-medium mt-0.5 block">
            {activeDeliveries.length > 0 ? t.delivery.transitSafety : t.delivery.noActiveRoutes}
          </span>
        </div>

        {/* Completed Today */}
        <div className="bg-[#0f1115]/90 rounded-2xl border border-white/[0.08] p-4 shadow-xl hover:border-emerald-500/30 transition-all backdrop-blur-md">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">
            {t.delivery.filterToday}
          </span>
          <div className="text-2xl font-black font-mono text-white mt-1">{completedTodayList.length}</div>
          <span className="text-[11px] text-emerald-400 font-medium mt-0.5 block">
            {t.delivery.otpVerified}
          </span>
        </div>

        {/* Today's Earnings */}
        <div className="bg-[#0f1115]/90 rounded-2xl border border-white/[0.08] p-4 shadow-xl hover:border-emerald-500/30 transition-all backdrop-blur-md">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">
            {t.delivery.todaysEarnings}
          </span>
          <div className="text-2xl font-black font-mono text-emerald-400 mt-1">₹{todayEarnings}</div>
          <span className="text-[11px] text-zinc-400 font-medium mt-0.5 block">
            {t.delivery.fareEarned}
          </span>
        </div>

        {/* Pending Jobs */}
        <div className="bg-[#0f1115]/90 rounded-2xl border border-white/[0.08] p-4 shadow-xl hover:border-amber-500/30 transition-all backdrop-blur-md">
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">
            {t.delivery.availablePickupsTab}
          </span>
          <div className="text-2xl font-black font-mono text-amber-300 mt-1">{availableJobs.length}</div>
          <span className="text-[11px] text-amber-400/80 font-medium mt-0.5 block">
            {t.delivery.availablePickupsTitle}
          </span>
        </div>
      </div>

      {/* 3. SECTION: RIDE HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-5">
          {/* Section Title & Period Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>{t.delivery.rideHistoryTab.toUpperCase()}</span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {t.delivery.fareEarned.toUpperCase()}
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {t.delivery.workspaceSubtitle}
              </p>
            </div>

            {/* Period Selector: [Today] [This Week] [This Month] [All Time] */}
            <div className="flex items-center gap-1 p-1 bg-[#121418] border border-white/[0.08] rounded-xl text-xs font-semibold text-zinc-400">
              <button
                onClick={() => setHistoryPeriod('today')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  historyPeriod === 'today'
                    ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 shadow-xs'
                    : 'hover:text-white'
                }`}
              >
                {t.delivery.filterToday}
              </button>
              <button
                onClick={() => setHistoryPeriod('week')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  historyPeriod === 'week'
                    ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 shadow-xs'
                    : 'hover:text-white'
                }`}
              >
                {t.delivery.filterThisWeek}
              </button>
              <button
                onClick={() => setHistoryPeriod('month')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  historyPeriod === 'month'
                    ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 shadow-xs'
                    : 'hover:text-white'
                }`}
              >
                {t.delivery.filterThisMonth}
              </button>
              <button
                onClick={() => setHistoryPeriod('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  historyPeriod === 'all'
                    ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 shadow-xs'
                    : 'hover:text-white'
                }`}
              >
                {t.delivery.filterAllTime}
              </button>
            </div>
          </div>

          {/* Ride History Summary Metric Cards (Today, This Week, This Month, Total, Completed Rides, Average Fare, Distance if available) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 1. Today's Earnings */}
            <div className="bg-[#121418] rounded-xl border border-white/[0.06] p-3.5">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide block">
                {t.delivery.todaysEarnings}
              </span>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                ₹{todayEarnings}
              </div>
              <span className="text-[10px] text-zinc-400">{completedTodayList.length} {t.delivery.filterToday}</span>
            </div>

            {/* 2. This Week's Earnings */}
            <div className="bg-[#121418] rounded-xl border border-white/[0.06] p-3.5">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide block">
                {t.delivery.thisWeeksEarnings}
              </span>
              <div className="text-xl font-bold font-mono text-white mt-1">
                ₹{thisWeekEarnings}
              </div>
              <span className="text-[10px] text-zinc-400">{thisWeekDeliveries.length} {t.delivery.filterThisWeek}</span>
            </div>

            {/* 3. This Month's Earnings */}
            <div className="bg-[#121418] rounded-xl border border-white/[0.06] p-3.5">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide block">
                {t.delivery.thisMonthsEarnings}
              </span>
              <div className="text-xl font-bold font-mono text-white mt-1">
                ₹{thisMonthEarnings}
              </div>
              <span className="text-[10px] text-zinc-400">{thisMonthDeliveries.length} {t.delivery.filterThisMonth}</span>
            </div>

            {/* 4. Total Earnings */}
            <div className="bg-[#121418] rounded-xl border border-white/[0.06] p-3.5">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide block">
                {t.delivery.totalEarnings}
              </span>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                ₹{totalFaresEarned}
              </div>
              <span className="text-[10px] text-emerald-400/80">{t.delivery.fareEarned}</span>
            </div>

            {/* 5. Completed Rides */}
            <div className="bg-[#121418] rounded-xl border border-white/[0.06] p-3.5">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide block">
                {t.delivery.completedRides}
              </span>
              <div className="text-xl font-bold font-mono text-white mt-1">
                {completedDeliveries.length}
              </div>
              <span className="text-[10px] text-zinc-400">{t.delivery.otpVerified}</span>
            </div>

            {/* 6. Average Fare Per Completed Ride */}
            <div className="bg-[#121418] rounded-xl border border-white/[0.06] p-3.5">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide block">
                {t.delivery.avgFarePerRide}
              </span>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                ₹{avgFarePerRide}
              </div>
              <span className="text-[10px] text-zinc-400">{t.delivery.fareEarned}</span>
            </div>

            {/* Distance metrics - ONLY when reliable distance data exists */}
            {hasReliableDistance && (
              <>
                <div className="bg-[#121418] rounded-xl border border-white/[0.06] p-3.5">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide block">
                    {t.delivery.totalDistance}
                  </span>
                  <div className="text-xl font-bold font-mono text-sky-400 mt-1">
                    {totalDistanceKm} km
                  </div>
                  <span className="text-[10px] text-zinc-400">{t.delivery.totalDistance}</span>
                </div>
                <div className="bg-[#121418] rounded-xl border border-white/[0.06] p-3.5">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide block">
                    {t.delivery.avgDistancePerRide}
                  </span>
                  <div className="text-xl font-bold font-mono text-sky-400 mt-1">
                    {avgDistanceKm} km
                  </div>
                  <span className="text-[10px] text-zinc-400">{t.delivery.avgDistancePerRide}</span>
                </div>
              </>
            )}
          </div>

          {/* Simple Clean Earnings Trend Visualization */}
          <div className="bg-[#121418] rounded-2xl border border-white/[0.08] p-4 shadow-md space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t.delivery.weeklyTrendTitle}</span>
              </span>
              <span className="text-[11px] text-zinc-400">{t.delivery.fareEarned}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Weekly bar when week or today selected */}
              {(historyPeriod === 'week' || historyPeriod === 'today' || historyPeriod === 'all') && (
                <div className="p-3 bg-[#09090b]/80 rounded-xl border border-white/[0.04] space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400 font-medium">{t.delivery.thisWeeksEarnings}</span>
                    <span className="font-mono font-bold text-white">₹{thisWeekEarnings}</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (thisWeekEarnings / Math.max(1, thisMonthEarnings)) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-500">
                    <span>{thisWeekDeliveries.length} {t.delivery.filterThisWeek}</span>
                    <span>{Math.round((thisWeekEarnings / Math.max(1, thisMonthEarnings)) * 100)}%</span>
                  </div>
                </div>
              )}

              {/* Monthly bar when month or all selected */}
              {(historyPeriod === 'month' || historyPeriod === 'all' || historyPeriod === 'week') && (
                <div className="p-3 bg-[#09090b]/80 rounded-xl border border-white/[0.04] space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400 font-medium">{t.delivery.thisMonthsEarnings}</span>
                    <span className="font-mono font-bold text-white">₹{thisMonthEarnings}</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-400 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (thisMonthEarnings / Math.max(1, totalFaresEarned)) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-500">
                    <span>{thisMonthDeliveries.length} {t.delivery.filterThisMonth}</span>
                    <span>{Math.round((thisMonthEarnings / Math.max(1, totalFaresEarned)) * 100)}%</span>
                  </div>
                </div>
              )}

              {/* Today's specific bar when today selected */}
              {historyPeriod === 'today' && (
                <div className="p-3 bg-[#09090b]/80 rounded-xl border border-white/[0.04] space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400 font-medium">{t.delivery.todaysEarnings}</span>
                    <span className="font-mono font-bold text-emerald-400">₹{todayEarnings}</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-400 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (todayEarnings / Math.max(1, thisWeekEarnings)) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-500">
                    <span>{completedTodayList.length} {t.delivery.filterToday}</span>
                    <span>{Math.round((todayEarnings / Math.max(1, thisWeekEarnings)) * 100)}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* List of Completed Rides */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-semibold">
                {t.delivery.completedRides} ({filteredHistory.length})
              </span>
              <button
                onClick={loadOrders}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>{t.common.refresh}</span>
              </button>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="bg-[#0f1115] rounded-2xl border border-white/[0.08] p-10 text-center text-zinc-500">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-40 text-zinc-500" />
                <p className="text-sm font-bold text-white">{t.delivery.noCompletedDeliveries}</p>
                <p className="text-xs text-zinc-500 mt-1">
                  {t.delivery.noCompletedDeliveriesDesc}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredHistory.map((ord) => {
                  const completedDate = ord.completed_at ? new Date(ord.completed_at) : new Date(ord.created_at);
                  const formattedDate = completedDate.toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  });
                  const formattedTime = completedDate.toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  });
                  const fare = ord.delivery_fare || 180;
                  const rideDisplayId = ord.id.replace('ord_', 'FH');

                  return (
                    <div
                      key={ord.id}
                      className="bg-[#0f1115]/90 rounded-2xl border border-white/[0.08] p-4 shadow-md hover:border-emerald-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      {/* Left: Ride ID, Route, Date & Time */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white font-mono">
                            {t.delivery.orderId} #{rideDisplayId}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            {t.customer.stageDelivered}
                          </span>
                        </div>

                        {/* Route: Farm -> Customer */}
                        <div className="text-zinc-300 flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-white">{ord.farmer_name}</span>
                          <span className="text-zinc-500 font-bold">→</span>
                          <span className="font-semibold text-white">{ord.customer_name}</span>
                          <span className="text-zinc-500 text-[11px]">({ord.delivery_address})</span>
                        </div>

                        {/* Date, Time, and verified OTP */}
                        <div className="text-[11px] text-zinc-500 flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-zinc-500" />
                            {formattedDate}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-zinc-500" />
                            {formattedTime}
                          </span>
                          <span>•</span>
                          <span>{t.delivery.otpVerified}: <span className="font-mono text-emerald-400">{ord.otp_code}</span></span>
                          {typeof ord.distance_km === 'number' && ord.distance_km > 0 && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-sky-400 font-semibold">{ord.distance_km} km</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right: Fare Earned */}
                      <div className="text-left sm:text-right border-t sm:border-t-0 border-white/[0.06] pt-2 sm:pt-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold">
                          {t.delivery.fareEarned}
                        </span>
                        <span className="text-base font-black font-mono text-emerald-400">
                          ₹{fare}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. ACTIVE TRANSIT ROUTES TAB (OTP Verification Flow) */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">{t.delivery.activeRoutesTitle}</h2>
              <p className="text-xs text-zinc-400">
                {t.delivery.workspaceSubtitle}
              </p>
            </div>
            <button
              onClick={loadOrders}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 px-3 py-1.5 bg-emerald-500/10 rounded-lg flex items-center gap-1 border border-emerald-500/30"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t.common.refresh}</span>
            </button>
          </div>

          {activeDeliveries.length === 0 ? (
            <div className="bg-[#0f1115] rounded-2xl border border-white/[0.08] p-12 text-center text-zinc-500 shadow-xl">
              <Truck className="w-12 h-12 mx-auto mb-2 opacity-40 text-zinc-500" />
              <p className="text-sm font-bold text-white">{t.delivery.noActiveRoutes}</p>
              <p className="text-xs text-zinc-500 mt-1">
                {t.delivery.noActiveRoutesDesc}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeDeliveries.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-[#0f1115]/90 rounded-2xl border border-white/[0.08] p-5 shadow-xl space-y-4"
                >
                  <div className="flex justify-between items-center pb-3 border-b border-white/[0.06]">
                    <div>
                      <span className="font-bold text-sm text-white font-mono">
                        {t.delivery.orderId} #{ord.id.replace('ord_', 'FH')}
                      </span>
                      <span className="ml-2 text-xs font-bold text-blue-300 bg-blue-500/15 border border-blue-500/30 px-2.5 py-0.5 rounded-full">
                        {t.customer.stageOutForDelivery}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold block">{t.delivery.fareEarned}</span>
                      <span className="text-sm font-mono font-black text-emerald-400">
                        ₹{ord.delivery_fare || 180}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="bg-[#121418] p-3 rounded-xl border border-white/[0.06]">
                      <span className="text-zinc-500 font-bold block text-[10px] uppercase">
                        1. {t.delivery.pickupFarm}
                      </span>
                      <div className="font-bold text-white mt-0.5">{ord.farmer_name}</div>
                      {ord.farmer_phone && (
                        <div className="text-zinc-400 flex items-center gap-1 mt-1">
                          <Phone className="w-3 h-3 text-emerald-400" />
                          <span>{ord.farmer_phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="bg-[#121418] p-3 rounded-xl border border-white/[0.06]">
                      <span className="text-zinc-500 font-bold block text-[10px] uppercase">
                        2. {t.delivery.deliveryDestination}
                      </span>
                      <div className="font-bold text-white mt-0.5">{ord.customer_name}</div>
                      <div className="text-zinc-400 flex items-start gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{ord.delivery_address}</span>
                      </div>
                    </div>
                  </div>

                  {/* Centered Clean OTP Verification Section */}
                  <div className="p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      <span>{t.delivery.otpVerified}</span>
                    </div>
                    <p className="text-[11px] text-amber-200/80">
                      {t.delivery.enterCustomerOtp} (₹{ord.delivery_fare || 180} fare)
                    </p>

                    {otpErrors[ord.id] && (
                      <div className="p-2 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{otpErrors[ord.id]}</span>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                      <input
                        type="text"
                        maxLength={6}
                        value={otpInputs[ord.id] || ''}
                        onChange={(e) =>
                          setOtpInputs({ ...otpInputs, [ord.id]: e.target.value.replace(/\D/g, '') })
                        }
                        placeholder={t.delivery.enterCustomerOtp}
                        className="p-2.5 bg-[#121418] border border-amber-500/40 rounded-xl text-center text-sm font-black font-mono tracking-widest text-white focus:outline-none focus:border-amber-400 shadow-sm max-w-xs"
                      />
                      <button
                        onClick={() => handleVerifyOtp(ord.id)}
                        disabled={verifyingId === ord.id}
                        className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {verifyingId === ord.id ? t.delivery.verifying : t.delivery.verifyAndComplete}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. AVAILABLE FARM PICKUPS TAB */}
      {activeTab === 'available' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">{t.delivery.availablePickupsTitle}</h2>
              <p className="text-xs text-zinc-400">
                {t.delivery.workspaceSubtitle}
              </p>
            </div>
            <button
              onClick={loadOrders}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 px-3 py-1.5 bg-emerald-500/10 rounded-lg flex items-center gap-1 border border-emerald-500/30"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t.common.refresh}</span>
            </button>
          </div>

          {availableJobs.length === 0 ? (
            <div className="bg-[#0f1115] rounded-2xl border border-white/[0.08] p-12 text-center text-zinc-500 shadow-xl">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-40 text-zinc-500" />
              <p className="text-sm font-bold text-white">{t.delivery.noAvailablePickups}</p>
              <p className="text-xs text-zinc-500 mt-1">
                {t.delivery.noAvailablePickupsDesc}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableJobs.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-[#0f1115]/90 rounded-2xl border border-white/[0.08] p-5 shadow-xl space-y-3.5 flex flex-col justify-between hover:border-emerald-500/30 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-white/[0.06]">
                      <span className="font-bold text-sm text-white font-mono">
                        {t.delivery.orderId} #{ord.id.replace('ord_', 'FH')}
                      </span>
                      <span className="text-xs font-bold font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                        ₹{ord.delivery_fare || 180} {t.delivery.fareEarned}
                      </span>
                    </div>

                    {/* Farm Origin Point */}
                    <div className="text-xs bg-[#121418] p-3 rounded-xl space-y-1 border border-white/[0.06]">
                      <div className="text-zinc-500 font-bold text-[10px] uppercase tracking-wide">
                        1. {t.delivery.pickupFarm}
                      </div>
                      <div className="font-bold text-white">{ord.farmer_name}</div>
                      {ord.farmer_phone && (
                        <div className="text-zinc-400 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-emerald-400" />
                          <span>{ord.farmer_phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Customer Delivery Destination */}
                    <div className="text-xs bg-[#121418] p-3 rounded-xl space-y-1 border border-white/[0.06]">
                      <div className="text-zinc-500 font-bold text-[10px] uppercase tracking-wide">
                        2. {t.delivery.deliveryDestination}
                      </div>
                      <div className="font-bold text-white">{ord.customer_name}</div>
                      <div className="text-zinc-400 flex items-start gap-1">
                        <MapPin className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">{ord.delivery_address}</span>
                      </div>
                    </div>

                    {/* Produce Items Summary */}
                    <div className="text-xs text-zinc-300 bg-[#121418]/60 p-2.5 rounded-xl border border-white/[0.04]">
                      <span className="text-zinc-500 font-bold block text-[10px] uppercase mb-1">
                        {t.customer.allProduce}
                      </span>
                      {ord.items.map((i) => formatOrderItemSummary(i.title, i.quantity, i.unit, language)).join(', ')}
                    </div>
                  </div>

                  <button
                    onClick={() => handleClaimJob(ord.id)}
                    className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                  >
                    <span>{t.delivery.claimDeliveryRoute}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
