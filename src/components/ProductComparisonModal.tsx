import React from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { getProductPriceRange, getStartingSize } from '../utils/pricing.ts';
import { X, Star, ShoppingBag, Trash2, GitCompare, Check, AlertCircle } from 'lucide-react';

export const ProductComparisonModal: React.FC = () => {
  const {
    compareModalOpen,
    setCompareModalOpen,
    compareList,
    toggleCompare,
    clearCompare,
    addToCart,
    setQuickViewProduct,
    getEffectivePrice,
  } = useStore();

  if (!compareModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 flex items-center justify-center font-sans text-[#191615]">
      <div className="relative w-full max-w-6xl bg-[#FAF8F4] rounded-xl shadow-2xl border border-[#EADFD8] overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-[#EADFD8]">
          <div className="flex items-center gap-2.5">
            <GitCompare className="w-5 h-5 text-[#9E5660]" />
            <div>
              <h2 className="font-serif text-xl font-bold text-[#191615]">
                Product Comparison ({compareList.length}/4)
              </h2>
              <p className="text-[11px] text-[#665E5B]">
                Compare fabrics, sizes, pricing, and stock availability side by side
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {compareList.length > 0 && (
              <button
                type="button"
                onClick={clearCompare}
                className="text-xs font-semibold text-[#B91C1C] hover:underline cursor-pointer"
              >
                Clear All
              </button>
            )}
            <button
              type="button"
              onClick={() => setCompareModalOpen(false)}
              aria-label="Close comparison"
              className="p-1.5 rounded-md text-[#665E5B] hover:text-[#191615] hover:bg-[#F4EDE2] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-auto flex-1">
          {compareList.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-xl border border-[#EADFD8] space-y-3">
              <GitCompare className="w-10 h-10 text-[#9E5660] mx-auto" />
              <p className="font-serif text-xl font-semibold text-[#191615]">No Products Selected</p>
              <p className="text-xs text-[#665E5B] max-w-md mx-auto">
                Tap Compare on any product card to compare up to 4 styles side by side.
              </p>
              <button
                type="button"
                onClick={() => setCompareModalOpen(false)}
                className="px-5 py-2.5 bg-[#9E5660] text-white text-xs font-semibold rounded-md cursor-pointer"
              >
                Browse Collections
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#EADFD8] overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-[#EADFD8]">
                    <th className="p-4 w-44 bg-[#FAF8F4] text-[11px] font-bold uppercase tracking-wider text-[#665E5B] align-top">
                      Feature
                    </th>
                    {compareList.map((p) => (
                      <th key={p.id} className="p-4 align-top min-w-[210px] border-l border-[#EADFD8]">
                        <div className="space-y-3">
                          <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-[#F4EDE2] border border-[#EADFD8]">
                            <img
                              src={p.images[0]}
                              alt={p.name}
                              referrerPolicy="no-referrer"
                              onClick={() => {
                                setCompareModalOpen(false);
                                setQuickViewProduct(p);
                              }}
                              className="w-full h-full object-cover object-top cursor-pointer"
                            />
                            <button
                              type="button"
                              onClick={() => toggleCompare(p)}
                              aria-label={`Remove ${p.name} from comparison`}
                              className="absolute top-2 right-2 p-1.5 bg-white/95 rounded-md text-[#B91C1C] border border-[#EADFD8] hover:bg-[#FEF2F2] cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div>
                            <p className="text-[10px] font-mono text-[#665E5B] uppercase">{p.sku}</p>
                            <button
                              type="button"
                              onClick={() => {
                                setCompareModalOpen(false);
                                setQuickViewProduct(p);
                              }}
                              className="font-serif text-base font-bold text-[#191615] hover:text-[#9E5660] text-left cursor-pointer"
                            >
                              {p.name}
                            </button>
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EADFD8]">
                  <tr>
                    <td className="p-4 bg-[#FAF8F4] font-semibold text-[#665E5B]">Offer Price</td>
                    {compareList.map((p) => {
                      const range = getProductPriceRange(p);
                      const startPrice = getEffectivePrice(p, getStartingSize(p));
                      return (
                        <td key={p.id} className="p-4 border-l border-[#EADFD8]">
                          {range.hasRange ? (
                            <span className="text-sm font-bold font-mono text-[#9E5660] tabular-nums">
                              ₹{range.min.toLocaleString()} – ₹{range.max.toLocaleString()}
                            </span>
                          ) : (
                            <div className="flex items-baseline gap-2">
                              <span className="text-base font-bold font-mono text-[#9E5660] tabular-nums">
                                ₹{startPrice.toLocaleString()}
                              </span>
                              {p.originalPrice > startPrice && (
                                <span className="text-[11px] text-[#665E5B] line-through font-mono tabular-nums">
                                  ₹{p.originalPrice.toLocaleString()}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="p-4 bg-[#FAF8F4] font-semibold text-[#665E5B]">Brand &amp; Category</td>
                    {compareList.map((p) => (
                      <td key={p.id} className="p-4 border-l border-[#EADFD8]">
                        <span className="font-semibold text-[#191615] block">{p.brand || 'Zohra Luxe'}</span>
                        <span className="text-[11px] text-[#665E5B]">{p.category}</span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4 bg-[#FAF8F4] font-semibold text-[#665E5B]">Rating</td>
                    {compareList.map((p) => (
                      <td key={p.id} className="p-4 border-l border-[#EADFD8]">
                        <div className="flex items-center gap-1.5 font-mono tabular-nums">
                          <Star className="w-3.5 h-3.5 fill-current text-[#B58A4A]" />
                          <span className="font-bold text-[#191615]">{p.rating}</span>
                          <span className="text-[#665E5B]">({p.reviewCount})</span>
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4 bg-[#FAF8F4] font-semibold text-[#665E5B]">Fabric</td>
                    {compareList.map((p) => (
                      <td key={p.id} className="p-4 border-l border-[#EADFD8] font-medium text-[#191615]">
                        {p.fabric}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4 bg-[#FAF8F4] font-semibold text-[#665E5B]">Available Sizes</td>
                    {compareList.map((p) => (
                      <td key={p.id} className="p-4 border-l border-[#EADFD8] font-mono">
                        {p.sizes.join(' · ')}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4 bg-[#FAF8F4] font-semibold text-[#665E5B]">Colours</td>
                    {compareList.map((p) => (
                      <td key={p.id} className="p-4 border-l border-[#EADFD8]">
                        <div className="flex flex-wrap gap-2">
                          {p.colors.map((c) => (
                            <span key={c.name} className="inline-flex items-center gap-1 text-[11px]">
                              <span
                                className="w-3 h-3 rounded-full border border-[#EADFD8]"
                                style={{ backgroundColor: c.hex }}
                              />
                              <span>{c.name}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4 bg-[#FAF8F4] font-semibold text-[#665E5B]">Details</td>
                    {compareList.map((p) => (
                      <td key={p.id} className="p-4 border-l border-[#EADFD8] space-y-1 text-[11px]">
                        <p><strong>Neckline:</strong> {p.details?.neckline || '—'}</p>
                        <p><strong>Sleeves:</strong> {p.details?.sleeves || p.sleeveType || '—'}</p>
                        <p><strong>Pattern:</strong> {p.details?.pattern || '—'}</p>
                        <p><strong>Wash Care:</strong> {p.details?.washCare || '—'}</p>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4 bg-[#FAF8F4] font-semibold text-[#665E5B]">Availability</td>
                    {compareList.map((p) => (
                      <td key={p.id} className="p-4 border-l border-[#EADFD8]">
                        {p.stockQuantity > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[#166534] font-semibold font-mono tabular-nums">
                            <Check className="w-3.5 h-3.5" />
                            <span>In Stock ({p.stockQuantity})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[#B91C1C] font-semibold">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Sold Out</span>
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4 bg-[#FAF8F4] font-semibold text-[#665E5B]">Quick Action</td>
                    {compareList.map((p) => {
                      const startSz = getStartingSize(p);
                      return (
                        <td key={p.id} className="p-4 border-l border-[#EADFD8]">
                          <button
                            type="button"
                            disabled={p.stockQuantity <= 0}
                            onClick={() => addToCart(p, startSz, p.colors[0]?.name || 'Standard', 1, false)}
                            className="w-full py-2 px-3 bg-[#9E5660] hover:bg-[#84424C] text-white text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>{p.stockQuantity > 0 ? 'Add to Bag' : 'Sold Out'}</span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

