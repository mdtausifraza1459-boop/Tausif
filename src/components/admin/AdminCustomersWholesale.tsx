import React, { useState } from 'react';
import {
  Search,
  Edit,
  Trash2,
  Download,
  X,
  Plus,
  Star,
  Flag,
  MessageSquare,
  Building2,
  Eye,
  Archive,
} from 'lucide-react';
import { Coupon, Review, WholesaleAccount, WholesaleOrderRequest } from '../../types.ts';
import { downloadAuthorizedFile } from './AdminCatalogInventory.tsx';

interface CommonProps {
  adminToken: string;
  pushNotice: (type: 'success' | 'error', text: string) => void;
  onRefresh: () => void;
}

// =================== 1. CUSTOMERS DIRECTORY ===================

export const CustomersDirectoryView: React.FC<
  CommonProps & {
    customers: any[];
    canManage: boolean;
  }
> = ({ customers, canManage, adminToken, pushNotice, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'activeOrders' | 'deliveredOrders' | 'blocked' | 'archived'>('all');
  const [editing, setEditing] = useState<any | null>(null);
  const [viewingHistory, setViewingHistory] = useState<any | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const filtered = customers.filter((c) => {
    const q = search.trim().toLowerCase();
    const matchQ =
      !q ||
      (c.name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q);
    if (!matchQ) return false;
    if (filter === 'activeOrders') return (c.activeOrdersCount || 0) > 0;
    if (filter === 'deliveredOrders') return !!c.hasDeliveredOrders;
    if (filter === 'blocked') return c.status === 'blocked' || c.status === 'suspended';
    if (filter === 'archived') return c.status === 'archived';
    return true;
  });

  const handleToggleStatus = async (cust: any) => {
    const nextStatus = cust.status === 'active' ? 'blocked' : 'active';
    const res = await fetch(`/api/admin/customers/${cust.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) {
      pushNotice('success', `Customer ${cust.name} set to ${nextStatus}.`);
      onRefresh();
    } else {
      const d = await res.json().catch(() => ({}));
      pushNotice('error', d.error || 'Status update failed.');
    }
  };

  const handleRemoveOrArchive = async (cust: any) => {
    const res = await fetch(`/api/admin/customers/${cust.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const d = await res.json().catch(() => ({}));
    setConfirmRemoveId(null);
    if (res.ok) {
      pushNotice('success', d.message || `Updated ${cust.name}.`);
      onRefresh();
    } else {
      pushNotice('error', d.error || 'Operation failed.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#141413]">Customers Directory</h1>
          <p className="text-xs text-[#63615C]">
            Inspect shopper profiles, order history, loyalty balances, and safely archive accounts without losing financial records
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            downloadAuthorizedFile(
              '/api/admin/customers/export/csv',
              `zohra_customers_${new Date().toISOString().slice(0, 10)}.csv`,
              adminToken,
              (m) => pushNotice('error', m)
            )
          }
          className="px-4 py-2 bg-[#164E3F] hover:bg-[#0F3A2E] text-white text-xs font-semibold rounded-md flex items-center gap-1.5 cursor-pointer self-start"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Customers CSV</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg border border-[#E2DFD7] flex flex-col md:flex-row gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#63615C] absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, email, or phone..."
            className="w-full pl-9 pr-3 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2] focus:bg-white focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'all', label: `All (${customers.length})` },
            { id: 'activeOrders', label: 'Active Orders' },
            { id: 'deliveredOrders', label: 'Delivered' },
            { id: 'blocked', label: 'Blocked' },
            { id: 'archived', label: 'Archived' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-md font-semibold border cursor-pointer ${
                filter === f.id
                  ? 'bg-[#164E3F] text-white border-[#164E3F]'
                  : 'bg-[#F7F6F2] text-[#63615C] border-[#E2DFD7]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-[#E2DFD7] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F6F2] text-[#63615C] font-semibold border-b border-[#E2DFD7]">
              <tr>
                <th className="p-3">Customer</th>
                <th className="p-3">Orders</th>
                <th className="p-3">Lifetime Spend</th>
                <th className="p-3">Loyalty</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DFD7]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#63615C]">
                    No customers match your current filter.
                  </td>
                </tr>
              ) : (
                filtered.map((cust) => (
                  <tr key={cust.id} className="hover:bg-[#F7F6F2]/70">
                    <td className="p-3">
                      <p className="font-semibold text-[#141413]">{cust.name}</p>
                      <p className="font-mono text-[11px] text-[#63615C]">
                        {cust.email} {cust.phone ? `· ${cust.phone}` : ''}
                      </p>
                      {cust.internalNotes && (
                        <p className="text-[10px] text-[#8E6D3B] mt-0.5 italic">{cust.internalNotes}</p>
                      )}
                    </td>
                    <td className="p-3 font-mono tabular-nums">
                      <strong>{cust.orderCount}</strong> total ({cust.deliveredOrdersCount} delivered)
                    </td>
                    <td className="p-3 font-mono font-bold tabular-nums text-[#164E3F]">
                      ₹{(cust.totalSpent || 0).toLocaleString()}
                    </td>
                    <td className="p-3 font-mono tabular-nums">{cust.loyaltyPoints || 0} pts</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          cust.status === 'active'
                            ? 'bg-[#ECFDF5] text-[#166534] border-[#A7F3D0]'
                            : cust.status === 'archived'
                            ? 'bg-[#F7F6F2] text-[#63615C] border-[#E2DFD7]'
                            : 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]'
                        }`}
                      >
                        {cust.status || 'active'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {confirmRemoveId === cust.id ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleRemoveOrArchive(cust)}
                            className="px-2.5 py-1 bg-[#B91C1C] text-white rounded text-[11px] font-semibold cursor-pointer"
                          >
                            {cust.orderCount > 0 ? 'Confirm Archive' : 'Confirm Delete'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmRemoveId(null)}
                            className="px-2 py-1 border border-[#E2DFD7] rounded text-[11px] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingHistory(cust)}
                            className="px-2 py-1 border border-[#E2DFD7] rounded text-[11px] font-semibold hover:border-[#164E3F] cursor-pointer inline-flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> History
                          </button>
                          {canManage && (
                            <>
                              <button
                                type="button"
                                onClick={() => setEditing(cust)}
                                className="px-2 py-1 border border-[#E2DFD7] rounded text-[11px] font-semibold hover:border-[#164E3F] cursor-pointer inline-flex items-center gap-1"
                              >
                                <Edit className="w-3 h-3" /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(cust)}
                                className="px-2 py-1 border border-[#E2DFD7] rounded text-[11px] font-semibold cursor-pointer"
                              >
                                {cust.status === 'active' ? 'Block' : 'Activate'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmRemoveId(cust.id)}
                                title={cust.orderCount > 0 ? 'Archive Customer (Preserves Invoices)' : 'Delete Unused Account'}
                                className="px-2 py-1 bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] rounded text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1"
                              >
                                {cust.orderCount > 0 ? <Archive className="w-3 h-3" /> : <Trash2 className="w-3 h-3" />}
                                <span>{cust.orderCount > 0 ? 'Archive' : 'Remove'}</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Customer Modal */}
      {editing && (
        <CustomerEditModal
          customer={editing}
          adminToken={adminToken}
          onClose={() => setEditing(null)}
          onSaved={(msg) => {
            setEditing(null);
            pushNotice('success', msg);
            onRefresh();
          }}
          onError={(m) => pushNotice('error', m)}
        />
      )}

      {/* History Drawer */}
      {viewingHistory && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs p-4 flex items-center justify-center">
          <div className="bg-white rounded-xl border border-[#E2DFD7] max-w-2xl w-full p-6 space-y-4 text-xs shadow-2xl max-h-[88vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold">{viewingHistory.name} — Customer History</h3>
                <p className="font-mono text-[#63615C]">{viewingHistory.email}</p>
              </div>
              <button type="button" onClick={() => setViewingHistory(null)} className="cursor-pointer">
                <X className="w-5 h-5 text-[#63615C]" />
              </button>
            </div>
            <div className="space-y-2">
              <p className="font-bold">Orders ({viewingHistory.orders?.length || 0})</p>
              {viewingHistory.orders?.length ? (
                viewingHistory.orders.map((o: any) => (
                  <div key={o.id} className="p-3 bg-[#F7F6F2] rounded border border-[#E2DFD7] flex justify-between">
                    <div>
                      <p className="font-mono font-bold text-[#164E3F]">{o.id}</p>
                      <p className="text-[11px] text-[#63615C]">{new Date(o.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="text-right font-mono">
                      <p className="font-bold">₹{o.total.toLocaleString()}</p>
                      <p className="text-[10px] uppercase text-[#B45309]">{o.orderStatus}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[#63615C]">No orders placed yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CustomerEditModal: React.FC<{
  customer: any;
  adminToken: string;
  onClose: () => void;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
}> = ({ customer, adminToken, onClose, onSaved, onError }) => {
  const [name, setName] = useState(customer.name || '');
  const [email, setEmail] = useState(customer.email || '');
  const [phone, setPhone] = useState(customer.phone || '');
  const [status, setStatus] = useState(customer.status || 'active');
  const [internalNotes, setInternalNotes] = useState(customer.internalNotes || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/customers/${customer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ name, email, phone, status, internalNotes }),
      });
      const data = await res.json();
      if (res.ok) {
        onSaved(`Updated customer ${name}.`);
      } else {
        onError(data.error || 'Update failed.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs p-4 flex items-center justify-center">
      <div className="bg-white rounded-xl border border-[#E2DFD7] max-w-md w-full p-6 space-y-4 text-xs shadow-2xl">
        <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3">
          <h3 className="font-serif text-lg font-bold">Edit Customer Profile</h3>
          <button type="button" onClick={onClose} className="cursor-pointer">
            <X className="w-5 h-5 text-[#63615C]" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="font-semibold block mb-1">Full Name *</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2]" />
          </div>
          <div>
            <label className="font-semibold block mb-1">Email *</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold block mb-1">Phone</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono" />
            </div>
            <div>
              <label className="font-semibold block mb-1">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2]">
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="blocked">Blocked</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <div>
            <label className="font-semibold block mb-1">Internal CRM Notes</label>
            <textarea rows={2} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} placeholder="VIP preferences, fit notes..." className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2]" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-[#E2DFD7] rounded font-semibold cursor-pointer">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-[#164E3F] text-white rounded font-semibold cursor-pointer">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =================== 2. WHOLESALE B2B MANAGEMENT ===================

export const WholesaleB2BView: React.FC<
  CommonProps & {
    accounts: WholesaleAccount[];
    orders: WholesaleOrderRequest[];
  }
> = ({ accounts, orders, adminToken, pushNotice, onRefresh }) => {
  const [subTab, setSubTab] = useState<'accounts' | 'orders'>('accounts');
  const [tierMap, setTierMap] = useState<Record<string, number>>({});

  const updateAccount = async (acc: WholesaleAccount, status: WholesaleAccount['status']) => {
    const discountTierPercent = tierMap[acc.id] ?? acc.discountTierPercent ?? 25;
    const res = await fetch(`/api/admin/wholesale/accounts/${acc.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status, discountTierPercent }),
    });
    if (res.ok) {
      pushNotice('success', `Wholesale buyer "${acc.businessName}" set to ${status} (${discountTierPercent}% tier).`);
      onRefresh();
    } else {
      const d = await res.json().catch(() => ({}));
      pushNotice('error', d.error || 'Failed to update wholesale account.');
    }
  };

  const updateOrder = async (ord: WholesaleOrderRequest, status: WholesaleOrderRequest['status']) => {
    const res = await fetch(`/api/admin/wholesale/orders/${ord.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      pushNotice('success', `Wholesale quote ${ord.id} marked ${status}.`);
      onRefresh();
    } else {
      pushNotice('error', 'Failed to update wholesale quote.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#141413]">Wholesale &amp; B2B Accounts</h1>
          <p className="text-xs text-[#63615C]">
            Approve boutique partners (+91 9310078735), assign wholesale discount tiers, and manage bulk quote requests
          </p>
        </div>

        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setSubTab('accounts')}
            className={`px-3.5 py-2 rounded-md font-semibold border cursor-pointer ${
              subTab === 'accounts' ? 'bg-[#164E3F] text-white border-[#164E3F]' : 'bg-white text-[#63615C] border-[#E2DFD7]'
            }`}
          >
            B2B Buyers ({accounts.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('orders')}
            className={`px-3.5 py-2 rounded-md font-semibold border cursor-pointer ${
              subTab === 'orders' ? 'bg-[#164E3F] text-white border-[#164E3F]' : 'bg-white text-[#63615C] border-[#E2DFD7]'
            }`}
          >
            Bulk Quotes ({orders.length})
          </button>
        </div>
      </div>

      {subTab === 'accounts' ? (
        <div className="space-y-3">
          {accounts.length === 0 ? (
            <div className="bg-white p-8 rounded-lg border border-[#E2DFD7] text-center text-xs text-[#63615C]">
              No B2B wholesale registrations yet.
            </div>
          ) : (
            accounts.map((acc) => (
              <div key={acc.id} className="bg-white p-4 rounded-lg border border-[#E2DFD7] flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#8E6D3B]" />
                    <span className="font-bold text-sm text-[#141413]">{acc.businessName}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        acc.status === 'approved'
                          ? 'bg-[#ECFDF5] text-[#166534] border-[#A7F3D0]'
                          : acc.status === 'pending'
                          ? 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'
                          : 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]'
                      }`}
                    >
                      {acc.status}
                    </span>
                  </div>
                  <p className="text-[#63615C]">
                    {acc.contactName} · <span className="font-mono">{acc.email}</span> · <span className="font-mono">{acc.phone}</span>
                  </p>
                  <p className="text-[#63615C]">
                    {acc.city}, {acc.state} {acc.gstNumber ? `· GSTIN: ${acc.gstNumber}` : ''}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-[11px] font-semibold">Tier %:</label>
                  <input
                    type="number"
                    min={5}
                    max={70}
                    value={tierMap[acc.id] ?? acc.discountTierPercent ?? 25}
                    onChange={(e) => setTierMap((prev) => ({ ...prev, [acc.id]: Number(e.target.value) }))}
                    className="w-16 p-1.5 border border-[#E2DFD7] rounded font-mono text-center bg-[#F7F6F2]"
                  />
                  <button
                    type="button"
                    onClick={() => updateAccount(acc, 'approved')}
                    className="px-3 py-1.5 bg-[#164E3F] text-white rounded font-semibold cursor-pointer"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => updateAccount(acc, 'suspended')}
                    className="px-3 py-1.5 border border-[#E2DFD7] rounded font-semibold cursor-pointer"
                  >
                    Suspend
                  </button>
                  <button
                    type="button"
                    onClick={() => updateAccount(acc, 'rejected')}
                    className="px-3 py-1.5 bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] rounded font-semibold cursor-pointer"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {orders.length === 0 ? (
            <div className="bg-white p-8 rounded-lg border border-[#E2DFD7] text-center text-xs text-[#63615C]">
              No bulk wholesale quote requests submitted yet.
            </div>
          ) : (
            orders.map((ord) => (
              <div key={ord.id} className="bg-white p-4 rounded-lg border border-[#E2DFD7] space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2DFD7] pb-2">
                  <div>
                    <span className="font-mono font-bold text-[#164E3F]">{ord.id}</span> ·{' '}
                    <strong>{ord.businessName}</strong> ({ord.phone})
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold">
                      {ord.totalQuantity} pcs · Est. ₹{ord.estimatedTotal.toLocaleString()}
                    </span>
                    <select
                      value={ord.status}
                      onChange={(e) => updateOrder(ord, e.target.value as any)}
                      className="p-1.5 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-semibold"
                    >
                      <option value="requested">Requested</option>
                      <option value="quoted">Quoted</option>
                      <option value="approved">Approved</option>
                      <option value="dispatched">Dispatched</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ord.items.map((it, i) => (
                    <span key={i} className="px-2 py-1 bg-[#F7F6F2] border border-[#E2DFD7] rounded font-mono text-[11px]">
                      {it.sku}: {it.name} × {it.quantity} @ ₹{it.requestedPrice}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// =================== 3. COUPONS & OFFERS ===================

export const CouponsOffersView: React.FC<
  CommonProps & {
    coupons: Coupon[];
  }
> = ({ coupons, adminToken, pushNotice, onRefresh }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState(15);
  const [minOrderValue, setMinOrderValue] = useState(1499);
  const [maxDiscountAmount, setMaxDiscountAmount] = useState<number | ''>('');
  const [usageLimitTotal, setUsageLimitTotal] = useState<number | ''>('');
  const [usageLimitPerUser, setUsageLimitPerUser] = useState<number | ''>('');
  const [firstOrderOnly, setFirstOrderOnly] = useState(false);
  const [returningCustomerOnly, setReturningCustomerOnly] = useState(false);
  const [vipOnly, setVipOnly] = useState(false);
  const [eligibleCategoriesInput, setEligibleCategoriesInput] = useState('');
  const [expiryDate, setExpiryDate] = useState('2026-12-31');
  const [festivalOffer, setFestivalOffer] = useState(false);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const eligibleCategories = eligibleCategoriesInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          code,
          discountType,
          discountValue,
          minOrderValue,
          maxDiscountAmount: maxDiscountAmount === '' ? undefined : Number(maxDiscountAmount),
          usageLimitTotal: usageLimitTotal === '' ? undefined : Number(usageLimitTotal),
          usageLimitPerUser: usageLimitPerUser === '' ? undefined : Number(usageLimitPerUser),
          firstOrderOnly,
          returningCustomerOnly,
          vipOnly,
          eligibleCategories: eligibleCategories.length ? eligibleCategories : undefined,
          expiryDate,
          festivalOffer,
          description,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        pushNotice('success', `Coupon ${data.coupon.code} created.`);
        setModalOpen(false);
        setCode('');
        setDescription('');
        setUsageLimitTotal('');
        setUsageLimitPerUser('');
        setFirstOrderOnly(false);
        setReturningCustomerOnly(false);
        setVipOnly(false);
        setEligibleCategoriesInput('');
        onRefresh();
      } else {
        pushNotice('error', data.error || 'Failed to create coupon.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#141413]">Coupons &amp; Promotional Offers</h1>
          <p className="text-xs text-[#63615C]">Configure festive discount codes, redemption caps, and customer eligibility rules</p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="px-4 py-2.5 bg-[#164E3F] hover:bg-[#0F3A2E] text-white text-xs font-semibold uppercase tracking-wider rounded-md flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Coupon</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons.map((c) => (
          <div key={c.code} className="p-4 bg-white rounded-lg border border-[#E2DFD7] space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-sm text-[#164E3F] bg-[#F7F6F2] px-2.5 py-1 rounded border border-[#E2DFD7]">
                {c.code}
              </span>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                  c.isActive ? 'bg-[#ECFDF5] text-[#166534] border-[#A7F3D0]' : 'bg-[#F7F6F2] text-[#63615C] border-[#E2DFD7]'
                }`}
              >
                {c.isActive ? 'Active' : 'Disabled'}
              </span>
            </div>
            <p className="text-[#63615C]">{c.description}</p>
            <div className="text-[11px] font-mono tabular-nums space-y-0.5 text-[#63615C]">
              <p>Discount: <strong className="text-[#141413]">{c.discountType === 'percentage' ? `${c.discountValue}%` : `₹${c.discountValue}`}</strong></p>
              <p>Min Order: <strong className="text-[#141413]">₹{c.minOrderValue}</strong> {c.expiryDate ? `· Exp ${c.expiryDate}` : ''}</p>
              <p>
                Redemptions: <strong className="text-[#141413]">{c.usedCount || 0}{c.usageLimitTotal ? ` / ${c.usageLimitTotal}` : ''}</strong>
                {c.usageLimitPerUser ? ` · Max ${c.usageLimitPerUser}/customer` : ''}
              </p>
            </div>
            {(c.firstOrderOnly || c.returningCustomerOnly || c.vipOnly || (c.eligibleCategories && c.eligibleCategories.length > 0)) && (
              <div className="flex flex-wrap gap-1 pt-1">
                {c.firstOrderOnly && <span className="px-2 py-0.5 bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] rounded text-[10px] font-bold">First Order Only</span>}
                {c.returningCustomerOnly && <span className="px-2 py-0.5 bg-[#ECF4F1] text-[#164E3F] border border-[#C6E2D8] rounded text-[10px] font-bold">Returning Shoppers</span>}
                {c.vipOnly && <span className="px-2 py-0.5 bg-[#141413] text-[#D4AF6A] rounded text-[10px] font-bold">VIP Only</span>}
                {c.eligibleCategories && c.eligibleCategories.length > 0 && (
                  <span className="px-2 py-0.5 bg-[#F7F6F2] text-[#63615C] border border-[#E2DFD7] rounded text-[10px]">
                    {c.eligibleCategories.join(', ')}
                  </span>
                )}
              </div>
            )}
            <div className="flex gap-2 pt-2 border-t border-[#E2DFD7]">
              {confirmDelete === c.code ? (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch(`/api/admin/coupons/${c.code}`, { method: 'DELETE', headers: { Authorization: `Bearer ${adminToken}` } });
                      setConfirmDelete(null);
                      pushNotice('success', `Deleted coupon ${c.code}.`);
                      onRefresh();
                    }}
                    className="flex-1 py-1 bg-[#B91C1C] text-white rounded font-semibold cursor-pointer"
                  >
                    Confirm
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(null)} className="px-3 py-1 border border-[#E2DFD7] rounded cursor-pointer">
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch(`/api/admin/coupons/${c.code}/toggle`, { method: 'PATCH', headers: { Authorization: `Bearer ${adminToken}` } });
                      onRefresh();
                    }}
                    className="flex-1 py-1.5 border border-[#E2DFD7] rounded font-semibold hover:bg-[#F7F6F2] cursor-pointer"
                  >
                    {c.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(c.code)}
                    className="p-1.5 text-[#B91C1C] hover:bg-[#FEF2F2] rounded cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs p-4 flex items-center justify-center">
          <div className="bg-white rounded-xl border border-[#E2DFD7] max-w-lg w-full p-6 space-y-4 text-xs shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3">
              <h3 className="font-serif text-lg font-bold">Create Promo Coupon</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="font-semibold block mb-1">Coupon Code *</label>
                <input type="text" required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="EID20" className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono uppercase" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Type</label>
                  <select value={discountType} onChange={(e) => setDiscountType(e.target.value as any)} className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2]">
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed INR (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Discount Value *</label>
                  <input type="number" required min={1} value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value))} className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Min Order Value *</label>
                  <input type="number" required min={0} value={minOrderValue} onChange={(e) => setMinOrderValue(Number(e.target.value))} className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Max Cap (Optional)</label>
                  <input type="number" value={maxDiscountAmount} onChange={(e) => setMaxDiscountAmount(e.target.value ? Number(e.target.value) : '')} className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Total Usage Limit</label>
                  <input type="number" min={1} placeholder="Unlimited" value={usageLimitTotal} onChange={(e) => setUsageLimitTotal(e.target.value ? Number(e.target.value) : '')} className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Per-Customer Limit</label>
                  <input type="number" min={1} placeholder="Unlimited" value={usageLimitPerUser} onChange={(e) => setUsageLimitPerUser(e.target.value ? Number(e.target.value) : '')} className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono" />
                </div>
              </div>
              <div>
                <label className="font-semibold block mb-1">Eligible Categories (Comma-separated, optional)</label>
                <input type="text" value={eligibleCategoriesInput} onChange={(e) => setEligibleCategoriesInput(e.target.value)} placeholder="Anarkali Kurtis, Festive Wear" className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2]" />
              </div>
              <div className="flex flex-wrap gap-4 py-1">
                <label className="inline-flex items-center gap-1.5 font-semibold cursor-pointer">
                  <input type="checkbox" checked={firstOrderOnly} onChange={(e) => { setFirstOrderOnly(e.target.checked); if (e.target.checked) setReturningCustomerOnly(false); }} />
                  First Order Only
                </label>
                <label className="inline-flex items-center gap-1.5 font-semibold cursor-pointer">
                  <input type="checkbox" checked={returningCustomerOnly} onChange={(e) => { setReturningCustomerOnly(e.target.checked); if (e.target.checked) setFirstOrderOnly(false); }} />
                  Returning Customers
                </label>
                <label className="inline-flex items-center gap-1.5 font-semibold cursor-pointer">
                  <input type="checkbox" checked={vipOnly} onChange={(e) => setVipOnly(e.target.checked)} />
                  VIP Members Only
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="font-semibold block mb-1">Expiry Date</label>
                  <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono" />
                </div>
                <label className="inline-flex items-center gap-1.5 font-semibold mt-4 cursor-pointer">
                  <input type="checkbox" checked={festivalOffer} onChange={(e) => setFestivalOffer(e.target.checked)} />
                  Festive Offer
                </label>
              </div>
              <div>
                <label className="font-semibold block mb-1">Description</label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Flat 15% off on orders above ₹1,499" className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2]" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-[#E2DFD7] rounded font-semibold cursor-pointer">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-[#164E3F] text-white rounded font-semibold cursor-pointer">Create Coupon</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// =================== 4. REVIEWS MODERATION ===================

export const ReviewsModerationView: React.FC<
  CommonProps & {
    reviews: (Review & { productName?: string })[];
    onRefreshStorefront: () => void;
  }
> = ({ reviews, adminToken, pushNotice, onRefresh, onRefreshStorefront }) => {
  const [filter, setFilter] = useState<'all' | 'reported' | 'approved' | 'hidden'>('all');
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyMsg, setReplyMsg] = useState('');

  const filtered = reviews.filter((r) => {
    if (filter === 'reported') return (r.reportedCount || 0) > 0;
    if (filter === 'approved') return (r.moderationStatus || 'approved') === 'approved';
    if (filter === 'hidden') return r.moderationStatus === 'hidden';
    return true;
  });

  const handleModerate = async (id: string, moderationStatus: 'approved' | 'hidden') => {
    const res = await fetch(`/api/admin/reviews/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ moderationStatus }),
    });
    if (res.ok) {
      pushNotice('success', `Review marked ${moderationStatus}.`);
      onRefresh();
      onRefreshStorefront();
    }
  };

  const handleSendReply = async (id: string) => {
    if (!replyMsg.trim()) return;
    const res = await fetch(`/api/admin/reviews/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ replyMessage: replyMsg.trim() }),
    });
    if (res.ok) {
      pushNotice('success', 'Official Zohra Luxe reply posted.');
      setReplyTargetId(null);
      setReplyMsg('');
      onRefresh();
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/admin/reviews/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.ok) {
      pushNotice('success', 'Review removed.');
      onRefresh();
      onRefreshStorefront();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#141413]">Customer Reviews Moderation</h1>
          <p className="text-xs text-[#63615C]">
            Verify authentic reviews, address reported comments, and post official boutique replies
          </p>
        </div>

        <div className="flex gap-1.5 text-xs">
          {[
            { id: 'all', label: `All (${reviews.length})` },
            { id: 'reported', label: `Reported (${reviews.filter((r) => (r.reportedCount || 0) > 0).length})` },
            { id: 'approved', label: 'Visible' },
            { id: 'hidden', label: 'Hidden' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilter(t.id as any)}
              className={`px-3 py-1.5 rounded-md font-semibold border cursor-pointer ${
                filter === t.id ? 'bg-[#164E3F] text-white border-[#164E3F]' : 'bg-white text-[#63615C] border-[#E2DFD7]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white p-8 rounded-lg border border-[#E2DFD7] text-center text-xs text-[#63615C]">
            No reviews match the selected filter.
          </div>
        ) : (
          filtered.map((rev) => (
            <div key={rev.id} className="bg-white p-4 rounded-lg border border-[#E2DFD7] space-y-2.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-[#141413]">{rev.customerName}</span>
                  <span className="inline-flex items-center gap-0.5 text-[#D4AF6A] font-bold">
                    <Star className="w-3.5 h-3.5 fill-[#D4AF6A]" /> {rev.rating}/5
                  </span>
                  {rev.verifiedPurchase && (
                    <span className="px-1.5 py-0.5 bg-[#ECFDF5] text-[#166534] border border-[#A7F3D0] rounded text-[10px] font-bold">
                      Verified Buyer
                    </span>
                  )}
                  {(rev.reportedCount || 0) > 0 && (
                    <span className="px-1.5 py-0.5 bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA] rounded text-[10px] font-bold inline-flex items-center gap-1">
                      <Flag className="w-3 h-3" /> Reported ×{rev.reportedCount}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-mono text-[#63615C]">{rev.productName}</span>
              </div>

              <p className="text-[#141413] leading-relaxed">{rev.comment}</p>

              {rev.images && rev.images.length > 0 && (
                <div className="flex gap-2">
                  {rev.images.map((img, i) => (
                    <img key={i} src={img} alt="Customer review" className="w-12 h-12 object-cover rounded border border-[#E2DFD7]" />
                  ))}
                </div>
              )}

              {rev.adminReply && (
                <div className="p-2.5 bg-[#F7F6F2] rounded border-l-2 border-[#164E3F] text-[11px]">
                  <p className="font-bold text-[#164E3F]">Store Reply ({rev.adminReply.author}):</p>
                  <p>{rev.adminReply.message}</p>
                </div>
              )}

              {replyTargetId === rev.id ? (
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={replyMsg}
                    onChange={(e) => setReplyMsg(e.target.value)}
                    placeholder="Write official store response..."
                    className="flex-1 p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2]"
                  />
                  <button
                    type="button"
                    onClick={() => handleSendReply(rev.id)}
                    className="px-3 py-1.5 bg-[#164E3F] text-white rounded font-semibold cursor-pointer"
                  >
                    Post Reply
                  </button>
                  <button
                    type="button"
                    onClick={() => setReplyTargetId(null)}
                    className="px-3 py-1.5 border border-[#E2DFD7] rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#E2DFD7]">
                  <button
                    type="button"
                    onClick={() => setReplyTargetId(rev.id)}
                    className="px-2.5 py-1 border border-[#E2DFD7] rounded font-semibold hover:border-[#164E3F] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <MessageSquare className="w-3 h-3" /> Reply
                  </button>
                  {rev.moderationStatus === 'hidden' ? (
                    <button
                      type="button"
                      onClick={() => handleModerate(rev.id, 'approved')}
                      className="px-2.5 py-1 bg-[#ECFDF5] border border-[#A7F3D0] text-[#166534] rounded font-semibold cursor-pointer"
                    >
                      Restore Visibility
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleModerate(rev.id, 'hidden')}
                      className="px-2.5 py-1 bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] rounded font-semibold cursor-pointer"
                    >
                      Hide Review
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(rev.id)}
                    className="px-2.5 py-1 bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] rounded font-semibold cursor-pointer ml-auto"
                  >
                    Delete Permanently
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
