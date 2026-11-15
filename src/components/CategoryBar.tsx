import React from 'react';
import { useStore } from '../context/StoreContext.tsx';

export const CategoryBar: React.FC = () => {
  const { categories, filters, selectCategory } = useStore();

  return (
    <section className="py-5 bg-gradient-to-b from-white to-[#FAF6EE] border-b border-[#E6DFD3]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-serif text-xl sm:text-2xl font-semibold text-[#141413]">
            Shop by Silhouette
          </h2>

          <button
            type="button"
            onClick={() => selectCategory('All')}
            className={`text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              filters.category === 'All'
                ? 'text-[#9F1239] underline underline-offset-4 font-semibold'
                : 'text-[#63615C] hover:text-[#164E3F]'
            }`}
          >
            View All ({categories.reduce((acc, c) => acc + (c.productCount || 0), 0)})
          </button>
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 pt-1 no-scrollbar">
          <button
            type="button"
            onClick={() => selectCategory('All')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all border cursor-pointer ${
              filters.category === 'All'
                ? 'bg-gradient-to-r from-[#164E3F] to-[#0F3A2E] text-white border-[#164E3F] shadow-sm'
                : 'bg-white text-[#141413] border-[#E6DFD3] hover:border-[#9F1239] hover:bg-[#FFF1F5]'
            }`}
          >
            All Collections
          </button>

          {categories.map((cat, idx) => {
            const isSelected = filters.category.toLowerCase() === cat.name.toLowerCase();
            const hoverPalette = [
              'hover:border-[#9F1239] hover:bg-[#FFF1F5]',
              'hover:border-[#164E3F] hover:bg-[#ECFDF5]',
              'hover:border-[#B45309] hover:bg-[#FFFBEB]',
              'hover:border-[#7E22CE] hover:bg-[#FAF5FF]',
              'hover:border-[#0F766E] hover:bg-[#F0FDFA]',
            ][idx % 5];
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  selectCategory(cat.name);
                  document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all border cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#881337] to-[#9F1239] text-white border-[#881337] shadow-sm'
                    : `bg-white text-[#141413] border-[#E6DFD3] ${hoverPalette}`
                }`}
              >
                <div className={`w-6 h-6 rounded overflow-hidden shrink-0 ring-1 ${isSelected ? 'ring-[#F5D076]' : 'ring-[#D4AF6A]/45'}`}>
                  <img
                    src={cat.image}
                    alt={cat.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span>{cat.name}</span>
                {cat.productCount !== undefined && cat.productCount > 0 && (
                  <span
                    className={`text-[11px] tabular-nums font-mono ${
                      isSelected ? 'text-[#F5D076]' : 'text-[#8E6D3B]'
                    }`}
                  >
                    {cat.productCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
