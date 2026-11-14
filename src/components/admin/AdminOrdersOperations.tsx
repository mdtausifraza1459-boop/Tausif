import React, { useState } from 'react';
import {
  Search,
  Eye,
  X,
  Truck,
  FileText,
  Printer,
  RotateCcw,
  CreditCard,
  CheckCircle,
  AlertTriangle,
  MessageSquarePlus,
  ShieldCheck,
} from 'lucide-react';
import {
  Order,
  OrderStage,
  PaymentTransaction,
  ReturnExchangeRequest,
} from '../../types.ts';

interface CommonProps {
  adminToken: string;
  pushNotice: (type: 'success' | 'error', text: string) => void;
  onRefresh: () => void;
}

const ORDER_STATUSES: OrderStage[] = [
  'Order Placed',
  'Payment Confirmed',
  'Order Confirmed',
  'Processing',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
  'Return Requested',
  'Returned',
  'Refund Initiated',
  'Refunded',
];

function triggerHtmlDownload(filename: string, html: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function generateTaxInvoiceHtml(order: Order) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Tax Invoice ${order.id}</title>
  <style>body{font-family:Arial,sans-serif;padding:32px;color:#141413;max-width:780px;margin:auto}
  h1{font-family:Georgia,serif;color:#164E3F;margin:0}table{width:100%;border-collapse:collapse;margin-top:20px}
  th,td{border:1px solid #E2DFD7;padding:10px;text-align:left;font-size:13px}th{background:#F7F6F2}
  .meta{display:flex;justify-content:space-between;margin:16px 0;font-size:13px}.right{text-align:right}</style>
  </head><body>
  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #164E3F;padding-bottom:12px">
    <div><h1>ZOHRA LUXE</h1><p style="margin:4px 0;font-size:12px;color:#63615C">Women's Heritage & Couture Atelier</p></div>
    <div class="right"><strong>TAX INVOICE</strong><br>Order ID: ${order.id}<br>Date: ${new Date(order.createdAt).toLocaleString()}</div>
  </div>
  <div class="meta">
    <div><strong>Billed & Shipped To:</strong><br>${order.customerName}<br>${order.deliveryAddress.street}<br>${order.deliveryAddress.city}, ${order.deliveryAddress.state} - ${order.deliveryAddress.pincode}<br>Phone: ${order.customerPhone}<br>Email: ${order.customerEmail}</div>
    <div class="right"><strong>Payment Method:</strong> ${order.paymentMethod.toUpperCase()}<br><strong>Payment Status:</strong> ${order.paymentStatus.toUpperCase()}<br><strong>Order Status:</strong> ${order.orderStatus}</div>
  </div>
  <table><thead><tr><th>SKU</th><th>Item Description</th><th>Size / Colour</th><th>Qty</th><th class="right">Price</th><th class="right">Amount</th></tr></thead><tbody>
  ${order.items.map((it) => `<tr><td>${it.sku || it.productId}</td><td>${it.name}</td><td>${it.size} · ${it.color}</td><td>${it.quantity}</td><td class="right">₹${it.price.toLocaleString()}</td><td class="right">₹${(it.price * it.quantity).toLocaleString()}</td></tr>`).join('')}
  </tbody></table>
  <div style="margin-top:16px;text-align:right;font-size:13px">
    <p>Subtotal: ₹${order.subtotal.toLocaleString()}</p>
    ${order.discount > 0 ? `<p>Coupon Discount: -₹${order.discount.toLocaleString()}</p>` : ''}
    ${order.loyaltyDiscount ? `<p>Loyalty Discount: -₹${order.loyaltyDiscount.toLocaleString()}</p>` : ''}
    <p>Shipping: ${order.shipping === 0 ? 'FREE' : `₹${order.shipping.toLocaleString()}`}</p>
    <p style="font-size:16px;font-weight:bold;color:#164E3F">Grand Total: ₹${order.total.toLocaleString()}</p>
  </div>
  </body></html>`;
}

function generateShippingLabelHtml(order: Order) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Shipping Label ${order.id}</title>
  <style>body{font-family:Arial,sans-serif;padding:24px;color:#141413}
  .label{border:2px solid #141413;padding:20px;max-width:440px}
  .hdr{display:flex;justify-content:space-between;border-bottom:2px solid #141413;padding-bottom:8px;margin-bottom:12px}
  .awb{font-family:monospace;font-size:15px;font-weight:bold;background:#F7F6F2;padding:8px;border:1px dashed #141413;margin:10px 0}</style>
  </head><body><div class="label">
  <div class="hdr"><strong>ZOHRA LUXE DISPATCH</strong><strong>${order.paymentMethod === 'cod' ? `COD: ₹${order.total.toLocaleString()}` : 'PREPAID'}</strong></div>
  <p style="margin:4px 0"><strong>TO:</strong> ${order.customerName}</p>
  <p style="margin:4px 0">${order.deliveryAddress.street}, ${order.deliveryAddress.city}, ${order.deliveryAddress.state} - <strong>${order.deliveryAddress.pincode}</strong></p>
  <p style="margin:4px 0"><strong>TEL:</strong> ${order.customerPhone}</p>
  <div class="awb">ORDER: ${order.id}<br>COURIER: ${order.courierDetails?.provider || 'UNASSIGNED'}<br>AWB: ${order.courierDetails?.trackingNumber || 'PENDING AWB'}</div>
  <p style="font-size:12px;margin-top:8px"><strong>CONTENTS (${order.items.reduce((s, i) => s + i.quantity, 0)} pcs):</strong> ${order.items.map((i) => `${i.name} (${i.size}/${i.color} ×${i.quantity})`).join(', ')}</p>
  </div></body></html>`;
}

// =================== 1. ORDERS MANAGEMENT ===================

export const OrdersManagementView: React.FC<
  CommonProps & {
    orders: Order[];
    shiprocketConfigured: boolean;
    canManageOrders: boolean;
    canModifyPayment: boolean;
  }
> = ({ orders, shiprocketConfigured, canManageOrders, canModifyPayment, adminToken, pushNotice, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filtered = orders.filter((o) => {
    const q = search.trim().toLowerCase();
    const matchQ =
      !q ||
      o.id.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerEmail.toLowerCase().includes(q) ||
      o.customerPhone.toLowerCase().includes(q);
    if (!matchQ) return false;
    if (statusFilter !== 'all' && o.orderStatus !== statusFilter) return false;
    if (paymentFilter !== 'all' && o.paymentMethod !== paymentFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#141413]">Orders &amp; Dispatch Management</h1>
          <p className="text-xs text-[#63615C]">
            Track lifecycle stages, enter courier AWB tracking, record internal notes, and export invoices/labels
          </p>
        </div>

        <span
          className={`px-3 py-1.5 rounded-md text-xs font-semibold border inline-flex items-center gap-1.5 ${
            shiprocketConfigured
              ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#166534]'
              : 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>
            {shiprocketConfigured
              ? 'Shiprocket Courier API Connected'
              : 'Courier API Not Configured (Manual Dispatch Active)'}
          </span>
        </span>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-[#E2DFD7] grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-[#63615C] absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Order ID, Customer Name, Email, or Phone..."
            className="w-full pl-9 pr-3 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2] focus:bg-white focus:outline-none focus:border-[#164E3F]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="p-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2]"
        >
          <option value="all">All Order Statuses ({orders.length})</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="p-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2]"
        >
          <option value="all">All Payment Methods</option>
          <option value="cod">Cash on Delivery</option>
          <option value="razorpay">Razorpay Online</option>
          <option value="online_upi">UPI</option>
          <option value="online_card">Card</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg border border-[#E2DFD7] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F6F2] text-[#63615C] font-semibold border-b border-[#E2DFD7]">
              <tr>
                <th className="p-3">Order &amp; Date</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Items</th>
                <th className="p-3">Total &amp; Payment</th>
                <th className="p-3">Courier / AWB</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DFD7]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#63615C]">
                    No orders match your current search or filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((ord) => (
                  <tr key={ord.id} className="hover:bg-[#F7F6F2]/70">
                    <td className="p-3">
                      <p className="font-mono font-bold text-[#164E3F]">{ord.id}</p>
                      <p className="text-[10px] text-[#63615C] font-mono">
                        {new Date(ord.createdAt).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="p-3">
                      <p className="font-semibold text-[#141413]">{ord.customerName}</p>
                      <p className="text-[10px] text-[#63615C] font-mono">{ord.customerPhone}</p>
                    </td>
                    <td className="p-3 font-mono tabular-nums">
                      {ord.items.reduce((s, i) => s + i.quantity, 0)} pcs
                    </td>
                    <td className="p-3">
                      <p className="font-mono font-bold tabular-nums">₹{ord.total.toLocaleString()}</p>
                      <p className="text-[10px] uppercase text-[#63615C]">
                        {ord.paymentMethod} ·{' '}
                        <span className={ord.paymentStatus === 'paid' ? 'text-[#166534] font-bold' : 'text-[#B45309]'}>
                          {ord.paymentStatus}
                        </span>
                      </p>
                    </td>
                    <td className="p-3 text-[11px]">
                      {ord.courierDetails?.trackingNumber ? (
                        <div>
                          <p className="font-semibold text-[#141413]">{ord.courierDetails.provider}</p>
                          <p className="font-mono text-[#164E3F]">{ord.courierDetails.trackingNumber}</p>
                        </div>
                      ) : (
                        <span className="text-[#63615C] italic">Not dispatched</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          ord.orderStatus === 'Delivered'
                            ? 'bg-[#ECFDF5] text-[#166534] border-[#A7F3D0]'
                            : ord.orderStatus === 'Cancelled' || ord.orderStatus === 'Refunded'
                            ? 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]'
                            : 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'
                        }`}
                      >
                        {ord.orderStatus}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(ord)}
                        className="px-3 py-1.5 border border-[#E2DFD7] hover:border-[#164E3F] rounded text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#164E3F]" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          adminToken={adminToken}
          canManageOrders={canManageOrders}
          canModifyPayment={canModifyPayment}
          onClose={() => setSelectedOrder(null)}
          onUpdated={(msg) => {
            setSelectedOrder(null);
            pushNotice('success', msg);
            onRefresh();
          }}
          onError={(m) => pushNotice('error', m)}
        />
      )}
    </div>
  );
};

const OrderDetailModal: React.FC<{
  order: Order;
  adminToken: string;
  canManageOrders: boolean;
  canModifyPayment: boolean;
  onClose: () => void;
  onUpdated: (msg: string) => void;
  onError: (msg: string) => void;
}> = ({ order, adminToken, canManageOrders, canModifyPayment, onClose, onUpdated, onError }) => {
  const [status, setStatus] = useState<OrderStage>(order.orderStatus);
  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus);
  const [courierProvider, setCourierProvider] = useState(order.courierDetails?.provider || '');
  const [trackingNumber, setTrackingNumber] = useState(order.courierDetails?.trackingNumber || '');
  const [trackingUrl, setTrackingUrl] = useState(order.courierDetails?.trackingUrl || '');
  const [estimatedDelivery, setEstimatedDelivery] = useState(order.courierDetails?.estimatedDelivery || '');
  const [internalNote, setInternalNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status,
          ...(canModifyPayment ? { paymentStatus } : {}),
          courierProvider: courierProvider.trim() || undefined,
          trackingNumber: trackingNumber.trim() || undefined,
          trackingUrl: trackingUrl.trim() || undefined,
          estimatedDelivery: estimatedDelivery.trim() || undefined,
          internalNote: internalNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onUpdated(`Order ${order.id} updated (${status}).`);
      } else {
        onError(data.error || 'Failed to update order.');
      }
    } catch {
      onError('Network error updating order.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-4 flex items-center justify-center">
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-[#E2DFD7] p-6 space-y-5 my-auto max-h-[92vh] overflow-y-auto text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2DFD7] pb-3">
          <div>
            <h3 className="font-serif text-xl font-bold text-[#141413]">
              Order <span className="font-mono text-[#164E3F]">{order.id}</span>
            </h3>
            <p className="text-[11px] text-[#63615C]">
              Placed on {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => triggerHtmlDownload(`ZohraLuxe_Invoice_${order.id}.html`, generateTaxInvoiceHtml(order))}
              className="px-3 py-1.5 border border-[#E2DFD7] hover:border-[#164E3F] rounded font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-[#164E3F]" /> Tax Invoice
            </button>
            <button
              type="button"
              onClick={() => triggerHtmlDownload(`ZohraLuxe_ShippingLabel_${order.id}.html`, generateShippingLabelHtml(order))}
              className="px-3 py-1.5 border border-[#E2DFD7] hover:border-[#8E6D3B] rounded font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-[#8E6D3B]" /> Shipping Label
            </button>
            <button type="button" onClick={onClose} className="p-1 cursor-pointer">
              <X className="w-5 h-5 text-[#63615C]" />
            </button>
          </div>
        </div>

        {/* Customer & Items */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3.5 bg-[#F7F6F2] rounded-lg border border-[#E2DFD7] space-y-1">
            <p className="text-[10px] font-bold uppercase text-[#63615C]">Customer &amp; Delivery Address</p>
            <p className="font-bold text-sm text-[#141413]">{order.customerName}</p>
            <p className="font-mono">{order.customerPhone} · {order.customerEmail}</p>
            <p className="text-[#63615C] pt-1">
              {order.deliveryAddress.street}, {order.deliveryAddress.city}, {order.deliveryAddress.state} —{' '}
              <strong className="font-mono text-[#141413]">{order.deliveryAddress.pincode}</strong>
            </p>
          </div>

          <div className="p-3.5 bg-[#F7F6F2] rounded-lg border border-[#E2DFD7] space-y-1 font-mono tabular-nums">
            <p className="text-[10px] font-sans font-bold uppercase text-[#63615C]">Financial Summary</p>
            <div className="flex justify-between"><span>Subtotal:</span><span>₹{order.subtotal.toLocaleString()}</span></div>
            {order.discount > 0 && <div className="flex justify-between text-[#166534]"><span>Coupon ({order.couponCode}):</span><span>-₹{order.discount.toLocaleString()}</span></div>}
            {order.loyaltyDiscount ? <div className="flex justify-between text-[#166534]"><span>Loyalty Redeemed:</span><span>-₹{order.loyaltyDiscount.toLocaleString()}</span></div> : null}
            <div className="flex justify-between"><span>Shipping:</span><span>₹{order.shipping.toLocaleString()}</span></div>
            <div className="flex justify-between font-bold text-sm text-[#164E3F] border-t border-[#E2DFD7] pt-1 mt-1">
              <span>Grand Total:</span><span>₹{order.total.toLocaleString()}</span>
            </div>
            {order.gatewayPaymentId && <p className="text-[10px] text-[#63615C] pt-1">Gateway TX: {order.gatewayPaymentId}</p>}
          </div>
        </div>

        <div className="border border-[#E2DFD7] rounded-lg overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-[#F7F6F2] text-[#63615C] font-semibold">
              <tr>
                <th className="p-2.5">Garment</th>
                <th className="p-2.5">SKU</th>
                <th className="p-2.5">Variant</th>
                <th className="p-2.5">Qty</th>
                <th className="p-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DFD7]">
              {order.items.map((it, idx) => (
                <tr key={idx}>
                  <td className="p-2.5 flex items-center gap-2">
                    <img src={it.image} alt={it.name} className="w-8 h-10 object-cover rounded border border-[#E2DFD7]" />
                    <span className="font-semibold">{it.name}</span>
                  </td>
                  <td className="p-2.5 font-mono text-[11px]">{it.sku || it.productId}</td>
                  <td className="p-2.5">{it.size} · {it.color}</td>
                  <td className="p-2.5 font-mono">{it.quantity}</td>
                  <td className="p-2.5 font-mono font-bold text-right">₹{(it.price * it.quantity).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Fulfillment & Courier Form */}
        {canManageOrders && (
          <form onSubmit={handleSave} className="space-y-3 p-4 bg-[#F7F6F2] rounded-lg border border-[#E2DFD7]">
            <p className="font-bold text-[#141413] text-sm">Fulfillment, Courier &amp; Internal Notes</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Order Lifecycle Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as OrderStage)}
                  className="w-full p-2 border border-[#E2DFD7] rounded bg-white"
                >
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold block mb-1">
                  Payment Status {!canModifyPayment && '(Finance/Owner Only)'}
                </label>
                <select
                  value={paymentStatus}
                  disabled={!canModifyPayment}
                  onChange={(e) => setPaymentStatus(e.target.value as any)}
                  className="w-full p-2 border border-[#E2DFD7] rounded bg-white disabled:opacity-60"
                >
                  <option value="pending">Pending</option>
                  <option value="awaiting_verification">Awaiting Verification</option>
                  <option value="paid">Paid</option>
                  <option value="failed">Failed</option>
                  <option value="refund_initiated">Refund Initiated</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold block mb-1">Courier Provider</label>
                <input
                  type="text"
                  value={courierProvider}
                  onChange={(e) => setCourierProvider(e.target.value)}
                  placeholder="Delhivery / BlueDart"
                  className="w-full p-2 border border-[#E2DFD7] rounded bg-white"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Tracking / AWB ID</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="AWB12345678"
                  className="w-full p-2 border border-[#E2DFD7] rounded bg-white font-mono"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Estimated Delivery</label>
                <input
                  type="text"
                  value={estimatedDelivery}
                  onChange={(e) => setEstimatedDelivery(e.target.value)}
                  placeholder="2-4 Business Days"
                  className="w-full p-2 border border-[#E2DFD7] rounded bg-white"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold block mb-1">Courier Tracking URL (Optional)</label>
              <input
                type="url"
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                placeholder="https://..."
                className="w-full p-2 border border-[#E2DFD7] rounded bg-white font-mono"
              />
            </div>

            <div>
              <label className="font-semibold mb-1 flex items-center gap-1">
                <MessageSquarePlus className="w-3.5 h-3.5 text-[#164E3F]" /> Append Internal Staff Note (Hidden from Customer)
              </label>
              <input
                type="text"
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                placeholder="e.g. Packed with complimentary zari potli pouch"
                className="w-full p-2 border border-[#E2DFD7] rounded bg-white"
              />
            </div>

            {order.internalNotes && order.internalNotes.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] font-bold uppercase text-[#63615C]">Internal Note History</p>
                {order.internalNotes.map((n) => (
                  <div key={n.id} className="p-2 bg-white rounded border border-[#E2DFD7] text-[11px]">
                    <p className="text-[#141413]">{n.text}</p>
                    <p className="text-[10px] text-[#63615C] font-mono mt-0.5">
                      {n.authorEmail} · {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 border border-[#E2DFD7] rounded bg-white font-semibold cursor-pointer">
                Close
              </button>
              <button type="submit" disabled={saving} className="px-5 py-2 bg-[#164E3F] text-white rounded font-semibold cursor-pointer disabled:opacity-50">
                {saving ? 'Updating...' : 'Save Order Update'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// =================== 2. PAYMENTS & REFUNDS LEDGER ===================

export const PaymentsLedgerView: React.FC<
  CommonProps & {
    transactions: PaymentTransaction[];
    orders: Order[];
    gatewayStatus: any;
    canRefund: boolean;
  }
> = ({ transactions, orders, gatewayStatus, canRefund, adminToken, pushNotice, onRefresh }) => {
  const [confirmRefundOrderId, setConfirmRefundOrderId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleRefund = async (orderId: string) => {
    setProcessingId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      setConfirmRefundOrderId(null);
      if (res.ok) {
        pushNotice('success', `Refund processed for Order ${orderId}.`);
        onRefresh();
      } else {
        pushNotice('error', data.error || 'Refund failed.');
      }
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#141413]">Payment Gateway &amp; Refunds</h1>
          <p className="text-xs text-[#63615C]">
            Verified Razorpay transaction captures, COD settlements, and authorized order refunds
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span
            className={`px-3 py-1.5 rounded-md border font-semibold inline-flex items-center gap-1.5 ${
              gatewayStatus?.razorpayConfigured
                ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#166534]'
                : 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            {gatewayStatus?.razorpayConfigured ? 'Razorpay Gateway Active' : 'Razorpay Not Configured'}
          </span>
          <span
            className={`px-3 py-1.5 rounded-md border font-semibold inline-flex items-center gap-1.5 ${
              gatewayStatus?.razorpayWebhookConfigured
                ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#166534]'
                : 'bg-[#F7F6F2] border-[#E2DFD7] text-[#63615C]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            {gatewayStatus?.razorpayWebhookConfigured ? 'Webhooks Verified' : 'Webhook Secret Unset'}
          </span>
        </div>
      </div>

      {/* Gateway Transactions */}
      <div className="bg-white rounded-lg border border-[#E2DFD7] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E2DFD7] bg-[#F7F6F2] font-bold text-xs text-[#141413]">
          Recorded Payment Transactions ({transactions.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F6F2]/50 text-[#63615C] font-semibold border-b border-[#E2DFD7]">
              <tr>
                <th className="p-3">TX ID / Order</th>
                <th className="p-3">Provider / Method</th>
                <th className="p-3">Gateway Refs</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Signature</th>
                <th className="p-3">Status</th>
                {canRefund && <th className="p-3 text-right">Refund Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DFD7]">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-[#63615C]">
                    No payment transactions recorded yet.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const ord = orders.find((o) => o.id === tx.orderId);
                  const canTriggerRefund =
                    canRefund && ord && ord.paymentStatus !== 'refunded' && (tx.status === 'captured' || ord.paymentStatus === 'paid');
                  return (
                    <tr key={tx.id} className="hover:bg-[#F7F6F2]/70">
                      <td className="p-3 font-mono">
                        <p className="font-bold text-[#141413]">{tx.id}</p>
                        <p className="text-[11px] text-[#164E3F]">{tx.orderId}</p>
                      </td>
                      <td className="p-3 uppercase font-semibold">
                        {tx.provider} · {tx.method}
                      </td>
                      <td className="p-3 font-mono text-[10px] text-[#63615C]">
                        <p>{tx.gatewayPaymentId || '—'}</p>
                        {tx.refundId && <p className="text-[#B91C1C]">REF: {tx.refundId}</p>}
                      </td>
                      <td className="p-3 font-mono font-bold tabular-nums">₹{tx.amount.toLocaleString()}</td>
                      <td className="p-3">
                        {tx.gatewaySignatureVerified ? (
                          <span className="text-[#166534] font-semibold inline-flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> HMAC Verified
                          </span>
                        ) : (
                          <span className="text-[#63615C]">N/A ({tx.provider})</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            tx.status === 'captured'
                              ? 'bg-[#ECFDF5] text-[#166534] border-[#A7F3D0]'
                              : tx.status === 'refunded' || tx.status === 'failed'
                              ? 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]'
                              : 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      {canRefund && (
                        <td className="p-3 text-right">
                          {canTriggerRefund ? (
                            confirmRefundOrderId === tx.orderId ? (
                              <div className="inline-flex gap-1.5">
                                <button
                                  type="button"
                                  disabled={processingId === tx.orderId}
                                  onClick={() => handleRefund(tx.orderId)}
                                  className="px-2.5 py-1 bg-[#B91C1C] text-white rounded text-[11px] font-semibold cursor-pointer"
                                >
                                  {processingId === tx.orderId ? 'Refunding...' : 'Confirm Refund'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmRefundOrderId(null)}
                                  className="px-2 py-1 border border-[#E2DFD7] rounded text-[11px] cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmRefundOrderId(tx.orderId)}
                                className="px-2.5 py-1 bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] rounded text-[11px] font-semibold cursor-pointer"
                              >
                                Issue Refund
                              </button>
                            )
                          ) : (
                            <span className="text-[11px] text-[#63615C]">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// =================== 3. RETURNS & EXCHANGES MANAGEMENT ===================

export const ReturnsManagementView: React.FC<
  CommonProps & {
    returnsList: ReturnExchangeRequest[];
    onRefreshStorefront: () => void;
  }
> = ({ returnsList, adminToken, pushNotice, onRefresh, onRefreshStorefront }) => {
  const [filter, setFilter] = useState('all');
  const [activeReturn, setActiveReturn] = useState<ReturnExchangeRequest | null>(null);
  const [status, setStatus] = useState<ReturnExchangeRequest['status']>('approved');
  const [pickupCourier, setPickupCourier] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTrackingId, setPickupTrackingId] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const openManage = (r: ReturnExchangeRequest) => {
    setActiveReturn(r);
    setStatus(r.status);
    setPickupCourier(r.pickupDetails?.courier || '');
    setPickupDate(r.pickupDetails?.pickupDate || '');
    setPickupTrackingId(r.pickupDetails?.trackingId || '');
    setAdminNotes(r.adminNotes || '');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReturn) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/returns/${activeReturn.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status,
          pickupCourier: pickupCourier.trim() || undefined,
          pickupDate: pickupDate || undefined,
          pickupTrackingId: pickupTrackingId.trim() || undefined,
          adminNotes,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        pushNotice(
          'success',
          `Return ${activeReturn.id} updated to ${status.replace(/_/g, ' ')}.${
            data.returnRequest?.inventoryRestored ? ' Variant stock restored.' : ''
          }`
        );
        setActiveReturn(null);
        onRefresh();
        onRefreshStorefront();
      } else {
        pushNotice('error', data.error || 'Failed to update return request.');
      }
    } finally {
      setSaving(false);
    }
  };

  const filtered = returnsList.filter((r) => filter === 'all' || r.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#141413]">Returns, Exchanges &amp; Selective Restock</h1>
          <p className="text-xs text-[#63615C]">
            Inspect uploaded garment photos, schedule reverse pickup, and restore stock only when goods pass quality inspection
          </p>
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="p-2 text-xs border border-[#E2DFD7] rounded-md bg-white"
        >
          <option value="all">All Requests ({returnsList.length})</option>
          <option value="requested">Requested</option>
          <option value="approved">Approved</option>
          <option value="pickup_scheduled">Pickup Scheduled</option>
          <option value="received_eligible">Received (Eligible)</option>
          <option value="received_damaged">Received (Damaged)</option>
          <option value="refund_initiated">Refund Initiated</option>
          <option value="refunded">Refunded</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white p-10 rounded-lg border border-[#E2DFD7] text-center text-xs text-[#63615C]">
            No return or exchange requests found.
          </div>
        ) : (
          filtered.map((r) => (
            <div key={r.id} className="bg-white rounded-lg border border-[#E2DFD7] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-[#164E3F]">{r.id}</span>
                  <span className="uppercase px-2 py-0.5 rounded bg-[#F7F6F2] border border-[#E2DFD7] text-[10px] font-bold">
                    {r.type}
                  </span>
                  <span className="font-mono text-[#63615C]">Order: {r.orderId}</span>
                  {r.inventoryRestored && (
                    <span className="px-2 py-0.5 rounded bg-[#ECFDF5] border border-[#A7F3D0] text-[#166534] text-[10px] font-bold">
                      Stock Restored
                    </span>
                  )}
                </div>
                <p className="font-semibold text-[#141413]">
                  {r.customerName} ({r.customerEmail}) {r.requestedSize ? `· Requested Size: ${r.requestedSize}` : ''}
                </p>
                <p className="text-[#63615C]">Reason: {r.reason}</p>
                {r.photos && r.photos.length > 0 && (
                  <div className="flex gap-2 pt-1">
                    {r.photos.map((src, i) => (
                      <img key={i} src={src} alt="Return proof" className="w-12 h-12 object-cover rounded border border-[#E2DFD7]" />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="px-2.5 py-1 rounded text-[11px] font-bold uppercase bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">
                  {r.status.replace(/_/g, ' ')}
                </span>
                <button
                  type="button"
                  onClick={() => openManage(r)}
                  className="px-3.5 py-1.5 bg-[#164E3F] text-white rounded font-semibold cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Process</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {activeReturn && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs p-4 flex items-center justify-center">
          <div className="bg-white rounded-xl border border-[#E2DFD7] max-w-lg w-full p-6 space-y-4 text-xs shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3">
              <h3 className="font-serif text-lg font-bold">
                Process {activeReturn.type.toUpperCase()} · {activeReturn.id}
              </h3>
              <button type="button" onClick={() => setActiveReturn(null)} className="cursor-pointer">
                <X className="w-5 h-5 text-[#63615C]" />
              </button>
            </div>

            {activeReturn.photos?.length > 0 && (
              <div className="space-y-1">
                <p className="font-bold text-[#141413]">Customer Uploaded Photos</p>
                <div className="flex flex-wrap gap-2">
                  {activeReturn.photos.map((p, i) => (
                    <img key={i} src={p} alt="Return evidence" className="w-20 h-24 object-cover rounded border border-[#E2DFD7]" />
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="font-semibold block mb-1">Decision / Workflow Stage</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2]"
                >
                  <option value="requested">Requested</option>
                  <option value="approved">Approved</option>
                  <option value="pickup_scheduled">Pickup Scheduled</option>
                  <option value="received_eligible">Received (Eligible — Restock Inventory)</option>
                  <option value="received_damaged">Received (Damaged — Do Not Restock)</option>
                  <option value="refund_initiated">Refund Initiated</option>
                  <option value="refunded">Refunded</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>
                {status === 'received_eligible' && !activeReturn.inventoryRestored && (
                  <p className="text-[11px] text-[#166534] mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Saving as Received (Eligible) will automatically restore variant stock once.
                  </p>
                )}
                {status === 'received_damaged' && (
                  <p className="text-[11px] text-[#B45309] mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Damaged returns are NOT added back to sellable stock.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Reverse Courier</label>
                  <input
                    type="text"
                    value={pickupCourier}
                    onChange={(e) => setPickupCourier(e.target.value)}
                    placeholder="Delhivery Reverse"
                    className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2]"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Pickup Date</label>
                  <input
                    type="date"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2]"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Pickup AWB</label>
                  <input
                    type="text"
                    value={pickupTrackingId}
                    onChange={(e) => setPickupTrackingId(e.target.value)}
                    className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Inspection &amp; Resolution Notes</label>
                <textarea
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setActiveReturn(null)} className="px-4 py-2 border border-[#E2DFD7] rounded font-semibold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-[#164E3F] text-white rounded font-semibold cursor-pointer disabled:opacity-50">
                  {saving ? 'Updating...' : 'Update Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
