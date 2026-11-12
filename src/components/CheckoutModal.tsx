import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import {
  X,
  ShieldCheck,
  CreditCard,
  QrCode,
  Banknote,
  CheckCircle2,
  ArrowRight,
  PackageCheck,
  Download,
  Truck,
  MapPin,
} from 'lucide-react';

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
    setTrackingModalOpen,
    setLastOrderId,
  } = useStore();

  const defaultAddr = user?.addresses?.find((a) => a.isDefault) || user?.addresses?.[0];

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [street, setStreet] = useState(defaultAddr?.street || '');
  const [city, setCity] = useState(defaultAddr?.city || '');
  const [state, setState] = useState(defaultAddr?.state || 'Delhi');
  const [pincode, setPincode] = useState(defaultAddr?.pincode || '');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online_upi' | 'online_card'>('online_upi');
  const [upiId, setUpiId] = useState('');
  const [cardLast4, setCardLast4] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<any | null>(null);

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

  if (!checkoutModalOpen) return null;

  const estimatedDeliveryDate = new Date(Date.now() + 3 * 86400000).toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !phone.trim() || !street.trim() || !city.trim() || !state.trim() || !pincode.trim()) {
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
        setPlacedOrder(data.order);
        setLastOrderId(data.order.id);
        clearCart();
        refreshProducts();
      } else {
        setError(data.error || 'Unable to place your order. Please verify details and retry.');
      }
    } catch {
      setError('Network communication failure while confirming order.');
    } finally {
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
    } - ${placedOrder.deliveryAddress.pincode}\nPayment Method: ${placedOrder.paymentMethod.toUpperCase()}\nPayment Status: ${placedOrder.paymentStatus.toUpperCase()}\n\nITEMS ORDERED:\n${placedOrder.items
      .map(
        (it: any) =>
          `- ${it.name} | Size: ${it.size} | Shade: ${it.color} | Qty: ${it.quantity} | ₹${(
            it.price * it.quantity
          ).toLocaleString()}`
      )
      .join('\n')}\n\nSubtotal: ₹${placedOrder.subtotal.toLocaleString()}\nDiscount: -₹${placedOrder.discount.toLocaleString()}\nShipping: ${
      placedOrder.shipping === 0 ? 'FREE' : `₹${placedOrder.shipping}`
    }\nTOTAL AMOUNT: ₹${placedOrder.total.toLocaleString()}\n\nThank you for shopping at Zohra Luxe Women's Ethnic Couture.`;

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
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 flex items-center justify-center">
      <div className="relative w-full max-w-4xl bg-[#FAF8F5] rounded-xl shadow-2xl border border-[#E5DFD7] overflow-hidden my-auto max-h-[92vh] flex flex-col font-sans text-[#1C1917]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#6D1D3A] text-white">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5" />
            <h2 className="font-serif text-lg font-bold">
              {placedOrder ? 'Order Confirmation Receipt' : 'Express Online Checkout'}
            </h2>
          </div>
          <button
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
            <div className="py-6 text-center space-y-6 max-w-xl mx-auto bg-white p-6 sm:p-8 rounded-xl border border-[#E5DFD7]">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#ECFDF5] flex items-center justify-center text-[#166534] border border-[#A7F3D0]">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <p className="text-xs uppercase font-bold tracking-widest text-[#166534]">
                  Order Confirmed Successfully
                </p>
                <h3 className="font-serif text-2xl font-bold text-[#1C1917] mt-1.5">
                  Thank You, {placedOrder.customerName}
                </h3>
                <p className="text-xs text-[#6B625D] mt-1.5">
                  Order Reference:{' '}
                  <strong className="text-[#6D1D3A] font-mono text-sm tabular-nums">{placedOrder.id}</strong> · Estimated delivery by{' '}
                  <strong className="text-[#1C1917]">{estimatedDeliveryDate}</strong>
                </p>
              </div>

              <div className="p-4 bg-[#FAF8F5] rounded-lg border border-[#E5DFD7] text-left text-xs space-y-2.5">
                <div className="flex justify-between border-b border-[#E5DFD7] pb-2 font-medium text-[#1C1917]">
                  <span>Delivery PIN: <strong className="font-mono">{placedOrder.deliveryAddress.pincode}</strong></span>
                  <span className="uppercase text-[#6D1D3A] font-bold font-mono">
                    {placedOrder.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Prepaid Verified'}
                  </span>
                </div>
                <div className="space-y-1">
                  {placedOrder.items.map((it: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-[#6B625D]">
                      <span className="truncate pr-2">
                        {it.name} ({it.size} × {it.quantity})
                      </span>
                      <span className="font-mono tabular-nums text-[#1C1917] font-semibold">
                        ₹{(it.price * it.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-sm font-bold text-[#1C1917] pt-2 border-t border-[#E5DFD7]">
                  <span>Grand Total</span>
                  <span className="font-mono tabular-nums text-[#6D1D3A]">
                    ₹{placedOrder.total.toLocaleString()}
                  </span>
                </div>
                <p className="text-[11px] text-[#6B625D] pt-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#6D1D3A] shrink-0" />
                  <span>
                    {placedOrder.deliveryAddress.street}, {placedOrder.deliveryAddress.city},{' '}
                    {placedOrder.deliveryAddress.state}
                  </span>
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <button
                  onClick={() => {
                    handleClose();
                    setTrackingModalOpen(true);
                  }}
                  className="flex-1 py-3 px-4 rounded-md bg-[#6D1D3A] hover:bg-[#53142B] text-white text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>Track Live Order</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadInvoice}
                  className="py-3 px-4 rounded-md border border-[#E5DFD7] bg-white text-[#1C1917] text-xs font-semibold uppercase tracking-wider hover:bg-[#FAF8F5] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#6D1D3A]" />
                  <span>Invoice</span>
                </button>
                <button
                  onClick={handleClose}
                  className="py-3 px-4 rounded-md border border-[#E5DFD7] bg-white text-[#6B625D] text-xs font-semibold uppercase tracking-wider hover:text-[#1C1917] transition-colors cursor-pointer"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Customer, Shipping & Payment Steps */}
              <div className="lg:col-span-7 space-y-5 bg-white p-5 sm:p-6 rounded-xl border border-[#E5DFD7]">
                {error && (
                  <div className="p-3 bg-[#FEF2F2] text-[#B91C1C] text-xs rounded-md border border-[#FECACA]">
                    {error}
                  </div>
                )}

                {/* Step 1: Contact */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#6D1D3A]">
                    1. Recipient Contact Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-[#6B625D] block mb-1">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Aanya Sharma"
                        className="w-full text-xs px-3 py-2 border border-[#E5DFD7] rounded-md bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#6D1D3A]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#6B625D] block mb-1">Mobile Number *</label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full text-xs px-3 py-2 border border-[#E5DFD7] rounded-md bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#6D1D3A]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#6B625D] block mb-1">Email Address (for Invoice) *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full text-xs px-3 py-2 border border-[#E5DFD7] rounded-md bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#6D1D3A]"
                    />
                  </div>
                </div>

                {/* Step 2: Delivery Address */}
                <div className="space-y-3 pt-4 border-t border-[#E5DFD7]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#6D1D3A]">
                    2. Shipping Address
                  </h3>
                  <div>
                    <label className="text-[11px] font-semibold text-[#6B625D] block mb-1">
                      House / Flat No., Building, Street &amp; Landmark *
                    </label>
                    <input
                      type="text"
                      required
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="e.g. Villa 14, Rosewood Lane"
                      className="w-full text-xs px-3 py-2 border border-[#E5DFD7] rounded-md bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#6D1D3A]"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-[#6B625D] block mb-1">City *</label>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. New Delhi"
                        className="w-full text-xs px-3 py-2 border border-[#E5DFD7] rounded-md bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#6D1D3A]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#6B625D] block mb-1">State *</label>
                      <input
                        type="text"
                        required
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="e.g. Delhi"
                        className="w-full text-xs px-3 py-2 border border-[#E5DFD7] rounded-md bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#6D1D3A]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#6B625D] block mb-1">PIN Code (6 digits) *</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        placeholder="e.g. 110001"
                        className="w-full text-xs px-3 py-2 border border-[#E5DFD7] rounded-md bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#6D1D3A] font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#6B625D] block mb-1">
                      Delivery Instructions / Gift Note (Optional)
                    </label>
                    <input
                      type="text"
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="e.g. Call upon arrival or gift wrap request"
                      className="w-full text-xs px-3 py-2 border border-[#E5DFD7] rounded-md bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#6D1D3A]"
                    />
                  </div>
                </div>

                {/* Step 3: Payment Option */}
                <div className="space-y-3 pt-4 border-t border-[#E5DFD7]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#6D1D3A]">
                    3. Payment Method
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('online_upi')}
                      className={`p-3 rounded-lg border text-left flex flex-col justify-between gap-2 transition-colors cursor-pointer ${
                        paymentMethod === 'online_upi'
                          ? 'border-[#6D1D3A] bg-[#FBF2F5] ring-1 ring-[#6D1D3A]'
                          : 'border-[#E5DFD7] bg-white hover:border-[#6D1D3A]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <QrCode className="w-5 h-5 text-[#6D1D3A]" />
                        <span className="text-[10px] font-bold text-[#166534]">Instant</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#1C1917]">UPI Payment</p>
                        <p className="text-[10px] text-[#6B625D]">GPay, PhonePe, Paytm</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('online_card')}
                      className={`p-3 rounded-lg border text-left flex flex-col justify-between gap-2 transition-colors cursor-pointer ${
                        paymentMethod === 'online_card'
                          ? 'border-[#6D1D3A] bg-[#FBF2F5] ring-1 ring-[#6D1D3A]'
                          : 'border-[#E5DFD7] bg-white hover:border-[#6D1D3A]'
                      }`}
                    >
                      <CreditCard className="w-5 h-5 text-[#6D1D3A]" />
                      <div>
                        <p className="text-xs font-bold text-[#1C1917]">Credit / Debit Card</p>
                        <p className="text-[10px] text-[#6B625D]">Visa, Mastercard, RuPay</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cod')}
                      className={`p-3 rounded-lg border text-left flex flex-col justify-between gap-2 transition-colors cursor-pointer ${
                        paymentMethod === 'cod'
                          ? 'border-[#6D1D3A] bg-[#FBF2F5] ring-1 ring-[#6D1D3A]'
                          : 'border-[#E5DFD7] bg-white hover:border-[#6D1D3A]'
                      }`}
                    >
                      <Banknote className="w-5 h-5 text-[#6D1D3A]" />
                      <div>
                        <p className="text-xs font-bold text-[#1C1917]">Cash on Delivery</p>
                        <p className="text-[10px] text-[#6B625D]">Pay cash or UPI at door</p>
                      </div>
                    </button>
                  </div>

                  {paymentMethod === 'online_upi' && (
                    <div className="p-3 bg-[#FAF8F5] border border-[#E5DFD7] rounded-md space-y-1.5 text-xs">
                      <label className="text-[11px] font-semibold text-[#1C1917] block">
                        UPI ID (Optional for instant verification)
                      </label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="e.g. yourname@okicici"
                        className="w-full text-xs px-3 py-2 border border-[#E5DFD7] rounded-md bg-white focus:outline-none focus:border-[#6D1D3A] font-mono"
                      />
                    </div>
                  )}

                  {paymentMethod === 'online_card' && (
                    <div className="p-3 bg-[#FAF8F5] border border-[#E5DFD7] rounded-md space-y-1.5 text-xs">
                      <label className="text-[11px] font-semibold text-[#1C1917] block">
                        Last 4 Digits of Card (Verification)
                      </label>
                      <input
                        type="text"
                        maxLength={4}
                        value={cardLast4}
                        onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, ''))}
                        placeholder="e.g. 4242"
                        className="w-full text-xs px-3 py-2 border border-[#E5DFD7] rounded-md bg-white focus:outline-none focus:border-[#6D1D3A] font-mono"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Live Order Summary Sidebar */}
              <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-[#E5DFD7] space-y-4">
                <div className="flex items-center justify-between border-b border-[#E5DFD7] pb-3">
                  <h3 className="font-serif text-base font-bold text-[#1C1917]">Order Summary</h3>
                  <span className="text-xs font-mono text-[#6B625D] tabular-nums">
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
                        src={item.product.images[0] || '/src/assets/images/category_kurtis_showcase_1794109164419.jpg'}
                        alt={item.product.name}
                        referrerPolicy="no-referrer"
                        className="w-11 h-14 object-cover rounded border border-[#E5DFD7] shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#1C1917] truncate">{item.product.name}</p>
                        <p className="text-[11px] text-[#6B625D]">
                          Size {item.size} · {item.color} · Qty {item.quantity}
                        </p>
                      </div>
                      <span className="font-mono font-semibold text-[#1C1917] tabular-nums">
                        ₹{(item.product.discountedPrice * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-[#FAF8F5] rounded-md border border-[#E5DFD7] text-[11px] text-[#6B625D] flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#6D1D3A] shrink-0" />
                  <span>
                    Estimated arrival by <strong className="text-[#1C1917]">{estimatedDeliveryDate}</strong>
                  </span>
                </div>

                <div className="space-y-1.5 text-xs pt-2 border-t border-[#E5DFD7]">
                  <div className="flex justify-between text-[#6B625D]">
                    <span>Items Subtotal</span>
                    <span className="font-mono tabular-nums font-semibold text-[#1C1917]">
                      ₹{cartSubtotal.toLocaleString()}
                    </span>
                  </div>
                  {cartDiscount > 0 && (
                    <div className="flex justify-between text-[#166534] font-semibold">
                      <span>Promo Discount ({appliedCoupon?.code})</span>
                      <span className="font-mono tabular-nums">-₹{cartDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#6B625D]">
                    <span>Express Shipping</span>
                    <span className="font-mono tabular-nums font-semibold">
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
                  type="submit"
                  disabled={loading || cart.length === 0}
                  className="w-full py-3.5 bg-[#6D1D3A] hover:bg-[#53142B] text-white text-xs font-semibold tracking-wider uppercase rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>{loading ? 'Confirming Order...' : `Confirm & Pay ₹${cartTotal.toLocaleString()}`}</span>
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
