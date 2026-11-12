import React from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { RotateCcw, SlidersHorizontal, Check, Star } from 'lucide-react';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const POPULAR_COLORS = [
  { name: 'Blush Pink', hex: '#E8C5C8' },
  { name: 'Sage Mint', hex: '#9FB8AD' },
  { name: 'Royal Wine', hex: '#581D22' },
  { name: 'Ivory Cream', hex: '#FDFBF7' },
  { name: 'Chalk White', hex: '#FAF9F6' },
  { name: 'Soft Lilac', hex: '#C8BEDB' },
  { name: 'Rose Gold', hex: '#C69888' },
  { name: 'Indigo Blue', hex: '#2B3D52' },
];

const SLEEVE_TYPES = ['3/4 Sleeves', 'Full Sleeves', 'Half Sleeves', 'Sleeveless'];
const KURTI_LENGTHS = ['Short', 'Knee Length', 'Calf Length', 'Ankle Length'];
const OCCASIONS = ['Daily Wear', 'Office Wear', 'Festive', 'Party', 'Wedding'];

const FABRICS = [
  'Pure Chanderi Silk & Organza',
  'Raw Silk Blend',
  'Heavy Art Silk & Brocade',
  'Fine Cotton Modal Slub',
  '100% Breathable Handloom Mulmul',
  'Georgette with Silver Tilla Work',
  'Organic Cambric Cotton',
  'Viscose Silk & Tissue Dupatta',
  'Katan Silk with Pure Gold Zari Weave',
  '100% Organic Mulmul Cotton',
];

const DISCOUNT_RANGES = [
  { label: '50% or more', value: 50 },
  { label: '40% or more', value: 40 },
  { label: '30% or more', value: 30 },
  { label: '20% or more', value: 20 },
  { label: '10% or more', value: 10 },
];

const RATING_OPTIONS = [
  { label: '4★ & above', min: 4 },
  { label: '3★ & above', min: 3 },
];

