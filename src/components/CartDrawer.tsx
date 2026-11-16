import React, { useState, useEffect } from 'react';
import { useStore, getProductVariantStock } from '../context/StoreContext.tsx';
import { isSizeAvailableForPurchase } from '../utils/pricing.ts';
import { X, Trash2, ArrowRight, Tag, ShieldCheck, ShoppingBag, Truck, Sparkles } from 'lucide-react';

export const CartDrawer: React.FC = () => {
  const {
    cart,
    cartDrawerOpen,
    setCartDrawerOpen,
    updateCartQuantity,
    updateCartItemSize,
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
    getEffectivePrice,
    user,
    token,
    refreshUserProfile,
    showToast,
  } = useStore();

  const [preview, setPreview] = useState<{
    bundleDiscount?: number;
    appliedBundle?: { title: string } | null;
    vipDiscount?: number;
    vipStatus?: { tier?: { name: string } };
    couponDiscount?: number;
    shipping?: number;
    total?: number;
  } | null>(null);
  const [savingConsent, setSavingConsent] = useState(false);

  useEffect(() => {
    if (!cartDrawerOpen || cart.length === 0) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    fetch('/api/checkout/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        items: cart.map((i) => ({
          productId: i.product.id,
          size: i.size,
          color: i.color,
          quantity: i.quantity,
        })),
        customerEmail: user?.email,
        couponCode: appliedCoupon?.code,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.ok) setPreview(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [cartDrawerOpen, cart, appliedCoupon?.code, user?.email, token]);

  const handleToggleCartConsent = async (checked: boolean) => {
    if (!token) return;
    setSavingConsent(true);
    try {
      const res = await fetch('/api/user/consents', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ abandonedCartConsent: checked }),
      });
      if (res.ok) {
        await refreshUserProfile();
        showToast({
          title: checked ? 'Bag Reminder Enabled' : 'Bag Reminder Disabled',
          subtitle: checked ? 'We will sync your saved bag with recovery consent.' : 'Bag recovery reminders turned off.',
          type: 'info',
        });
      }
    } finally {
      setSavingConsent(false);
    }
  };

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
        <div className="w-screen max-w-md bg-[#FAF8F4] border-l border-[#EADFD8] shadow-2xl flex flex-col font-sans text-[#191615]">
          {/* Header */}
          <div className="p-4 bg-[#191615] text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-5 h-5 text-[#E8C5C8]" />
              <h2 className="font-serif text-xl font-semibold">Shopping Bag</h2>
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
          <div className="p-3.5 bg-white border-b border-[#EADFD8] text-xs">
            {amountNeededForFreeShipping > 0 ? (
              <p className="text-[#191615] flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-[#9E5660] shrink-0" />
                <span>
                  Add <strong className="text-[#9E5660] font-mono tabular-nums">₹{amountNeededForFreeShipping}</strong> more for{' '}
                  <strong className="text-[#166534]">Free Express Delivery</strong>
                </span>
              </p>
            ) : (
              <p className="font-semibold text-[#166534] flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 shrink-0" />
                <span>Complimentary Express Delivery Unlocked</span>
              </p>
            )}
            <div className="w-full bg-[#F4EDE2] h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-[#9E5660] h-full transition-all duration-300 rounded-full"
                style={{ width: `${freeShippingProgress}%` }}
              />
            </div>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
            {cart.length === 0 ? (
              <div className="py-16 text-center space-y-4 bg-white rounded-lg border border-[#E2DFD7] p-6">
                <div className="w-14 h-14 mx-auto rounded-full bg-[#ECF4F1] flex items-center justify-center text-[#164E3F]">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <div>
                  <p className="font-serif text-lg font-bold text-[#141413]">Your Shopping Bag Is Empty</p>
                  <p className="text-xs text-[#63615C] mt-1">
                    Explore handcrafted kurtis, anarkalis, and festive women&apos;s wear.
                  </p>
                </div>
                <button
                  onClick={() => setCartDrawerOpen(false)}
                  className="px-6 py-2.5 bg-[#9E5660] hover:bg-[#84424C] text-white text-xs font-semibold uppercase tracking-wider rounded-md transition-colors cursor-pointer"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              cart.map((item) => {
                const maxStock = getProductVariantStock(item.product, item.size, item.color);
                const atLimit = item.quantity >= maxStock;
                const unitPrice = getEffectivePrice(item.product, item.size);
                return (
                  <div
                    key={`${item.product.id}-${item.size}-${item.color}`}
                    className="p-3 bg-white rounded-lg border border-[#EADFD8] flex gap-3 relative"
                  >
                    <div className="w-20 aspect-[3/4] rounded overflow-hidden bg-[#F4EDE2] shrink-0 border border-[#EADFD8]">
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
                          <h3 className="text-xs font-semibold text-[#191615] line-clamp-1">
                            {item.product.name}
                          </h3>
                          <button
                            onClick={() => removeFromCart(item.product.id, item.size, item.color)}
                            className="text-[#665E5B] hover:text-[#B91C1C] transition-colors p-0.5 cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#665E5B] mt-1.5">
                          <label className="inline-flex items-center gap-1">
                            <span>Size:</span>
                            <select
                              aria-label={`Change size for ${item.product.name}`}
                              value={item.size}
                              onChange={(e) =>
                                updateCartItemSize(item.product.id, item.size, item.color, e.target.value)
                              }
                              className="px-1.5 py-0.5 text-[11px] font-semibold text-[#191615] bg-[#FAF8F4] border border-[#EADFD8] rounded cursor-pointer focus:outline-none focus:border-[#9E5660]"
                            >
                              {item.product.sizes.map((sz) => {
                                const szAvail = isSizeAvailableForPurchase(item.product, sz, item.color);
                                const szPrice = getEffectivePrice(item.product, sz);
                                return (
                                  <option key={sz} value={sz} disabled={!szAvail}>
                                    {sz} — ₹{szPrice.toLocaleString()}
                                    {!szAvail ? ' (Unavailable)' : ''}
                                  </option>
                                );
                              })}
                            </select>
                          </label>
                          <span>·</span>
                          <span>Shade: <strong className="text-[#191615]">{item.color}</strong></span>
                        </div>
                        {maxStock <= 5 && maxStock > 0 && (
                          <p className="text-[10px] text-[#B58A4A] font-medium mt-0.5">
                            Only {maxStock} left in this variant
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#F4EDE2]">
                        <div className="flex items-center border border-[#EADFD8] rounded overflow-hidden">
                          <button
                            onClick={() => updateCartQuantity(item.product.id, item.size, item.color, item.quantity - 1)}
                            className="px-2.5 py-0.5 text-xs text-[#191615] hover:bg-[#F4EDE2] cursor-pointer font-bold"
                          >
                            -
                          </button>
                          <span className="px-2.5 text-xs font-bold font-mono tabular-nums text-[#191615] bg-[#FAF8F4]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateCartQuantity(item.product.id, item.size, item.color, item.quantity + 1)}
                            disabled={atLimit}
                            title={atLimit ? `Maximum ${maxStock} available` : 'Increase quantity'}
                            className="px-2.5 py-0.5 text-xs text-[#191615] hover:bg-[#F4EDE2] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-bold"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-bold font-mono text-[#191615] tabular-nums block">
                            ₹{(unitPrice * item.quantity).toLocaleString()}
                          </span>
                          {item.quantity > 1 && (
                            <span className="text-[10px] font-mono text-[#665E5B] tabular-nums">
                              ₹{unitPrice.toLocaleString()} each
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Summary & Checkout Trigger */}
          {cart.length > 0 && (
            <div className="p-4 border-t border-[#E2DFD7] bg-white space-y-3.5">
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
                        className="flex-1 text-xs px-3 py-2 border border-[#E2DFD7] rounded-md uppercase focus:outline-none focus:border-[#164E3F] bg-[#F7F6F2]"
                      />
                      <button
                        onClick={() => handleApplyCoupon()}
                        disabled={applying || !couponInput}
                        className="px-4 py-2 bg-[#141413] hover:bg-[#164E3F] text-white text-xs font-semibold rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {applying ? '...' : 'Apply'}
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] text-[#63615C]">Available offers:</span>
                      {['WELCOME10', 'FESTIVE20', 'FIRST500'].map((code) => (
                        <button
                          key={code}
                          onClick={() => handleApplyCoupon(code)}
                          className="text-[10px] font-mono font-bold px-2 py-0.5 bg-[#ECF4F1] border border-[#164E3F]/20 text-[#164E3F] rounded hover:bg-[#164E3F] hover:text-white transition-colors cursor-pointer"
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

              <div className="space-y-1.5 text-xs text-[#141413] pt-2 border-t border-[#E2DFD7]">
                <div className="flex justify-between">
                  <span className="text-[#63615C]">Subtotal</span>
                  <span className="font-mono tabular-nums font-semibold">₹{cartSubtotal.toLocaleString()}</span>
                </div>
                {(preview?.bundleDiscount || 0) > 0 && (
                  <div className="flex justify-between text-[#166534] font-semibold">
                    <span>Bundle Offer ({preview?.appliedBundle?.title || 'Combo'})</span>
                    <span className="font-mono tabular-nums">-₹{(preview?.bundleDiscount || 0).toLocaleString()}</span>
                  </div>
                )}
                {(preview?.vipDiscount || 0) > 0 && (
                  <div className="flex justify-between text-[#8E6D3B] font-semibold">
                    <span>{preview?.vipStatus?.tier?.name || 'VIP Privilege'}</span>
                    <span className="font-mono tabular-nums">-₹{(preview?.vipDiscount || 0).toLocaleString()}</span>
                  </div>
                )}
                {cartDiscount > 0 && (
                  <div className="flex justify-between text-[#166534] font-semibold">
                    <span>Promo Discount</span>
                    <span className="font-mono tabular-nums">-₹{cartDiscount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#63615C]">Express Shipping</span>
                  <span className="font-mono tabular-nums">
                    {(preview ? preview.shipping : cartShipping) === 0 ? (
                      <strong className="text-[#166534]">FREE</strong>
                    ) : (
                      `₹${preview ? preview.shipping : cartShipping}`
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold text-[#191615] pt-2 border-t border-[#EADFD8]">
                  <span>Total Payable</span>
                  <span className="font-mono tabular-nums text-lg text-[#9E5660]">
                    ₹{(preview?.total !== undefined ? preview.total : cartTotal).toLocaleString()}
                  </span>
                </div>
              </div>

              {user && (
                <label className="flex items-start gap-2 p-2.5 bg-[#FAF8F4] border border-[#EADFD8] rounded text-[11px] text-[#665E5B] cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={savingConsent}
                    checked={Boolean(user.abandonedCartConsent)}
                    onChange={(e) => handleToggleCartConsent(e.target.checked)}
                    className="mt-0.5 accent-[#9E5660]"
                  />
                  <span>
                    <Sparkles className="w-3 h-3 inline text-[#B58A4A] mr-1" />
                    Keep my bag synced &amp; notify me with gentle reminders.
                  </span>
                </label>
              )}

              <button
                onClick={() => {
                  setCartDrawerOpen(false);
                  setCheckoutModalOpen(true);
                }}
                className="w-full py-3.5 bg-[#9E5660] hover:bg-[#84424C] text-white text-xs font-semibold tracking-wider uppercase rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#665E5B]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#166534]" />
                <span>Secure Checkout · Cash on Delivery &amp; Verified Payments</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
