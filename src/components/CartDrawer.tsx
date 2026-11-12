import React, { useState } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { X, Trash2, ArrowRight, Tag, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';

export const CartDrawer: React.FC = () => {
  const {
    cart,
    cartDrawerOpen,
    setCartDrawerOpen,
    updateCartQuantity,
    removeFromCart,
    cartSubtotal,
    cartDiscount,
    cartShipping,
    cartTotal,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    settings,
    setCheckoutModalOpen,
  } = useStore();

  const [couponInput, setCouponInput] = useState('');
  const [couponFeedback, setCouponFeedback] = useState<{ message: string; isError: boolean } | null>(null);
  const [applying, setApplying] = useState(false);

  if (!cartDrawerOpen) return null;

  const freeThreshold = settings?.freeShippingThreshold || 1499;
  const amountNeededForFreeShipping = Math.max(0, freeThreshold - cartSubtotal);
  const freeShippingProgress = Math.min(100, Math.round((cartSubtotal / freeThreshold) * 100));

  const handleApplyCoupon = async (codeToApply?: string) => {
    const code = codeToApply || couponInput;
    if (!code) return;
    setApplying(true);
    setCouponFeedback(null);
    const res = await applyCoupon(code);
    setApplying(false);
    setCouponFeedback({ message: res.message, isError: !res.success });
    if (res.success) setCouponInput('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/55 backdrop-blur-xs">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#FAF8F5] border-l border-[#E5DFD7] shadow-2xl flex flex-col font-sans text-[#1C1917]">
          {/* Header */}
          <div className="p-4 bg-[#6D1D3A] text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-5 h-5" />
              <h2 className="font-serif text-lg font-bold">Shopping Bag</h2>
              <span className="text-xs bg-white/15 text-white font-mono font-semibold px-2 py-0.5 rounded tabular-nums">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} items
              </span>
            </div>
            <button
              onClick={() => setCartDrawerOpen(false)}
              aria-label="Close shopping bag"
              className="p-1.5 rounded-md hover:bg-white/15 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Progress */}
          <div className="p-3.5 bg-white border-b border-[#E5DFD7] text-xs">
            {amountNeededForFreeShipping > 0 ? (
              <p className="text-[#1C1917] flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-[#6D1D3A] shrink-0" />
                <span>
                  Add <strong className="text-[#6D1D3A] font-mono tabular-nums">₹{amountNeededForFreeShipping}</strong> more for{' '}
                  <strong className="text-[#166534]">Free Express Delivery</strong>
                </span>
              </p>
            ) : (
              <p className="font-semibold text-[#166534] flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 shrink-0" />
                <span>Your order qualifies for Complimentary Express Delivery</span>
              </p>
            )}
            <div className="w-full bg-[#F3EFEA] h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-[#6D1D3A] h-full transition-all duration-300 rounded-full"
                style={{ width: `${freeShippingProgress}%` }}
              />
            </div>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
            {cart.length === 0 ? (
              <div className="py-16 text-center space-y-4 bg-white rounded-lg border border-[#E5DFD7] p-6">
                <div className="w-14 h-14 mx-auto rounded-full bg-[#FBF2F5] flex items-center justify-center text-[#6D1D3A]">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <div>
                  <p className="font-serif text-lg font-bold text-[#1C1917]">Your Shopping Bag Is Empty</p>
                  <p className="text-xs text-[#6B625D] mt-1">
                    Explore handcrafted kurtis, anarkalis, and festive women&apos;s wear.
                  </p>
                </div>
                <button
                  onClick={() => setCartDrawerOpen(false)}
                  className="px-6 py-2.5 bg-[#6D1D3A] hover:bg-[#53142B] text-white text-xs font-semibold uppercase tracking-wider rounded-md transition-colors cursor-pointer"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={`${item.product.id}-${item.size}-${item.color}`}
                  className="p-3 bg-white rounded-lg border border-[#E5DFD7] flex gap-3 relative"
                >
                  <div className="w-20 aspect-[3/4] rounded overflow-hidden bg-[#F3EFEA] shrink-0 border border-[#E5DFD7]">
                    <img
                      src={item.product.images[0] || '/src/assets/images/category_kurtis_showcase_1794109164419.jpg'}
                      alt={item.product.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-top"
                    />
                  </div>

                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-xs font-semibold text-[#1C1917] line-clamp-1">
                          {item.product.name}
                        </h3>
                        <button
                          onClick={() => removeFromCart(item.product.id, item.size, item.color)}
                          className="text-[#6B625D] hover:text-[#B91C1C] transition-colors p-0.5 cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-[#6B625D] mt-1">
                        <span>Size: <strong className="text-[#1C1917]">{item.size}</strong></span>
                        <span>·</span>
                        <span>Shade: <strong className="text-[#1C1917]">{item.color}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#E5DFD7]">
                      <div className="flex items-center border border-[#E5DFD7] rounded overflow-hidden">
                        <button
                          onClick={() => updateCartQuantity(item.product.id, item.size, item.color, item.quantity - 1)}
                          className="px-2.5 py-0.5 text-xs text-[#1C1917] hover:bg-[#F3EFEA] cursor-pointer font-bold"
                        >
                          -
                        </button>
                        <span className="px-2.5 text-xs font-bold font-mono tabular-nums text-[#1C1917] bg-[#FAF8F5]">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQuantity(item.product.id, item.size, item.color, item.quantity + 1)}
                          className="px-2.5 py-0.5 text-xs text-[#1C1917] hover:bg-[#F3EFEA] cursor-pointer font-bold"
                        >
                          +
                        </button>
                      </div>

                      <span className="text-sm font-bold font-mono text-[#1C1917] tabular-nums">
                        ₹{(item.product.discountedPrice * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Summary & Checkout Trigger */}
          {cart.length > 0 && (
            <div className="p-4 border-t border-[#E5DFD7] bg-white space-y-3.5">
              <div className="space-y-2">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-2.5 bg-[#ECFDF5] border border-[#A7F3D0] rounded-md text-xs">
                    <div className="flex items-center gap-2 text-[#166534]">
                      <Tag className="w-3.5 h-3.5" />
                      <span>
                        Coupon <strong>{appliedCoupon.code}</strong> applied (-₹{appliedCoupon.discountAmount})
                      </span>
                    </div>
                    <button
                      onClick={removeCoupon}
                      className="text-xs text-[#B91C1C] hover:underline font-semibold cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder="Promo code (e.g. WELCOME10)"
                        className="flex-1 text-xs px-3 py-2 border border-[#E5DFD7] rounded-md uppercase focus:outline-none focus:border-[#6D1D3A] bg-[#FAF8F5]"
                      />
                      <button
                        onClick={() => handleApplyCoupon()}
                        disabled={applying || !couponInput}
                        className="px-4 py-2 bg-[#1C1917] hover:bg-[#6D1D3A] text-white text-xs font-semibold rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {applying ? '...' : 'Apply'}
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] text-[#6B625D]">Available offers:</span>
                      {['WELCOME10', 'FESTIVE20', 'FIRST500'].map((code) => (
                        <button
                          key={code}
                          onClick={() => handleApplyCoupon(code)}
                          className="text-[10px] font-mono font-bold px-2 py-0.5 bg-[#FBF2F5] border border-[#6D1D3A]/20 text-[#6D1D3A] rounded hover:bg-[#6D1D3A] hover:text-white transition-colors cursor-pointer"
                        >
                          {code}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {couponFeedback && (
                  <p className={`text-xs font-medium ${couponFeedback.isError ? 'text-[#B91C1C]' : 'text-[#166534]'}`}>
                    {couponFeedback.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5 text-xs text-[#1C1917] pt-2 border-t border-[#E5DFD7]">
                <div className="flex justify-between">
                  <span className="text-[#6B625D]">Subtotal</span>
                  <span className="font-mono tabular-nums font-semibold">₹{cartSubtotal.toLocaleString()}</span>
                </div>
                {cartDiscount > 0 && (
                  <div className="flex justify-between text-[#166534] font-semibold">
                    <span>Promo Discount</span>
                    <span className="font-mono tabular-nums">-₹{cartDiscount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#6B625D]">Express Shipping</span>
                  <span className="font-mono tabular-nums">
                    {cartShipping === 0 ? <strong className="text-[#166534]">FREE</strong> : `₹${cartShipping}`}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold text-[#1C1917] pt-2 border-t border-[#E5DFD7]">
                  <span>Total Payable</span>
                  <span className="font-mono tabular-nums text-lg text-[#6D1D3A]">
                    ₹{cartTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setCartDrawerOpen(false);
                  setCheckoutModalOpen(true);
                }}
                className="w-full py-3.5 bg-[#6D1D3A] hover:bg-[#53142B] text-white text-xs font-semibold tracking-wider uppercase rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#6B625D]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#166534]" />
                <span>256-Bit Encrypted Checkout · 100% Authentic Women&apos;s Fashion</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
