import React from 'react';
import { useStore } from '../context/StoreContext.tsx';
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
  } = useStore();

  if (!compareModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 flex items-center justify-center font-sans text-[#141413]">
      <div className="relative w-full max-w-6xl bg-[#F7F6F2] rounded-xl shadow-2xl border border-[#E2DFD7] overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-[#E2DFD7]">
          <div className="flex items-center gap-2.5">
            <GitCompare className="w-5 h-5 text-[#164E3F]" />
            <div>
              <h2 className="font-serif text-xl font-bold text-[#141413]">
                Product Comparison ({compareList.length}/4)
              </h2>
              <p className="text-[11px] text-[#63615C]">
                Side-by-side comparison of fabrics, craftsmanship, sizes, ratings, and availability
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
              className="p-1.5 rounded-md text-[#63615C] hover:text-[#141413] hover:bg-[#EFECE6] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-auto flex-1">
          {compareList.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-xl border border-[#E2DFD7] space-y-3">
              <GitCompare className="w-10 h-10 text-[#164E3F] mx-auto" />
              <p className="font-serif text-xl font-semibold text-[#141413]">No Products Selected for Comparison</p>
              <p className="text-xs text-[#63615C] max-w-md mx-auto">
                Click the Compare icon on any garment card in the catalog to compare up to 4 styles side by side.
              </p>
              <button
                type="button"
                onClick={() => setCompareModalOpen(false)}
                className="px-5 py-2.5 bg-[#164E3F] text-white text-xs font-semibold rounded-md cursor-pointer"
              >
                Browse Collections
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#E2DFD7] overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-[#E2DFD7]">
                    <th className="p-4 w-44 bg-[#F7F6F2] text-[11px] font-bold uppercase tracking-wider text-[#63615C] align-top">
                      Garment Feature
                    </th>
                    {compareList.map((p) => (
                      <th key={p.id} className="p-4 align-top min-w-[210px] border-l border-[#E2DFD7]">
                        <div className="space-y-3">
                          <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-[#EFECE6] border border-[#E2DFD7]">
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
                              className="absolute top-2 right-2 p-1.5 bg-white/95 rounded-md text-[#B91C1C] border border-[#E2DFD7] hover:bg-[#FEF2F2] cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div>
                            <p className="text-[10px] font-mono text-[#63615C] uppercase">{p.sku}</p>
                            <button
                              type="button"
                              onClick={() => {
                                setCompareModalOpen(false);
                                setQuickViewProduct(p);
                              }}
                              className="font-serif text-base font-bold text-[#141413] hover:text-[#164E3F] text-left cursor-pointer"
                            >
                              {p.name}
                            </button>
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2DFD7]">
                  <tr>
                    <td className="p-4 bg-[#F7F6F2] font-semibold text-[#63615C]">Offer Price</td>
                    {compareList.map((p) => (
                      <td key={p.id} className="p-4 border-l border-[#E2DFD7]">
                        <div className="flex items-baseline gap-2">
                          <span className="text-base font-bold font-mono text-[#164E3F] tabular-nums">
                            ₹{p.discountedPrice.toLocaleString()}
                          </span>
                          {p.originalPrice > p.discountedPrice && (
                            <span className="text-[11px] text-[#63615C] line-through font-mono tabular-nums">
                              ₹{p.originalPrice.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4 bg-[#F7F6F2] font-semibold text-[#63615C]">Brand &amp; Category</td>
                    {compareList.map((p) => (
                      <td key={p.id} className="p-4 border-l border-[#E2DFD7]">
                        <span className="font-semibold text-[#141413] block">{p.brand || 'Zohra Luxe'}</span>
                        <span className="text-[11px] text-[#63615C]">{p.category}</span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4 bg-[#F7F6F2] font-semibold text-[#63615C]">Ratings &amp; Reviews</td>
                    {compareList.map((p) => (
                      <td key={p.id} className="p-4 border-l border-[#E2DFD7]">
                        <div className="flex items-center gap-1.5 font-mono tabular-nums">
                          <Star className="w-3.5 h-3.5 fill-current text-[#8E6D3B]" />
                          <span className="font-bold text-[#141413]">{p.rating}</span>
                          <span className="text-[#63615C]">({p.reviewCount} reviews)</span>
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4 bg-[#F7F6F2] font-semibold text-[#63615C]">Material &amp; Fabric</td>
                    {compareList.map((p) => (
                      <td key={p.id} className="p-4 border-l border-[#E2DFD7] font-medium text-[#141413]">
                        {p.fabric}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4 bg-[#F7F6F2] font-semibold text-[#63615C]">Available Sizes</td>
                    {compareList.map((p) => (
                      <td key={p.id} className="p-4 border-l border-[#E2DFD7] font-mono">
                        {p.sizes.join(' · ')}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4 bg-[#F7F6F2] font-semibold text-[#63615C]">Available Colours</td>
                    {compareList.map((p) => (
                      <td key={p.id} className="p-4 border-l border-[#E2DFD7]">
                        <div className="flex flex-wrap gap-2">
                          {p.colors.map((c) => (
                            <span key={c.name} className="inline-flex items-center gap-1 text-[11px]">
                              <span
                                className="w-3 h-3 rounded-full border border-[#E2DFD7]"
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
                    <td className="p-4 bg-[#F7F6F2] font-semibold text-[#63615C]">Craft Specifications</td>
                    {compareList.map((p) => (
                      <td key={p.id} className="p-4 border-l border-[#E2DFD7] space-y-1 text-[11px]">
                        <p><strong>Neckline:</strong> {p.details?.neckline || '—'}</p>
                        <p><strong>Sleeves:</strong> {p.details?.sleeves || p.sleeveType || '—'}</p>
                        <p><strong>Pattern:</strong> {p.details?.pattern || '—'}</p>
                        <p><strong>Lining:</strong> {p.details?.lining || '—'}</p>
                        <p><strong>Wash Care:</strong> {p.details?.washCare || '—'}</p>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4 bg-[#F7F6F2] font-semibold text-[#63615C]">Stock Availability</td>
                    {compareList.map((p) => (
                      <td key={p.id} className="p-4 border-l border-[#E2DFD7]">
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
                    <td className="p-4 bg-[#F7F6F2] font-semibold text-[#63615C]">Quick Action</td>
                    {compareList.map((p) => (
                      <td key={p.id} className="p-4 border-l border-[#E2DFD7]">
                        <button
                          type="button"
                          disabled={p.stockQuantity <= 0}
                          onClick={() => addToCart(p, p.sizes[0] || 'M', p.colors[0]?.name || 'Standard', 1, false)}
                          className="w-full py-2 px-3 bg-[#164E3F] hover:bg-[#0F3A2E] text-white text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>{p.stockQuantity > 0 ? 'Add to Bag' : 'Sold Out'}</span>
                        </button>
                      </td>
                    ))}
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
