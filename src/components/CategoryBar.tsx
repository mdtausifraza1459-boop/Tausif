import React from 'react';
import { useStore } from '../context/StoreContext.tsx';

export const CategoryBar: React.FC = () => {
  const { categories, filters, selectCategory } = useStore();

  return (
    <section className="py-5 bg-white border-b border-[#E2DFD7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-serif text-xl sm:text-2xl font-semibold text-[#141413]">
              Shop by Silhouette
            </h2>
            <p className="text-xs text-[#63615C]">
              Exclusively curated ethnic &amp; contemporary styles for girls and women
            </p>
          </div>

          <button
            type="button"
            onClick={() => selectCategory('All')}
            className={`text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              filters.category === 'All'
                ? 'text-[#164E3F] underline underline-offset-4 font-semibold'
                : 'text-[#63615C] hover:text-[#141413]'
            }`}
          >
            View All ({categories.reduce((acc, c) => acc + (c.productCount || 0), 0)})
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
          <button
            type="button"
            onClick={() => selectCategory('All')}
            className={`px-4 py-2 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors border cursor-pointer ${
              filters.category === 'All'
                ? 'bg-[#141413] text-white border-[#141413]'
                : 'bg-[#F7F6F2] text-[#141413] border-[#E2DFD7] hover:border-[#141413]'
            }`}
          >
            All Collections
          </button>

          {categories.map((cat) => {
            const isSelected = filters.category.toLowerCase() === cat.name.toLowerCase();
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  selectCategory(cat.name);
                  document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors border cursor-pointer ${
                  isSelected
                    ? 'bg-[#141413] text-white border-[#141413]'
                    : 'bg-[#F7F6F2] text-[#141413] border-[#E2DFD7] hover:border-[#141413]'
                }`}
              >
                <div className="w-5 h-5 rounded-sm overflow-hidden bg-[#EFECE6] shrink-0">
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
                      isSelected ? 'text-white/75' : 'text-[#63615C]'
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