interface FilterSidebarProps {
  totalCount: number;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({ totalCount }) => {
  const { categories, filters, setFilters, resetFilters } = useStore();

  const handleSizeToggle = (size: string) => {
    setFilters((prev) => ({
      ...prev,
      sizes: prev.sizes.includes(size) ? prev.sizes.filter((s) => s !== size) : [...prev.sizes, size],
    }));
  };

  const handleColorToggle = (color: string) => {
    setFilters((prev) => ({
      ...prev,
      colors: prev.colors.includes(color) ? prev.colors.filter((c) => c !== color) : [...prev.colors, color],
    }));
  };

  const handleFabricToggle = (fabric: string) => {
    setFilters((prev) => ({
      ...prev,
      fabrics: prev.fabrics.includes(fabric) ? prev.fabrics.filter((f) => f !== fabric) : [...prev.fabrics, fabric],
    }));
  };

  const handleSleeveToggle = (sleeve: string) => {
    setFilters((prev) => ({
      ...prev,
      sleeveTypes: prev.sleeveTypes.includes(sleeve)
        ? prev.sleeveTypes.filter((s) => s !== sleeve)
        : [...prev.sleeveTypes, sleeve],
    }));
  };

  const handleLengthToggle = (length: string) => {
    setFilters((prev) => ({
      ...prev,
      kurtiLengths: prev.kurtiLengths.includes(length)
        ? prev.kurtiLengths.filter((l) => l !== length)
        : [...prev.kurtiLengths, length],
    }));
  };

  const handleOccasionToggle = (occ: string) => {
    setFilters((prev) => ({
      ...prev,
      occasions: prev.occasions.includes(occ)
        ? prev.occasions.filter((o) => o !== occ)
        : [...prev.occasions, occ],
    }));
  };

  const hasActiveFilters =
    filters.category !== 'All' ||
    filters.sizes.length > 0 ||
    filters.colors.length > 0 ||
    filters.fabrics.length > 0 ||
    filters.sleeveTypes.length > 0 ||
    filters.kurtiLengths.length > 0 ||
    filters.occasions.length > 0 ||
    filters.minDiscount > 0 ||
    filters.minRating > 0 ||
    filters.inStockOnly ||
    filters.newArrivalsOnly ||
    filters.bestSellersOnly ||
    filters.priceRange[1] < 10000;

  return (
    <aside className="w-full lg:w-68 bg-white p-4 sm:p-5 rounded-lg border border-[#E5DFD7] space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-[#E5DFD7]">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-[#6D1D3A]" />
          <h3 className="text-sm font-bold text-[#1C1917]">Refine Results</h3>
          <span className="text-xs font-mono text-[#6B625D] tabular-nums">({totalCount})</span>
        </div>

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="text-xs font-semibold text-[#6D1D3A] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Availability */}
      <div className="space-y-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B625D] block">
          Availability
        </span>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2.5 text-xs text-[#1C1917] cursor-pointer hover:text-[#6D1D3A]">
            <input
              type="checkbox"
              checked={filters.inStockOnly}
              onChange={(e) => setFilters((prev) => ({ ...prev, inStockOnly: e.target.checked }))}
              className="rounded accent-[#6D1D3A]"
            />
            <span className="font-medium">In Stock Only</span>
          </label>
          <label className="flex items-center gap-2.5 text-xs text-[#1C1917] cursor-pointer hover:text-[#6D1D3A]">
            <input
              type="checkbox"
              checked={filters.newArrivalsOnly}
              onChange={(e) => setFilters((prev) => ({ ...prev, newArrivalsOnly: e.target.checked }))}
              className="rounded accent-[#6D1D3A]"
            />
            <span>New Arrivals</span>
          </label>
          <label className="flex items-center gap-2.5 text-xs text-[#1C1917] cursor-pointer hover:text-[#6D1D3A]">
            <input
              type="checkbox"
              checked={filters.bestSellersOnly}
              onChange={(e) => setFilters((prev) => ({ ...prev, bestSellersOnly: e.target.checked }))}
              className="rounded accent-[#6D1D3A]"
            />
            <span>Best Sellers</span>
          </label>
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-2 pt-3 border-t border-[#E5DFD7]">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold uppercase tracking-wider text-[#6B625D]">Category</span>
          <span className="text-[#6B625D]">15 Styles</span>
        </div>
        <div className="space-y-1 max-h-48 overflow-y-auto pr-1 text-xs">
          <button
            onClick={() => setFilters((prev) => ({ ...prev, category: 'All' }))}
            className={`w-full text-left py-1.5 px-2.5 rounded transition-colors cursor-pointer ${
              filters.category === 'All'
                ? 'font-semibold text-[#6D1D3A] bg-[#FBF2F5]'
                : 'text-[#1C1917] hover:bg-[#FAF8F5]'
            }`}
          >
            All Women's Clothing
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilters((prev) => ({ ...prev, category: cat.name }))}
              className={`w-full text-left py-1.5 px-2.5 rounded transition-colors flex items-center justify-between cursor-pointer ${
                filters.category.toLowerCase() === cat.name.toLowerCase()
                  ? 'font-semibold text-[#6D1D3A] bg-[#FBF2F5]'
                  : 'text-[#1C1917] hover:bg-[#FAF8F5]'
              }`}
            >
              <span className="truncate">{cat.name}</span>
              {cat.productCount !== undefined && (
                <span className="text-[11px] text-[#6B625D] tabular-nums font-mono">{cat.productCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Price */}
      <div className="space-y-2.5 pt-3 border-t border-[#E5DFD7]">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold uppercase tracking-wider text-[#6B625D]">Max Price</span>
          <span className="font-bold font-mono text-[#6D1D3A] tabular-nums">
            ₹{filters.priceRange[1].toLocaleString()}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: 'Under ₹999', max: 999 },
            { label: 'Under ₹1,499', max: 1499 },
            { label: 'Under ₹2,499', max: 2499 },
            { label: 'All Prices', max: 10000 },
          ].map((tag) => (
            <button
              key={tag.label}
              type="button"
              onClick={() => setFilters((prev) => ({ ...prev, priceRange: [0, tag.max] }))}
              className={`py-1.5 text-[11px] rounded border font-medium transition-colors cursor-pointer ${
                filters.priceRange[1] === tag.max
                  ? 'bg-[#6D1D3A] text-white border-[#6D1D3A]'
                  : 'bg-white text-[#1C1917] border-[#E5DFD7] hover:border-[#6D1D3A]'
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>

        <input
          type="range"
          min={500}
          max={10000}
          step={500}
          value={filters.priceRange[1]}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              priceRange: [0, Number(e.target.value)],
            }))
          }
          className="w-full accent-[#6D1D3A] cursor-pointer mt-1"
        />
        <div className="flex items-center justify-between text-[10px] text-[#6B625D] font-mono">
          <span>₹500</span>
          <span>₹10,000+</span>
        </div>
      </div>

      {/* Sizes */}
      <div className="space-y-2 pt-3 border-t border-[#E5DFD7]">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B625D] block">Size</span>
        <div className="grid grid-cols-3 gap-1.5">
          {SIZES.map((size) => {
            const isSelected = filters.sizes.includes(size);
            return (
              <button
                key={size}
                type="button"
                onClick={() => handleSizeToggle(size)}
                className={`py-1.5 text-xs font-semibold rounded border transition-colors cursor-pointer ${
                  isSelected
                    ? 'border-[#6D1D3A] bg-[#6D1D3A] text-white'
                    : 'border-[#E5DFD7] bg-white text-[#1C1917] hover:border-[#6D1D3A]'
                }`}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sleeve Type */}
      <div className="space-y-2 pt-3 border-t border-[#E5DFD7]">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B625D] block">Sleeve Type</span>
        <div className="space-y-1.5 text-xs">
          {SLEEVE_TYPES.map((slv) => (
            <label key={slv} className="flex items-center gap-2 cursor-pointer text-[#1C1917] hover:text-[#6D1D3A]">
              <input
                type="checkbox"
                checked={filters.sleeveTypes.includes(slv)}
                onChange={() => handleSleeveToggle(slv)}
                className="rounded accent-[#6D1D3A]"
              />
              <span>{slv}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Kurti Length */}
      <div className="space-y-2 pt-3 border-t border-[#E5DFD7]">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B625D] block">Length</span>
        <div className="space-y-1.5 text-xs">
          {KURTI_LENGTHS.map((len) => (
            <label key={len} className="flex items-center gap-2 cursor-pointer text-[#1C1917] hover:text-[#6D1D3A]">
              <input
                type="checkbox"
                checked={filters.kurtiLengths.includes(len)}
                onChange={() => handleLengthToggle(len)}
                className="rounded accent-[#6D1D3A]"
              />
              <span>{len}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Occasion */}
      <div className="space-y-2 pt-3 border-t border-[#E5DFD7]">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B625D] block">Occasion</span>
        <div className="space-y-1.5 text-xs">
          {OCCASIONS.map((occ) => (
            <label key={occ} className="flex items-center gap-2 cursor-pointer text-[#1C1917] hover:text-[#6D1D3A]">
              <input
                type="checkbox"
                checked={filters.occasions.includes(occ)}
                onChange={() => handleOccasionToggle(occ)}
                className="rounded accent-[#6D1D3A]"
              />
              <span>{occ}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Discount */}
      <div className="space-y-2 pt-3 border-t border-[#E5DFD7]">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B625D] block">Discount</span>
        <div className="space-y-1.5 text-xs">
          {DISCOUNT_RANGES.map((d) => (
            <label key={d.value} className="flex items-center gap-2 cursor-pointer text-[#1C1917] hover:text-[#6D1D3A]">
              <input
                type="radio"
                name="discount-filter"
                checked={filters.minDiscount === d.value}
                onChange={() =>
                  setFilters((prev) => ({
                    ...prev,
                    minDiscount: prev.minDiscount === d.value ? 0 : d.value,
                  }))
                }
                className="accent-[#6D1D3A]"
              />
              <span className={filters.minDiscount === d.value ? 'font-semibold text-[#6D1D3A]' : ''}>{d.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Rating */}
      <div className="space-y-2 pt-3 border-t border-[#E5DFD7]">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B625D] block">Customer Rating</span>
        <div className="space-y-1.5 text-xs">
          {RATING_OPTIONS.map((r) => (
            <button
              key={r.min}
              type="button"
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  minRating: prev.minRating === r.min ? 0 : r.min,
                }))
              }
              className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded text-left transition-colors cursor-pointer ${
                filters.minRating === r.min
                  ? 'bg-[#FBF2F5] text-[#6D1D3A] font-semibold'
                  : 'text-[#1C1917] hover:bg-[#FAF8F5]'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[#166534] font-bold flex items-center gap-0.5 tabular-nums">
                  {r.min} <Star className="w-3 h-3 fill-current" />
                </span>
                <span>& above</span>
              </div>
              {filters.minRating === r.min && <Check className="w-3.5 h-3.5 text-[#6D1D3A]" />}
            </button>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div className="space-y-2 pt-3 border-t border-[#E5DFD7]">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B625D] block">Color</span>
        <div className="flex flex-wrap gap-2">
          {POPULAR_COLORS.map((c) => {
            const isSelected = filters.colors.includes(c.name);
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => handleColorToggle(c.name)}
                title={c.name}
                className={`relative w-7 h-7 rounded-full border transition-all flex items-center justify-center cursor-pointer ${
                  isSelected ? 'ring-2 ring-[#6D1D3A] scale-110' : 'border-[#E5DFD7]'
                }`}
                style={{ backgroundColor: c.hex }}
              >
                {isSelected && (
                  <Check
                    className={`w-3.5 h-3.5 ${
                      c.hex === '#FDFBF7' || c.hex === '#FAF9F6' ? 'text-[#1C1917]' : 'text-white'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Fabrics */}
      <div className="space-y-2 pt-3 border-t border-[#E5DFD7]">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B625D] block">Fabric</span>
        <div className="space-y-1.5 text-xs max-h-40 overflow-y-auto pr-1">
          {FABRICS.map((fab) => (
            <label key={fab} className="flex items-start gap-2 cursor-pointer text-[#1C1917] hover:text-[#6D1D3A]">
              <input
                type="checkbox"
                checked={filters.fabrics.includes(fab)}
                onChange={() => handleFabricToggle(fab)}
                className="mt-0.5 rounded accent-[#6D1D3A]"
              />
              <span className="line-clamp-1">{fab}</span>
            </label>
          ))}
        </div>
      </div>
    </aside>
  );
};
