import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { Order, ReturnExchangeRequest, OrderComplaint } from '../types.ts';
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
  Download,
  ExternalLink,
  ImagePlus,
  Clock,
  ShoppingBag,
  MessageSquareWarning,
  Send,
} from 'lucide-react';

const SEVEN_STAGES = [
  { id: 'Order Placed', title: 'Order Placed', desc: 'Order received and inventory verified' },
  { id: 'Order Confirmed', title: 'Payment & Confirmation', desc: 'Order & payment status confirmed' },
  { id: 'Processing', title: 'Processing & Quality Check', desc: 'Finishing craftsmanship, steam-press & tagging' },
  { id: 'Packed', title: 'Packed & Ready', desc: 'Tamper-proof boutique packaging complete' },
  { id: 'Shipped', title: 'Shipped with Courier', desc: 'Consignment handed over to courier partner' },
  { id: 'Out for Delivery', title: 'Out for Delivery', desc: 'Delivery executive en route to your address' },
  { id: 'Delivered', title: 'Delivered', desc: 'Delivered safely to recipient' },
];

export const OrderTrackingModal: React.FC = () => {
  const { trackingModalOpen, setTrackingModalOpen, lastOrderId, showToast, reorderFromOrder, user } = useStore();
  const [orderQuery, setOrderQuery] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [returnsList, setReturnsList] = useState<ReturnExchangeRequest[]>([]);
  const [complaints, setComplaints] = useState<OrderComplaint[]>([]);
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [complaintCategory, setComplaintCategory] = useState<OrderComplaint['category']>('delivery_delay');
  const [complaintSubject, setComplaintSubject] = useState('');
  const [complaintDesc, setComplaintDesc] = useState('');
  const [replyTextById, setReplyTextById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showReturnBox, setShowReturnBox] = useState(false);
  const [returnType, setReturnType] = useState<'return' | 'exchange'>('return');
  const [requestedSize, setRequestedSize] = useState('M');
  const [selectedItemProductId, setSelectedItemProductId] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [returnPhotos, setReturnPhotos] = useState<string[]>([]);

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
        setReturnsList(Array.isArray(data.returns) ? data.returns : []);
        if (data.order.items?.[0]?.productId) {
          setSelectedItemProductId(data.order.items[0].productId);
        }
        fetch(`/api/user/complaints?email=${encodeURIComponent(data.order.customerEmail)}`)
          .then((cr) => (cr.ok ? cr.json() : null))
          .then((cd) => {
            if (Array.isArray(cd?.complaints)) {
              setComplaints(cd.complaints.filter((c: OrderComplaint) => c.orderId === data.order.id));
            }
          })
          .catch(() => {});
      } else {
        setError(data.error || 'No matching order found for this ID or mobile number.');
        setOrder(null);
        setReturnsList([]);
        setComplaints([]);
      }
    } catch {
      setError('Connection failure while fetching order tracking details.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (trackingModalOpen && lastOrderId) {
      setOrderQuery(lastOrderId);
      fetchOrderByQuery(lastOrderId);
    }
  }, [trackingModalOpen, lastOrderId, fetchOrderByQuery]);

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
        setActionMessage(
          data.order.paymentStatus === 'refund_initiated'
            ? 'Order cancelled and stock released. Online refund has been initiated.'
            : 'Order cancelled and reserved stock released.'
        );
      } else {
        setError(data.error || 'Unable to cancel this order.');
      }
    } catch {
      setError('Failed to process cancellation request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, Math.max(0, 3 - returnPhotos.length));
    files.forEach((file) => {
      if (file.size > 2_000_000) {
        showToast({ title: 'Image Too Large', subtitle: `${file.name} exceeds 2MB limit.`, type: 'error' });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setReturnPhotos((prev) => [...prev, reader.result as string].slice(0, 3));
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
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
        body: JSON.stringify({
          type: returnType,
          reason: returnReason.trim(),
          requestedSize: returnType === 'exchange' ? requestedSize : undefined,
          productId: selectedItemProductId || order.items[0]?.productId,
          photos: returnPhotos,
        }),
      });
      const data = await res.json();
      if (res.ok && data.order) {
        setOrder(data.order);
        if (data.returnRequest) {
          setReturnsList((prev) => [data.returnRequest, ...prev]);
        }
        setShowReturnBox(false);
        setReturnReason('');
        setReturnPhotos([]);
        setActionMessage(
          `${returnType === 'exchange' ? 'Exchange' : 'Return'} request (${
            data.returnRequest?.id || ''
          }) submitted for store inspection.`
        );
      } else {
        setError(data.error || 'Unable to register return/exchange request.');
      }
    } catch {
      setError('Failed to submit return/exchange request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadHtmlInvoice = () => {
    if (!order) return;
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Invoice ${order.id} - Zohra Luxe</title><style>body{font-family:system-ui,-apple-system,sans-serif;max-width:740px;margin:32px auto;padding:24px;color:#141413;border:1px solid #e2dfd7}h1{margin:0 0 4px;font-size:22px;letter-spacing:.08em}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{padding:10px;border-bottom:1px solid #e2dfd7;text-align:left;font-size:13px}th{background:#f7f6f2;text-transform:uppercase;font-size:11px;letter-spacing:.05em}.tot{font-size:15px;font-weight:700}</style></head><body><h1>ZOHRA LUXE — TAX INVOICE</h1><p style="font-size:12px;color:#63615c">Order ID: <strong>${order.id}</strong> | Date: ${new Date(order.createdAt).toLocaleString()} | Status: ${order.orderStatus}</p><hr style="border:none;border-top:1px solid #e2dfd7;margin:16px 0"><p style="font-size:13px"><strong>Billed / Shipped To:</strong><br>${order.customerName} (${order.customerPhone})<br>${order.customerEmail}<br>${order.deliveryAddress.street}, ${order.deliveryAddress.city}, ${order.deliveryAddress.state} - ${order.deliveryAddress.pincode}</p><p style="font-size:13px"><strong>Payment:</strong> ${String(order.paymentMethod).toUpperCase()} (${String(order.paymentStatus).toUpperCase()})${order.transactionId ? ` · Ref: ${order.transactionId}` : ''}</p><table><thead><tr><th>Garment</th><th>Size / Colour</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr></thead><tbody>${order.items
      .map(
        (it) =>
          `<tr><td>${it.name}${it.sku ? ` <small>(${it.sku})</small>` : ''}</td><td>${it.size} / ${it.color}</td><td>${it.quantity}</td><td>₹${it.price.toLocaleString()}</td><td>₹${(it.price * it.quantity).toLocaleString()}</td></tr>`
      )
      .join('')}</tbody></table><p style="font-size:13px">Subtotal: ₹${order.subtotal.toLocaleString()}<br>Discount: -₹${(order.discount || 0).toLocaleString()}${
      order.loyaltyDiscount ? `<br>Loyalty Redeemed: -₹${order.loyaltyDiscount.toLocaleString()}` : ''
    }<br>Shipping: ${order.shipping === 0 ? 'FREE' : `₹${order.shipping}`}</p><p class="tot">Grand Total: ₹${order.total.toLocaleString()}</p></body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ZohraLuxe_Invoice_${order.id}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleComplaintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !complaintSubject.trim() || !complaintDesc.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: order.customerEmail,
          customerName: order.customerName,
          category: complaintCategory,
          subject: complaintSubject.trim(),
          description: complaintDesc.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.complaint) {
        setComplaints((prev) => [data.complaint, ...prev]);
        setShowComplaintForm(false);
        setComplaintSubject('');
        setComplaintDesc('');
        setActionMessage(`Support ticket ${data.complaint.id} created. Our team will respond shortly.`);
      } else {
        setError(data.error || 'Could not submit support ticket.');
      }
    } catch {
      setError('Network error submitting support ticket.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplaintReply = async (complaintId: string) => {
    const txt = (replyTextById[complaintId] || '').trim();
    if (!txt) return;
    const res = await fetch(`/api/complaints/${complaintId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author: user?.name || order?.customerName || 'Customer',
        role: 'customer',
        text: txt,
      }),
    });
    const data = await res.json();
    if (res.ok && data.complaint) {
      setComplaints((prev) => prev.map((c) => (c.id === complaintId ? data.complaint : c)));
      setReplyTextById((prev) => ({ ...prev, [complaintId]: '' }));
    }
  };

  const getStageIndex = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'delivered' || s.includes('return') || s.includes('refund')) return 6;
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
  const isPostDeliveryReturn =
    order && ['Return Requested', 'Returned', 'Refund Initiated', 'Refunded'].includes(order.orderStatus);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-4 flex items-center justify-center">
      <div className="relative w-full max-w-2xl bg-[#F7F6F2] rounded-xl shadow-2xl border border-[#E2DFD7] overflow-hidden my-auto max-h-[94vh] flex flex-col font-sans text-[#141413]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#E2DFD7] bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#ECF4F1] border border-[#E2DFD7] flex items-center justify-center text-[#164E3F]">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#141413]">Live Order Tracker</h3>
              <p className="text-[11px] text-[#63615C]">Real-Time Shipment, Invoice &amp; Return Portal</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setTrackingModalOpen(false);
              setOrder(null);
            }}
            aria-label="Close order tracker"
            className="p-1.5 rounded-md text-[#63615C] hover:text-[#141413] hover:bg-[#EFECE6] transition-colors cursor-pointer"
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
              placeholder="Enter Order ID (e.g. ORD-104821) or Registered Phone Number"
              className="flex-1 text-xs px-4 py-2.5 border border-[#E2DFD7] rounded-md bg-white focus:outline-none focus:border-[#164E3F] font-mono"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[#164E3F] hover:bg-[#0F3A2E] text-white text-xs font-semibold uppercase tracking-wider rounded-md transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>{loading ? 'Locating...' : 'Track'}</span>
            </button>
          </form>

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

          {!order && !error && !loading && (
            <div className="p-6 bg-white rounded-lg border border-[#E2DFD7] text-center space-y-1.5 text-xs text-[#63615C]">
              <p className="font-semibold text-[#141413]">Track any placed order</p>
              <p>
                Enter the Order Reference from your confirmation email/SMS or the recipient mobile number used at checkout.
              </p>
            </div>
          )}

          {order && (
            <div className="space-y-5">
              {/* Order Summary Card */}
              <div className="p-4 bg-white rounded-lg border border-[#E2DFD7] space-y-3 text-xs">
                <div className="flex flex-wrap justify-between items-center gap-2 border-b border-[#E2DFD7] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-[#141413]">{order.id}</span>
                    <span className="text-[11px] text-[#63615C] flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#164E3F]" />
                      <span>
                        {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        reorderFromOrder(order);
                        setTrackingModalOpen(false);
                      }}
                      className="px-2.5 py-1 bg-[#164E3F] text-white rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer hover:bg-[#0F3A2E]"
                    >
                      <ShoppingBag className="w-3 h-3" />
                      <span>Reorder</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadHtmlInvoice}
                      className="px-2.5 py-1 border border-[#E2DFD7] hover:border-[#141413] rounded text-[11px] font-semibold text-[#141413] flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3 text-[#164E3F]" />
                      <span>Invoice</span>
                    </button>
                    <span
                      className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${
                        isCancelled
                          ? 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]'
                          : order.orderStatus === 'Delivered' || order.orderStatus === 'Refunded'
                          ? 'bg-[#ECFDF5] text-[#166534] border-[#A7F3D0]'
                          : 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'
                      }`}
                    >
                      {order.orderStatus}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="text-[#63615C] block">Recipient &amp; Payment</span>
                    <span className="font-semibold text-[#141413]">{order.customerName}</span>
                    <p className="text-[#63615C] font-mono">
                      {order.customerPhone} · {String(order.paymentMethod).toUpperCase()} ({order.paymentStatus})
                    </p>
                  </div>
                  <div>
                    <span className="text-[#63615C] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#164E3F]" />
                      <span>Destination</span>
                    </span>
                    <span className="font-semibold text-[#141413]">
                      {order.deliveryAddress.city}, {order.deliveryAddress.state} - {order.deliveryAddress.pincode}
                    </span>
                  </div>
                </div>

                {!isCancelled && (
                  <div className="p-3 bg-[#F7F6F2] rounded-md border border-[#E2DFD7] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    {order.courierDetails?.trackingNumber ? (
                      <>
                        <div>
                          <span className="text-[#63615C]">Courier Partner: </span>
                          <strong className="text-[#141413]">{order.courierDetails.provider}</strong>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[#63615C]">AWB: </span>
                          <strong className="font-mono text-[#164E3F]">{order.courierDetails.trackingNumber}</strong>
                          {order.courierDetails.trackingUrl && (
                            <a
                              href={order.courierDetails.trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#164E3F] hover:underline inline-flex items-center gap-0.5 text-[11px]"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Track</span>
                            </a>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-[#63615C]">
                        <Clock className="w-3.5 h-3.5 text-[#8E6D3B] shrink-0" />
                        <span>Awaiting dispatch &amp; courier AWB assignment from store</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 7-Stage Vertical Timeline */}
              {!isCancelled && (
                <div className="p-5 bg-white rounded-lg border border-[#E2DFD7] space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#141413]">
                      Shipment Progress
                    </h4>
                    <span className="text-[11px] font-bold text-[#164E3F] font-mono tabular-nums">
                      {isPostDeliveryReturn ? order.orderStatus : `Stage ${Math.min(currentStageIndex + 1, 7)} of 7`}
                    </span>
                  </div>

                  <div className="relative pl-6 space-y-5 before:absolute before:top-3 before:bottom-3 before:left-3 before:w-0.5 before:bg-[#E2DFD7]">
                    {SEVEN_STAGES.map((stg, idx) => {
                      const isCompleted = idx <= currentStageIndex;
                      const isCurrent = idx === currentStageIndex && !isPostDeliveryReturn;

                      return (
                        <div key={stg.id} className="relative flex items-start gap-3.5">
                          <div
                            className={`absolute -left-6 top-0.5 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                              isCompleted
                                ? 'bg-[#166534] text-white'
                                : 'bg-white border-2 border-[#E2DFD7] text-[#E2DFD7]'
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
                                    ? 'text-[#164E3F]'
                                    : isCompleted
                                    ? 'text-[#141413]'
                                    : 'text-[#63615C]'
                                }`}
                              >
                                {stg.title}
                              </p>
                              {isCurrent && (
                                <span className="text-[11px] text-[#166534] font-semibold">Current Stage</span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#63615C] mt-0.5">{stg.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Existing Returns / Exchanges for this Order */}
              {returnsList.length > 0 && (
                <div className="p-4 bg-white rounded-lg border border-[#E2DFD7] space-y-2.5 text-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#164E3F]">
                    Return &amp; Exchange Requests ({returnsList.length})
                  </h4>
                  {returnsList.map((ret) => (
                    <div key={ret.id} className="p-3 bg-[#F7F6F2] rounded border border-[#E2DFD7] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-[#141413]">
                          {ret.id} · {ret.type.toUpperCase()}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white border border-[#E2DFD7] text-[10px] font-semibold uppercase">
                          {ret.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-[#63615C]">
                        {ret.itemName} {ret.requestedSize ? `(Exchange to Size ${ret.requestedSize})` : ''} — &ldquo;{ret.reason}&rdquo;
                      </p>
                      {ret.pickupDetails && (
                        <p className="text-[11px] text-[#164E3F] font-medium">
                          Pickup: {ret.pickupDetails.courier} on {ret.pickupDetails.pickupDate}
                          {ret.pickupDetails.trackingId ? ` (${ret.pickupDetails.trackingId})` : ''}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {isCancelled && (
                <div className="p-4 bg-[#FEF2F2] rounded-lg border border-[#FECACA] text-xs text-[#B91C1C] space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <Ban className="w-4 h-4" /> Order Cancelled
                  </p>
                  <p className="text-[11px]">
                    This order has been cancelled. Reserved inventory has been released and verified refunds are processed per store policy.
                  </p>
                </div>
              )}

              {/* Enclosed Garments */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#63615C]">Ordered Items</h4>
                <div className="divide-y divide-[#E2DFD7] bg-white rounded-lg border border-[#E2DFD7] p-3">
                  {order.items.map((it, i) => (
                    <div key={i} className="py-2.5 flex items-center gap-3 text-xs">
                      <img
                        src={it.image || '/src/assets/images/category_kurtis_showcase_1794109164419.jpg'}
                        alt={it.name}
                        referrerPolicy="no-referrer"
                        className="w-11 h-14 rounded object-cover border border-[#E2DFD7]"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#141413] truncate">{it.name}</p>
                        <p className="text-[11px] text-[#63615C]">
                          Size: <strong className="text-[#141413]">{it.size}</strong> · Shade:{' '}
                          <strong className="text-[#141413]">{it.color}</strong> · Qty: {it.quantity}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-[#141413] tabular-nums">
                        ₹{(it.price * it.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}

                  <div className="pt-2.5 flex justify-between items-center text-xs font-bold">
                    <span>Order Total</span>
                    <span className="font-mono text-[#164E3F] text-sm tabular-nums">
                      ₹{order.total.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Inline Cancel & Return Controls */}
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
                        className="px-4 py-1.5 bg-white border border-[#E2DFD7] text-[#141413] rounded text-xs font-semibold cursor-pointer"
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
                    className="w-full py-2.5 px-4 bg-white hover:bg-[#ECF4F1] text-[#164E3F] text-xs font-semibold rounded-md border border-[#164E3F] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Request 7-Day Return or Size Exchange</span>
                  </button>
                )}

                {showReturnBox && (
                  <form onSubmit={handleReturnSubmit} className="p-4 bg-white border border-[#E2DFD7] rounded-md space-y-3 text-xs">
                    <div className="flex gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                        <input
                          type="radio"
                          checked={returnType === 'return'}
                          onChange={() => setReturnType('return')}
                          className="accent-[#164E3F]"
                        />
                        <span>Return &amp; Refund</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                        <input
                          type="radio"
                          checked={returnType === 'exchange'}
                          onChange={() => setReturnType('exchange')}
                          className="accent-[#164E3F]"
                        />
                        <span>Size Exchange</span>
                      </label>
                    </div>

                    {order.items.length > 1 && (
                      <div>
                        <label className="text-[11px] font-semibold text-[#63615C] block mb-1">Garment</label>
                        <select
                          value={selectedItemProductId}
                          onChange={(e) => setSelectedItemProductId(e.target.value)}
                          className="w-full px-3 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2]"
                        >
                          {order.items.map((it) => (
                            <option key={`${it.productId}-${it.size}`} value={it.productId}>
                              {it.name} (Size {it.size}, {it.color})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {returnType === 'exchange' && (
                      <div>
                        <label className="text-[11px] font-semibold text-[#63615C] block mb-1">
                          Replacement Size Needed
                        </label>
                        <select
                          value={requestedSize}
                          onChange={(e) => setRequestedSize(e.target.value)}
                          className="w-full px-3 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2]"
                        >
                          {['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'].map((s) => (
                            <option key={s} value={s}>
                              Size {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="font-semibold text-[#141413] block mb-1">
                        Reason for {returnType === 'exchange' ? 'Exchange' : 'Return'} *
                      </label>
                      <input
                        type="text"
                        required
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                        placeholder={
                          returnType === 'exchange'
                            ? 'e.g. Bust measurement tight, need L instead of M'
                            : 'e.g. Color slightly different from expectation'
                        }
                        className="w-full px-3 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2] focus:outline-none focus:border-[#164E3F]"
                      />
                    </div>

                    {/* Photo Evidence Upload */}
                    <div className="flex flex-wrap items-center gap-2">
                      {returnPhotos.map((ph, idx) => (
                        <div key={idx} className="relative w-12 h-14 rounded border border-[#E2DFD7] overflow-hidden">
                          <img src={ph} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setReturnPhotos((prev) => prev.filter((_, i) => i !== idx))}
                            className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5 cursor-pointer"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                      {returnPhotos.length < 3 && (
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-[#E2DFD7] rounded text-[11px] text-[#63615C] hover:border-[#164E3F] cursor-pointer">
                          <ImagePlus className="w-3.5 h-3.5" />
                          <span>Attach Garment Photos ({returnPhotos.length}/3)</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="px-4 py-2 bg-[#164E3F] text-white font-semibold rounded-md cursor-pointer"
                      >
                        {actionLoading ? 'Submitting...' : 'Submit Request'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowReturnBox(false)}
                        className="px-4 py-2 border border-[#E2DFD7] text-[#63615C] font-semibold rounded-md cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {/* Order Support & Complaint Desk */}
                <div className="pt-3 border-t border-[#E2DFD7] space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#141413] flex items-center gap-1.5">
                      <MessageSquareWarning className="w-4 h-4 text-[#8E6D3B]" />
                      <span>Order Support &amp; Issue Resolution</span>
                    </h4>
                    {!showComplaintForm && (
                      <button
                        type="button"
                        onClick={() => setShowComplaintForm(true)}
                        className="text-xs font-semibold text-[#164E3F] hover:underline cursor-pointer"
                      >
                        + Raise Issue
                      </button>
                    )}
                  </div>

                  {showComplaintForm && (
                    <form onSubmit={handleComplaintSubmit} className="p-4 bg-white border border-[#E2DFD7] rounded-md space-y-2.5 text-xs">
                      <select
                        value={complaintCategory}
                        onChange={(e) => setComplaintCategory(e.target.value as any)}
                        className="w-full px-3 py-2 border border-[#E2DFD7] rounded bg-[#F7F6F2]"
                      >
                        <option value="delivery_delay">Delivery Delay</option>
                        <option value="quality_issue">Fabric / Quality Concern</option>
                        <option value="wrong_item">Wrong Item or Size Received</option>
                        <option value="payment_refund">Payment or Refund Question</option>
                        <option value="sizing_help">Sizing &amp; Exchange Assistance</option>
                        <option value="other">Other Inquiry</option>
                      </select>
                      <input
                        type="text"
                        required
                        value={complaintSubject}
                        onChange={(e) => setComplaintSubject(e.target.value)}
                        placeholder="Short subject (e.g. Courier update needed)"
                        className="w-full px-3 py-2 border border-[#E2DFD7] rounded bg-[#F7F6F2]"
                      />
                      <textarea
                        required
                        rows={2}
                        value={complaintDesc}
                        onChange={(e) => setComplaintDesc(e.target.value)}
                        placeholder="Describe your issue so our concierge can resolve it..."
                        className="w-full px-3 py-2 border border-[#E2DFD7] rounded bg-[#F7F6F2]"
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={actionLoading}
                          className="px-4 py-1.5 bg-[#164E3F] text-white font-semibold rounded cursor-pointer"
                        >
                          Submit Ticket
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowComplaintForm(false)}
                          className="px-4 py-1.5 border border-[#E2DFD7] rounded text-[#63615C] font-semibold cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {complaints.map((c) => (
                    <div key={c.id} className="p-3.5 bg-white border border-[#E2DFD7] rounded-md space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#141413]">
                          {c.subject} <span className="font-mono text-[10px] text-[#63615C]">({c.id})</span>
                        </span>
                        <span className="px-2 py-0.5 bg-[#F7F6F2] border border-[#E2DFD7] rounded text-[10px] font-bold uppercase">
                          {c.status}
                        </span>
                      </div>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {(c.messages || []).map((m) => (
                          <div
                            key={m.id}
                            className={`p-2 rounded text-[11px] ${
                              m.role === 'admin' ? 'bg-[#ECF4F1] text-[#164E3F]' : 'bg-[#F7F6F2] text-[#141413]'
                            }`}
                          >
                            <strong>{m.author}:</strong> {m.text}
                          </div>
                        ))}
                      </div>
                      {c.status !== 'resolved' && (
                        <div className="flex gap-1.5 pt-1">
                          <input
                            type="text"
                            value={replyTextById[c.id] || ''}
                            onChange={(e) => setReplyTextById((prev) => ({ ...prev, [c.id]: e.target.value }))}
                            placeholder="Reply to support team..."
                            className="flex-1 text-xs px-2.5 py-1.5 border border-[#E2DFD7] rounded bg-[#F7F6F2]"
                          />
                          <button
                            type="button"
                            onClick={() => handleComplaintReply(c.id)}
                            className="px-3 py-1.5 bg-[#141413] text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                            <span>Send</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
