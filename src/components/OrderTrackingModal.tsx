import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { Order } from '../types.ts';
import {
  X,
  Search,
  CheckCircle2,
  Circle,
  Truck,
  RotateCcw,
  Ban,
  AlertCircle,
  MapPin,
  Calendar,
} from 'lucide-react';

const SEVEN_STAGES = [
  { id: 'Order Placed', title: 'Order Placed', desc: 'Order received and verified' },
  { id: 'Order Confirmed', title: 'Order Confirmed', desc: 'Tailoring inspection and inventory locked' },
  { id: 'Processing', title: 'Processing & Quality Check', desc: 'Finishing craftsmanship, steam-press & tagging' },
  { id: 'Packed', title: 'Packed & Ready', desc: 'Tamper-proof boutique packaging complete' },
  { id: 'Shipped', title: 'Shipped with Courier', desc: 'Consignment handed over to air express courier' },
  { id: 'Out for Delivery', title: 'Out for Delivery', desc: 'Delivery executive on route to your address' },
  { id: 'Delivered', title: 'Delivered', desc: 'Delivered safely to recipient' },
];

export const OrderTrackingModal: React.FC = () => {
  const { trackingModalOpen, setTrackingModalOpen, lastOrderId } = useStore();
  const [orderQuery, setOrderQuery] = useState('ORD-98241');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showReturnBox, setShowReturnBox] = useState(false);
  const [returnReason, setReturnReason] = useState('');

  const fetchOrderByQuery = useCallback(async (queryStr: string) => {
    const clean = queryStr.trim();
    if (!clean) return;
    setLoading(true);
    setError(null);
    setActionMessage(null);
    setConfirmCancel(false);
    setShowReturnBox(false);
    try {
      const res = await fetch(`/api/orders/track/${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (res.ok && data.order) {
        setOrder(data.order);
      } else {
        setError(data.error || 'No matching order found for this ID or mobile number.');
        setOrder(null);
      }
    } catch {
      setError('Connection failure while fetching order tracking details.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (trackingModalOpen) {
      const targetId = lastOrderId || orderQuery;
      setOrderQuery(targetId);
      fetchOrderByQuery(targetId);
    }
  }, [trackingModalOpen, lastOrderId]);

  if (!trackingModalOpen) return null;

  const handleTrack = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    fetchOrderByQuery(orderQuery);
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Customer requested cancellation via live tracker' }),
      });
      const data = await res.json();
      if (res.ok && data.order) {
        setOrder(data.order);
        setConfirmCancel(false);
        setActionMessage('Order cancelled successfully. Any online payment will be refunded within 3–5 business days.');
      } else {
        setError(data.error || 'Unable to cancel this order.');
      }
    } catch {
      setError('Failed to process cancellation request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !returnReason.trim()) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: returnReason.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.order) {
        setOrder(data.order);
        setShowReturnBox(false);
        setReturnReason('');
        setActionMessage('Return / Exchange request registered. Courier pickup will be scheduled within 24–48 hours.');
      } else {
        setError(data.error || 'Unable to register return.');
      }
    } catch {
      setError('Failed to submit return request.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStageIndex = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('deliver')) return 6;
    if (s.includes('out for')) return 5;
    if (s.includes('ship')) return 4;
    if (s.includes('pack')) return 3;
    if (s.includes('process')) return 2;
    if (s.includes('confirm')) return 1;
    if (s.includes('place')) return 0;
    return 0;
  };

  const currentStageIndex = order ? getStageIndex(order.orderStatus) : -1;
  const isCancelled = order?.orderStatus === 'Cancelled';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-4 flex items-center justify-center">
      <div className="relative w-full max-w-2xl bg-[#FAF8F5] rounded-xl shadow-2xl border border-[#E5DFD7] overflow-hidden my-auto max-h-[94vh] flex flex-col font-sans text-[#1C1917]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#E5DFD7] bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#FBF2F5] border border-[#E5DFD7] flex items-center justify-center text-[#6D1D3A]">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#1C1917]">Live Order Tracker</h3>
              <p className="text-[11px] text-[#6B625D]">7-Stage Real-Time Consignment Timeline</p>
            </div>
          </div>
          <button
            onClick={() => {
              setTrackingModalOpen(false);
              setOrder(null);
            }}
            aria-label="Close order tracker"
            className="p-1.5 rounded-md text-[#6B625D] hover:text-[#1C1917] hover:bg-[#F3EFEA] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          <form onSubmit={handleTrack} className="flex gap-2">
            <input
              type="text"
              required
              value={orderQuery}
              onChange={(e) => setOrderQuery(e.target.value)}
              placeholder="Enter Order ID (e.g. ORD-98241) or Customer Mobile Number"
              className="flex-1 text-xs px-4 py-2.5 border border-[#E5DFD7] rounded-md bg-white focus:outline-none focus:border-[#6D1D3A] font-mono"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[#6D1D3A] hover:bg-[#53142B] text-white text-xs font-semibold uppercase tracking-wider rounded-md transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>{loading ? 'Locating...' : 'Track'}</span>
            </button>
          </form>

          <div className="flex items-center gap-3 text-[11px] text-[#6B625D] overflow-x-auto">
            <span className="shrink-0 font-medium">Sample Order IDs:</span>
            {['ORD-98241', 'ORD-98242'].map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setOrderQuery(id);
                  fetchOrderByQuery(id);
                }}
                className="font-mono text-[#6D1D3A] underline hover:text-[#53142B] shrink-0 cursor-pointer"
              >
                {id}
              </button>
            ))}
          </div>

          {error && (
            <div className="p-3.5 bg-[#FEF2F2] text-[#B91C1C] text-xs rounded-md border border-[#FECACA] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {actionMessage && (
            <div className="p-3.5 bg-[#ECFDF5] text-[#166534] text-xs rounded-md border border-[#A7F3D0] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{actionMessage}</span>
            </div>
          )}

          {order && (
            <div className="space-y-5">
              {/* Order Summary Card */}
              <div className="p-4 bg-white rounded-lg border border-[#E5DFD7] space-y-3 text-xs">
                <div className="flex flex-wrap justify-between items-center gap-2 border-b border-[#E5DFD7] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-[#1C1917]">{order.id}</span>
                    <span className="text-[11px] text-[#6B625D] flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#6D1D3A]" />
                      <span>
                        {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${
                      isCancelled
                        ? 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]'
                        : order.orderStatus === 'Delivered'
                        ? 'bg-[#ECFDF5] text-[#166534] border-[#A7F3D0]'
                        : 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'
                    }`}
                  >
                    {order.orderStatus}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="text-[#6B625D] block">Recipient</span>
                    <span className="font-semibold text-[#1C1917]">{order.customerName}</span>
                    <p className="text-[#6B625D] font-mono">{order.customerPhone}</p>
                  </div>
                  <div>
                    <span className="text-[#6B625D] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#6D1D3A]" />
                      <span>Destination</span>
                    </span>
                    <span className="font-semibold text-[#1C1917]">
                      {order.deliveryAddress.city}, {order.deliveryAddress.state} - {order.deliveryAddress.pincode}
                    </span>
                  </div>
                </div>

                {order.courierDetails && !isCancelled && (
                  <div className="p-3 bg-[#FAF8F5] rounded-md border border-[#E5DFD7] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[#6B625D]">Courier Partner: </span>
                      <strong className="text-[#1C1917]">{order.courierDetails.provider}</strong>
                    </div>
                    <div>
                      <span className="text-[#6B625D]">AWB Number: </span>
                      <strong className="font-mono text-[#6D1D3A]">{order.courierDetails.trackingNumber}</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* 7-Stage Vertical Timeline */}
              {!isCancelled && (
                <div className="p-5 bg-white rounded-lg border border-[#E5DFD7] space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#1C1917]">
                      Shipment Progress (7 Stages)
                    </h4>
                    <span className="text-[11px] font-bold text-[#6D1D3A] font-mono tabular-nums">
                      Stage {Math.min(currentStageIndex + 1, 7)} of 7
                    </span>
                  </div>

                  <div className="relative pl-6 space-y-5 before:absolute before:top-3 before:bottom-3 before:left-3 before:w-0.5 before:bg-[#E5DFD7]">
                    {SEVEN_STAGES.map((stg, idx) => {
                      const isCompleted = idx <= currentStageIndex;
                      const isCurrent = idx === currentStageIndex;

                      return (
                        <div key={stg.id} className="relative flex items-start gap-3.5">
                          <div
                            className={`absolute -left-6 top-0.5 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                              isCompleted
                                ? 'bg-[#166534] text-white'
                                : 'bg-white border-2 border-[#E5DFD7] text-[#E5DFD7]'
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <Circle className="w-2.5 h-2.5 fill-current" />
                            )}
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p
                                className={`text-xs font-bold ${
                                  isCurrent
                                    ? 'text-[#6D1D3A]'
                                    : isCompleted
                                    ? 'text-[#1C1917]'
                                    : 'text-[#6B625D]'
                                }`}
                              >
                                {stg.title}
                              </p>
                              {isCurrent && (
                                <span className="text-[11px] text-[#166534] font-semibold">Current Stage</span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#6B625D] mt-0.5">{stg.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {isCancelled && (
                <div className="p-4 bg-[#FEF2F2] rounded-lg border border-[#FECACA] text-xs text-[#B91C1C] space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <Ban className="w-4 h-4" /> Order Cancelled
                  </p>
                  <p className="text-[11px]">
                    This order has been cancelled. Any prepaid amount is automatically refunded within 3–5 working days.
                  </p>
                </div>
              )}

              {/* Enclosed Garments */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B625D]">Ordered Items</h4>
                <div className="divide-y divide-[#E5DFD7] bg-white rounded-lg border border-[#E5DFD7] p-3">
                  {order.items.map((it, i) => (
                    <div key={i} className="py-2.5 flex items-center gap-3 text-xs">
                      <img
                        src={it.image || '/src/assets/images/category_kurtis_showcase_1794109164419.jpg'}
                        alt={it.name}
                        referrerPolicy="no-referrer"
                        className="w-11 h-14 rounded object-cover border border-[#E5DFD7]"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#1C1917] truncate">{it.name}</p>
                        <p className="text-[11px] text-[#6B625D]">
                          Size: <strong className="text-[#1C1917]">{it.size}</strong> · Shade:{' '}
                          <strong className="text-[#1C1917]">{it.color}</strong> · Qty: {it.quantity}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-[#1C1917] tabular-nums">
                        ₹{(it.price * it.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}

                  <div className="pt-2.5 flex justify-between items-center text-xs font-bold">
                    <span>Order Total</span>
                    <span className="font-mono text-[#6D1D3A] text-sm tabular-nums">
                      ₹{order.total.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Inline Cancel & Return Controls (Zero window.confirm / window.prompt) */}
              <div className="space-y-3 pt-1">
                {currentStageIndex < 4 && !isCancelled && !confirmCancel && (
                  <button
                    type="button"
                    onClick={() => setConfirmCancel(true)}
                    disabled={actionLoading}
                    className="w-full py-2.5 px-4 bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#B91C1C] text-xs font-semibold rounded-md border border-[#FECACA] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Cancel Order</span>
                  </button>
                )}

                {confirmCancel && (
                  <div className="p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-md space-y-2.5 text-xs">
                    <p className="font-semibold text-[#B91C1C]">
                      Confirm cancelling order {order.id}? This action cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCancelOrder}
                        disabled={actionLoading}
                        className="px-4 py-1.5 bg-[#B91C1C] hover:bg-red-800 text-white rounded text-xs font-semibold cursor-pointer"
                      >
                        {actionLoading ? 'Cancelling...' : 'Yes, Cancel Order'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmCancel(false)}
                        className="px-4 py-1.5 bg-white border border-[#E5DFD7] text-[#1C1917] rounded text-xs font-semibold cursor-pointer"
                      >
                        Keep Order
                      </button>
                    </div>
                  </div>
                )}

                {order.orderStatus === 'Delivered' && !showReturnBox && (
                  <button
                    type="button"
                    onClick={() => setShowReturnBox(true)}
                    disabled={actionLoading}
                    className="w-full py-2.5 px-4 bg-white hover:bg-[#FBF2F5] text-[#6D1D3A] text-xs font-semibold rounded-md border border-[#6D1D3A] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Request 7-Day Return or Size Exchange</span>
                  </button>
                )}

                {showReturnBox && (
                  <form onSubmit={handleReturnSubmit} className="p-4 bg-white border border-[#E5DFD7] rounded-md space-y-3 text-xs">
                    <label className="font-semibold text-[#1C1917] block">
                      Reason for Return / Exchange
                    </label>
                    <input
                      type="text"
                      required
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      placeholder="e.g. Size exchange needed from M to L"
                      className="w-full px-3 py-2 border border-[#E5DFD7] rounded-md bg-[#FAF8F5] focus:outline-none focus:border-[#6D1D3A]"
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="px-4 py-2 bg-[#6D1D3A] text-white font-semibold rounded-md cursor-pointer"
                      >
                        {actionLoading ? 'Submitting...' : 'Submit Request'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowReturnBox(false)}
                        className="px-4 py-2 border border-[#E5DFD7] text-[#6B625D] font-semibold rounded-md cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
