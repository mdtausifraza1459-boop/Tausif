import React, { useState, useEffect } from 'react';
import {
  Zap,
  Layers,
  Gift,
  Sparkles,
  MessageCircleQuestion,
  Crown,
  Megaphone,
  ShoppingCart,
  LifeBuoy,
  TrendingUp,
  RotateCcw,
  AlertTriangle,
  CalendarClock,
  Users,
  Tag,
  CheckCircle,
  Trash2,
  Plus,
  Send,
  Play,
  Download,
  Search,
  ShieldCheck,
  BarChart3,
  Package,
} from 'lucide-react';
import {
  AbandonedCartRecord,
  BundleOffer,
  Category,
  DigitalGiftCard,
  FlashSaleRule,
  LookbookCollection,
  MarketingCampaign,
  OccasionType,
  OrderComplaint,
  Product,
  ProductQuestion,
  ScheduledReportConfig,
  VipTierConfig,
} from '../../types.ts';

interface CommonProps {
  adminToken: string;
  pushNotice: (type: 'success' | 'error', text: string) => void;
  onRefresh: () => void;
}

const OCCASION_OPTIONS: OccasionType[] = [
  'Wedding',
  'Festive',
  'Eid',
  'Party',
  'Office',
  'Casual',
  'Daily Wear',
];

// =================== 1. GROWTH, FLASH SALES, BUNDLES, GIFT CARDS, LOOKBOOKS & Q&A ===================

export const GrowthPromotionsView: React.FC<
  CommonProps & {
    products: Product[];
    categories: Category[];
    flashSales: FlashSaleRule[];
    bundles: BundleOffer[];
    giftCards: DigitalGiftCard[];
    lookbooks: LookbookCollection[];
    questions: (ProductQuestion & { productName?: string })[];
    canManage: boolean;
    onRefreshStorefront: () => void;
  }
