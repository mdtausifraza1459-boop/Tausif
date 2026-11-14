import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { WholesaleAccount, WholesaleOrderRequest } from '../types.ts';
import {
  X,
  Building2,
  Phone,
  CheckCircle2,
  AlertCircle,
  Package,
  Send,
  ShieldCheck,
  Clock,
} from 'lucide-react';

interface WholesaleCatalogItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  fabric: string;
  images: string[];
  retailPrice: number;
  wholesalePrice: number;
  wholesaleMoq: number;
  stockQuantity: number;
}

export const WholesalePortalModal: React.FC = () => {
  const { wholesaleModalOpen, setWholesaleModalOpen, user, token, showToast } = useStore();

  const [lookupEmail, setLookupEmail] = useState(user?.email || '');
  const [account, setAccount] = useState<WholesaleAccount | null>(null);
  const [catalog, setCatalog] = useState<WholesaleCatalogItem[]>([]);
  const [orders, setOrders] = useState<WholesaleOrderRequest[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [statusLoading, setStatusLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Registration Form
  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState(user?.name || '');
  const [regEmail, setRegEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [gstNumber, setGstNumber] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');

  const loadWholesaleState = useCallback(
    async (emailToCheck: string) => {
      if (!emailToCheck.trim()) return;
      setStatusLoading(true);
      setFeedback(null);
      try {
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
        const sRes = await fetch(`/api/wholesale/status?email=${encodeURIComponent(emailToCheck.trim())}`, { headers });
        const sData = await sRes.json();
        if (sRes.ok) {
          setAccount(sData.account || null);
          if (sData.account?.status === 'approved') {
            const [cRes, oRes] = await Promise.all([
              fetch(`/api/wholesale/catalog?email=${encodeURIComponent(emailToCheck.trim())}`, { headers }),
              fetch(`/api/wholesale/orders?email=${encodeURIComponent(emailToCheck.trim())}`, { headers }),
            ]);
            if (cRes.ok) {
              const cData = await cRes.json();
              setCatalog(cData.products || []);
            }
            if (oRes.ok) {
              const oData = await oRes.json();
              setOrders(oData.orders || []);
            }
          } else {
            setCatalog([]);
            setOrders([]);
          }
        }
      } catch {
        setFeedback({ type: 'error', text: 'Failed to check wholesale portal status.' });
      } finally {
        setStatusLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (wholesaleModalOpen && user?.email) {
      setLookupEmail(user.email);
      setRegEmail(user.email);
      setContactName(user.name || '');
      loadWholesaleState(user.email);
    }
  }, [wholesaleModalOpen, user, loadWholesaleState]);

  if (!wholesaleModalOpen) return null;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/wholesale/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          businessName,
          contactName,
          email: regEmail,
          phone,
          gstNumber: gstNumber || undefined,
          city,
          state: stateName,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAccount(data.account);
        setLookupEmail(regEmail);
        setFeedback({ type: 'success', text: data.message });
      } else {
        setFeedback({ type: 'error', text: data.error || 'Registration failed.' });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Network error submitting registration.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitBulkOrder = async () => {
    if (!account || account.status !== 'approved') return;
    const selectedItems = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([productId, quantity]) => ({ productId, quantity }));

    if (selectedItems.length === 0) {
      setFeedback({ type: 'error', text: 'Enter order quantities (meeting MOQ) for at least one SKU.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/wholesale/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email: account.email, items: selectedItems }),
      });
      const data = await res.json();
      if (res.ok && data.wholesaleOrder) {
        setQuantities({});
        setOrders((prev) => [data.wholesaleOrder, ...prev]);
        showToast({
          title: `Wholesale Quote Requested (${data.wholesaleOrder.id})`,
          subtitle: `${data.wholesaleOrder.totalQuantity} units submitted for dispatch review.`,
          type: 'success',
        });
        setFeedback({
          type: 'success',
          text: `Bulk request ${data.wholesaleOrder.id} submitted (${data.wholesaleOrder.totalQuantity} units). Our B2B desk will confirm dispatch & invoicing.`,
        });
      } else {
        setFeedback({ type: 'error', text: data.error || 'Failed to submit wholesale request.' });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Network failure submitting bulk request.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 flex items-center justify-center font-sans text-[#141413]">
      <div className="relative w-full max-w-5xl bg-[#F7F6F2] rounded-xl shadow-2xl border border-[#E2DFD7] overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#141413] text-white">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-[#D4AF6A]" />
            <div>
              <h2 className="font-serif text-xl font-semibold">Zohra Luxe B2B &amp; Wholesale Trade Desk</h2>
              <p className="text-[11px] text-white/75">
                Approved retail boutiques &amp; resellers · Direct Wholesale Line:{' '}
                <a href="tel:9310078735" className="text-[#D4AF6A] font-mono underline">
                  +91 9310078735
                </a>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setWholesaleModalOpen(false)}
            aria-label="Close wholesale portal"
            className="p-1.5 rounded-md text-white/80 hover:text-white hover:bg-white/15 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Direct Contact Card */}
          <div className="p-4 bg-white rounded-lg border border-[#E2DFD7] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#164E3F]">
                Factory-Direct Wholesale &amp; Boutique Supply
              </span>
              <h3 className="font-serif text-lg font-bold text-[#141413]">
                For Wholesale Rates, Bulk Catalogue &amp; Trade Partnerships
              </h3>
              <p className="text-[#63615C]">
                Wholesale unit pricing and MOQ tiers are visible only to store-approved trade buyers.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <a
                href="tel:9310078735"
                className="px-4 py-2.5 bg-[#164E3F] hover:bg-[#0F3A2E] text-white font-semibold rounded-md flex items-center gap-1.5 font-mono"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call +91 9310078735</span>
              </a>
              <a
                href="https://wa.me/919310078735?text=Hello%20Zohra%20Luxe%2C%20I%20would%20like%20to%20inquire%20about%20wholesale%20B2B%20rates."
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 bg-[#ECF4F1] text-[#164E3F] border border-[#164E3F]/30 font-semibold rounded-md"
              >
                WhatsApp Trade Desk
              </a>
            </div>
          </div>

          {feedback && (
            <div
              className={`p-3.5 rounded-md border flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#166534]'
                  : 'bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C]'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          {/* Buyer Status Check */}
          <div className="p-4 bg-white rounded-lg border border-[#E2DFD7] flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="font-semibold text-[#141413] shrink-0">Check Approved B2B Account:</span>
            <input
              type="email"
              value={lookupEmail}
              onChange={(e) => setLookupEmail(e.target.value)}
              placeholder="Enter registered business email"
              className="flex-1 px-3 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2] font-mono focus:outline-none focus:border-[#164E3F]"
            />
            <button
              type="button"
              onClick={() => loadWholesaleState(lookupEmail)}
              disabled={statusLoading || !lookupEmail.trim()}
              className="px-4 py-2 bg-[#141413] hover:bg-[#164E3F] text-white font-semibold rounded-md cursor-pointer disabled:opacity-50"
            >
              {statusLoading ? 'Checking...' : 'Access Trade Catalog'}
            </button>
          </div>

          {/* Account Status Views */}
          {account && account.status !== 'approved' && (
            <div className="p-5 bg-white rounded-lg border border-[#FDE68A] space-y-2">
              <div className="flex items-center gap-2 text-[#B45309] font-bold">
                <Clock className="w-4 h-4" />
                <span>
                  Application {account.id} Status: {account.status.toUpperCase()}
                </span>
              </div>
              <p className="text-[#63615C]">
                Business: <strong>{account.businessName}</strong> ({account.city}, {account.state}). Wholesale pricing remains hidden until an authorized store owner approves your registration. Call{' '}
                <a href="tel:9310078735" className="font-mono font-semibold text-[#164E3F] underline">
                  +91 9310078735
                </a>{' '}
                for fast verification.
              </p>
            </div>
          )}

          {account && account.status === 'approved' ? (
            <div className="space-y-6">
              <div className="p-4 bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-[#166534]">
                  <ShieldCheck className="w-5 h-5" />
                  <div>
                    <p className="font-bold">
                      Verified Wholesale Partner: {account.businessName} ({account.id})
                    </p>
                    <p className="text-[11px]">
                      Approved Trade Tier: <strong>{account.discountTierPercent}% Off Retail MRP</strong> · GST:{' '}
                      <span className="font-mono">{account.gstNumber || 'N/A'}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSubmitBulkOrder}
                  disabled={submitting}
                  className="px-5 py-2.5 bg-[#164E3F] hover:bg-[#0F3A2E] text-white font-semibold rounded-md flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Submitting...' : 'Submit Bulk Quote Order'}</span>
                </button>
              </div>

              {/* Wholesale Gated Price & MOQ Table */}
              <div className="bg-white rounded-lg border border-[#E2DFD7] overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F6F2] text-[#63615C] border-b border-[#E2DFD7]">
                    <tr>
                      <th className="p-3">SKU &amp; Product</th>
                      <th className="p-3">Retail Price</th>
                      <th className="p-3">Wholesale Unit Rate</th>
                      <th className="p-3">MOQ</th>
                      <th className="p-3">Order Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2DFD7]">
                    {catalog.map((item) => (
                      <tr key={item.id}>
                        <td className="p-3 flex items-center gap-3">
                          <img
                            src={item.images[0]}
                            alt={item.name}
                            referrerPolicy="no-referrer"
                            className="w-10 h-12 object-cover rounded border border-[#E2DFD7]"
                          />
                          <div>
                            <p className="font-mono text-[10px] text-[#63615C]">{item.sku}</p>
                            <p className="font-semibold text-[#141413]">{item.name}</p>
                            <p className="text-[11px] text-[#63615C]">{item.fabric}</p>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-[#63615C] line-through tabular-nums">
                          ₹{item.retailPrice.toLocaleString()}
                        </td>
                        <td className="p-3 font-mono font-bold text-[#164E3F] tabular-nums">
                          ₹{item.wholesalePrice.toLocaleString()}
                        </td>
                        <td className="p-3 font-mono font-semibold tabular-nums">{item.wholesaleMoq} pcs</td>
                        <td className="p-3">
                          <input
                            type="number"
                            min={0}
                            step={1}
                            placeholder={`Min ${item.wholesaleMoq}`}
                            value={quantities[item.id] || ''}
                            onChange={(e) =>
                              setQuantities((prev) => ({
                                ...prev,
                                [item.id]: Math.max(0, parseInt(e.target.value, 10) || 0),
                              }))
                            }
                            className="w-24 px-2.5 py-1.5 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono text-xs"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bulk Order Requests History */}
              {orders.length > 0 && (
                <div className="bg-white rounded-lg border border-[#E2DFD7] p-4 space-y-3">
                  <h4 className="font-serif text-base font-bold text-[#141413] flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#164E3F]" />
                    <span>Your Wholesale Order Requests</span>
                  </h4>
                  <div className="divide-y divide-[#E2DFD7]">
                    {orders.map((wo) => (
                      <div key={wo.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-mono font-bold text-[#164E3F]">{wo.id}</span>
                          <span className="text-[#63615C] ml-2">
                            {wo.totalQuantity} pieces · {new Date(wo.createdAt).toLocaleDateString()}
                          </span>
                          {wo.adminQuoteNotes && (
                            <p className="text-[11px] text-[#63615C] mt-0.5">Note: {wo.adminQuoteNotes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold tabular-nums">
                            Est. ₹{wo.estimatedTotal.toLocaleString()}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-[#ECF4F1] text-[#164E3F] font-semibold uppercase text-[10px]">
                            {wo.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : !account && (
            /* Wholesale Partner Application Form */
            <form onSubmit={handleRegister} className="bg-white rounded-xl border border-[#E2DFD7] p-5 sm:p-6 space-y-4">
              <div className="border-b border-[#E2DFD7] pb-3">
                <h3 className="font-serif text-lg font-bold text-[#141413]">Apply for Wholesale B2B Account</h3>
                <p className="text-[11px] text-[#63615C]">
                  Once verified by the Zohra Luxe Store Owner, wholesale rates &amp; MOQ catalogs unlock immediately for your business email.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-[#141413] block mb-1">Boutique / Business Name *</label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Noor Heritage Emporium"
                    className="w-full px-3 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#141413] block mb-1">Primary Contact Name *</label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Owner or Buyer Name"
                    className="w-full px-3 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#141413] block mb-1">Business Email *</label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="buyer@boutique.com"
                    className="w-full px-3 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2] font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#141413] block mb-1">WhatsApp / Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 00000"
                    className="w-full px-3 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2] font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#141413] block mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Jaipur"
                    className="w-full px-3 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#141413] block mb-1">State *</label>
                  <input
                    type="text"
                    required
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    placeholder="e.g. Rajasthan"
                    className="w-full px-3 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="font-semibold text-[#141413] block mb-1">GSTIN Number (Optional)</label>
                  <input
                    type="text"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. 07AABCU9603R1ZM"
                    className="w-full px-3 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2] font-mono"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-[#164E3F] hover:bg-[#0F3A2E] text-white font-semibold rounded-md cursor-pointer"
              >
                {submitting ? 'Submitting Application...' : 'Submit B2B Application'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
