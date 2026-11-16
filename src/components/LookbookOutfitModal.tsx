import React, { useState } from 'react';
import { useStore, getProductVariantStock } from '../context/StoreContext.tsx';
import { isSizeAvailableForPurchase } from '../utils/pricing.ts';
import { Product } from '../types.ts';
import { X, Sparkles, Layers, ShoppingBag, Check, ArrowRight } from 'lucide-react';

export const LookbookOutfitModal: React.FC = () => {
  const {
    lookbookModalOpen,
    setLookbookModalOpen,
    lookbooks,
    bundles,
    products,
    addToCart,
    setQuickViewProduct,
    getEffectivePrice,
    showToast,
  } = useStore();

  const [tab, setTab] = useState<'lookbooks' | 'builder'>('lookbooks');
  const [occasionFilter, setOccasionFilter] = useState<string>('All');
  const [selectedOutfitIds, setSelectedOutfitIds] = useState<string[]>(['zk-101', 'zk-109']);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});

  if (!lookbookModalOpen) return null;

  const filteredLookbooks =
    occasionFilter === 'All'
      ? lookbooks
      : lookbooks.filter((lb) => lb.occasion.toLowerCase() === occasionFilter.toLowerCase());

  const outfitProducts = selectedOutfitIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));

  const outfitRawTotal = outfitProducts.reduce(
    (s, p) => s + getEffectivePrice(p, selectedSizes[p.id] || p.sizes[0] || 'M'),
    0
  );

  // Estimate best active bundle discount matching selected products
  let matchedBundleTitle = '';
  let estimatedBundleSavings = 0;
  const selSet = new Set(selectedOutfitIds);
  for (const b of bundles) {
    if (!b.active) continue;
    const minOk = outfitProducts.length >= (b.minItems || 2);
    const reqOk =
      !b.requiredProductIds?.length ||
      b.requiredProductIds.every((pid) => selSet.has(pid));
    if (!minOk || !reqOk) continue;
    const amt =
      b.discountType === 'percentage'
        ? Math.round((outfitRawTotal * b.discountValue) / 100)
        : Math.min(outfitRawTotal, b.discountValue);
    if (amt > estimatedBundleSavings) {
      estimatedBundleSavings = amt;
      matchedBundleTitle = b.title;
    }
  }

  const toggleBuilderProduct = (id: string) => {
    setSelectedOutfitIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 5)
    );
  };

  const handleAddCompleteOutfit = (itemsList: Product[], title: string) => {
    let added = 0;
    for (const prod of itemsList) {
      const sz = selectedSizes[prod.id] || prod.sizes[0] || 'M';
      const col = prod.colors[0]?.name || 'Standard';
      const avail = getProductVariantStock(prod, sz, col);
      if (avail > 0 && isSizeAvailableForPurchase(prod, sz, col)) {
        addToCart(prod, sz, col, 1, false);
        added++;
      }
    }
    if (added > 0) {
      setLookbookModalOpen(false);
      showToast({
        title: `Added ${added} curated piece(s)`,
        subtitle: `${title} — combo savings calculated automatically at checkout`,
        type: 'success',
        showBagActions: true,
      });
    } else {
      showToast({
        title: 'Selected pieces out of stock',
        subtitle: 'Please adjust sizes or select alternative silhouettes.',
        type: 'error',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FAF8F4] w-full max-w-5xl max-h-[90vh] rounded-xl border border-[#EADFD8] shadow-2xl flex flex-col overflow-hidden text-[#191615]">
        <div className="px-6 py-4 bg-white border-b border-[#EADFD8] flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#9E5660] font-semibold">
              Curated Styling
            </p>
            <h2 className="font-serif text-2xl font-semibold text-[#191615]">
              Atelier Lookbook &amp; Outfit Builder
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-[#FAF8F4] p-1 rounded-md border border-[#EADFD8] text-xs font-medium">
              <button
                type="button"
                onClick={() => setTab('lookbooks')}
                className={`px-3 py-1.5 rounded flex items-center gap-1.5 cursor-pointer transition-colors ${
                  tab === 'lookbooks' ? 'bg-[#9E5660] text-white' : 'text-[#665E5B] hover:text-[#191615]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Curated Lookbooks</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('builder')}
                className={`px-3 py-1.5 rounded flex items-center gap-1.5 cursor-pointer transition-colors ${
                  tab === 'builder' ? 'bg-[#9E5660] text-white' : 'text-[#665E5B] hover:text-[#191615]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Custom Outfit Builder</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setLookbookModalOpen(false)}
              className="p-2 hover:bg-[#F4EDE2] rounded-md text-[#665E5B] cursor-pointer"
              aria-label="Close Lookbook"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {tab === 'lookbooks' ? (
            <>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {['All', 'Wedding', 'Eid', 'Festive', 'Office', 'Casual'].map((occ) => (
                  <button
                    key={occ}
                    type="button"
                    onClick={() => setOccasionFilter(occ)}
                    className={`px-3.5 py-1.5 rounded-md text-xs font-medium border cursor-pointer whitespace-nowrap ${
                      occasionFilter === occ
                        ? 'bg-[#191615] text-white border-[#191615]'
                        : 'bg-white text-[#191615] border-[#EADFD8] hover:border-[#9E5660]'
                    }`}
                  >
                    {occ}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredLookbooks.map((lb) => {
                  const lbItems =
                    lb.products && lb.products.length > 0
                      ? lb.products
                      : lb.productIds
                          .map((pid) => products.find((p) => p.id === pid))
                          .filter((p): p is Product => Boolean(p));
                  const sum = lbItems.reduce(
                    (s, p) => s + getEffectivePrice(p, selectedSizes[p.id] || p.sizes[0] || 'M'),
                    0
                  );

                  return (
                    <div
                      key={lb.id}
                      className="bg-white border border-[#EADFD8] rounded-xl overflow-hidden flex flex-col shadow-xs"
                    >
                      <div className="relative h-52 bg-[#F4EDE2] overflow-hidden">
                        <img
                          src={lb.image}
                          alt={lb.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-3 left-3 px-2.5 py-1 bg-[#191615]/90 text-[#E8C5C8] text-[10px] font-mono uppercase tracking-wider rounded">
                          {lb.occasion} Edit
                        </span>
                      </div>
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          <h3 className="font-serif text-xl font-semibold text-[#191615]">{lb.title}</h3>
                          <p className="text-xs text-[#665E5B]">{lb.subtitle}</p>
                          <p className="text-xs text-[#9E5660] bg-[#F9EEF0] p-2.5 rounded border border-[#EADFD8] leading-relaxed">
                            <strong>Stylist Note:</strong> {lb.editorialNote}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#665E5B]">
                            Included Garments ({lbItems.length})
                          </p>
                          <div className="space-y-1.5">
                            {lbItems.map((item) => {
                              const selSz = selectedSizes[item.id] || item.sizes[0] || 'M';
                              return (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between gap-2 p-2 bg-[#FAF8F4] rounded border border-[#EADFD8]"
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setLookbookModalOpen(false);
                                      setQuickViewProduct(item);
                                    }}
                                    className="flex items-center gap-2.5 text-left min-w-0 cursor-pointer hover:text-[#9E5660]"
                                  >
                                    <img
                                      src={item.images[0]}
                                      alt=""
                                      referrerPolicy="no-referrer"
                                      className="w-9 h-11 object-cover rounded border border-[#EADFD8] shrink-0"
                                    />
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium truncate">{item.name}</p>
                                      <p className="text-[11px] font-mono text-[#9E5660]">
                                        ₹{getEffectivePrice(item, selSz).toLocaleString()}
                                      </p>
                                    </div>
                                  </button>
                                  <select
                                    value={selSz}
                                    onChange={(e) =>
                                      setSelectedSizes((prev) => ({ ...prev, [item.id]: e.target.value }))
                                    }
                                    className="text-xs bg-white border border-[#EADFD8] rounded px-2 py-1"
                                  >
                                    {item.sizes.map((s) => (
                                      <option key={s} value={s}>
                                        {s}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[#EADFD8] flex items-center justify-between gap-3">
                          <div>
                            <span className="text-[11px] text-[#665E5B] block">Look Total</span>
                            <span className="font-mono text-base font-bold text-[#191615]">
                              ₹{sum.toLocaleString()}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddCompleteOutfit(lbItems, lb.title)}
                            className="px-4 py-2 bg-[#9E5660] hover:bg-[#84424C] text-white text-xs font-semibold rounded-md flex items-center gap-1.5 cursor-pointer"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Add Complete Look</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-3">
                <p className="text-xs text-[#665E5B]">
                  Select 2 to 5 pieces to build an outfit. Eligible combo discounts apply at checkout.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {products.map((p) => {
                    const selected = selectedOutfitIds.includes(p.id);
                    const selSize = selectedSizes[p.id] || p.sizes[0] || 'M';
                    const sizeAvail = isSizeAvailableForPurchase(p, selSize);
                    return (
                      <div
                        key={p.id}
                        className={`p-3 rounded-lg border flex items-center gap-3 transition-colors ${
                          selected
                            ? 'bg-[#F9EEF0] border-[#9E5660]'
                            : 'bg-white border-[#EADFD8]'
                        }`}
                      >
                        <img
                          src={p.images[0]}
                          alt={p.name}
                          referrerPolicy="no-referrer"
                          className="w-14 h-18 object-cover rounded border border-[#EADFD8] shrink-0"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <span className="text-[10px] font-mono uppercase text-[#B58A4A] block">
                            {p.occasion || p.category}
                          </span>
                          <p className="text-xs font-semibold truncate text-[#191615]">{p.name}</p>
                          <p className="text-xs font-mono font-semibold text-[#9E5660]">
                            ₹{getEffectivePrice(p, selSize).toLocaleString()}
                            {!sizeAvail && (
                              <span className="ml-1.5 text-[10px] text-[#B91C1C]">(Unavailable)</span>
                            )}
                          </p>
                          <div className="flex items-center gap-2 pt-1">
                            <select
                              value={selSize}
                              onChange={(e) =>
                                setSelectedSizes((prev) => ({ ...prev, [p.id]: e.target.value }))
                              }
                              className="text-[11px] bg-white border border-[#EADFD8] rounded px-1.5 py-0.5 text-[#191615]"
                            >
                              {p.sizes.map((s) => (
                                <option key={s} value={s} disabled={!isSizeAvailableForPurchase(p, s)}>
                                  {s}{!isSizeAvailableForPurchase(p, s) ? ' (Out)' : ''}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => toggleBuilderProduct(p.id)}
                              className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                                selected
                                  ? 'bg-[#9E5660] text-white'
                                  : 'bg-[#191615] text-white hover:bg-[#9E5660]'
                              }`}
                            >
                              {selected ? <Check className="w-3 h-3" /> : null}
                              <span>{selected ? 'Selected' : 'Pair Piece'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white border border-[#EADFD8] rounded-xl p-5 space-y-4 h-fit sticky top-0">
                <h3 className="font-serif text-xl font-semibold text-[#191615]">
                  Your Custom Ensemble ({outfitProducts.length})
                </h3>
                {outfitProducts.length === 0 ? (
                  <p className="text-xs text-[#665E5B]">
                    Pick garments on the left to build your complete outfit.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {outfitProducts.map((op) => {
                      const opSize = selectedSizes[op.id] || op.sizes[0] || 'M';
                      return (
                        <div key={op.id} className="flex items-center justify-between text-xs border-b border-[#F4EDE2] pb-2">
                          <div className="min-w-0 pr-2">
                            <p className="font-medium truncate text-[#191615]">{op.name}</p>
                            <p className="text-[11px] text-[#665E5B]">
                              Size {opSize} · {op.colors[0]?.name}
                            </p>
                          </div>
                          <span className="font-mono font-semibold shrink-0 text-[#191615]">
                            ₹{getEffectivePrice(op, opSize).toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="bg-[#FAF8F4] p-3.5 rounded-lg border border-[#EADFD8] space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#665E5B]">Ensemble Value</span>
                    <span className="font-mono">₹{outfitRawTotal.toLocaleString()}</span>
                  </div>
                  {estimatedBundleSavings > 0 && (
                    <div className="flex justify-between text-[#9E5660] font-semibold">
                      <span>{matchedBundleTitle}</span>
                      <span className="font-mono">-₹{estimatedBundleSavings.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm pt-1.5 border-t border-[#EADFD8]">
                    <span>Est. Combo Total</span>
                    <span className="font-mono text-[#9E5660]">
                      ₹{Math.max(0, outfitRawTotal - estimatedBundleSavings).toLocaleString()}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={outfitProducts.length === 0}
                  onClick={() => handleAddCompleteOutfit(outfitProducts, 'Custom Atelier Ensemble')}
                  className="w-full py-2.5 bg-[#9E5660] hover:bg-[#84424C] disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-wider rounded-md flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <span>Add Complete Outfit to Bag</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
