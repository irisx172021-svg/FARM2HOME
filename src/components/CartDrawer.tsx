import React, { useState } from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag, ShieldCheck, MapPin, AlertCircle, ArrowRight } from 'lucide-react';
import { CartItem, Profile, Language } from '../types';
import { getTranslation } from '../lib/translations';
import { formatQuantity, formatOnlyLeft, normalizeUnit } from '../lib/quantity';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  currentProfile: Profile | null;
  language: Language;
  onUpdateQuantity: (cartItemId: string, newQty: number) => Promise<void>;
  onRemoveItem: (cartItemId: string) => Promise<void>;
  onCheckout: (deliveryAddress: string) => Promise<void>;
  isCheckingOut: boolean;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cartItems,
  currentProfile,
  language,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  isCheckingOut,
}) => {
  const t = getTranslation(language);
  const [address, setAddress] = useState(
    currentProfile?.location || 'Flat 402, Green Valley Apts, Hitech City, Hyderabad - 500081'
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (currentProfile?.location) {
      setAddress((prev) => (!prev || prev.includes('Flat 402') ? currentProfile.location! : prev));
    }
  }, [currentProfile?.location]);

  if (!isOpen) return null;

  const totalAmount = cartItems.reduce((sum, item) => {
    const price = item.product?.price || 0;
    return sum + price * item.quantity;
  }, 0);

  const hasStockIssues = cartItems.some(
    (item) => !item.product || item.product.stock <= 0 || item.quantity > item.product.stock
  );

  const handleProceedCheckout = async () => {
    if (!address.trim()) {
      setErrorMsg(t.customer.deliveryAddress);
      return;
    }
    setErrorMsg(null);
    try {
      await onCheckout(address);
    } catch (err: any) {
      setErrorMsg(err.message || 'Checkout failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#0f1115] shadow-2xl flex flex-col rounded-l-2xl border-l border-white/[0.1] text-white">
          {/* Header */}
          <div className="p-4 bg-[#121418] border-b border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">{t.customer.cart}</h2>
                <p className="text-[11px] text-zinc-400">
                  {cartItems.length} {t.customer.uniqueProduceItems}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
              title={t.common.close}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {cartItems.length === 0 ? (
              <div className="text-center py-20 text-zinc-500">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/[0.08] flex items-center justify-center mx-auto mb-3 text-zinc-500">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <p className="text-sm font-bold text-white">{t.customer.emptyCartTitle}</p>
                <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                  {t.customer.emptyCartDesc}
                </p>
                <button
                  onClick={onClose}
                  className="mt-4 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold rounded-xl transition-all shadow-md"
                >
                  {t.customer.browseFreshProduce}
                </button>
              </div>
            ) : (
              cartItems.map((item) => {
                const prod = item.product;
                const isOutOfStock = !prod || prod.stock <= 0;
                const isExceeded = prod && item.quantity > prod.stock;

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-2xl border flex gap-3.5 transition-all ${
                      isOutOfStock || isExceeded
                        ? 'bg-rose-500/10 border-rose-500/30 shadow-md'
                        : 'bg-[#121418] border-white/[0.08] hover:border-emerald-500/30 shadow-md'
                    }`}
                  >
                    <img
                      src={prod?.image_url || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=200'}
                      alt={prod?.title || 'Crop'}
                      className="w-16 h-16 object-cover rounded-xl shrink-0 border border-white/[0.08] bg-zinc-900"
                    />

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-xs font-bold text-white truncate">
                            {prod?.title || 'Unknown crop'}
                          </h4>
                          <button
                            onClick={() => onRemoveItem(item.id)}
                            className="text-zinc-500 hover:text-rose-400 transition-colors p-1"
                            title={t.common.delete}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <p className="text-[11px] text-zinc-400 truncate">
                          {prod?.farmer_name}
                        </p>
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        <div className="text-xs font-bold font-mono text-emerald-400">
                          ₹{prod?.price}
                          <span className="text-[10px] text-zinc-500 font-normal">/{normalizeUnit(prod?.unit)}</span>
                        </div>

                        {/* Quantity Counter Pill */}
                        <div className="flex items-center border border-white/[0.1] rounded-lg bg-[#09090b] overflow-hidden">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                            className="p-1.5 hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors"
                            title="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2.5 text-xs font-bold font-mono text-white min-w-[24px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            disabled={Boolean(prod && item.quantity >= prod.stock)}
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                            className="p-1.5 hover:bg-white/[0.08] text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
                            title="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Stock Warning Messages */}
                      {isOutOfStock && (
                        <p className="text-[10px] text-rose-400 font-medium mt-1.5 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {t.customer.outOfStock}
                        </p>
                      )}
                      {isExceeded && !isOutOfStock && (
                        <p className="text-[10px] text-amber-400 font-medium mt-1.5 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {formatOnlyLeft(prod.stock, prod.unit, language)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Checkout Panel */}
          {cartItems.length > 0 && (
            <div className="p-4 bg-[#121418] border-t border-white/[0.08] space-y-3">
              {/* Delivery Address Input */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t.customer.deliveryAddress}</span>
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={t.customer.deliveryAddress}
                  className="w-full text-xs p-2.5 bg-[#09090b] border border-white/[0.1] text-white rounded-xl focus:outline-none focus:border-emerald-500/50 resize-none"
                />
              </div>

              {/* Distinct Price Calculation Summary */}
              <div className="space-y-1.5 text-xs text-zinc-400 pt-2 border-t border-white/[0.06]">
                <div className="flex justify-between">
                  <span>{t.customer.itemsTotal}</span>
                  <span className="font-semibold font-mono text-white">₹{totalAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t.customer.coldTransitFee}</span>
                  <span className="text-emerald-400 font-semibold">{t.header.zeroMiddleman}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-white pt-1.5 border-t border-white/[0.06]">
                  <span>{t.customer.totalAmount}</span>
                  <span className="text-base font-mono text-emerald-400">₹{totalAmount}</span>
                </div>
              </div>

              {/* OTP Security Guarantee */}
              <div className="flex items-center gap-2 text-[11px] text-emerald-300 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{t.customer.orderOtpNote}</span>
              </div>

              {/* Checkout Button */}
              <button
                type="button"
                onClick={handleProceedCheckout}
                disabled={isCheckingOut || hasStockIssues || cartItems.length === 0}
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold text-xs rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.25)] flex items-center justify-center gap-2"
              >
                {isCheckingOut ? (
                  t.customer.processingCheckout
                ) : (
                  <>
                    <span>{t.customer.proceedToCheckout} • ₹{totalAmount}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
