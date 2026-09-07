import React, { useState } from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag, ShieldCheck, MapPin, AlertCircle, ArrowRight } from 'lucide-react';
import { CartItem, Profile, Language } from '../types';
import { translations } from '../lib/translations';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  currentProfile: Profile;
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
  const t = translations[language];
  const [address, setAddress] = useState(
    currentProfile.location || 'Flat 402, Green Valley Apts, Hitech City, Hyderabad - 500081'
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      setErrorMsg('Please enter a delivery address.');
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
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-bold text-stone-900">{t.cart}</h2>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                {cartItems.length} items
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {cartItems.length === 0 ? (
              <div className="text-center py-16 text-stone-400">
                <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-40 text-stone-400" />
                <p className="text-sm font-medium text-stone-600">{t.emptyCart}</p>
                <p className="text-xs text-stone-400 mt-1">Explore our farm harvest and add fresh crops!</p>
              </div>
            ) : (
              cartItems.map((item) => {
                const prod = item.product;
                const isOutOfStock = !prod || prod.stock <= 0;
                const isExceeded = prod && item.quantity > prod.stock;

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border flex gap-3 ${
                      isOutOfStock || isExceeded
                        ? 'bg-rose-50/50 border-rose-200'
                        : 'bg-stone-50/60 border-stone-200'
                    }`}
                  >
                    <img
                      src={prod?.image_url || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=200'}
                      alt={prod?.title || 'Crop'}
                      className="w-16 h-16 object-cover rounded-lg shrink-0 border border-stone-200"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-xs font-semibold text-stone-900 truncate">
                          {prod?.title || 'Unknown crop'}
                        </h4>
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="text-stone-400 hover:text-rose-600 transition-colors p-1"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-[11px] text-stone-500 truncate">
                        {prod?.farmer_name}
                      </p>

                      <div className="mt-1 flex items-center justify-between">
                        <div className="text-xs font-bold text-emerald-700">
                          ₹{prod?.price}
                          <span className="text-[10px] text-stone-500 font-normal">/{prod?.unit}</span>
                        </div>

                        {/* Quantity Counter */}
                        <div className="flex items-center border border-stone-200 rounded-lg bg-white overflow-hidden shadow-2xs">
                          <button
                            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                            className="p-1 hover:bg-stone-100 text-stone-600 transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 text-xs font-semibold text-stone-800">
                            {item.quantity}
                          </span>
                          <button
                            disabled={Boolean(prod && item.quantity >= prod.stock)}
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                            className="p-1 hover:bg-stone-100 text-stone-600 disabled:opacity-30 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Stock Warning Banner */}
                      {isOutOfStock && (
                        <p className="text-[10px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          This item is now out of stock.
                        </p>
                      )}
                      {isExceeded && !isOutOfStock && (
                        <p className="text-[10px] text-amber-700 font-medium mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Only {prod.stock} {prod.unit} available. Please reduce quantity.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with Checkout Info */}
          {cartItems.length > 0 && (
            <div className="p-4 bg-stone-50 border-t border-stone-200 space-y-3">
              {/* Delivery Address Input */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  Delivery Address
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter full street, apartment/house number, city, and pincode..."
                  className="w-full text-xs p-2 bg-white border border-stone-300 rounded-xl focus:outline-emerald-600 resize-none"
                />
              </div>

              {/* Price Calculation */}
              <div className="space-y-1 text-xs text-stone-600 pt-1 border-t border-stone-200">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-stone-800">₹{totalAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Direct Farm Delivery</span>
                  <span className="text-emerald-700 font-medium">Free (Zero Middleman)</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-stone-900 pt-1 border-t border-stone-200">
                  <span>Total Amount</span>
                  <span className="text-emerald-700">₹{totalAmount}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-stone-500 bg-emerald-50/80 p-2 rounded-lg border border-emerald-100">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Protected with Secret 6-Digit Delivery OTP upon doorstep arrival.</span>
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleProceedCheckout}
                disabled={isCheckingOut || hasStockIssues || cartItems.length === 0}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                {isCheckingOut ? (
                  'Securing Farm Stock...'
                ) : (
                  <>
                    <span>{t.checkout} (₹{totalAmount})</span>
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
