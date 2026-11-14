import React, { useState } from 'react';
import {
  Download,
  AlertTriangle,
  CheckCircle,
  Plus,
  Trash2,
  Shield,
  Edit,
  X,
  HardDrive,
  RefreshCw,
  Bell,
  Lock,
  Power,
  Users,
} from 'lucide-react';
import {
  ActivityLog,
  AdminPermission,
  AdminRolePreset,
  BackupRecord,
  NotificationItem,
  SupportInquiry,
  WebsiteSettings,
} from '../../types.ts';
import { downloadAuthorizedFile } from './AdminCatalogInventory.tsx';

interface CommonProps {
  adminToken: string;
  pushNotice: (type: 'success' | 'error', text: string) => void;
  onRefresh: () => void;
}

// =================== 1. REPORTS & ANALYTICS ===================

export const ReportsAnalyticsView: React.FC<{
  reportsData: any;
  orders: any[];
}> = ({ reportsData, orders }) => {
  if (!reportsData) return null;

  const exportSalesCsv = () => {
    const headers = ['Order ID', 'Customer Name', 'Email', 'Phone', 'Total (INR)', 'Payment', 'Status', 'Date'];
    const rows = orders.map((o) => [
      o.id,
      `"${(o.customerName || '').replace(/"/g, '""')}"`,
      o.customerEmail,
      o.customerPhone,
      o.total,
      o.paymentMethod,
      o.orderStatus,
      new Date(o.createdAt).toLocaleDateString(),
    ]);
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const a = document.createElement('a');
    a.href = encodeURI(csv);
    a.download = `zohra_sales_report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#141413]">Sales Reports &amp; Analytics</h1>
          <p className="text-xs text-[#63615C]">
            Period sales performance, top-performing SKUs, and category breakdowns
          </p>
        </div>
        <button
          type="button"
          onClick={exportSalesCsv}
          className="px-4 py-2 bg-[#164E3F] text-white text-xs font-semibold rounded-md hover:bg-[#0F3A2E] flex items-center gap-1.5 cursor-pointer self-start"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Sales CSV</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Today's Sales", val: reportsData.dailySales, accent: true },
          { label: 'Last 7 Days', val: reportsData.weeklySales },
          { label: 'This Month', val: reportsData.monthlySales },
          { label: 'Annual Revenue', val: reportsData.yearlySales },
        ].map((k) => (
          <div key={k.label} className="p-4 bg-white rounded-lg border border-[#E2DFD7] space-y-1">
            <span className="text-[11px] font-bold text-[#63615C] uppercase">{k.label}</span>
            <p className={`text-xl font-bold font-mono tabular-nums ${k.accent ? 'text-[#164E3F]' : 'text-[#141413]'}`}>
              ₹{(k.val || 0).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-5 rounded-lg border border-[#E2DFD7] space-y-4">
          <h3 className="font-serif text-lg font-bold text-[#141413]">Top Selling Products</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F6F2] text-[#63615C] font-semibold border-b border-[#E2DFD7]">
                <tr>
                  <th className="p-3">SKU &amp; Product</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Units</th>
                  <th className="p-3">Revenue</th>
                  <th className="p-3">Recorded Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DFD7]">
                {(reportsData.topProducts || []).map((p: any, idx: number) => (
                  <tr key={idx} className="hover:bg-[#F7F6F2]">
                    <td className="p-3">
                      <p className="font-semibold text-[#141413]">{p.name}</p>
                      <p className="font-mono text-[10px] text-[#164E3F]">{p.sku}</p>
                    </td>
                    <td className="p-3 text-[#63615C]">{p.category}</td>
                    <td className="p-3 font-mono tabular-nums">{p.qty} pcs</td>
                    <td className="p-3 font-mono font-bold tabular-nums text-[#164E3F]">₹{p.revenue.toLocaleString()}</td>
                    <td className="p-3 font-mono tabular-nums text-[#63615C]">
                      {p.costRecorded > 0 ? `₹${p.costRecorded.toLocaleString()}` : 'Unrecorded'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E2DFD7] space-y-4">
          <h3 className="font-serif text-lg font-bold text-[#141413]">Top Categories</h3>
          <div className="space-y-3 text-xs">
            {(reportsData.topCategories || []).map((c: any) => (
              <div key={c.name} className="p-3 bg-[#F7F6F2] rounded border border-[#E2DFD7] flex justify-between items-center">
                <div>
                  <p className="font-semibold text-[#141413]">{c.name}</p>
                  <p className="text-[11px] text-[#63615C] font-mono">{c.count} units sold</p>
                </div>
                <span className="font-mono font-bold text-[#164E3F]">₹{c.revenue.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// =================== 2. FINANCE P&L + EXPENSES ===================

export const FinancePnlExpensesView: React.FC<
  CommonProps & {
    pnl: any;
    onFilterRange: (from?: string, to?: string) => void;
    canEditExpenses: boolean;
  }
> = ({ pnl, onFilterRange, canEditExpenses, adminToken, pushNotice, onRefresh }) => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().slice(0, 10));
  const [expCat, setExpCat] = useState('packaging');
  const [expDesc, setExpDesc] = useState('');
  const [expAmt, setExpAmt] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expDesc.trim() || !Number(expAmt)) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/finance/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          date: expDate,
          category: expCat,
          description: expDesc.trim(),
          amount: Number(expAmt),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        pushNotice('success', `Recorded expense ₹${Number(expAmt).toLocaleString()}.`);
        setExpDesc('');
        setExpAmt('');
        onRefresh();
      } else {
        pushNotice('error', data.error || 'Failed to record expense.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    const res = await fetch(`/api/admin/finance/expenses/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.ok) {
      pushNotice('success', 'Expense entry deleted.');
      onRefresh();
    }
  };

  if (!pnl) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#141413]">Profit &amp; Loss Statement &amp; Expenses</h1>
          <p className="text-xs text-[#63615C]">
            Real ledger math: Net Realized Revenue minus Recorded COGS and Recorded Operating Expenses
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="p-2 border border-[#E2DFD7] rounded bg-white font-mono" />
          <span>to</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="p-2 border border-[#E2DFD7] rounded bg-white font-mono" />
          <button
            type="button"
            onClick={() => onFilterRange(fromDate || undefined, toDate || undefined)}
            className="px-3.5 py-2 bg-[#164E3F] text-white rounded font-semibold cursor-pointer"
          >
            Apply Period
          </button>
          {(fromDate || toDate) && (
            <button
              type="button"
              onClick={() => {
                setFromDate('');
                setToDate('');
                onFilterRange(undefined, undefined);
              }}
              className="px-3 py-2 border border-[#E2DFD7] rounded bg-white cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {!pnl.costDataComplete && (
        <div className="p-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg text-xs text-[#92400E] flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#B45309]" />
          <div>
            <p className="font-bold">Incomplete Cost Price Data — Partial COGS Shown</p>
            <p className="mt-0.5">
              {pnl.productsMissingCostCount} product(s) and {pnl.unitsMissingCost} sold unit(s) currently have ₹0 costPrice recorded. Zohra Luxe never fabricates cost data — add Cost Price in Products Catalog for exact margin figures.
            </p>
          </div>
        </div>
      )}

      {/* P&L KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="p-4 bg-white rounded-lg border border-[#E2DFD7]">
          <span className="text-[10px] font-bold uppercase text-[#63615C]">Realized Net Revenue</span>
          <p className="text-xl font-bold font-mono tabular-nums text-[#164E3F] mt-1">
            ₹{pnl.realizedNetRevenue.toLocaleString()}
          </p>
          <p className="text-[10px] text-[#63615C] mt-0.5">After ₹{pnl.totalRefunds.toLocaleString()} refunds</p>
        </div>
        <div className="p-4 bg-white rounded-lg border border-[#E2DFD7]">
          <span className="text-[10px] font-bold uppercase text-[#63615C]">Recorded COGS</span>
          <p className="text-xl font-bold font-mono tabular-nums text-[#141413] mt-1">
            ₹{pnl.recordedCogs.toLocaleString()}
          </p>
          <p className="text-[10px] text-[#63615C] mt-0.5">{pnl.unitsWithRecordedCost}/{pnl.unitsSold} units costumed</p>
        </div>
        <div className="p-4 bg-white rounded-lg border border-[#E2DFD7]">
          <span className="text-[10px] font-bold uppercase text-[#63615C]">Gross Profit</span>
          <p className="text-xl font-bold font-mono tabular-nums text-[#141413] mt-1">
            ₹{pnl.grossProfitBeforeExpenses.toLocaleString()}
          </p>
          <p className="text-[10px] text-[#63615C] mt-0.5">Before operating expenses</p>
        </div>
        <div className="p-4 bg-white rounded-lg border border-[#E2DFD7]">
          <span className="text-[10px] font-bold uppercase text-[#63615C]">Operating Expenses</span>
          <p className="text-xl font-bold font-mono tabular-nums text-[#B45309] mt-1">
            ₹{pnl.totalRecordedExpenses.toLocaleString()}
          </p>
          <p className="text-[10px] text-[#63615C] mt-0.5">{(pnl.expensesBreakdown || []).length} entries</p>
        </div>
        <div className="p-4 bg-white rounded-lg border border-[#E2DFD7]">
          <span className="text-[10px] font-bold uppercase text-[#63615C]">Net Profit</span>
          <p className={`text-xl font-bold font-mono tabular-nums mt-1 ${pnl.netProfit >= 0 ? 'text-[#166534]' : 'text-[#B91C1C]'}`}>
            ₹{pnl.netProfit.toLocaleString()}
          </p>
          <p className="text-[10px] text-[#63615C] mt-0.5">{pnl.activeOrdersCount} active orders</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {canEditExpenses && (
          <form onSubmit={handleAddExpense} className="bg-white p-5 rounded-lg border border-[#E2DFD7] space-y-3 text-xs">
            <h3 className="font-serif text-lg font-bold text-[#141413]">Record Operating Expense</h3>
            <div>
              <label className="font-semibold block mb-1">Date</label>
              <input type="date" required value={expDate} onChange={(e) => setExpDate(e.target.value)} className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono" />
            </div>
            <div>
              <label className="font-semibold block mb-1">Category</label>
              <select value={expCat} onChange={(e) => setExpCat(e.target.value)} className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2]">
                <option value="packaging">Packaging &amp; Boxes</option>
                <option value="shipping">Courier &amp; Logistics</option>
                <option value="marketing">Ads &amp; Marketing</option>
                <option value="platform_fees">Gateway &amp; Platform Fees</option>
                <option value="staff">Staff &amp; Tailoring</option>
                <option value="operations">Studio Operations</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="font-semibold block mb-1">Description *</label>
              <input type="text" required value={expDesc} onChange={(e) => setExpDesc(e.target.value)} placeholder="e.g. Custom gold foil garment bags" className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2]" />
            </div>
            <div>
              <label className="font-semibold block mb-1">Amount (INR) *</label>
              <input type="number" required min={1} value={expAmt} onChange={(e) => setExpAmt(e.target.value)} className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono" />
            </div>
            <button type="submit" disabled={saving} className="w-full py-2.5 bg-[#164E3F] text-white font-semibold rounded cursor-pointer flex items-center justify-center gap-1.5">
              <Plus className="w-4 h-4" />
              <span>{saving ? 'Recording...' : 'Add Expense'}</span>
            </button>
          </form>
        )}

        <div className={`${canEditExpenses ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white rounded-lg border border-[#E2DFD7] overflow-hidden`}>
          <div className="px-4 py-3 border-b border-[#E2DFD7] bg-[#F7F6F2] font-bold text-xs">
            Recorded Expenses ({(pnl.expensesBreakdown || []).length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F6F2]/50 text-[#63615C] font-semibold border-b border-[#E2DFD7]">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Recorded By</th>
                  {canEditExpenses && <th className="p-3 text-right">Remove</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DFD7]">
                {(pnl.expensesBreakdown || []).length === 0 ? (
                  <tr><td colSpan={6} className="p-6 text-center text-[#63615C]">No expenses logged in this period.</td></tr>
                ) : (
                  pnl.expensesBreakdown.map((e: any) => (
                    <tr key={e.id} className="hover:bg-[#F7F6F2]">
                      <td className="p-3 font-mono">{e.date}</td>
                      <td className="p-3 uppercase text-[10px] font-bold">{e.category}</td>
                      <td className="p-3 font-medium">{e.description}</td>
                      <td className="p-3 font-mono font-bold text-[#B91C1C]">₹{e.amount.toLocaleString()}</td>
                      <td className="p-3 font-mono text-[10px] text-[#63615C]">{e.recordedBy}</td>
                      {canEditExpenses && (
                        <td className="p-3 text-right">
                          <button type="button" onClick={() => handleDeleteExpense(e.id)} className="p-1 text-[#B91C1C] hover:bg-[#FEF2F2] rounded cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// =================== 3. NOTIFICATIONS CENTER ===================

export const NotificationsCenterView: React.FC<
  CommonProps & {
    notifications: NotificationItem[];
  }
> = ({ notifications, adminToken, pushNotice, onRefresh }) => {
  const markRead = async (id?: string) => {
    await fetch('/api/admin/notifications/read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ id }),
    });
    if (!id) pushNotice('success', 'All admin notifications marked as read.');
    onRefresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#141413]">Admin Notifications Feed</h1>
          <p className="text-xs text-[#63615C]">
            Real-time alerts for new orders, low-stock variants, returns, wholesale leads, and security blocks
          </p>
        </div>
        <button
          type="button"
          onClick={() => markRead()}
          className="px-4 py-2 bg-[#164E3F] text-white text-xs font-semibold rounded-md cursor-pointer self-start"
        >
          Mark All as Read
        </button>
      </div>

      <div className="space-y-2.5">
        {notifications.length === 0 ? (
          <div className="bg-white p-8 rounded-lg border border-[#E2DFD7] text-center text-xs text-[#63615C]">
            No administrative alerts yet.
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                n.isRead ? 'bg-white border-[#E2DFD7]' : 'bg-[#ECF4F1] border-[#164E3F]/30'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5 text-[#164E3F]" />
                  <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-[#E2DFD7]">
                    {n.category}
                  </span>
                  <span className="font-bold text-[#141413]">{n.title}</span>
                </div>
                <p className="text-[#63615C]">{n.message}</p>
                <p className="text-[10px] font-mono text-[#63615C]">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
              {!n.isRead && (
                <button
                  type="button"
                  onClick={() => markRead(n.id)}
                  className="px-3 py-1.5 bg-white border border-[#E2DFD7] rounded font-semibold hover:border-[#164E3F] cursor-pointer shrink-0"
                >
                  Mark Read
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// =================== 4. WEBSITE CONTENT CMS ===================

export const CmsContentView: React.FC<
  CommonProps & {
    settingsData: WebsiteSettings | null;
    setSettingsData: React.Dispatch<React.SetStateAction<WebsiteSettings | null>>;
    onRefreshStorefront: () => void;
  }
> = ({ settingsData, setSettingsData, adminToken, pushNotice, onRefreshStorefront }) => {
  const [saving, setSaving] = useState(false);

  if (!settingsData) return null;

  const saveCms = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(settingsData),
      });
      if (res.ok) {
        pushNotice('success', 'Website CMS content published.');
        onRefreshStorefront();
      } else {
        pushNotice('error', 'Failed to save CMS updates.');
      }
    } finally {
      setSaving(false);
    }
  };

  const addBanner = () => {
    const next = [
      ...(settingsData.cmsBanners || []),
      {
        id: `ban-${Date.now()}`,
        title: 'New Festive Collection',
        subtitle: 'Handcrafted silk & zari kurtis',
        image: '/src/assets/images/category_kurtis_showcase_1794109164419.jpg',
        ctaText: 'Explore Collection',
        active: true,
      },
    ];
    setSettingsData({ ...settingsData, cmsBanners: next });
  };

  const addFaq = () => {
    const next = [
      ...(settingsData.faqItems || []),
      { id: `faq-${Date.now()}`, question: 'New Question', answer: 'Answer details...' },
    ];
    setSettingsData({ ...settingsData, faqItems: next });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-serif text-2xl font-bold text-[#141413]">Website Content &amp; Policy Pages (CMS)</h1>
        <p className="text-xs text-[#63615C]">
          Edit hero banners, promotional strips, About Us, Contact, Shipping, Returns, Privacy, Terms, and FAQs
        </p>
      </div>

      <form onSubmit={saveCms} className="space-y-6 text-xs">
        <div className="bg-white p-5 rounded-lg border border-[#E2DFD7] space-y-4">
          <h3 className="font-serif text-lg font-bold">Hero Banner</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold block mb-1">Hero Headline</label>
              <input type="text" value={settingsData.heroHeadline} onChange={(e) => setSettingsData({ ...settingsData, heroHeadline: e.target.value })} className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2]" />
            </div>
            <div>
              <label className="font-semibold block mb-1">CTA Button Text</label>
              <input type="text" value={settingsData.heroButtonText} onChange={(e) => setSettingsData({ ...settingsData, heroButtonText: e.target.value })} className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2]" />
            </div>
          </div>
          <div>
            <label className="font-semibold block mb-1">Hero Subtitle</label>
            <input type="text" value={settingsData.heroSubtitle} onChange={(e) => setSettingsData({ ...settingsData, heroSubtitle: e.target.value })} className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2]" />
          </div>
          <div>
            <label className="font-semibold block mb-1">Hero Image URL</label>
            <input type="text" value={settingsData.heroImage} onChange={(e) => setSettingsData({ ...settingsData, heroImage: e.target.value })} className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E2DFD7] space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-serif text-lg font-bold">CMS Promo Banners ({(settingsData.cmsBanners || []).length})</h3>
            <button type="button" onClick={addBanner} className="px-3 py-1.5 bg-[#141413] text-white rounded font-semibold cursor-pointer">+ Add Banner</button>
          </div>
          {(settingsData.cmsBanners || []).map((b, idx) => (
            <div key={b.id} className="p-3 bg-[#F7F6F2] rounded border border-[#E2DFD7] grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={b.title}
                placeholder="Title"
                onChange={(e) => {
                  const list = [...(settingsData.cmsBanners || [])];
                  list[idx] = { ...b, title: e.target.value };
                  setSettingsData({ ...settingsData, cmsBanners: list });
                }}
                className="p-2 border border-[#E2DFD7] rounded bg-white"
              />
              <input
                type="text"
                value={b.subtitle}
                placeholder="Subtitle"
                onChange={(e) => {
                  const list = [...(settingsData.cmsBanners || [])];
                  list[idx] = { ...b, subtitle: e.target.value };
                  setSettingsData({ ...settingsData, cmsBanners: list });
                }}
                className="p-2 border border-[#E2DFD7] rounded bg-white"
              />
              <input
                type="text"
                value={b.image}
                placeholder="Image URL"
                onChange={(e) => {
                  const list = [...(settingsData.cmsBanners || [])];
                  list[idx] = { ...b, image: e.target.value };
                  setSettingsData({ ...settingsData, cmsBanners: list });
                }}
                className="p-2 border border-[#E2DFD7] rounded bg-white font-mono"
              />
              <div className="flex items-center justify-between gap-2">
                <label className="inline-flex items-center gap-1.5 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={b.active}
                    onChange={(e) => {
                      const list = [...(settingsData.cmsBanners || [])];
                      list[idx] = { ...b, active: e.target.checked };
                      setSettingsData({ ...settingsData, cmsBanners: list });
                    }}
                  />
                  Active
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setSettingsData({
                      ...settingsData,
                      cmsBanners: (settingsData.cmsBanners || []).filter((x) => x.id !== b.id),
                    })
                  }
                  className="text-[#B91C1C] font-semibold cursor-pointer"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E2DFD7] space-y-3">
          <h3 className="font-serif text-lg font-bold">Storefront Pages &amp; Legal Policies</h3>
          <div>
            <label className="font-semibold block mb-1">About Us Content</label>
            <textarea rows={2} value={settingsData.aboutUsText || ''} onChange={(e) => setSettingsData({ ...settingsData, aboutUsText: e.target.value })} className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2]" />
          </div>
          <div>
            <label className="font-semibold block mb-1">Contact &amp; Atelier Info</label>
            <textarea rows={2} value={settingsData.contactInfoText || ''} onChange={(e) => setSettingsData({ ...settingsData, contactInfoText: e.target.value })} className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2]" />
          </div>
          <div>
            <label className="font-semibold block mb-1">Shipping Policy</label>
            <textarea rows={2} value={settingsData.shippingPolicyText || ''} onChange={(e) => setSettingsData({ ...settingsData, shippingPolicyText: e.target.value })} className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold block mb-1">Return Window (Days)</label>
              <input type="number" min={0} value={settingsData.returnPolicyDays} onChange={(e) => setSettingsData({ ...settingsData, returnPolicyDays: Number(e.target.value) })} className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono" />
            </div>
            <div className="sm:col-span-2">
              <label className="font-semibold block mb-1">Return &amp; Exchange Policy</label>
              <textarea rows={2} value={settingsData.returnPolicyText} onChange={(e) => setSettingsData({ ...settingsData, returnPolicyText: e.target.value })} className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2]" />
            </div>
          </div>
          <div>
            <label className="font-semibold block mb-1">Privacy Policy</label>
            <textarea rows={2} value={settingsData.privacyPolicyText} onChange={(e) => setSettingsData({ ...settingsData, privacyPolicyText: e.target.value })} className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2]" />
          </div>
          <div>
            <label className="font-semibold block mb-1">Terms &amp; Conditions</label>
            <textarea rows={2} value={settingsData.termsConditionsText} onChange={(e) => setSettingsData({ ...settingsData, termsConditionsText: e.target.value })} className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2]" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E2DFD7] space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-serif text-lg font-bold">FAQ Items ({(settingsData.faqItems || []).length})</h3>
            <button type="button" onClick={addFaq} className="px-3 py-1.5 bg-[#141413] text-white rounded font-semibold cursor-pointer">+ Add FAQ</button>
          </div>
          {(settingsData.faqItems || []).map((f, idx) => (
            <div key={f.id} className="p-3 bg-[#F7F6F2] rounded border border-[#E2DFD7] space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={f.question}
                  onChange={(e) => {
                    const list = [...(settingsData.faqItems || [])];
                    list[idx] = { ...f, question: e.target.value };
                    setSettingsData({ ...settingsData, faqItems: list });
                  }}
                  className="flex-1 p-2 border border-[#E2DFD7] rounded bg-white font-semibold"
                />
                <button
                  type="button"
                  onClick={() =>
                    setSettingsData({
                      ...settingsData,
                      faqItems: (settingsData.faqItems || []).filter((x) => x.id !== f.id),
                    })
                  }
                  className="text-[#B91C1C] font-semibold cursor-pointer px-2"
                >
                  Remove
                </button>
              </div>
              <textarea
                rows={2}
                value={f.answer}
                onChange={(e) => {
                  const list = [...(settingsData.faqItems || [])];
                  list[idx] = { ...f, answer: e.target.value };
                  setSettingsData({ ...settingsData, faqItems: list });
                }}
                className="w-full p-2 border border-[#E2DFD7] rounded bg-white"
              />
            </div>
          ))}
        </div>

        <button type="submit" disabled={saving} className="px-6 py-3 bg-[#164E3F] hover:bg-[#0F3A2E] text-white font-semibold uppercase tracking-wider rounded-md cursor-pointer">
          {saving ? 'Publishing CMS...' : 'Publish All Website Content'}
        </button>
      </form>
    </div>
  );
};

// =================== 5. TEAM, PARTNERS & GRANULAR PERMISSIONS ===================

export const TeamPermissionsView: React.FC<
  CommonProps & {
    teamList: any[];
    primaryOwnerEmail: string;
    rolePresets: Record<AdminRolePreset, AdminPermission[]>;
    allPermissions: AdminPermission[];
    callerPermissions: AdminPermission[];
    isCallerOwner: boolean;
    onTransferOwnership: (email: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  }
> = ({
  teamList,
  primaryOwnerEmail,
  rolePresets,
  allPermissions,
  callerPermissions,
  isCallerOwner,
  adminToken,
  pushNotice,
  onRefresh,
  onTransferOwnership,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [rolePreset, setRolePreset] = useState<AdminRolePreset>('store_partner');
  const [selectedPerms, setSelectedPerms] = useState<AdminPermission[]>(
    rolePresets?.store_partner || ['overview.view', 'orders.view', 'orders.manage']
  );
  const [adding, setAdding] = useState(false);

  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [transferEmail, setTransferEmail] = useState('');
  const [transferring, setTransferring] = useState(false);

  const assignablePerms = allPermissions.filter(
    (p) => p !== 'ownership.transfer' && (isCallerOwner || callerPermissions.includes(p))
  );

  const handleRoleChange = (r: AdminRolePreset) => {
    setRolePreset(r);
    const presetPerms = (rolePresets?.[r] || []).filter((p) => assignablePerms.includes(p));
    setSelectedPerms(presetPerms);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      pushNotice('error', 'Password must be at least 8 characters.');
      return;
    }
    setAdding(true);
    try {
      const res = await fetch('/api/admin/team/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          password,
          adminRole: rolePreset,
          permissions: selectedPerms,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        pushNotice('success', data.message || `Added ${email}.`);
        setName('');
        setEmail('');
        setPhone('');
        setPassword('');
        onRefresh();
      } else {
        pushNotice('error', data.error || 'Failed to add team member.');
      }
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (id: string) => {
    const res = await fetch(`/api/admin/team/${id}/toggle`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const d = await res.json();
    if (res.ok) {
      pushNotice('success', `Account status set to ${d.status}.`);
      onRefresh();
    } else {
      pushNotice('error', d.error || 'Action blocked.');
    }
  };

  const handleRemove = async (id: string) => {
    const res = await fetch(`/api/admin/team/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const d = await res.json();
    setConfirmRemoveId(null);
    if (res.ok) {
      pushNotice('success', d.message || 'Team member removed.');
      onRefresh();
    } else {
      pushNotice('error', d.error || 'Cannot remove user.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#141413]">Store Partners, Staff Roles &amp; Permissions</h1>
          <p className="text-xs text-[#63615C]">
            Primary Owner ({primaryOwnerEmail}) retains protected authority. Assign least-privilege roles to Store Partners &amp; Staff.
          </p>
        </div>
        <span className="px-3 py-1.5 bg-[#ECFDF5] border border-[#A7F3D0] text-[#166534] rounded-md text-xs font-semibold inline-flex items-center gap-1.5 self-start">
          <Users className="w-3.5 h-3.5" /> Team Size: {teamList.length}
        </span>
      </div>

      {/* Add Partner / Staff Form */}
      <form onSubmit={handleAdd} className="bg-white p-5 rounded-lg border border-[#E2DFD7] space-y-4 text-xs">
        <h3 className="font-serif text-lg font-bold">Authorize Partner or Staff Member</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="font-semibold block mb-1">Full Name *</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Partner Name" className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2]" />
          </div>
          <div>
            <label className="font-semibold block mb-1">Authorized Gmail *</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="partner@gmail.com" className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono" />
          </div>
          <div>
            <label className="font-semibold block mb-1">Password (min 8 chars) *</label>
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Strong password" className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono" />
          </div>
          <div>
            <label className="font-semibold block mb-1">Phone</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono" />
          </div>
          <div>
            <label className="font-semibold block mb-1">Role Preset</label>
            <select value={rolePreset} onChange={(e) => handleRoleChange(e.target.value as AdminRolePreset)} className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2]">
              <option value="store_partner">Store Partner</option>
              <option value="order_manager">Order Manager</option>
              <option value="inventory_manager">Inventory Manager</option>
              <option value="customer_support">Customer Support</option>
              <option value="delivery_staff">Delivery Staff</option>
              <option value="finance_manager">Finance Manager</option>
              <option value="custom">Custom Permissions</option>
            </select>
          </div>
        </div>

        <div className="p-3 bg-[#F7F6F2] rounded border border-[#E2DFD7] space-y-2">
          <p className="font-bold text-[11px] uppercase text-[#63615C]">Granular Module Permissions (Enforced Server-Side)</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {assignablePerms.map((p) => (
              <label key={p} className="inline-flex items-center gap-1.5 text-[11px] font-mono cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedPerms.includes(p)}
                  onChange={(e) =>
                    setSelectedPerms((prev) =>
                      e.target.checked ? [...prev, p] : prev.filter((x) => x !== p)
                    )
                  }
                />
                <span>{p}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={adding} className="px-5 py-2.5 bg-[#164E3F] text-white font-semibold rounded cursor-pointer flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            <span>{adding ? 'Authorizing...' : 'Authorize Account'}</span>
          </button>
        </div>
      </form>

      {/* Team Table */}
      <div className="bg-white rounded-lg border border-[#E2DFD7] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F6F2] text-[#63615C] font-semibold border-b border-[#E2DFD7]">
              <tr>
                <th className="p-3">Member</th>
                <th className="p-3">Role Preset</th>
                <th className="p-3">Granted Permissions</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DFD7]">
              {teamList.map((m) => (
                <tr key={m.id} className="hover:bg-[#F7F6F2]">
                  <td className="p-3">
                    <p className="font-bold text-[#141413] flex items-center gap-1.5">
                      {m.name}
                      {m.isSuperAdmin && (
                        <span className="px-1.5 py-0.5 bg-[#141413] text-[#D4AF6A] rounded text-[10px] font-bold">
                          PRIMARY OWNER
                        </span>
                      )}
                    </p>
                    <p className="font-mono text-[11px] text-[#63615C]">{m.email}</p>
                  </td>
                  <td className="p-3 font-mono text-[11px] uppercase">{m.adminRole}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1 max-w-md">
                      {(m.permissions || []).slice(0, 6).map((p: string) => (
                        <span key={p} className="px-1.5 py-0.5 bg-[#F7F6F2] border border-[#E2DFD7] rounded font-mono text-[10px]">
                          {p}
                        </span>
                      ))}
                      {(m.permissions || []).length > 6 && (
                        <span className="text-[10px] text-[#164E3F] font-semibold">
                          +{m.permissions.length - 6} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${m.status === 'active' ? 'bg-[#ECFDF5] text-[#166534] border-[#A7F3D0]' : 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]'}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    {m.isSuperAdmin ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#63615C] font-semibold">
                        <Lock className="w-3 h-3" /> Owner Protected
                      </span>
                    ) : confirmRemoveId === m.id ? (
                      <div className="inline-flex gap-1.5">
                        <button type="button" onClick={() => handleRemove(m.id)} className="px-2 py-1 bg-[#B91C1C] text-white rounded text-[11px] font-semibold cursor-pointer">Confirm</button>
                        <button type="button" onClick={() => setConfirmRemoveId(null)} className="px-2 py-1 border border-[#E2DFD7] rounded text-[11px] cursor-pointer">Cancel</button>
                      </div>
                    ) : (
                      <div className="inline-flex gap-1.5">
                        <button type="button" onClick={() => setEditingMember(m)} className="px-2 py-1 border border-[#E2DFD7] rounded text-[11px] font-semibold hover:border-[#164E3F] cursor-pointer inline-flex items-center gap-1">
                          <Edit className="w-3 h-3" /> Edit
                        </button>
                        <button type="button" onClick={() => handleToggle(m.id)} className="px-2 py-1 border border-[#E2DFD7] rounded text-[11px] font-semibold cursor-pointer">
                          {m.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                        <button type="button" onClick={() => setConfirmRemoveId(m.id)} className="p-1 bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] rounded cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ownership Transfer (Primary Owner Only) */}
      {isCallerOwner && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!transferEmail.trim()) return;
            setTransferring(true);
            const res = await onTransferOwnership(transferEmail.trim());
            setTransferring(false);
            if (res.success) {
              pushNotice('success', res.message || 'Primary ownership transferred.');
              setTransferEmail('');
              onRefresh();
            } else {
              pushNotice('error', res.error || 'Transfer failed.');
            }
          }}
          className="bg-white p-5 rounded-lg border border-[#E2DFD7] space-y-3 text-xs"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#8E6D3B]" />
            <h3 className="font-bold text-[#141413]">Transfer Primary Ownership (Owner Only)</h3>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 max-w-lg">
            <input
              type="email"
              required
              value={transferEmail}
              onChange={(e) => setTransferEmail(e.target.value)}
              placeholder="newowner@gmail.com"
              className="flex-1 p-2.5 border border-[#E2DFD7] rounded font-mono bg-[#F7F6F2]"
            />
            <button type="submit" disabled={transferring} className="px-4 py-2 bg-[#141413] text-[#D4AF6A] rounded font-semibold cursor-pointer">
              {transferring ? 'Transferring...' : 'Transfer Ownership'}
            </button>
          </div>
        </form>
      )}

      {editingMember && (
        <EditTeamMemberModal
          member={editingMember}
          assignablePerms={assignablePerms}
          rolePresets={rolePresets}
          adminToken={adminToken}
          onClose={() => setEditingMember(null)}
          onSaved={(msg) => {
            setEditingMember(null);
            pushNotice('success', msg);
            onRefresh();
          }}
          onError={(m) => pushNotice('error', m)}
        />
      )}
    </div>
  );
};

const EditTeamMemberModal: React.FC<{
  member: any;
  assignablePerms: AdminPermission[];
  rolePresets: Record<AdminRolePreset, AdminPermission[]>;
  adminToken: string;
  onClose: () => void;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
}> = ({ member, assignablePerms, rolePresets, adminToken, onClose, onSaved, onError }) => {
  const [name, setName] = useState(member.name || '');
  const [phone, setPhone] = useState(member.phone || '');
  const [adminRole, setAdminRole] = useState<AdminRolePreset>(member.adminRole || 'store_partner');
  const [permissions, setPermissions] = useState<AdminPermission[]>(member.permissions || []);
  const [status, setStatus] = useState(member.status || 'active');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password && password.length < 8) {
      onError('New password must be at least 8 characters.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/team/${member.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name,
          phone,
          adminRole,
          permissions,
          status,
          ...(password ? { password } : {}),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onSaved(data.message || `Updated ${member.email}.`);
      } else {
        onError(data.error || 'Failed to update staff member.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs p-4 flex items-center justify-center">
      <div className="bg-white rounded-xl border border-[#E2DFD7] max-w-2xl w-full p-6 space-y-4 text-xs shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3">
          <div>
            <h3 className="font-serif text-lg font-bold">Edit Role &amp; Permissions</h3>
            <p className="font-mono text-[#63615C]">{member.email}</p>
          </div>
          <button type="button" onClick={onClose} className="cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold block mb-1">Name *</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2]" />
            </div>
            <div>
              <label className="font-semibold block mb-1">Phone</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono" />
            </div>
            <div>
              <label className="font-semibold block mb-1">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2]">
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold block mb-1">Role Preset</label>
              <select
                value={adminRole}
                onChange={(e) => {
                  const r = e.target.value as AdminRolePreset;
                  setAdminRole(r);
                  setPermissions((rolePresets?.[r] || []).filter((p) => assignablePerms.includes(p)));
                }}
                className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2]"
              >
                <option value="store_partner">Store Partner</option>
                <option value="order_manager">Order Manager</option>
                <option value="inventory_manager">Inventory Manager</option>
                <option value="customer_support">Customer Support</option>
                <option value="delivery_staff">Delivery Staff</option>
                <option value="finance_manager">Finance Manager</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="font-semibold block mb-1">Reset Password (Optional, min 8 chars)</label>
              <input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave blank to keep existing" className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono" />
            </div>
          </div>

          <div className="p-3 bg-[#F7F6F2] rounded border border-[#E2DFD7] space-y-2">
            <p className="font-bold text-[11px] uppercase text-[#63615C]">Permissions</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {assignablePerms.map((p) => (
                <label key={p} className="inline-flex items-center gap-1.5 text-[11px] font-mono cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permissions.includes(p)}
                    onChange={(e) =>
                      setPermissions((prev) =>
                        e.target.checked ? [...prev, p] : prev.filter((x) => x !== p)
                      )
                    }
                  />
                  <span>{p}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-[#E2DFD7] rounded font-semibold cursor-pointer">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-[#164E3F] text-white rounded font-semibold cursor-pointer">
              {saving ? 'Saving...' : 'Save Permissions'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =================== 6. STORE SETTINGS & MAINTENANCE ===================

export const StoreSettingsView: React.FC<
  CommonProps & {
    settingsData: WebsiteSettings | null;
    setSettingsData: React.Dispatch<React.SetStateAction<WebsiteSettings | null>>;
    onRefreshStorefront: () => void;
  }
> = ({ settingsData, setSettingsData, adminToken, pushNotice, onRefreshStorefront }) => {
  const [saving, setSaving] = useState(false);
  if (!settingsData) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(settingsData),
      });
      if (res.ok) {
        pushNotice('success', 'Website configuration saved.');
        onRefreshStorefront();
      } else {
        pushNotice('error', 'Failed to update settings.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-serif text-2xl font-bold text-[#141413]">Store Settings &amp; Security Controls</h1>
        <p className="text-xs text-[#63615C]">
          Configure branding, shipping charges, WhatsApp wholesale number, session expiry, and maintenance mode
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white p-6 rounded-lg border border-[#E2DFD7] space-y-4 text-xs">
        <div className="p-3.5 rounded-md border border-[#E2DFD7] bg-[#F7F6F2] flex items-center justify-between">
          <div>
            <p className="font-bold text-[#141413] flex items-center gap-1.5">
              <Power className="w-4 h-4 text-[#B45309]" /> Storefront Maintenance Mode
            </p>
            <p className="text-[11px] text-[#63615C]">
              Temporarily pauses public shopping while allowing admins to inspect and manage operations.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={!!settingsData.maintenanceMode}
              onChange={(e) => setSettingsData({ ...settingsData, maintenanceMode: e.target.checked })}
            />
            <span>{settingsData.maintenanceMode ? 'ENABLED' : 'OFF'}</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="font-semibold block mb-1">Brand Name</label>
            <input type="text" value={settingsData.brandName} onChange={(e) => setSettingsData({ ...settingsData, brandName: e.target.value })} className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2]" />
          </div>
          <div>
            <label className="font-semibold block mb-1">Header Wordmark</label>
            <input type="text" value={settingsData.logoText} onChange={(e) => setSettingsData({ ...settingsData, logoText: e.target.value })} className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2]" />
          </div>
        </div>

        <div>
          <label className="font-semibold block mb-1">Top Announcement Banner</label>
          <input type="text" value={settingsData.announcement} onChange={(e) => setSettingsData({ ...settingsData, announcement: e.target.value })} className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2]" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="font-semibold block mb-1">Wholesale &amp; WhatsApp No.</label>
            <input type="text" value={settingsData.whatsappNumber} onChange={(e) => setSettingsData({ ...settingsData, whatsappNumber: e.target.value })} className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono" />
          </div>
          <div>
            <label className="font-semibold block mb-1">Support Phone</label>
            <input type="text" value={settingsData.supportPhone} onChange={(e) => setSettingsData({ ...settingsData, supportPhone: e.target.value })} className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono" />
          </div>
          <div>
            <label className="font-semibold block mb-1">Support Email</label>
            <input type="email" value={settingsData.supportEmail} onChange={(e) => setSettingsData({ ...settingsData, supportEmail: e.target.value })} className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2]" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="font-semibold block mb-1">Free Delivery Min (₹)</label>
            <input type="number" value={settingsData.freeShippingThreshold} onChange={(e) => setSettingsData({ ...settingsData, freeShippingThreshold: Number(e.target.value) })} className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono" />
          </div>
          <div>
            <label className="font-semibold block mb-1">Standard Fee (₹)</label>
            <input type="number" value={settingsData.standardShippingFee} onChange={(e) => setSettingsData({ ...settingsData, standardShippingFee: Number(e.target.value) })} className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono" />
          </div>
          <div>
            <label className="font-semibold block mb-1">Session TTL (Hours)</label>
            <input type="number" min={1} max={720} value={settingsData.sessionTimeoutHours || 168} onChange={(e) => setSettingsData({ ...settingsData, sessionTimeoutHours: Number(e.target.value) })} className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono" />
          </div>
          <div>
            <label className="font-semibold block mb-1">Backup Retention</label>
            <input type="number" min={3} max={50} value={settingsData.backupRetentionCount || 15} onChange={(e) => setSettingsData({ ...settingsData, backupRetentionCount: Number(e.target.value) })} className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono" />
          </div>
        </div>

        <button type="submit" disabled={saving} className="px-6 py-2.5 bg-[#164E3F] hover:bg-[#0F3A2E] text-white font-semibold uppercase tracking-wider rounded cursor-pointer">
          {saving ? 'Saving Settings...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
};

// =================== 7. SECURITY LOGS, ACTIVE SESSIONS & SUPPORT ===================

export const SecurityLogsSessionsView: React.FC<
  CommonProps & {
    logs: ActivityLog[];
    activeSessions: any[];
    inquiries: SupportInquiry[];
  }
> = ({ logs, activeSessions, inquiries, adminToken, pushNotice, onRefresh }) => {
  const [logSearch, setLogSearch] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const filteredLogs = logs.filter((l) => {
    const q = logSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      (l.action || '').toLowerCase().includes(q) ||
      (l.adminEmail || '').toLowerCase().includes(q) ||
      (l.details || '').toLowerCase().includes(q) ||
      (l.recordId || '').toLowerCase().includes(q)
    );
  });

  const revokeUserSessions = async (userId: string) => {
    const res = await fetch(`/api/admin/sessions/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.ok) {
      pushNotice('success', `Revoked active sessions for user ${userId}.`);
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-[#141413]">Security Logs, Change History &amp; Sessions</h1>
        <p className="text-xs text-[#63615C]">
          Tamper-evident before/after change history audit log, active authentication sessions with instant revocation, and customer inquiries
        </p>
      </div>

      {/* Active Sessions */}
      <div className="bg-white rounded-lg border border-[#E2DFD7] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E2DFD7] bg-[#F7F6F2] font-bold text-xs">
          Active Sessions ({activeSessions.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F6F2]/50 text-[#63615C] font-semibold border-b border-[#E2DFD7]">
              <tr>
                <th className="p-3">Account</th>
                <th className="p-3">Role</th>
                <th className="p-3">IP Address</th>
                <th className="p-3">Expires</th>
                <th className="p-3 text-right">Revoke</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DFD7]">
              {activeSessions.map((s, i) => (
                <tr key={i} className="hover:bg-[#F7F6F2]">
                  <td className="p-3 font-mono font-semibold">{s.email}</td>
                  <td className="p-3 uppercase text-[10px] font-bold">{s.adminRole || s.role}</td>
                  <td className="p-3 font-mono text-[11px]">{s.ipAddress || '—'}</td>
                  <td className="p-3 font-mono text-[11px]">{new Date(s.expiresAt).toLocaleString()}</td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => revokeUserSessions(s.userId)}
                      className="px-2.5 py-1 bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] rounded text-[11px] font-semibold cursor-pointer"
                    >
                      Revoke All
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="bg-white rounded-lg border border-[#E2DFD7] p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="font-serif text-lg font-bold">Audit &amp; Change History ({filteredLogs.length})</h3>
            <input
              type="text"
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              placeholder="Filter actor, action, record ID..."
              className="px-2.5 py-1.5 border border-[#E2DFD7] rounded bg-[#F7F6F2] text-xs sm:w-56"
            />
          </div>
          <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
            {filteredLogs.map((l) => {
              const hasDiff = Boolean(l.before || l.after);
              const isExpanded = expandedLogId === l.id;
              return (
                <div key={l.id} className="p-3 bg-[#F7F6F2] rounded border border-[#E2DFD7] text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[#141413]">
                      {l.action}
                      {l.recordId ? <span className="ml-1.5 font-mono text-[10px] text-[#8E6D3B]">[{l.recordId}]</span> : null}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {hasDiff && (
                        <button
                          type="button"
                          onClick={() => setExpandedLogId(isExpanded ? null : l.id)}
                          className="px-1.5 py-0.5 rounded bg-white border border-[#E2DFD7] text-[10px] font-semibold text-[#164E3F] cursor-pointer"
                        >
                          {isExpanded ? 'Hide Diff' : 'View Change Diff'}
                        </button>
                      )}
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          l.result === 'blocked' || l.result === 'failure'
                            ? 'bg-[#FEF2F2] text-[#B91C1C]'
                            : 'bg-[#ECFDF5] text-[#166534]'
                        }`}
                      >
                        {l.result || 'success'}
                      </span>
                    </div>
                  </div>
                  <p className="text-[#63615C]">{l.details}</p>
                  <p className="font-mono text-[10px] text-[#164E3F]">
                    {l.adminEmail} {l.ipAddress ? `· IP ${l.ipAddress}` : ''} · {new Date(l.timestamp).toLocaleString()}
                  </p>
                  {isExpanded && hasDiff && (
                    <div className="mt-2 pt-2 border-t border-[#E2DFD7] grid grid-cols-1 gap-2 font-mono text-[10px]">
                      {l.before && (
                        <div className="p-2 bg-[#FEF2F2]/70 rounded border border-[#FECACA] overflow-x-auto">
                          <span className="font-bold text-[#B91C1C] block mb-0.5">BEFORE:</span>
                          <pre className="whitespace-pre-wrap break-all">{JSON.stringify(l.before, null, 2)}</pre>
                        </div>
                      )}
                      {l.after && (
                        <div className="p-2 bg-[#ECFDF5]/70 rounded border border-[#A7F3D0] overflow-x-auto">
                          <span className="font-bold text-[#166534] block mb-0.5">AFTER:</span>
                          <pre className="whitespace-pre-wrap break-all">{JSON.stringify(l.after, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[#E2DFD7] p-5 space-y-3">
          <h3 className="font-serif text-lg font-bold">Customer Support Inquiries ({inquiries.length})</h3>
          <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
            {inquiries.map((inq) => (
              <div key={inq.id} className="p-3 bg-[#F7F6F2] rounded border border-[#E2DFD7] text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold">{inq.subject}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${inq.status === 'resolved' ? 'bg-[#ECFDF5] text-[#166534]' : 'bg-[#FFFBEB] text-[#B45309]'}`}>
                    {inq.status}
                  </span>
                </div>
                <p className="text-[#63615C]">{inq.message}</p>
                <div className="flex justify-between items-center pt-1">
                  <span className="font-mono text-[10px] text-[#63615C]">{inq.name} · {inq.email}</span>
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch(`/api/admin/support/${inq.id}`, {
                        method: 'PATCH',
                        headers: { Authorization: `Bearer ${adminToken}` },
                      });
                      onRefresh();
                    }}
                    className="font-semibold text-[#164E3F] hover:underline cursor-pointer"
                  >
                    Mark {inq.status === 'open' ? 'Resolved' : 'Reopen'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// =================== 8. BACKUP & RECOVERY ===================

export const BackupsRecoveryView: React.FC<
  CommonProps & {
    backups: BackupRecord[];
    retentionCount: number;
    onRefreshStorefront: () => void;
  }
> = ({ backups, retentionCount, adminToken, pushNotice, onRefresh, onRefreshStorefront }) => {
  const [creating, setCreating] = useState(false);
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<Record<string, string>>({});

  const createBackup = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/admin/backups', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (res.ok) {
        pushNotice('success', `Snapshot ${data.backup.filename} created (${data.backup.sizeBytes} bytes).`);
        onRefresh();
      } else {
        pushNotice('error', data.error || 'Backup creation failed.');
      }
    } finally {
      setCreating(false);
    }
  };

  const verifyBackup = async (b: BackupRecord) => {
    const res = await fetch(`/api/admin/backups/${b.id}/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const d = await res.json();
    setVerifyMsg((prev) => ({
      ...prev,
      [b.id]: d.valid ? `Checksum Verified (${d.counts.products} products, ${d.counts.orders} orders)` : `Corrupted: ${d.error}`,
    }));
  };

  const restoreBackup = async (b: BackupRecord) => {
    setRestoring(true);
    try {
      const res = await fetch(`/api/admin/backups/${b.id}/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const d = await res.json();
      setConfirmRestoreId(null);
      if (res.ok) {
        pushNotice('success', d.message || `Restored ${b.filename}.`);
        onRefresh();
        onRefreshStorefront();
      } else {
        pushNotice('error', d.error || 'Restore failed.');
      }
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#141413]">Database Backups &amp; Point-in-Time Recovery</h1>
          <p className="text-xs text-[#63615C]">
            SHA-256 verified JSON snapshots stored in <code className="font-mono">data/backups/</code> (Retention: {retentionCount} backups)
          </p>
        </div>

        <button
          type="button"
          onClick={createBackup}
          disabled={creating}
          className="px-4 py-2.5 bg-[#164E3F] hover:bg-[#0F3A2E] text-white text-xs font-semibold uppercase tracking-wider rounded-md flex items-center gap-1.5 cursor-pointer self-start"
        >
          <HardDrive className="w-4 h-4" />
          <span>{creating ? 'Creating Snapshot...' : 'Create Manual Backup'}</span>
        </button>
      </div>

      <div className="space-y-3">
        {backups.length === 0 ? (
          <div className="bg-white p-8 rounded-lg border border-[#E2DFD7] text-center text-xs text-[#63615C]">
            No backups recorded yet. Click Create Manual Backup to generate an encrypted checksum snapshot.
          </div>
        ) : (
          backups.map((b) => (
            <div key={b.id} className="bg-white p-4 rounded-lg border border-[#E2DFD7] space-y-2 text-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-[#164E3F]">{b.filename}</span>
                    <span className="uppercase px-2 py-0.5 rounded bg-[#F7F6F2] border border-[#E2DFD7] text-[10px] font-bold">
                      {b.trigger.replace('_', ' ')}
                    </span>
                    <span className="font-mono text-[#63615C]">{(b.sizeBytes / 1024).toFixed(1)} KB</span>
                  </div>
                  <p className="font-mono text-[11px] text-[#63615C]">
                    SHA-256: {b.checksum.slice(0, 20)}... · Products: {b.counts.products} · Orders: {b.counts.orders} · Users: {b.counts.users}
                  </p>
                  <p className="text-[11px] text-[#63615C]">
                    Created {new Date(b.createdAt).toLocaleString()} by <span className="font-mono">{b.createdBy}</span>
                  </p>
                </div>

                {confirmRestoreId === b.id ? (
                  <div className="flex items-center gap-2 bg-[#FEF2F2] p-2 rounded border border-[#FECACA]">
                    <span className="text-[11px] font-bold text-[#B91C1C]">Overwrite live DB?</span>
                    <button
                      type="button"
                      disabled={restoring}
                      onClick={() => restoreBackup(b)}
                      className="px-2.5 py-1 bg-[#B91C1C] text-white rounded font-semibold cursor-pointer"
                    >
                      {restoring ? 'Restoring...' : 'Yes, Restore'}
                    </button>
                    <button type="button" onClick={() => setConfirmRestoreId(null)} className="px-2 py-1 border border-[#E2DFD7] bg-white rounded cursor-pointer">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => verifyBackup(b)}
                      className="px-3 py-1.5 border border-[#E2DFD7] rounded font-semibold hover:border-[#164E3F] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-[#164E3F]" /> Verify
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        downloadAuthorizedFile(
                          `/api/admin/backups/${b.id}/download`,
                          b.filename,
                          adminToken,
                          (m) => pushNotice('error', m)
                        )
                      }
                      className="px-3 py-1.5 border border-[#E2DFD7] rounded font-semibold hover:border-[#164E3F] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRestoreId(b.id)}
                      className="px-3 py-1.5 bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] rounded font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Restore
                    </button>
                  </div>
                )}
              </div>

              {verifyMsg[b.id] && (
                <p className="text-[11px] font-mono text-[#166534] bg-[#ECFDF5] px-2.5 py-1 rounded border border-[#A7F3D0]">
                  {verifyMsg[b.id]}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
