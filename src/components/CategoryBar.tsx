import React from 'react';
import { useStore } from '../context/StoreContext.tsx';

export const CategoryBar: React.FC = () => {
  const { categories, filters, selectCategory } = useStore();

  return (
    <section className="py-5 bg-white border-b border-[#EADFD8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-serif text-xl sm:text-2xl font-semibold text-[#191615]">
            Shop by Category
          </h2>

          <button
            type="button"
            onClick={() => selectCategory('All')}
            className={`text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              filters.category === 'All'
                ? 'text-[#9E5660] underline underline-offset-4 font-semibold'
                : 'text-[#665E5B] hover:text-[#191615]'
            }`}
          >
            View All ({categories.reduce((acc, c) => acc + (c.productCount || 0), 0)})
          </button>
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 pt-1 no-scrollbar">
          <button
            type="button"
            onClick={() => selectCategory('All')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors border cursor-pointer ${
              filters.category === 'All'
                ? 'bg-[#9E5660] text-white border-[#9E5660] shadow-xs'
                : 'bg-[#FAF8F4] text-[#191615] border-[#EADFD8] hover:border-[#9E5660] hover:bg-[#F9EEF0]'
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
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors border cursor-pointer ${
                  isSelected
                    ? 'bg-[#9E5660] text-white border-[#9E5660] shadow-xs'
                    : 'bg-white text-[#191615] border-[#EADFD8] hover:border-[#9E5660] hover:bg-[#F9EEF0]'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded overflow-hidden shrink-0 ring-1 ${
                    isSelected ? 'ring-[#F4EDE2]' : 'ring-[#EADFD8]'
                  }`}
                >
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
                      isSelected ? 'text-[#F4EDE2]' : 'text-[#665E5B]'
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