> = ({
  products,
  categories,
  flashSales,
  bundles,
  giftCards,
  lookbooks,
  questions,
  canManage,
  adminToken,
  pushNotice,
  onRefresh,
  onRefreshStorefront,
}) => {
  const [subTab, setSubTab] = useState<'flash' | 'bundles' | 'giftcards' | 'lookbooks' | 'qa'>('flash');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Flash sale form
  const [fsTitle, setFsTitle] = useState('');
  const [fsDesc, setFsDesc] = useState('');
  const [fsDiscount, setFsDiscount] = useState(20);
  const [fsStartsAt, setFsStartsAt] = useState(() => new Date(Date.now() - 3600000).toISOString().slice(0, 16));
  const [fsEndsAt, setFsEndsAt] = useState(() => new Date(Date.now() + 72 * 3600000).toISOString().slice(0, 16));
  const [fsVipEarly, setFsVipEarly] = useState(12);
  const [fsCats, setFsCats] = useState<string[]>([]);
  const [fsPids, setFsPids] = useState<string[]>([]);

  // Bundle form
  const [bnTitle, setBnTitle] = useState('');
  const [bnDesc, setBnDesc] = useState('');
  const [bnMinItems, setBnMinItems] = useState(2);
  const [bnType, setBnType] = useState<'percentage' | 'fixed'>('percentage');
  const [bnVal, setBnVal] = useState(10);
  const [bnPids, setBnPids] = useState<string[]>([]);

  // Gift card admin issue form
  const [gcRecipientName, setGcRecipientName] = useState('');
  const [gcRecipientEmail, setGcRecipientEmail] = useState('');
  const [gcAmount, setGcAmount] = useState(2500);
  const [gcMessage, setGcMessage] = useState('');

  // Lookbook form
  const [lbTitle, setLbTitle] = useState('');
  const [lbOccasion, setLbOccasion] = useState<OccasionType>('Festive');
  const [lbSubtitle, setLbSubtitle] = useState('');
  const [lbNote, setLbNote] = useState('');
  const [lbDiscount, setLbDiscount] = useState(5);
  const [lbImage, setLbImage] = useState('/src/assets/images/category_anarkali_festive_1794109164992.jpg');
  const [lbPids, setLbPids] = useState<string[]>([]);

  // Q&A filter & answer drafts
  const [qaFilter, setQaFilter] = useState<'all' | 'unanswered'>('unanswered');
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});

  const toggleArr = (arr: string[], setArr: (v: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  const createFlashSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fsCats.length === 0 && fsPids.length === 0) {
      pushNotice('error', 'Select at least one category or product for the flash sale.');
      return;
    }
    const res = await fetch('/api/admin/flash-sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: fsTitle,
        description: fsDesc,
        discountPercent: fsDiscount,
        startsAt: new Date(fsStartsAt).toISOString(),
        endsAt: new Date(fsEndsAt).toISOString(),
        vipEarlyAccessHours: fsVipEarly,
        categories: fsCats,
        productIds: fsPids,
      }),
    });
    const d = await res.json();
    if (res.ok) {
      pushNotice('success', `Flash sale "${d.flashSale.title}" scheduled.`);
      setFsTitle('');
      setFsDesc('');
      setFsCats([]);
      setFsPids([]);
      onRefresh();
      onRefreshStorefront();
    } else {
      pushNotice('error', d.error || 'Failed to create flash sale.');
    }
  };

  const createBundle = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/bundles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: bnTitle,
        description: bnDesc,
        minItems: bnMinItems,
        discountType: bnType,
        discountValue: bnVal,
        requiredProductIds: bnPids,
      }),
    });
    const d = await res.json();
    if (res.ok) {
      pushNotice('success', `Bundle "${d.bundle.title}" created.`);
      setBnTitle('');
      setBnDesc('');
      setBnPids([]);
      onRefresh();
      onRefreshStorefront();
    } else {
      pushNotice('error', d.error || 'Failed to create bundle.');
    }
  };

  const issueGiftCard = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/gift-cards/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        amount: gcAmount,
        recipientName: gcRecipientName,
        recipientEmail: gcRecipientEmail,
        senderName: 'Zohra Luxe Concierge',
        message: gcMessage || 'Compliments of Zohra Luxe Atelier',
      }),
    });
    const d = await res.json();
    if (res.ok) {
      pushNotice('success', `Issued Digital Gift Card ${d.giftCard.code} (₹${d.giftCard.initialBalance}).`);
      setGcRecipientName('');
      setGcRecipientEmail('');
      setGcMessage('');
      onRefresh();
    } else {
      pushNotice('error', d.error || 'Failed to issue gift card.');
    }
  };

  const createLookbook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lbPids.length === 0) {
      pushNotice('error', 'Select at least 1 product for the curated lookbook.');
      return;
    }
    const res = await fetch('/api/admin/lookbooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: lbTitle,
        occasion: lbOccasion,
        subtitle: lbSubtitle,
        editorialNote: lbNote,
        bundleDiscountPercent: lbDiscount,
        image: lbImage,
        productIds: lbPids,
      }),
    });
    const d = await res.json();
    if (res.ok) {
      pushNotice('success', `Lookbook "${d.lookbook.title}" published.`);
      setLbTitle('');
      setLbSubtitle('');
      setLbNote('');
      setLbPids([]);
      onRefresh();
      onRefreshStorefront();
    } else {
      pushNotice('error', d.error || 'Failed to create lookbook.');
    }
  };

  const answerQuestion = async (qId: string, isPublic?: boolean) => {
    const answer = answerDrafts[qId];
    const res = await fetch(`/api/admin/questions/${qId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        ...(answer !== undefined ? { answer } : {}),
        ...(isPublic !== undefined ? { isPublic } : {}),
      }),
    });
    if (res.ok) {
      pushNotice('success', 'Product Q&A updated.');
      onRefresh();
      onRefreshStorefront();
    } else {
      const d = await res.json().catch(() => ({}));
      pushNotice('error', d.error || 'Failed to update question.');
    }
  };

  const filteredQuestions = questions.filter((q) =>
    qaFilter === 'unanswered' ? !q.answer : true
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#141413]">
            Growth, Merchandising &amp; Q&amp;A Desk
          </h1>
          <p className="text-xs text-[#63615C]">
            Schedule flash sales, configure combo bundles, manage digital gift cards, curate lookbooks, and answer product Q&amp;A
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[#E2DFD7] pb-3 text-xs">
        {[
          { id: 'flash', label: `Flash Sales (${flashSales.length})`, icon: Zap },
          { id: 'bundles', label: `Combo Bundles (${bundles.length})`, icon: Layers },
          { id: 'giftcards', label: `Digital Gift Cards (${giftCards.length})`, icon: Gift },
          { id: 'lookbooks', label: `Fashion Lookbooks (${lookbooks.length})`, icon: Sparkles },
          {
            id: 'qa',
            label: `Product Q&A (${questions.filter((q) => !q.answer).length} pending)`,
            icon: MessageCircleQuestion,
          },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id as any)}
              className={`px-3.5 py-2 rounded-md font-semibold inline-flex items-center gap-1.5 border cursor-pointer ${
                subTab === t.id
                  ? 'bg-[#164E3F] text-white border-[#164E3F]'
                  : 'bg-white text-[#63615C] border-[#E2DFD7] hover:border-[#164E3F]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* FLASH SALES */}
      {subTab === 'flash' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {canManage && (
            <form
              onSubmit={createFlashSale}
              className="bg-white p-5 rounded-lg border border-[#E2DFD7] space-y-3 text-xs"
            >
              <h3 className="font-serif text-lg font-bold">Schedule Flash Sale</h3>
              <div>
                <label className="font-semibold block mb-1">Campaign Title *</label>
                <input
                  type="text"
                  required
                  value={fsTitle}
                  onChange={(e) => setFsTitle(e.target.value)}
                  placeholder="Midnight Silk Flash"
                  className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2]"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Description</label>
                <input
                  type="text"
                  value={fsDesc}
                  onChange={(e) => setFsDesc(e.target.value)}
                  placeholder="Extra flash markdown on curated weaves"
                  className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Discount % *</label>
                  <input
                    type="number"
                    min={1}
                    max={85}
                    required
                    value={fsDiscount}
                    onChange={(e) => setFsDiscount(Number(e.target.value))}
                    className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">VIP Early Access (Hrs)</label>
                  <input
                    type="number"
                    min={0}
                    max={72}
                    value={fsVipEarly}
                    onChange={(e) => setFsVipEarly(Number(e.target.value))}
                    className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Starts At *</label>
                  <input
                    type="datetime-local"
                    required
                    value={fsStartsAt}
                    onChange={(e) => setFsStartsAt(e.target.value)}
                    className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Ends At *</label>
                  <input
                    type="datetime-local"
                    required
                    value={fsEndsAt}
                    onChange={(e) => setFsEndsAt(e.target.value)}
                    className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono text-[11px]"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold block mb-1">Target Categories</label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-[#F7F6F2] rounded border border-[#E2DFD7]">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleArr(fsCats, setFsCats, c.name)}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold border cursor-pointer ${
                        fsCats.includes(c.name)
                          ? 'bg-[#164E3F] text-white border-[#164E3F]'
                          : 'bg-white text-[#63615C] border-[#E2DFD7]'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="font-semibold block mb-1">Or Specific Products ({fsPids.length})</label>
                <div className="max-h-28 overflow-y-auto p-2 bg-[#F7F6F2] rounded border border-[#E2DFD7] space-y-1">
                  {products.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer text-[11px]">
                      <input
                        type="checkbox"
                        checked={fsPids.includes(p.id)}
                        onChange={() => toggleArr(fsPids, setFsPids, p.id)}
                      />
                      <span className="truncate">{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-[#164E3F] hover:bg-[#0F3A2E] text-white font-semibold uppercase tracking-wider rounded cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Launch Flash Sale
              </button>
            </form>
          )}

          <div className={`${canManage ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-3`}>
            {flashSales.length === 0 ? (
              <div className="bg-white p-8 rounded-lg border border-[#E2DFD7] text-center text-xs text-[#63615C]">
                No flash sales scheduled yet.
              </div>
            ) : (
              flashSales.map((fs) => {
                const now = Date.now();
                const isLive =
                  fs.active &&
                  new Date(fs.startsAt).getTime() <= now &&
                  new Date(fs.endsAt).getTime() >= now;
                return (
                  <div
                    key={fs.id}
                    className="bg-white p-4 rounded-lg border border-[#E2DFD7] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-serif text-base font-bold text-[#141413]">{fs.title}</span>
                        <span className="px-2 py-0.5 rounded font-mono font-bold bg-[#141413] text-[#D4AF6A] text-[10px]">
                          {fs.discountPercent}% EXTRA OFF
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isLive
                              ? 'bg-[#ECFDF5] text-[#166534]'
                              : fs.active
                              ? 'bg-[#FFFBEB] text-[#B45309]'
                              : 'bg-[#F7F6F2] text-[#63615C]'
                          }`}
                        >
                          {isLive ? 'Live Now' : fs.active ? 'Scheduled / Ended' : 'Paused'}
                        </span>
                      </div>
                      <p className="text-[#63615C]">{fs.description}</p>
                      <p className="font-mono text-[11px] text-[#63615C]">
                        Window: {new Date(fs.startsAt).toLocaleString()} → {new Date(fs.endsAt).toLocaleString()} · VIP Early Access: {fs.vipEarlyAccessHours || 0}h
                      </p>
                      <p className="text-[11px] text-[#164E3F]">
                        Targets: {fs.categories.length ? fs.categories.join(', ') : `${fs.productIds.length} product(s)`}
                      </p>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={async () => {
                            await fetch(`/api/admin/flash-sales/${fs.id}/toggle`, {
                              method: 'PATCH',
                              headers: { Authorization: `Bearer ${adminToken}` },
                            });
                            onRefresh();
                            onRefreshStorefront();
                          }}
                          className="px-3 py-1.5 border border-[#E2DFD7] rounded font-semibold hover:bg-[#F7F6F2] cursor-pointer"
                        >
                          {fs.active ? 'Pause' : 'Activate'}
                        </button>
                        {confirmDeleteId === fs.id ? (
                          <>
                            <button
                              type="button"
                              onClick={async () => {
                                await fetch(`/api/admin/flash-sales/${fs.id}`, {
                                  method: 'DELETE',
                                  headers: { Authorization: `Bearer ${adminToken}` },
                                });
                                setConfirmDeleteId(null);
                                pushNotice('success', 'Flash sale deleted.');
                                onRefresh();
                                onRefreshStorefront();
                              }}
                              className="px-2.5 py-1.5 bg-[#B91C1C] text-white rounded font-semibold cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1.5 border border-[#E2DFD7] rounded cursor-pointer"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(fs.id)}
                            className="p-1.5 text-[#B91C1C] hover:bg-[#FEF2F2] rounded cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* BUNDLES */}
      {subTab === 'bundles' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {canManage && (
            <form
              onSubmit={createBundle}
              className="bg-white p-5 rounded-lg border border-[#E2DFD7] space-y-3 text-xs"
            >
              <h3 className="font-serif text-lg font-bold">Create Bundle Offer</h3>
              <div>
                <label className="font-semibold block mb-1">Offer Title *</label>
                <input
                  type="text"
                  required
                  value={bnTitle}
                  onChange={(e) => setBnTitle(e.target.value)}
                  placeholder="Festive Trio Bundle — Save 12%"
                  className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2]"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Description</label>
                <input
                  type="text"
                  value={bnDesc}
                  onChange={(e) => setBnDesc(e.target.value)}
                  placeholder="Automatically applied on checkout"
                  className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2]"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Min Items</label>
                  <input
                    type="number"
                    min={2}
                    value={bnMinItems}
                    onChange={(e) => setBnMinItems(Number(e.target.value))}
                    className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Type</label>
                  <select
                    value={bnType}
                    onChange={(e) => setBnType(e.target.value as any)}
                    className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2]"
                  >
                    <option value="percentage">% Off</option>
                    <option value="fixed">₹ Off</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Value *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={bnVal}
                    onChange={(e) => setBnVal(Number(e.target.value))}
                    className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold block mb-1">Required Specific Products (Optional)</label>
                <div className="max-h-28 overflow-y-auto p-2 bg-[#F7F6F2] rounded border border-[#E2DFD7] space-y-1">
                  {products.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer text-[11px]">
                      <input
                        type="checkbox"
                        checked={bnPids.includes(p.id)}
                        onChange={() => toggleArr(bnPids, setBnPids, p.id)}
                      />
                      <span className="truncate">{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-[#164E3F] text-white font-semibold uppercase tracking-wider rounded cursor-pointer"
              >
                Create Bundle Rule
              </button>
            </form>
          )}

          <div className={`${canManage ? 'lg:col-span-2' : 'lg:col-span-3'} grid grid-cols-1 md:grid-cols-2 gap-4`}>
            {bundles.map((b) => (
              <div key={b.id} className="bg-white p-4 rounded-lg border border-[#E2DFD7] space-y-2.5 text-xs">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h4 className="font-serif text-base font-bold text-[#141413]">{b.title}</h4>
                    <p className="text-[#63615C]">{b.description}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      b.active ? 'bg-[#ECFDF5] text-[#166534]' : 'bg-[#F7F6F2] text-[#63615C]'
                    }`}
                  >
                    {b.active ? 'Active' : 'Paused'}
                  </span>
                </div>
                <div className="font-mono text-[11px] bg-[#F7F6F2] p-2.5 rounded border border-[#E2DFD7]">
                  Min Units: <strong>{b.minItems}</strong> · Savings:{' '}
                  <strong className="text-[#164E3F]">
                    {b.discountType === 'percentage' ? `${b.discountValue}%` : `₹${b.discountValue}`}
                  </strong>
                  {b.requiredProductIds.length > 0 && (
                    <p className="mt-1 text-[#63615C]">
                      Requires {b.requiredProductIds.length} paired style(s)
                    </p>
                  )}
                </div>
                {canManage && (
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch(`/api/admin/bundles/${b.id}/toggle`, {
                        method: 'PATCH',
                        headers: { Authorization: `Bearer ${adminToken}` },
                      });
                      onRefresh();
                      onRefreshStorefront();
                    }}
                    className="w-full py-1.5 border border-[#E2DFD7] rounded font-semibold hover:bg-[#F7F6F2] cursor-pointer"
                  >
                    {b.active ? 'Disable Bundle' : 'Enable Bundle'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DIGITAL GIFT CARDS */}
      {subTab === 'giftcards' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {canManage && (
            <form
              onSubmit={issueGiftCard}
              className="bg-white p-5 rounded-lg border border-[#E2DFD7] space-y-3 text-xs"
            >
              <h3 className="font-serif text-lg font-bold">Issue Digital Gift Card</h3>
              <div>
                <label className="font-semibold block mb-1">Recipient Name *</label>
                <input
                  type="text"
                  required
                  value={gcRecipientName}
                  onChange={(e) => setGcRecipientName(e.target.value)}
                  className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2]"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Recipient Email *</label>
                <input
                  type="email"
                  required
                  value={gcRecipientEmail}
                  onChange={(e) => setGcRecipientEmail(e.target.value)}
                  className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Balance Amount (₹) *</label>
                <input
                  type="number"
                  min={500}
                  max={50000}
                  required
                  value={gcAmount}
                  onChange={(e) => setGcAmount(Number(e.target.value))}
                  className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Gift Note</label>
                <input
                  type="text"
                  value={gcMessage}
                  onChange={(e) => setGcMessage(e.target.value)}
                  placeholder="Warm wishes from Zohra Luxe"
                  className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2]"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-[#164E3F] text-white font-semibold uppercase tracking-wider rounded cursor-pointer"
              >
                Issue Gift Card
              </button>
            </form>
          )}

          <div className={`${canManage ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white rounded-lg border border-[#E2DFD7] overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F6F2] text-[#63615C] font-semibold border-b border-[#E2DFD7]">
                  <tr>
                    <th className="p-3">Code</th>
                    <th className="p-3">Recipient</th>
                    <th className="p-3">Remaining / Initial</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2DFD7]">
                  {giftCards.map((gc) => (
                    <tr key={gc.id} className="hover:bg-[#F7F6F2]">
                      <td className="p-3 font-mono font-bold text-[#164E3F]">{gc.code}</td>
                      <td className="p-3">
                        <p className="font-semibold">{gc.recipientName}</p>
                        <p className="font-mono text-[11px] text-[#63615C]">{gc.recipientEmail}</p>
                      </td>
                      <td className="p-3 font-mono tabular-nums">
                        <strong className="text-[#141413]">₹{gc.currentBalance.toLocaleString()}</strong> / ₹
                        {gc.initialBalance.toLocaleString()}
                        <p className="text-[10px] text-[#63615C]">
                          {gc.transactions?.length || 0} ledger entries · Exp {gc.expiresAt?.slice(0, 10)}
                        </p>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            gc.status === 'active'
                              ? 'bg-[#ECFDF5] text-[#166534]'
                              : gc.status === 'disabled'
                              ? 'bg-[#FEF2F2] text-[#B91C1C]'
                              : 'bg-[#F7F6F2] text-[#63615C]'
                          }`}
                        >
                          {gc.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {canManage && (
                          <button
                            type="button"
                            onClick={async () => {
                              await fetch(`/api/admin/gift-cards/${gc.id}/toggle`, {
                                method: 'PATCH',
                                headers: { Authorization: `Bearer ${adminToken}` },
                              });
                              onRefresh();
                            }}
                            className="px-2.5 py-1 border border-[#E2DFD7] rounded font-semibold hover:bg-white cursor-pointer"
                          >
                            {gc.status === 'disabled' ? 'Enable' : 'Disable'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CURATED LOOKBOOKS */}
      {subTab === 'lookbooks' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {canManage && (
            <form
              onSubmit={createLookbook}
              className="bg-white p-5 rounded-lg border border-[#E2DFD7] space-y-3 text-xs"
            >
              <h3 className="font-serif text-lg font-bold">Publish Fashion Lookbook</h3>
              <div>
                <label className="font-semibold block mb-1">Lookbook Title *</label>
                <input
                  type="text"
                  required
                  value={lbTitle}
                  onChange={(e) => setLbTitle(e.target.value)}
                  placeholder="Chandni Eid Soirée"
                  className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Occasion</label>
                  <select
                    value={lbOccasion}
                    onChange={(e) => setLbOccasion(e.target.value as OccasionType)}
                    className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2]"
                  >
                    {OCCASION_OPTIONS.map((occ) => (
                      <option key={occ} value={occ}>
                        {occ}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Bundle % Off</label>
                  <input
                    type="number"
                    min={0}
                    max={40}
                    value={lbDiscount}
                    onChange={(e) => setLbDiscount(Number(e.target.value))}
                    className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold block mb-1">Subtitle</label>
                <input
                  type="text"
                  value={lbSubtitle}
                  onChange={(e) => setLbSubtitle(e.target.value)}
                  placeholder="Complete festive look with handwoven dupatta"
                  className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2]"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Editorial Styling Note</label>
                <textarea
                  rows={2}
                  value={lbNote}
                  onChange={(e) => setLbNote(e.target.value)}
                  className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2]"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Cover Image URL</label>
                <input
                  type="text"
                  value={lbImage}
                  onChange={(e) => setLbImage(e.target.value)}
                  className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono text-[11px]"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Paired Garments ({lbPids.length}) *</label>
                <div className="max-h-32 overflow-y-auto p-2 bg-[#F7F6F2] rounded border border-[#E2DFD7] space-y-1">
                  {products.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer text-[11px]">
                      <input
                        type="checkbox"
                        checked={lbPids.includes(p.id)}
                        onChange={() => toggleArr(lbPids, setLbPids, p.id)}
                      />
                      <span className="truncate">{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-[#164E3F] text-white font-semibold uppercase tracking-wider rounded cursor-pointer"
              >
                Publish Lookbook
              </button>
            </form>
          )}

          <div className={`${canManage ? 'lg:col-span-2' : 'lg:col-span-3'} grid grid-cols-1 md:grid-cols-2 gap-4`}>
            {lookbooks.map((lb) => (
              <div key={lb.id} className="bg-white rounded-lg border border-[#E2DFD7] overflow-hidden text-xs">
                <div className="h-36 bg-[#F7F6F2] relative overflow-hidden">
                  <img src={lb.image} alt={lb.title} className="w-full h-full object-cover" />
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-[#141413]/85 text-[#D4AF6A] rounded text-[10px] font-bold uppercase">
                    {lb.occasion}
                  </span>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="font-serif text-base font-bold text-[#141413]">{lb.title}</h4>
                      <p className="text-[#63615C]">{lb.subtitle}</p>
                    </div>
                    {canManage && (
                      <button
                        type="button"
                        onClick={async () => {
                          await fetch(`/api/admin/lookbooks/${lb.id}`, {
                            method: 'DELETE',
                            headers: { Authorization: `Bearer ${adminToken}` },
                          });
                          pushNotice('success', 'Lookbook removed.');
                          onRefresh();
                          onRefreshStorefront();
                        }}
                        className="p-1 text-[#B91C1C] hover:bg-[#FEF2F2] rounded cursor-pointer"
                        title="Delete lookbook"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="italic text-[#8E6D3B]">{lb.editorialNote}</p>
                  <p className="font-mono text-[11px] text-[#164E3F]">
                    {lb.productIds.length} pieces · {lb.bundleDiscountPercent}% look pairing note
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PRODUCT Q&A DESK */}
      {subTab === 'qa' && (
        <div className="space-y-4">
          <div className="flex gap-2 text-xs">
            {[
              { id: 'unanswered', label: `Unanswered (${questions.filter((q) => !q.answer).length})` },
              { id: 'all', label: `All Questions (${questions.length})` },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setQaFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-md font-semibold border cursor-pointer ${
                  qaFilter === f.id
                    ? 'bg-[#164E3F] text-white border-[#164E3F]'
                    : 'bg-white text-[#63615C] border-[#E2DFD7]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredQuestions.length === 0 ? (
              <div className="bg-white p-8 rounded-lg border border-[#E2DFD7] text-center text-xs text-[#63615C]">
                No product questions in this queue.
              </div>
            ) : (
              filteredQuestions.map((q) => (
                <div key={q.id} className="bg-white p-4 rounded-lg border border-[#E2DFD7] space-y-2.5 text-xs">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <div>
                      <span className="font-mono text-[11px] font-bold text-[#164E3F]">
                        {q.productName || q.productId}
                      </span>
                      <span className="mx-2 text-[#E2DFD7]">|</span>
                      <span className="text-[#63615C]">
                        Asked by <strong>{q.customerName}</strong> ({new Date(q.createdAt).toLocaleDateString()})
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        q.isPublic ? 'bg-[#ECFDF5] text-[#166534]' : 'bg-[#F7F6F2] text-[#63615C]'
                      }`}
                    >
                      {q.isPublic ? 'Public on PDP' : 'Hidden'}
                    </span>
                  </div>
                  <p className="font-semibold text-[#141413]">Q: {q.question}</p>
                  {q.answer && (
                    <div className="p-2.5 bg-[#F7F6F2] rounded border border-[#E2DFD7]">
                      <p className="text-[#164E3F] font-semibold">Atelier Answer ({q.answeredBy}):</p>
                      <p className="text-[#141413] mt-0.5">{q.answer}</p>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={answerDrafts[q.id] ?? q.answer ?? ''}
                      onChange={(e) => setAnswerDrafts({ ...answerDrafts, [q.id]: e.target.value })}
                      placeholder="Write official fabric / fit / styling reply..."
                      className="flex-1 p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2]"
                    />
                    <button
                      type="button"
                      onClick={() => answerQuestion(q.id, true)}
                      className="px-4 py-2 bg-[#164E3F] text-white rounded font-semibold cursor-pointer inline-flex items-center gap-1"
                    >
                      <Send className="w-3.5 h-3.5" /> Save &amp; Publish
                    </button>
                    <button
                      type="button"
                      onClick={() => answerQuestion(q.id, !q.isPublic)}
                      className="px-3 py-2 border border-[#E2DFD7] rounded font-semibold cursor-pointer"
                    >
                      {q.isPublic ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// =================== 2. CRM, VIP TIERS, SEGMENTATION, CAMPAIGNS, CONSENTED CARTS & SUPPORT ===================

export const CrmLoyaltyView: React.FC<
  CommonProps & {
    vipTiers: VipTierConfig[];
    campaigns: MarketingCampaign[];
    abandonedCarts: AbandonedCartRecord[];
    complaints: OrderComplaint[];
    biData: any;
    canManage: boolean;
  }
> = ({ vipTiers, campaigns, abandonedCarts, complaints, biData, canManage, adminToken, pushNotice, onRefresh }) => {
  const [subTab, setSubTab] = useState<'segments' | 'campaigns' | 'abandoned' | 'complaints'>('segments');
  const [segSearch, setSegSearch] = useState('');
  const [segTag, setSegTag] = useState('all');
  const [editableTiers, setEditableTiers] = useState<VipTierConfig[]>(vipTiers);

  // Campaign form
  const [cmpName, setCmpName] = useState('');
  const [cmpFestival, setCmpFestival] = useState('Eid & Festive Collection');
  const [cmpChannel, setCmpChannel] = useState<'onsite' | 'email' | 'whatsapp'>('onsite');
  const [cmpSegment, setCmpSegment] = useState<'all' | 'new' | 'repeat' | 'vip' | 'at_risk' | 'consented'>('consented');
  const [cmpCoupon, setCmpCoupon] = useState('');
  const [cmpBudget, setCmpBudget] = useState(5000);

  // Abandoned cart message drafts
  const [recoveryMsgs, setRecoveryMsgs] = useState<Record<string, string>>({});

  // Complaint status filter & reply drafts
  const [compFilter, setCompFilter] = useState<'all' | 'open' | 'investigating' | 'escalated' | 'resolved'>('all');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setEditableTiers(vipTiers);
  }, [vipTiers]);

  const segmentsSummary = biData?.segments?.summary || {};
  const segmentedCustomers: any[] = biData?.segments?.customers || [];

  const filteredSegCustomers = segmentedCustomers.filter((c) => {
    const q = segSearch.trim().toLowerCase();
    const matchesSearch = !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
    if (!matchesSearch) return false;
    if (segTag === 'all') return true;
    return (c.tags || []).some((t: string) => t.toLowerCase().includes(segTag.toLowerCase()));
  });

  const saveVipTiers = async () => {
    const res = await fetch('/api/admin/vip-tiers', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ vipTiers: editableTiers }),
    });
    if (res.ok) {
      pushNotice('success', 'VIP tier rules updated.');
      onRefresh();
    } else {
      const d = await res.json().catch(() => ({}));
      pushNotice('error', d.error || 'Failed to save VIP tiers.');
    }
  };

  const setCustomerVipOverride = async (custId: string, tierId: string) => {
    const res = await fetch(`/api/admin/customers/${custId}/vip`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ vipTierOverride: tierId || null }),
    });
    if (res.ok) {
      pushNotice('success', 'Customer VIP tier assignment saved.');
      onRefresh();
    } else {
      const d = await res.json().catch(() => ({}));
      pushNotice('error', d.error || 'Failed to update VIP override.');
    }
  };

  const createCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: cmpName,
        seasonOrFestival: cmpFestival,
        channel: cmpChannel,
        targetSegment: cmpSegment,
        couponCode: cmpCoupon || undefined,
        budget: cmpBudget,
      }),
    });
    const d = await res.json();
    if (res.ok) {
      pushNotice('success', `Campaign "${d.campaign.name}" launched.`);
      setCmpName('');
      setCmpCoupon('');
      onRefresh();
    } else {
      pushNotice('error', d.error || 'Failed to create campaign.');
    }
  };

  const sendRecovery = async (cart: AbandonedCartRecord) => {
    const res = await fetch(`/api/admin/abandoned-carts/${cart.id}/send-recovery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ message: recoveryMsgs[cart.id] }),
    });
    const d = await res.json();
    if (res.ok) {
      pushNotice('success', `Consented recovery alert delivered to ${cart.customerEmail}.`);
      onRefresh();
    } else {
      pushNotice('error', d.error || 'Recovery notification blocked.');
    }
  };

  const updateComplaint = async (
    compId: string,
    payload: { status?: string; priority?: string; replyText?: string }
  ) => {
    const res = await fetch(`/api/admin/complaints/${compId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      if (payload.replyText) {
        setReplyDrafts((prev) => ({ ...prev, [compId]: '' }));
      }
      pushNotice('success', 'Support ticket updated.');
      onRefresh();
    } else {
      const d = await res.json().catch(() => ({}));
      pushNotice('error', d.error || 'Failed to update ticket.');
    }
  };

  const filteredComplaints = complaints.filter((c) =>
    compFilter === 'all' ? true : c.status === compFilter
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-[#141413]">
          CRM, VIP Membership &amp; Retention Operations
        </h1>
        <p className="text-xs text-[#63615C]">
          Manage VIP club tiers, customer segments, seasonal campaigns, consent-verified abandoned cart recovery, and support tickets
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[#E2DFD7] pb-3 text-xs">
        {[
          { id: 'segments', label: 'VIP Tiers & Segmentation', icon: Crown },
          { id: 'campaigns', label: `Seasonal Campaigns (${campaigns.length})`, icon: Megaphone },
          { id: 'abandoned', label: `Consented Abandoned Carts (${abandonedCarts.length})`, icon: ShoppingCart },
          {
            id: 'complaints',
            label: `Order Support & Tickets (${complaints.filter((c) => c.status !== 'resolved').length} open)`,
            icon: LifeBuoy,
          },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id as any)}
              className={`px-3.5 py-2 rounded-md font-semibold inline-flex items-center gap-1.5 border cursor-pointer ${
                subTab === t.id
                  ? 'bg-[#164E3F] text-white border-[#164E3F]'
                  : 'bg-white text-[#63615C] border-[#E2DFD7] hover:border-[#164E3F]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* VIP TIERS & SEGMENTATION */}
      {subTab === 'segments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
            {[
              { label: 'New Shoppers', val: segmentsSummary.newCustomers || 0 },
              { label: 'Repeat Buyers', val: segmentsSummary.repeatCustomers || 0 },
              { label: 'VIP Circle', val: segmentsSummary.vipMembers || 0 },
              { label: 'At-Risk (>60d)', val: segmentsSummary.atRisk || 0 },
              { label: 'High Spenders', val: segmentsSummary.highSpenders || 0 },
              { label: 'Cart Opt-In', val: segmentsSummary.abandonedCartConsented || 0 },
              { label: 'Promo Opt-In', val: segmentsSummary.marketingConsented || 0 },
            ].map((s) => (
              <div key={s.label} className="bg-white p-3 rounded-lg border border-[#E2DFD7]">
                <span className="text-[10px] uppercase font-bold text-[#63615C]">{s.label}</span>
                <p className="text-xl font-bold font-mono tabular-nums text-[#164E3F] mt-0.5">{s.val}</p>
              </div>
            ))}
          </div>

          {/* Segmented Customer Directory + VIP Override */}
          <div className="bg-white rounded-lg border border-[#E2DFD7] p-5 space-y-4 text-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <h3 className="font-serif text-lg font-bold">Customer Segmentation &amp; VIP Assignments</h3>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#63615C] absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={segSearch}
                    onChange={(e) => setSegSearch(e.target.value)}
                    placeholder="Filter email or name..."
                    className="pl-8 pr-3 py-1.5 border border-[#E2DFD7] rounded bg-[#F7F6F2]"
                  />
                </div>
                <select
                  value={segTag}
                  onChange={(e) => setSegTag(e.target.value)}
                  className="px-2.5 py-1.5 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-semibold"
                >
                  <option value="all">All Segments</option>
                  <option value="New">New</option>
                  <option value="Repeat">Repeat</option>
                  <option value="High Spender">High Spender</option>
                  <option value="At-Risk">At-Risk</option>
                  {vipTiers.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F6F2] text-[#63615C] font-semibold border-b border-[#E2DFD7]">
                  <tr>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Orders / Spend</th>
                    <th className="p-3">Segments &amp; Consents</th>
                    <th className="p-3">VIP Tier (Override)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2DFD7]">
                  {filteredSegCustomers.map((c) => (
                    <tr key={c.id} className="hover:bg-[#F7F6F2]">
                      <td className="p-3">
                        <p className="font-semibold text-[#141413]">{c.name}</p>
                        <p className="font-mono text-[11px] text-[#63615C]">{c.email}</p>
                      </td>
                      <td className="p-3 font-mono tabular-nums">
                        <strong>{c.ordersCount}</strong> orders · ₹{(c.totalSpend || 0).toLocaleString()}
                        {c.daysSinceLastOrder !== null && (
                          <p className="text-[10px] text-[#63615C]">{c.daysSinceLastOrder}d since last order</p>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {(c.tags || []).map((tag: string) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded bg-[#F7F6F2] border border-[#E2DFD7] text-[10px] font-bold"
                            >
                              {tag}
                            </span>
                          ))}
                          {c.abandonedCartConsent && (
                            <span className="px-2 py-0.5 rounded bg-[#ECFDF5] text-[#166534] text-[10px] font-bold">
                              Cart Opt-In
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <select
                          disabled={!canManage}
                          value={c.vipTierOverride || ''}
                          onChange={(e) => setCustomerVipOverride(c.id, e.target.value)}
                          className="p-1.5 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-semibold text-xs"
                        >
                          <option value="">Automatic ({c.vipTier})</option>
                          {vipTiers.map((t) => (
                            <option key={t.id} value={t.id}>
                              Force: {t.name} ({t.discountPercent}%)
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Configurable VIP Tiers */}
          <div className="bg-white rounded-lg border border-[#E2DFD7] p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-bold">VIP Membership Tier Configuration</h3>
                <p className="text-[#63615C]">
                  Backend-enforced spend thresholds, automatic checkout discounts, shipping privileges, and points multipliers
                </p>
              </div>
              {canManage && (
                <button
                  type="button"
                  onClick={saveVipTiers}
                  className="px-4 py-2 bg-[#164E3F] text-white rounded font-semibold cursor-pointer"
                >
                  Save VIP Rules
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {editableTiers.map((tier, idx) => (
                <div key={tier.id} className="p-4 bg-[#F7F6F2] rounded-lg border border-[#E2DFD7] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-base font-bold text-[#141413]">{tier.name}</span>
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tier.badgeColor || '#164E3F' }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-[#63615C]">Min Spend (₹)</label>
                      <input
                        type="number"
                        disabled={!canManage}
                        value={tier.minLifetimeSpend}
                        onChange={(e) => {
                          const next = [...editableTiers];
                          next[idx] = { ...tier, minLifetimeSpend: Number(e.target.value) };
                          setEditableTiers(next);
                        }}
                        className="w-full p-1.5 border border-[#E2DFD7] rounded bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-[#63615C]">Min Orders</label>
                      <input
                        type="number"
                        disabled={!canManage}
                        value={tier.minOrders}
                        onChange={(e) => {
                          const next = [...editableTiers];
                          next[idx] = { ...tier, minOrders: Number(e.target.value) };
                          setEditableTiers(next);
                        }}
                        className="w-full p-1.5 border border-[#E2DFD7] rounded bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-[#63615C]">Discount (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={40}
                        disabled={!canManage}
                        value={tier.discountPercent}
                        onChange={(e) => {
                          const next = [...editableTiers];
                          next[idx] = { ...tier, discountPercent: Number(e.target.value) };
                          setEditableTiers(next);
                        }}
                        className="w-full p-1.5 border border-[#E2DFD7] rounded bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-[#63615C]">Points Mult.</label>
                      <input
                        type="number"
                        step="0.5"
                        min={1}
                        disabled={!canManage}
                        value={tier.pointsMultiplier}
                        onChange={(e) => {
                          const next = [...editableTiers];
                          next[idx] = { ...tier, pointsMultiplier: Number(e.target.value) };
                          setEditableTiers(next);
                        }}
                        className="w-full p-1.5 border border-[#E2DFD7] rounded bg-white font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 pt-1">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={!canManage}
                        checked={tier.freeShippingAlways}
                        onChange={(e) => {
                          const next = [...editableTiers];
                          next[idx] = { ...tier, freeShippingAlways: e.target.checked };
                          setEditableTiers(next);
                        }}
                      />
                      <span>Always Complimentary Express Shipping</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={!canManage}
                        checked={tier.earlyAccessFlashSales}
                        onChange={(e) => {
                          const next = [...editableTiers];
                          next[idx] = { ...tier, earlyAccessFlashSales: e.target.checked };
                          setEditableTiers(next);
                        }}
                      />
                      <span>Early Access to Flash Sales</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SEASONAL & FESTIVAL CAMPAIGNS */}
      {subTab === 'campaigns' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {canManage && (
            <form
              onSubmit={createCampaign}
              className="bg-white p-5 rounded-lg border border-[#E2DFD7] space-y-3 text-xs"
            >
              <h3 className="font-serif text-lg font-bold">Launch Seasonal Campaign</h3>
              <p className="text-[11px] text-[#63615C] bg-[#F7F6F2] p-2 rounded border border-[#E2DFD7]">
                Outreach channels automatically restrict delivery to customers with active promotional opt-in consent.
              </p>
              <div>
                <label className="font-semibold block mb-1">Campaign Name *</label>
                <input
                  type="text"
                  required
                  value={cmpName}
                  onChange={(e) => setCmpName(e.target.value)}
                  placeholder="Eid Crescent Luxury Showcase"
                  className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2]"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Festival / Season *</label>
                <input
                  type="text"
                  required
                  value={cmpFestival}
                  onChange={(e) => setCmpFestival(e.target.value)}
                  className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Channel</label>
                  <select
                    value={cmpChannel}
                    onChange={(e) => setCmpChannel(e.target.value as any)}
                    className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2]"
                  >
                    <option value="onsite">On-Site Banner</option>
                    <option value="email">Email (Opt-In)</option>
                    <option value="whatsapp">WhatsApp (Opt-In)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Target Segment</label>
                  <select
                    value={cmpSegment}
                    onChange={(e) => setCmpSegment(e.target.value as any)}
                    className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2]"
                  >
                    <option value="consented">Marketing Opt-In Only</option>
                    <option value="vip">VIP Circle</option>
                    <option value="repeat">Repeat Buyers</option>
                    <option value="new">New Shoppers</option>
                    <option value="at_risk">At-Risk (&gt;60d)</option>
                    <option value="all">All Storefront</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Promo Code</label>
                  <input
                    type="text"
                    value={cmpCoupon}
                    onChange={(e) => setCmpCoupon(e.target.value.toUpperCase())}
                    placeholder="EID20"
                    className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Budget (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={cmpBudget}
                    onChange={(e) => setCmpBudget(Number(e.target.value))}
                    className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-[#164E3F] text-white font-semibold uppercase tracking-wider rounded cursor-pointer"
              >
                Save Campaign
              </button>
            </form>
          )}

          <div className={`${canManage ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-3`}>
            {campaigns.map((c) => (
              <div
                key={c.id}
                className="bg-white p-4 rounded-lg border border-[#E2DFD7] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-serif text-base font-bold text-[#141413]">{c.name}</span>
                    <span className="px-2 py-0.5 rounded bg-[#F7F6F2] border border-[#E2DFD7] text-[10px] font-bold uppercase">
                      {c.seasonOrFestival}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#ECFDF5] text-[#166534] text-[10px] font-bold uppercase">
                      {c.channel} · {c.targetSegment}
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-[#63615C]">
                    Budget ₹{c.budget.toLocaleString()} {c.couponCode ? `· Coupon ${c.couponCode}` : ''} · Conversions:{' '}
                    {c.conversions} · Revenue: ₹{c.revenueAttributed.toLocaleString()}
                  </p>
                </div>
                {canManage && (
                  <select
                    value={c.status}
                    onChange={async (e) => {
                      await fetch(`/api/admin/campaigns/${c.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
                        body: JSON.stringify({ status: e.target.value }),
                      });
                      pushNotice('success', `Campaign status set to ${e.target.value}.`);
                      onRefresh();
                    }}
                    className="p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-semibold"
                  >
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CONSENTED ABANDONED CARTS */}
      {subTab === 'abandoned' && (
        <div className="space-y-4">
          <div className="p-3.5 bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg text-xs text-[#166534] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>
              Privacy-First Enforcement: Only shoppers who explicitly granted <strong>Abandoned Cart Recovery Consent</strong> appear below. Unconsented sessions are never stored or messaged.
            </span>
          </div>

          {abandonedCarts.length === 0 ? (
            <div className="bg-white p-8 rounded-lg border border-[#E2DFD7] text-center text-xs text-[#63615C]">
              No consented abandoned carts currently awaiting recovery.
            </div>
          ) : (
            <div className="space-y-3">
              {abandonedCarts.map((cart) => (
                <div key={cart.id} className="bg-white p-4 rounded-lg border border-[#E2DFD7] space-y-3 text-xs">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <div>
                      <span className="font-bold text-[#141413]">{cart.customerName}</span>
                      <span className="ml-2 font-mono text-[#63615C]">{cart.customerEmail}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#ECFDF5] text-[#166534] text-[10px] font-bold uppercase">
                        Consent Verified
                      </span>
                      <span className="font-mono font-bold text-[#164E3F]">
                        ₹{cart.subtotal.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {cart.items.map((it, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-[#F7F6F2] rounded border border-[#E2DFD7] font-mono text-[11px]"
                      >
                        {it.name} ({it.size}, {it.color}) × {it.quantity}
                      </span>
                    ))}
                  </div>
                  <p className="font-mono text-[10px] text-[#63615C]">
                    Bag updated: {new Date(cart.lastUpdatedAt).toLocaleString()}
                    {cart.recoverySentAt ? ` · Last recovery sent: ${new Date(cart.recoverySentAt).toLocaleString()}` : ''}
                  </p>
                  {canManage && (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={
                          recoveryMsgs[cart.id] ??
                          `Your curated Zohra Luxe pieces (₹${cart.subtotal.toLocaleString()}) are waiting in your bag.`
                        }
                        onChange={(e) => setRecoveryMsgs({ ...recoveryMsgs, [cart.id]: e.target.value })}
                        className="flex-1 p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2]"
                      />
                      <button
                        type="button"
                        onClick={() => sendRecovery(cart)}
                        className="px-4 py-2 bg-[#164E3F] text-white rounded font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" /> Send Recovery Alert
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ORDER SUPPORT & COMPLAINTS */}
      {subTab === 'complaints' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5 text-xs">
            {(['all', 'open', 'investigating', 'escalated', 'resolved'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setCompFilter(st)}
                className={`px-3 py-1.5 rounded-md font-semibold uppercase border cursor-pointer ${
                  compFilter === st
                    ? 'bg-[#164E3F] text-white border-[#164E3F]'
                    : 'bg-white text-[#63615C] border-[#E2DFD7]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {filteredComplaints.length === 0 ? (
            <div className="bg-white p-8 rounded-lg border border-[#E2DFD7] text-center text-xs text-[#63615C]">
              No support tickets match this status filter.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredComplaints.map((comp) => (
                <div key={comp.id} className="bg-white p-4 rounded-lg border border-[#E2DFD7] space-y-3 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-[#164E3F]">{comp.id}</span>
                        <span className="font-bold text-[#141413]">{comp.subject}</span>
                        <span className="px-2 py-0.5 rounded bg-[#F7F6F2] border border-[#E2DFD7] text-[10px] font-bold uppercase">
                          Order {comp.orderId}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#63615C] font-mono mt-0.5">
                        {comp.customerName} ({comp.customerEmail}) · {comp.category.replace('_', ' ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        disabled={!canManage}
                        value={comp.priority}
                        onChange={(e) => updateComplaint(comp.id, { priority: e.target.value })}
                        className="p-1.5 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-bold uppercase text-[11px]"
                      >
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                      <select
                        disabled={!canManage}
                        value={comp.status}
                        onChange={(e) => updateComplaint(comp.id, { status: e.target.value })}
                        className="p-1.5 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-bold uppercase text-[11px]"
                      >
                        <option value="open">Open</option>
                        <option value="investigating">Investigating</option>
                        <option value="escalated">Escalated</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </div>
                  </div>

                  <p className="text-[#141413] bg-[#F7F6F2] p-2.5 rounded border border-[#E2DFD7]">
                    {comp.description}
                  </p>

                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {comp.messages.map((m) => (
                      <div
                        key={m.id}
                        className={`p-2 rounded text-[11px] ${
                          m.role === 'admin'
                            ? 'bg-[#ECF4F1] border border-[#C6E2D8] ml-6'
                            : 'bg-[#F7F6F2] border border-[#E2DFD7] mr-6'
                        }`}
                      >
                        <span className="font-bold">{m.author}</span>{' '}
                        <span className="text-[10px] text-[#63615C] font-mono">
                          ({m.role.replace('_', ' ')} · {new Date(m.createdAt).toLocaleString()})
                        </span>
                        <p className="mt-0.5">{m.text}</p>
                      </div>
                    ))}
                  </div>

                  {canManage && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={replyDrafts[comp.id] || ''}
                        onChange={(e) => setReplyDrafts({ ...replyDrafts, [comp.id]: e.target.value })}
                        placeholder="Write concierge reply (notifies customer immediately)..."
                        className="flex-1 p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2]"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          replyDrafts[comp.id]?.trim() &&
                          updateComplaint(comp.id, { replyText: replyDrafts[comp.id].trim() })
                        }
                        className="px-4 py-2 bg-[#164E3F] text-white rounded font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" /> Reply
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// =================== 3. ADVANCED BUSINESS INTELLIGENCE, FORECASTS & SCHEDULED REPORTS ===================

export const BusinessIntelligenceView: React.FC<
  CommonProps & {
    biData: any;
    schedules: ScheduledReportConfig[];
    canScheduleReports: boolean;
  }
> = ({ biData, schedules, canScheduleReports, adminToken, pushNotice, onRefresh }) => {
  const [prodSearch, setProdSearch] = useState('');
  const [repName, setRepName] = useState('');
  const [repFreq, setRepFreq] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [repEmail, setRepEmail] = useState('');
  const [lastSnapshot, setLastSnapshot] = useState<any>(null);

  if (!biData) {
    return (
      <div className="bg-white p-10 rounded-lg border border-[#E2DFD7] text-center text-xs text-[#63615C]">
        Computing real-time business intelligence from live orders and catalog records...
      </div>
    );
  }

  const retention = biData.retention || {};
  const forecast = biData.salesForecast || {};
  const returns = biData.returnsAnalysis || {};
  const categoryPerf: any[] = biData.categoryPerformance || [];
  const productComparison: any[] = (biData.productComparison || []).filter((p: any) => {
    const q = prodSearch.trim().toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  });
  const couponPerf: any[] = biData.couponPerformance || [];
  const demandAlerts: any[] = biData.inventoryDemandAlerts || [];
  const staffActivity: any[] = biData.staffActivity || [];
  const automatedAlerts: any[] = biData.automatedAlerts || [];

  const createSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/reports/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: repName,
        frequency: repFreq,
        recipientEmail: repEmail,
        sections: ['pnl', 'retention', 'inventory_demand', 'forecast'],
      }),
    });
    const d = await res.json();
    if (res.ok) {
      pushNotice('success', `Scheduled report "${d.schedule.name}" saved.`);
      setRepName('');
      onRefresh();
    } else {
      pushNotice('error', d.error || 'Failed to save schedule.');
    }
  };

  const runSchedule = async (id: string) => {
    const res = await fetch(`/api/admin/reports/schedules/${id}/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const d = await res.json();
    if (res.ok) {
      setLastSnapshot(d);
      pushNotice('success', `Report "${d.schedule.name}" generated at ${new Date(d.generatedAt).toLocaleTimeString()}.`);
      onRefresh();
    } else {
      pushNotice('error', d.error || 'Report run failed.');
    }
  };

  const exportBiCsv = () => {
    const rows = [
      ['SKU', 'Product', 'Category', 'Units Sold', 'Revenue (INR)', 'COGS (INR)', 'Gross Profit (INR)', 'Margin %', 'Return Rate %', 'Stock'].join(','),
      ...productComparison.map((p: any) =>
        [
          `"${p.sku}"`,
          `"${String(p.name).replace(/"/g, '""')}"`,
          `"${p.category}"`,
          p.unitsSold,
          p.revenue,
          p.cogs,
          p.grossProfit,
          p.marginPercent,
          p.returnRate,
          p.currentStock,
        ].join(',')
      ),
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zohra_bi_profitability_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#141413]">
            Advanced Business Intelligence &amp; Forecasting
          </h1>
          <p className="text-xs text-[#63615C]">
            Honest historical retention cohorts, profitability comparison, inventory velocity, staff audit summary, and scheduled reports
          </p>
        </div>
        <button
          type="button"
          onClick={exportBiCsv}
          className="px-4 py-2 bg-[#164E3F] hover:bg-[#0F3A2E] text-white text-xs font-semibold rounded-md inline-flex items-center gap-1.5 cursor-pointer self-start"
        >
          <Download className="w-3.5 h-3.5" /> Export Profitability CSV
        </button>
      </div>

      {/* Automated Business Alerts */}
      {automatedAlerts.length > 0 && (
        <div className="bg-white rounded-lg border border-[#E2DFD7] p-5 space-y-3 text-xs">
          <h3 className="font-serif text-lg font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#B45309]" /> Automated Business Alerts ({automatedAlerts.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {automatedAlerts.map((al) => (
              <div
                key={al.id}
                className={`p-3 rounded border ${
                  al.severity === 'critical'
                    ? 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                    : al.severity === 'warning'
                    ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
                    : 'bg-[#F7F6F2] border-[#E2DFD7] text-[#141413]'
                }`}
              >
                <div className="flex justify-between font-bold">
                  <span>{al.title}</span>
                  <span className="uppercase text-[10px] font-mono">{al.category}</span>
                </div>
                <p className="mt-1 opacity-90">{al.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historical Sales Forecast (Estimate Only) + Retention Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-[#E2DFD7] p-5 space-y-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-serif text-lg font-bold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#8E6D3B]" /> Historical Sales Forecast
            </h3>
            <span className="px-2 py-0.5 rounded bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] text-[10px] font-bold uppercase">
              Estimate Only · Not Guaranteed
            </span>
          </div>
          <p className="text-[11px] text-[#8E6D3B] bg-[#FFFBEB]/60 p-2.5 rounded border border-[#FDE68A]">
            {forecast.disclaimer || 'Statistical estimate from historical non-cancelled orders. Not a guaranteed result.'}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono tabular-nums">
            <div className="p-2.5 bg-[#F7F6F2] rounded border border-[#E2DFD7]">
              <span className="text-[10px] text-[#63615C] block">Trailing 7d</span>
              <strong>₹{(forecast.trailing7DaysRevenue || 0).toLocaleString()}</strong>
            </div>
            <div className="p-2.5 bg-[#F7F6F2] rounded border border-[#E2DFD7]">
              <span className="text-[10px] text-[#63615C] block">Trailing 30d</span>
              <strong>₹{(forecast.trailing30DaysRevenue || 0).toLocaleString()}</strong>
            </div>
            <div className="p-2.5 bg-[#F7F6F2] rounded border border-[#E2DFD7]">
              <span className="text-[10px] text-[#63615C] block">Est. Daily Rate</span>
              <strong>₹{(forecast.estimatedDailyRunRate || 0).toLocaleString()}</strong>
            </div>
            <div className="p-2.5 bg-[#ECF4F1] rounded border border-[#C6E2D8]">
              <span className="text-[10px] text-[#164E3F] block">Est. Next 30d</span>
              <strong className="text-[#164E3F]">₹{(forecast.estimatedNext30DaysRevenue || 0).toLocaleString()}</strong>
            </div>
          </div>
          <p className="font-mono text-[11px] text-[#63615C]">
            Sample Size: {forecast.basedOnOrderCount || 0} active orders · Trend:{' '}
            <strong className="uppercase">{String(forecast.trendDirection || 'steady').replace('_', ' ')}</strong> ·
            Confidence: <strong className="uppercase">{String(forecast.confidenceLevel || 'low').replace('_', ' ')}</strong>
          </p>
        </div>

        <div className="bg-white rounded-lg border border-[#E2DFD7] p-5 space-y-3 text-xs">
          <h3 className="font-serif text-lg font-bold flex items-center gap-2">
            <Users className="w-4 h-4 text-[#164E3F]" /> Customer Retention &amp; Repeat Purchase Report
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono tabular-nums">
            <div className="p-2.5 bg-[#F7F6F2] rounded border border-[#E2DFD7]">
              <span className="text-[10px] text-[#63615C] block">Buyers</span>
              <strong>{retention.totalOrderingCustomers || 0}</strong>
            </div>
            <div className="p-2.5 bg-[#F7F6F2] rounded border border-[#E2DFD7]">
              <span className="text-[10px] text-[#63615C] block">Repeat Buyers</span>
              <strong>{retention.repeatCustomerCount || 0}</strong>
            </div>
            <div className="p-2.5 bg-[#ECFDF5] rounded border border-[#A7F3D0]">
              <span className="text-[10px] text-[#166534] block">Retention Rate</span>
              <strong className="text-[#166534]">{retention.retentionRatePercent || 0}%</strong>
            </div>
            <div className="p-2.5 bg-[#F7F6F2] rounded border border-[#E2DFD7]">
              <span className="text-[10px] text-[#63615C] block">Avg Reorder Gap</span>
              <strong>{retention.avgDaysBetweenOrders !== null ? `${retention.avgDaysBetweenOrders}d` : '—'}</strong>
            </div>
          </div>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {(retention.repeatLeaderboard || []).slice(0, 5).map((r: any) => (
              <div key={r.email} className="flex justify-between items-center p-2 bg-[#F7F6F2] rounded">
                <span>
                  <strong>{r.name}</strong> <span className="font-mono text-[#63615C]">({r.email})</span>
                </span>
                <span className="font-mono font-bold text-[#164E3F]">
                  {r.orderCount} orders · ₹{r.totalSpend.toLocaleString()}
                </span>
              </div>
            ))}
            {(!retention.repeatLeaderboard || retention.repeatLeaderboard.length === 0) && (
              <p className="text-[#63615C]">No repeat customers with 2+ active orders yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Category Performance + Return Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-[#E2DFD7] p-5 space-y-3 text-xs">
          <h3 className="font-serif text-lg font-bold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#164E3F]" /> Category Performance
          </h3>
          <div className="space-y-2">
            {categoryPerf.map((cat) => (
              <div key={cat.category} className="p-2.5 bg-[#F7F6F2] rounded border border-[#E2DFD7] flex justify-between items-center">
                <div>
                  <span className="font-bold text-[#141413]">{cat.category}</span>
                  <span className="ml-2 text-[11px] text-[#63615C]">({cat.productCount} styles)</span>
                </div>
                <span className="font-mono font-bold text-[#164E3F] tabular-nums">
                  {cat.unitsSold} units · ₹{cat.revenue.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[#E2DFD7] p-5 space-y-3 text-xs">
          <h3 className="font-serif text-lg font-bold flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-[#B91C1C]" /> Product Return Analysis
          </h3>
          <div className="flex gap-4 font-mono">
            <div className="p-2.5 bg-[#F7F6F2] rounded border border-[#E2DFD7] flex-1">
              <span className="text-[10px] text-[#63615C] block">Total Requests</span>
              <strong>{returns.totalReturnRequests || 0}</strong>
            </div>
            <div className="p-2.5 bg-[#F7F6F2] rounded border border-[#E2DFD7] flex-1">
              <span className="text-[10px] text-[#63615C] block">Unit Return Rate</span>
              <strong>{returns.returnRatePercent || 0}%</strong>
            </div>
          </div>
          <div className="space-y-1.5">
            {Object.entries(returns.byReason || {}).map(([reason, count]: [string, any]) => (
              <div key={reason} className="flex justify-between p-2 bg-[#F7F6F2] rounded">
                <span>{reason}</span>
                <span className="font-mono font-bold">{count}</span>
              </div>
            ))}
            {(returns.byProduct || []).length > 0 && (
              <div className="pt-2 border-t border-[#E2DFD7] space-y-1">
                <p className="font-bold text-[#63615C] uppercase text-[10px]">Returned Items Breakdown</p>
                {returns.byProduct.map((rp: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-[11px]">
                    <span>{rp.productName}</span>
                    <span className="font-mono font-bold text-[#B91C1C]">{rp.count} request(s)</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Product Profitability & Performance Comparison */}
      <div className="bg-white rounded-lg border border-[#E2DFD7] p-5 space-y-3 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-serif text-lg font-bold">Product Profitability &amp; Performance Comparison</h3>
            <p className="text-[#63615C]">
              Live COGS, gross profit, margin %, return rate, and rating per SKU. Items missing unit cost are honestly flagged.
            </p>
          </div>
          <input
            type="text"
            value={prodSearch}
            onChange={(e) => setProdSearch(e.target.value)}
            placeholder="Search SKU or style..."
            className="p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2] w-full sm:w-64"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F6F2] text-[#63615C] font-semibold border-b border-[#E2DFD7]">
              <tr>
                <th className="p-2.5">SKU / Product</th>
                <th className="p-2.5">Units Sold</th>
                <th className="p-2.5">Revenue</th>
                <th className="p-2.5">COGS</th>
                <th className="p-2.5">Gross Profit / Margin</th>
                <th className="p-2.5">Return Rate</th>
                <th className="p-2.5">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DFD7] font-mono tabular-nums">
              {productComparison.map((p: any) => (
                <tr key={p.productId} className="hover:bg-[#F7F6F2]">
                  <td className="p-2.5 font-sans">
                    <p className="font-semibold text-[#141413]">{p.name}</p>
                    <p className="font-mono text-[10px] text-[#63615C]">
                      {p.sku} · {p.category} · ★ {p.rating}
                    </p>
                  </td>
                  <td className="p-2.5">{p.unitsSold}</td>
                  <td className="p-2.5 font-bold">₹{p.revenue.toLocaleString()}</td>
                  <td className="p-2.5">
                    ₹{p.cogs.toLocaleString()}
                    {!p.costComplete && (
                      <span className="ml-1 px-1.5 py-0.5 bg-[#FFFBEB] text-[#B45309] rounded text-[9px] font-sans font-bold">
                        Partial COGS
                      </span>
                    )}
                  </td>
                  <td className="p-2.5 text-[#164E3F] font-bold">
                    ₹{p.grossProfit.toLocaleString()} ({p.marginPercent}%)
                  </td>
                  <td className="p-2.5">{p.returnRate}%</td>
                  <td className="p-2.5">{p.currentStock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inventory Demand Alerts + Coupon Performance + Staff Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-[#E2DFD7] p-5 space-y-3 text-xs">
          <h3 className="font-serif text-lg font-bold flex items-center gap-2">
            <Package className="w-4 h-4 text-[#B45309]" /> Inventory Demand Velocity
          </h3>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {demandAlerts.map((d: any) => (
              <div key={d.productId} className="p-2.5 bg-[#F7F6F2] rounded border border-[#E2DFD7]">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-[#141413]">{d.name}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      d.urgency === 'critical'
                        ? 'bg-[#FEF2F2] text-[#B91C1C]'
                        : d.urgency === 'warning'
                        ? 'bg-[#FFFBEB] text-[#B45309]'
                        : 'bg-[#ECFDF5] text-[#166534]'
                    }`}
                  >
                    {d.urgency}
                  </span>
                </div>
                <p className="font-mono text-[10px] text-[#63615C] mt-1">
                  Stock: {d.currentStock} · 30d Sold: {d.unitsSoldLast30d} ({d.dailyVelocity}/day)
                  {d.estimatedDaysOfStock !== null ? ` · ~${d.estimatedDaysOfStock}d left` : ''}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[#E2DFD7] p-5 space-y-3 text-xs">
          <h3 className="font-serif text-lg font-bold flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#164E3F]" /> Coupon Performance
          </h3>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {couponPerf.map((cp: any) => (
              <div key={cp.code} className="p-2.5 bg-[#F7F6F2] rounded border border-[#E2DFD7] flex justify-between">
                <div>
                  <span className="font-mono font-bold text-[#164E3F]">{cp.code}</span>
                  <p className="text-[10px] text-[#63615C]">
                    Uses: {cp.usedCount}
                    {cp.usageLimitTotal ? ` / ${cp.usageLimitTotal}` : ''} · Discounted ₹
                    {cp.totalDiscountGiven.toLocaleString()}
                  </p>
                </div>
                <span className="font-mono font-bold">₹{cp.revenue.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[#E2DFD7] p-5 space-y-3 text-xs">
          <h3 className="font-serif text-lg font-bold">Staff Activity Summary</h3>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {staffActivity.map((st: any) => (
              <div key={st.email} className="p-2.5 bg-[#F7F6F2] rounded border border-[#E2DFD7]">
                <div className="flex justify-between font-mono text-[11px]">
                  <strong className="text-[#141413] truncate">{st.email}</strong>
                  <span className="text-[#164E3F] font-bold">{st.actionsCount} ops</span>
                </div>
                <p className="text-[10px] text-[#63615C] mt-0.5">
                  Blocked/Failed: {st.blockedCount} · Recent: {(st.recentActions || []).join(', ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scheduled Business Reports */}
      <div className="bg-white rounded-lg border border-[#E2DFD7] p-5 space-y-4 text-xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-lg font-bold flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-[#164E3F]" /> Scheduled Business Reports
            </h3>
            <p className="text-[#63615C]">
              Configure automated recurring snapshots and generate instant on-demand executive packs
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {canScheduleReports && (
            <form onSubmit={createSchedule} className="p-4 bg-[#F7F6F2] rounded-lg border border-[#E2DFD7] space-y-2.5">
              <h4 className="font-bold text-[#141413]">Add Report Schedule</h4>
              <input
                type="text"
                required
                value={repName}
                onChange={(e) => setRepName(e.target.value)}
                placeholder="Weekly Executive Growth Digest"
                className="w-full p-2 border border-[#E2DFD7] rounded bg-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={repFreq}
                  onChange={(e) => setRepFreq(e.target.value as any)}
                  className="p-2 border border-[#E2DFD7] rounded bg-white"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <input
                  type="email"
                  required
                  value={repEmail}
                  onChange={(e) => setRepEmail(e.target.value)}
                  placeholder="owner@zohraluxe.com"
                  className="p-2 border border-[#E2DFD7] rounded bg-white font-mono"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-[#164E3F] text-white rounded font-semibold cursor-pointer"
              >
                Create Schedule
              </button>
            </form>
          )}

          <div className={`${canScheduleReports ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-2.5`}>
            {schedules.map((sc) => (
              <div
                key={sc.id}
                className="p-3.5 bg-[#F7F6F2] rounded-lg border border-[#E2DFD7] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#141413]">{sc.name}</span>
                    <span className="px-2 py-0.5 rounded bg-white border border-[#E2DFD7] uppercase text-[10px] font-bold">
                      {sc.frequency}
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-[#63615C] mt-0.5">
                    Recipient: {sc.recipientEmail} · Next: {new Date(sc.nextRunAt).toLocaleDateString()}
                    {sc.lastGeneratedAt ? ` · Last Run: ${new Date(sc.lastGeneratedAt).toLocaleString()}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => runSchedule(sc.id)}
                    className="px-3 py-1.5 bg-[#164E3F] text-white rounded font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Play className="w-3 h-3" /> Run Now
                  </button>
                  {canScheduleReports && (
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch(`/api/admin/reports/schedules/${sc.id}`, {
                          method: 'DELETE',
                          headers: { Authorization: `Bearer ${adminToken}` },
                        });
                        pushNotice('success', 'Schedule removed.');
                        onRefresh();
                      }}
                      className="p-1.5 text-[#B91C1C] hover:bg-[#FEF2F2] rounded cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {lastSnapshot && (
          <div className="p-4 bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#166534] flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> Latest Generated Snapshot: {lastSnapshot.schedule?.name}
              </span>
              <button
                type="button"
                onClick={() => setLastSnapshot(null)}
                className="text-[11px] font-semibold text-[#166534] underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
            <p className="font-mono text-[11px] text-[#141413]">
              Net Revenue: ₹{(lastSnapshot.snapshot?.pnl?.netRevenue || 0).toLocaleString()} · Net Profit: ₹
              {(lastSnapshot.snapshot?.pnl?.netProfit || 0).toLocaleString()} · Retention:{' '}
              {lastSnapshot.snapshot?.bi?.retention?.retentionRatePercent || 0}% · Est. Next 30d: ₹
              {(lastSnapshot.snapshot?.bi?.salesForecast?.estimatedNext30DaysRevenue || 0).toLocaleString()} (Estimate Only)
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
