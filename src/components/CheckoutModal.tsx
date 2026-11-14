import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import {
  X,
  ShieldCheck,
  CreditCard,
  Banknote,
  CheckCircle2,
  ArrowRight,
  PackageCheck,
  Download,
  Truck,
  MapPin,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Gift,
} from 'lucide-react';

interface PaymentConfig {
  razorpayConfigured: boolean;
  keyId: string | null;
  supportedMethods: Record<string, boolean>;
  notice: string;
}

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const CheckoutModal: React.FC = () => {
  const {
    checkoutModalOpen,
    setCheckoutModalOpen,
    cart,
    cartSubtotal,
    cartDiscount,
    cartShipping,
    cartTotal,
    appliedCoupon,
    clearCart,
    user,
    token,
    refreshProducts,
    refreshUserProfile,
    setTrackingModalOpen,
    setLastOrderId,
    getEffectivePrice,
  } = useStore();

  const defaultAddr = user?.addresses?.find((a) => a.isDefault) || user?.addresses?.[0];

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [street, setStreet] = useState(defaultAddr?.street || '');
  const [city, setCity] = useState(defaultAddr?.city || '');
  const [state, setState] = useState(defaultAddr?.state || 'Delhi');
  const [pincode, setPincode] = useState(defaultAddr?.pincode || '');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'razorpay'>('cod');
  const [orderNotes, setOrderNotes] = useState('');

  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [giftCardInput, setGiftCardInput] = useState('');
  const [appliedGiftCardCode, setAppliedGiftCardCode] = useState<string | null>(null);
  const [checkoutPreview, setCheckoutPreview] = useState<any | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => `idem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRetryOrder, setPendingRetryOrder] = useState<any | null>(null);
  const [placedOrder, setPlacedOrder] = useState<any | null>(null);

  useEffect(() => {
    if (!checkoutModalOpen) return;
    fetch('/api/payments/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: PaymentConfig | null) => {
        if (data) {
          setPaymentConfig(data);
          setPaymentMethod(data.razorpayConfigured ? 'razorpay' : 'cod');
        }
      })
      .catch(() => {});
  }, [checkoutModalOpen]);

  useEffect(() => {
    if (checkoutModalOpen && user) {
      if (!name) setName(user.name || '');
      if (!email) setEmail(user.email || '');
      if (!phone && user.phone) setPhone(user.phone);
      const addr = user.addresses?.find((a) => a.isDefault) || user.addresses?.[0];
      if (addr) {
        if (!street) setStreet(addr.street || '');
        if (!city) setCity(addr.city || '');
        if (!state) setState(addr.state || 'Delhi');
        if (!pincode) setPincode(addr.pincode || '');
      }
    }
  }, [checkoutModalOpen, user]);

  useEffect(() => {
    if (!checkoutModalOpen || cart.length === 0) return;
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
        customerEmail: email.trim() || user?.email,
        couponCode: appliedCoupon?.code,
        giftCardCode: appliedGiftCardCode || undefined,
        redeemPoints: useLoyaltyPoints ? pointsToRedeem : 0,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.ok) setCheckoutPreview(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [
    checkoutModalOpen,
    cart,
    email,
    user?.email,
    appliedCoupon?.code,
    appliedGiftCardCode,
    useLoyaltyPoints,
    pointsToRedeem,
    token,
  ]);

  if (!checkoutModalOpen) return null;

  const maxRedeemable = Math.min(user?.loyaltyPoints || 0, Math.max(0, cartSubtotal - cartDiscount));
  const appliedLoyaltyDiscount =
    checkoutPreview?.loyaltyDiscount !== undefined
      ? checkoutPreview.loyaltyDiscount
      : useLoyaltyPoints
      ? Math.min(Math.max(0, pointsToRedeem), maxRedeemable)
      : 0;
  const serverSubtotal = checkoutPreview?.subtotal ?? cartSubtotal;
  const serverBundleDiscount = checkoutPreview?.bundleDiscount ?? 0;
  const serverVipDiscount = checkoutPreview?.vipDiscount ?? 0;
  const serverCouponDiscount = checkoutPreview?.couponDiscount ?? cartDiscount;
  const serverGiftDiscount = checkoutPreview?.giftCardDiscount ?? 0;
  const serverShipping = checkoutPreview?.shipping ?? cartShipping;
  const finalPayable =
    checkoutPreview?.total !== undefined
      ? checkoutPreview.total
      : Math.max(0, cartTotal - appliedLoyaltyDiscount);

  const estimatedDeliveryDate = new Date(Date.now() + 3 * 86400000).toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const handleSelectSavedAddress = (addrId: string) => {
    const addr = user?.addresses?.find((a) => a.id === addrId);
    if (!addr) return;
    setName(addr.fullName || name);
    setPhone(addr.phone || phone);
    setStreet(addr.street);
    setCity(addr.city);
    setState(addr.state);
    setPincode(addr.pincode);
  };

  const launchRazorpayCheckout = async (order: any) => {
    setError(null);
    setLoading(true);
    try {
      const gwRes = await fetch('/api/payments/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      });
      const gwData = await gwRes.json();
      if (!gwRes.ok || !gwData.razorpayOrderId) {
        setPendingRetryOrder(order);
        setError(gwData.error || 'Could not initiate Razorpay checkout.');
        setLoading(false);
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded || !(window as any).Razorpay) {
        setPendingRetryOrder(order);
        setError('Unable to load Razorpay Checkout SDK. Please retry.');
        setLoading(false);
        return;
      }

      const rzp = new (window as any).Razorpay({
        key: gwData.keyId,
        amount: gwData.amount,
        currency: gwData.currency,
        name: 'Zohra Luxe',
        description: `Order ${order.id}`,
        order_id: gwData.razorpayOrderId,
        prefill: {
          name: order.customerName,
          email: order.customerEmail,
          contact: order.customerPhone,
        },
        theme: { color: '#164E3F' },
        modal: {
          ondismiss: () => {
            setPendingRetryOrder(order);
            setError(`Payment cancelled before completion for Order ${order.id}. Click Retry Online Payment to complete.`);
            setLoading(false);
          },
        },
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch('/api/payments/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: order.id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success && verifyData.order) {
              setPendingRetryOrder(null);
              setPlacedOrder(verifyData.order);
              setLastOrderId(verifyData.order.id);
              clearCart();
              refreshProducts();
              if (user) refreshUserProfile();
            } else {
              setPendingRetryOrder(order);
              setError(verifyData.error || 'Payment signature verification failed.');
            }
          } catch {
            setPendingRetryOrder(order);
            setError('Failed to verify Razorpay payment signature.');
          } finally {
            setLoading(false);
          }
        },
      });
      rzp.on('payment.failed', (resp: any) => {
        setPendingRetryOrder(order);
        setError(resp?.error?.description || `Payment failed for Order ${order.id}. You can retry safely.`);
        setLoading(false);
      });
      rzp.open();
    } catch {
      setPendingRetryOrder(order);
      setError('Payment initiation error. Please retry.');
      setLoading(false);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (pendingRetryOrder) {
      await launchRazorpayCheckout(pendingRetryOrder);
      return;
    }

    if (
      !name.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !street.trim() ||
      !city.trim() ||
      !state.trim() ||
      !pincode.trim()
    ) {
      setError('Please complete all recipient contact and shipping address fields.');
      return;
    }

    if (pincode.trim().length !== 6 || !/^\d+$/.test(pincode.trim())) {
      setError('Please enter a valid 6-digit Indian Postal PIN code.');
      return;
    }

    setLoading(true);
    try {
      const orderPayload = {
        idempotencyKey,
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerPhone: phone.trim(),
        deliveryAddress: {
          street: street.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
        },
        items: cart.map((item) => ({
          productId: item.product.id,
          name: item.product.name,
          image: item.product.images[0] || '',
          size: item.size,
          color: item.color,
          price: item.product.discountedPrice,
          quantity: item.quantity,
        })),
        paymentMethod,
        couponCode: appliedCoupon?.code,
        giftCardCode: appliedGiftCardCode || undefined,
        redeemPoints: appliedLoyaltyDiscount > 0 ? appliedLoyaltyDiscount : undefined,
        notes: orderNotes.trim() || undefined,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();
      if (res.ok && data.success && data.order) {
        if (paymentMethod === 'razorpay') {
          await launchRazorpayCheckout(data.order);
        } else {
          setPlacedOrder(data.order);
          setLastOrderId(data.order.id);
          clearCart();
          refreshProducts();
          if (user) refreshUserProfile();
          setLoading(false);
        }
      } else {
        setError(data.error || 'Unable to place your order. Please verify details and retry.');
        setLoading(false);
      }
    } catch {
      setError('Network communication failure while confirming order.');
      setLoading(false);
    }
  };

  const handleDownloadInvoice = () => {
    if (!placedOrder) return;
    const receiptText = `=== ZOHRA LUXE OFFICIAL TAX INVOICE ===\nOrder ID: ${placedOrder.id}\nPlaced On: ${new Date(
      placedOrder.createdAt
    ).toLocaleString()}\nRecipient: ${placedOrder.customerName}\nEmail: ${placedOrder.customerEmail}\nPhone: ${
      placedOrder.customerPhone
    }\nShipping Address: ${placedOrder.deliveryAddress.street}, ${placedOrder.deliveryAddress.city}, ${
      placedOrder.deliveryAddress.state
    } - ${placedOrder.deliveryAddress.pincode}\nPayment Method: ${String(
      placedOrder.paymentMethod
    ).toUpperCase()}\nPayment Status: ${String(placedOrder.paymentStatus).toUpperCase()}${
      placedOrder.transactionId ? `\nTransaction Reference: ${placedOrder.transactionId}` : ''
    }\n\nITEMS ORDERED:\n${placedOrder.items
      .map(
        (it: any) =>
          `- ${it.name} | Size: ${it.size} | Shade: ${it.color} | Qty: ${it.quantity} | ₹${(
            it.price * it.quantity
          ).toLocaleString()}`
      )
      .join('\n')}\n\nSubtotal: ₹${placedOrder.subtotal.toLocaleString()}\nCoupon Discount: -₹${(
      placedOrder.discount || 0
    ).toLocaleString()}${
      placedOrder.loyaltyDiscount ? `\nLoyalty Points Redeemed: -₹${placedOrder.loyaltyDiscount}` : ''
    }\nShipping: ${placedOrder.shipping === 0 ? 'FREE' : `₹${placedOrder.shipping}`}\nTOTAL AMOUNT: ₹${placedOrder.total.toLocaleString()}\n\nThank you for shopping at Zohra Luxe Women's Fashion.`;

    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ZohraLuxe_Invoice_${placedOrder.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setCheckoutModalOpen(false);
    setPlacedOrder(null);
    setPendingRetryOrder(null);
    setError(null);
    setIdempotencyKey(`idem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 flex items-center justify-center">
      <div className="relative w-full max-w-4xl bg-[#F7F6F2] rounded-xl shadow-2xl border border-[#E2DFD7] overflow-hidden my-auto max-h-[92vh] flex flex-col font-sans text-[#141413]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#141413] text-white">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#D4AF6A]" />
            <h2 className="font-serif text-xl font-semibold">
              {placedOrder ? 'Order Confirmation Receipt' : 'Express Online Checkout'}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close checkout"
            className="p-1.5 rounded-md text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {placedOrder ? (
            <div className="py-6 text-center space-y-6 max-w-xl mx-auto bg-white p-6 sm:p-8 rounded-xl border border-[#E2DFD7]">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#ECFDF5] flex items-center justify-center text-[#166534] border border-[#A7F3D0]">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <p className="text-xs uppercase font-bold tracking-widest text-[#166534]">
                  {placedOrder.paymentStatus === 'paid' ? 'Order & Payment Confirmed' : 'Order Placed Successfully'}
                </p>
                <h3 className="font-serif text-2xl font-bold text-[#141413] mt-1.5">
                  Thank You, {placedOrder.customerName}
                </h3>
                <p className="text-xs text-[#63615C] mt-1.5">
                  Order Reference:{' '}
                  <strong className="text-[#164E3F] font-mono text-sm tabular-nums">{placedOrder.id}</strong> · Estimated
                  delivery by <strong className="text-[#141413]">{estimatedDeliveryDate}</strong>
                </p>
              </div>

              <div className="p-4 bg-[#F7F6F2] rounded-lg border border-[#E2DFD7] text-left text-xs space-y-2.5">
                <div className="flex justify-between border-b border-[#E2DFD7] pb-2 font-medium text-[#141413]">
                  <span>
                    Delivery PIN: <strong className="font-mono">{placedOrder.deliveryAddress.pincode}</strong>
                  </span>
                  <span className="uppercase text-[#164E3F] font-bold font-mono">
                    {placedOrder.paymentMethod === 'cod'
                      ? 'Cash on Delivery'
                      : placedOrder.paymentStatus === 'paid'
                      ? 'Paid · Razorpay Verified'
                      : 'Payment Pending'}
                  </span>
                </div>
                <div className="space-y-1">
                  {placedOrder.items.map((it: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-[#63615C]">
                      <span className="truncate pr-2">
                        {it.name} ({it.size} × {it.quantity})
                      </span>
                      <span className="font-mono tabular-nums text-[#141413] font-semibold">
                        ₹{(it.price * it.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-sm font-bold text-[#141413] pt-2 border-t border-[#E2DFD7]">
                  <span>Grand Total</span>
                  <span className="font-mono tabular-nums text-[#164E3F]">
                    ₹{placedOrder.total.toLocaleString()}
                  </span>
                </div>
                <p className="text-[11px] text-[#63615C] pt-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#164E3F] shrink-0" />
                  <span>
                    {placedOrder.deliveryAddress.street}, {placedOrder.deliveryAddress.city},{' '}
                    {placedOrder.deliveryAddress.state}
                  </span>
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    setTrackingModalOpen(true);
                  }}
                  className="flex-1 py-3 px-4 rounded-md bg-[#164E3F] hover:bg-[#0F3A2E] text-white text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>Track Live Order</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadInvoice}
                  className="py-3 px-4 rounded-md border border-[#E2DFD7] bg-white text-[#141413] text-xs font-semibold uppercase tracking-wider hover:bg-[#F7F6F2] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#164E3F]" />
                  <span>Invoice</span>
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="py-3 px-4 rounded-md border border-[#E2DFD7] bg-white text-[#63615C] text-xs font-semibold uppercase tracking-wider hover:text-[#141413] transition-colors cursor-pointer"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Customer, Shipping & Payment Steps */}
              <div className="lg:col-span-7 space-y-5 bg-white p-5 sm:p-6 rounded-xl border border-[#E2DFD7]">
                {error && (
                  <div className="p-3 bg-[#FEF2F2] text-[#B91C1C] text-xs rounded-md border border-[#FECACA] flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p>{error}</p>
                      {pendingRetryOrder && (
                        <button
                          type="button"
                          onClick={() => launchRazorpayCheckout(pendingRetryOrder)}
                          className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-[#B91C1C] text-white rounded text-[11px] font-semibold cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Retry Online Payment</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Saved Addresses Quick Selector */}
                {user && user.addresses && user.addresses.length > 0 && (
                  <div className="space-y-2 pb-4 border-b border-[#E2DFD7]">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#164E3F]">
                      Saved Delivery Addresses
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {user.addresses.map((addr) => (
                        <button
                          key={addr.id}
                          type="button"
                          onClick={() => handleSelectSavedAddress(addr.id)}
                          className={`p-2.5 text-left rounded-md border text-[11px] cursor-pointer transition-colors ${
                            street === addr.street && pincode === addr.pincode
                              ? 'border-[#164E3F] bg-[#ECF4F1]/60'
                              : 'border-[#E2DFD7] bg-[#F7F6F2] hover:border-[#141413]'
                          }`}
                        >
                          <p className="font-semibold text-[#141413] truncate">{addr.fullName}</p>
                          <p className="text-[#63615C] truncate">{addr.street}</p>
                          <p className="font-mono text-[#63615C]">
                            {addr.city} - {addr.pincode}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 1: Contact */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#164E3F]">
                    1. Recipient Contact Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-[#63615C] block mb-1">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Aanya Sharma"
                        className="w-full text-xs px-3 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2] focus:bg-white focus:outline-none focus:border-[#164E3F]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#63615C] block mb-1">Mobile Number *</label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full text-xs px-3 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2] focus:bg-white focus:outline-none focus:border-[#164E3F]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#63615C] block mb-1">
                      Email Address (for Invoice) *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full text-xs px-3 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2] focus:bg-white focus:outline-none focus:border-[#164E3F]"
                    />
                  </div>
                </div>

                {/* Step 2: Delivery Address */}
                <div className="space-y-3 pt-4 border-t border-[#E2DFD7]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#164E3F]">
                    2. Shipping Address
                  </h3>
                  <div>
                    <label className="text-[11px] font-semibold text-[#63615C] block mb-1">
                      House / Flat No., Building, Street &amp; Landmark *
                    </label>
                    <input
                      type="text"
                      required
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="e.g. Villa 14, Rosewood Lane"
                      className="w-full text-xs px-3 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2] focus:bg-white focus:outline-none focus:border-[#164E3F]"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-[#63615C] block mb-1">City *</label>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. New Delhi"
                        className="w-full text-xs px-3 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2] focus:bg-white focus:outline-none focus:border-[#164E3F]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#63615C] block mb-1">State *</label>
                      <input
                        type="text"
                        required
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="e.g. Delhi"
                        className="w-full text-xs px-3 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2] focus:bg-white focus:outline-none focus:border-[#164E3F]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#63615C] block mb-1">
                        PIN Code (6 digits) *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        placeholder="e.g. 110001"
                        className="w-full text-xs px-3 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2] focus:bg-white focus:outline-none focus:border-[#164E3F] font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#63615C] block mb-1">
                      Delivery Instructions / Gift Note (Optional)
                    </label>
                    <input
                      type="text"
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="e.g. Call upon arrival or gift wrap request"
                      className="w-full text-xs px-3 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2] focus:bg-white focus:outline-none focus:border-[#164E3F]"
                    />
                  </div>
                </div>

                {/* Step 3: Payment Option (Honest Gateway Check) */}
                <div className="space-y-3 pt-4 border-t border-[#E2DFD7]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#164E3F]">
                    3. Payment Method
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={!paymentConfig?.razorpayConfigured}
                      onClick={() => setPaymentMethod('razorpay')}
                      className={`p-3.5 rounded-lg border text-left flex flex-col justify-between gap-2 transition-colors ${
                        !paymentConfig?.razorpayConfigured
                          ? 'border-[#E2DFD7] bg-[#F7F6F2] opacity-60 cursor-not-allowed'
                          : paymentMethod === 'razorpay'
                          ? 'border-[#164E3F] bg-[#ECF4F1] ring-1 ring-[#164E3F] cursor-pointer'
                          : 'border-[#E2DFD7] bg-white hover:border-[#164E3F] cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <CreditCard className="w-5 h-5 text-[#164E3F]" />
                        <span
                          className={`text-[10px] font-bold ${
                            paymentConfig?.razorpayConfigured ? 'text-[#166534]' : 'text-[#63615C]'
                          }`}
                        >
                          {paymentConfig?.razorpayConfigured ? 'Razorpay Verified' : 'Not Configured'}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#141413]">
                          UPI, QR, Debit / Credit Card &amp; Net Banking
                        </p>
                        <p className="text-[10px] text-[#63615C]">
                          {paymentConfig?.razorpayConfigured
                            ? 'Pay securely via Razorpay gateway'
                            : 'Gateway credentials unavailable on server'}
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cod')}
                      className={`p-3.5 rounded-lg border text-left flex flex-col justify-between gap-2 transition-colors cursor-pointer ${
                        paymentMethod === 'cod'
                          ? 'border-[#164E3F] bg-[#ECF4F1] ring-1 ring-[#164E3F]'
                          : 'border-[#E2DFD7] bg-white hover:border-[#164E3F]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <Banknote className="w-5 h-5 text-[#164E3F]" />
                        <span className="text-[10px] font-bold text-[#166534]">Active</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#141413]">Cash on Delivery</p>
                        <p className="text-[10px] text-[#63615C]">Pay cash or UPI upon doorstep delivery</p>
                      </div>
                    </button>
                  </div>

                  {paymentConfig && !paymentConfig.razorpayConfigured && (
                    <div className="p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-md text-[11px] text-[#92400E]">
                      {paymentConfig.notice}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Live Order Summary Sidebar */}
              <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-[#E2DFD7] space-y-4">
                <div className="flex items-center justify-between border-b border-[#E2DFD7] pb-3">
                  <h3 className="font-serif text-base font-bold text-[#141413]">Order Summary</h3>
                  <span className="text-xs font-mono text-[#63615C] tabular-nums">
                    {cart.reduce((s, i) => s + i.quantity, 0)} piece(s)
                  </span>
                </div>

                {/* Live Bag Items Preview */}
                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div
                      key={`${item.product.id}-${item.size}-${item.color}`}
                      className="flex items-center gap-3 text-xs"
                    >
                      <img
                        src={
                          item.product.images[0] || '/src/assets/images/category_kurtis_showcase_1794109164419.jpg'
                        }
                        alt={item.product.name}
                        referrerPolicy="no-referrer"
                        className="w-11 h-14 object-cover rounded border border-[#E2DFD7] shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#141413] truncate">{item.product.name}</p>
                        <p className="text-[11px] text-[#63615C]">
                          Size {item.size} · {item.color} · Qty {item.quantity}
                        </p>
                      </div>
                      <span className="font-mono font-semibold text-[#141413] tabular-nums">
                        ₹{(getEffectivePrice(item.product) * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Digital Gift Card Redemption */}
                <div className="p-3 bg-[#F7F6F2] border border-[#E2DFD7] rounded-md space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#141413] flex items-center gap-1.5">
                      <Gift className="w-3.5 h-3.5 text-[#8E6D3B]" />
                      <span>Redeem Digital Gift Card</span>
                    </span>
                    {appliedGiftCardCode && (
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedGiftCardCode(null);
                          setGiftCardInput('');
                        }}
                        className="text-[11px] text-[#B91C1C] font-semibold hover:underline cursor-pointer"
                      >
                        Remove ({appliedGiftCardCode})
                      </button>
                    )}
                  </div>
                  {!appliedGiftCardCode && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={giftCardInput}
                        onChange={(e) => setGiftCardInput(e.target.value.toUpperCase())}
                        placeholder="ZL-GIFT-XXXX-XXXX"
                        className="flex-1 text-xs px-2.5 py-1.5 border border-[#E2DFD7] rounded bg-white font-mono uppercase focus:outline-none focus:border-[#164E3F]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (giftCardInput.trim()) setAppliedGiftCardCode(giftCardInput.trim().toUpperCase());
                        }}
                        className="px-3 py-1.5 bg-[#141413] hover:bg-[#164E3F] text-white text-[11px] font-semibold rounded cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                  {checkoutPreview?.giftCardError && (
                    <p className="text-[11px] text-[#B91C1C] font-medium">{checkoutPreview.giftCardError}</p>
                  )}
                  {checkoutPreview?.couponError && appliedCoupon?.code && (
                    <p className="text-[11px] text-[#B91C1C] font-medium">{checkoutPreview.couponError}</p>
                  )}
                </div>

                {/* Loyalty Points Redemption */}
                {user && (user.loyaltyPoints || 0) > 0 && maxRedeemable > 0 && (
                  <div className="p-3 bg-[#ECF4F1] border border-[#164E3F]/20 rounded-md space-y-2 text-xs">
                    <label className="flex items-center justify-between gap-2 cursor-pointer">
                      <span className="flex items-center gap-1.5 font-semibold text-[#164E3F]">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Redeem Loyalty Points ({user.loyaltyPoints} pts = ₹{user.loyaltyPoints})</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={useLoyaltyPoints}
                        onChange={(e) => {
                          setUseLoyaltyPoints(e.target.checked);
                          if (e.target.checked && pointsToRedeem === 0) {
                            setPointsToRedeem(maxRedeemable);
                          }
                        }}
                        className="accent-[#164E3F] cursor-pointer"
                      />
                    </label>
                    {useLoyaltyPoints && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={maxRedeemable}
                          value={pointsToRedeem}
                          onChange={(e) =>
                            setPointsToRedeem(Math.min(maxRedeemable, Math.max(0, Number(e.target.value) || 0)))
                          }
                          className="w-24 text-xs px-2 py-1 border border-[#E2DFD7] rounded bg-white font-mono"
                        />
                        <span className="text-[11px] text-[#63615C]">Max {maxRedeemable} points for this order</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-3 bg-[#F7F6F2] rounded-md border border-[#E2DFD7] text-[11px] text-[#63615C] flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#164E3F] shrink-0" />
                  <span>
                    Estimated arrival by <strong className="text-[#141413]">{estimatedDeliveryDate}</strong>
                  </span>
                </div>

                <div className="space-y-1.5 text-xs pt-2 border-t border-[#E2DFD7]">
                  <div className="flex justify-between text-[#63615C]">
                    <span>Items Subtotal</span>
                    <span className="font-mono tabular-nums font-semibold text-[#141413]">
                      ₹{serverSubtotal.toLocaleString()}
                    </span>
                  </div>
                  {serverBundleDiscount > 0 && (
                    <div className="flex justify-between text-[#166534] font-semibold">
                      <span>Bundle / Combo Discount</span>
                      <span className="font-mono tabular-nums">-₹{serverBundleDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  {serverVipDiscount > 0 && (
                    <div className="flex justify-between text-[#8E6D3B] font-semibold">
                      <span>VIP Tier ({checkoutPreview?.vipStatus?.tier?.name})</span>
                      <span className="font-mono tabular-nums">-₹{serverVipDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  {serverCouponDiscount > 0 && (
                    <div className="flex justify-between text-[#166534] font-semibold">
                      <span>Promo Discount ({appliedCoupon?.code})</span>
                      <span className="font-mono tabular-nums">-₹{serverCouponDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  {appliedLoyaltyDiscount > 0 && (
                    <div className="flex justify-between text-[#166534] font-semibold">
                      <span>Loyalty Points Credit</span>
                      <span className="font-mono tabular-nums">-₹{appliedLoyaltyDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  {serverGiftDiscount > 0 && (
                    <div className="flex justify-between text-[#166534] font-semibold">
                      <span>Digital Gift Card ({appliedGiftCardCode})</span>
                      <span className="font-mono tabular-nums">-₹{serverGiftDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#63615C]">
                    <span>Express Shipping</span>
                    <span className="font-mono tabular-nums font-semibold">
                      {serverShipping === 0 ? <strong className="text-[#166534]">FREE</strong> : `₹${serverShipping}`}
                    </span>
                  </div>
                  {checkoutPreview?.freeShippingReason && serverShipping === 0 && (
                    <p className="text-[10px] text-[#164E3F] font-medium text-right">
                      {checkoutPreview.freeShippingReason}
                    </p>
                  )}
                  <div className="flex justify-between text-base font-bold text-[#141413] pt-2 border-t border-[#E2DFD7]">
                    <span>Total Payable</span>
                    <span className="font-mono tabular-nums text-lg text-[#164E3F]">
                      ₹{finalPayable.toLocaleString()}
                    </span>
                  </div>
                  {checkoutPreview?.pointsToEarn > 0 && (
                    <p className="text-[10px] text-[#8E6D3B] font-medium text-right">
                      +{checkoutPreview.pointsToEarn} Loyalty Points upon delivery
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || cart.length === 0}
                  className="w-full py-3.5 bg-[#164E3F] hover:bg-[#0F3A2E] text-white text-xs font-semibold tracking-wider uppercase rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>
                    {loading
                      ? 'Processing Order...'
                      : pendingRetryOrder
                      ? 'Retry Online Payment'
                      : paymentMethod === 'razorpay'
                      ? `Proceed to Pay ₹${finalPayable.toLocaleString()}`
                      : `Place COD Order · ₹${finalPayable.toLocaleString()}`}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
