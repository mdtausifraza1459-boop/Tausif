import React from 'react';
import { useStore } from '../context/StoreContext.tsx';

export const CategoryBar: React.FC = () => {
  const { categories, filters, selectCategory } = useStore();

  return (
    <section className="py-5 bg-[#FAF8F5] border-b border-[#E5DFD7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-serif text-lg sm:text-xl font-bold text-[#1C1917]">
              Shop by Category
            </h2>
            <p className="text-xs text-[#6B625D]">
              Exclusively curated ethnic & contemporary styles for girls and women
            </p>
          </div>

          <button
            onClick={() => selectCategory('All')}
            className={`text-xs font-semibold transition-colors cursor-pointer ${
              filters.category === 'All'
                ? 'text-[#6D1D3A] underline underline-offset-4'
                : 'text-[#6B625D] hover:text-[#6D1D3A]'
            }`}
          >
            View All ({categories.reduce((acc, c) => acc + (c.productCount || 0), 0)})
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
          <button
            onClick={() => selectCategory('All')}
            className={`px-3.5 py-2 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 transition-all border cursor-pointer ${
              filters.category === 'All'
                ? 'bg-[#6D1D3A] text-white border-[#6D1D3A] shadow-xs'
                : 'bg-white text-[#1C1917] border-[#E5DFD7] hover:border-[#6D1D3A] hover:text-[#6D1D3A]'
            }`}
          >
            All Collections
          </button>

          {categories.map((cat) => {
            const isSelected = filters.category.toLowerCase() === cat.name.toLowerCase();
            return (
              <button
                key={cat.id}
                onClick={() => {
                  selectCategory(cat.name);
                  document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-all border cursor-pointer ${
                  isSelected
                    ? 'bg-[#6D1D3A] text-white border-[#6D1D3A] shadow-xs'
                    : 'bg-white text-[#1C1917] border-[#E5DFD7] hover:border-[#6D1D3A] hover:text-[#6D1D3A]'
                }`}
              >
                <div className="w-5 h-5 rounded-sm overflow-hidden bg-[#F3EFEA] shrink-0">
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
                      isSelected ? 'text-white/80' : 'text-[#6B625D]'
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
