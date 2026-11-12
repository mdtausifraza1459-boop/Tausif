import React from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { ArrowRight, ShieldCheck, RefreshCw, Truck, CreditCard, Phone } from 'lucide-react';

export const HeroBanner: React.FC = () => {
  const { settings, selectCategory } = useStore();

  const headline = settings?.heroHeadline || 'Discover Your Style, Celebrate Your Elegance';
  const subtitle =
    settings?.heroSubtitle ||
    "Handcrafted Kurtis, Short Kurtis, Anarkali Suits, and Festive Pret tailored exclusively for girls and women.";
  const heroImage = settings?.heroImage || '/src/assets/images/hero_ethnic_fashion_1794109163430.jpg';

  return (
    <section className="relative overflow-hidden bg-white border-b border-[#E5DFD7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Editorial Copy & CTAs */}
          <div className="lg:col-span-7 space-y-5 text-center lg:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6D1D3A]">
              2026 Festive & Pret Collection · Ready to Ship
            </p>

            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#1C1917] leading-[1.12]">
              {headline}
            </h1>

            <p className="text-[#6B625D] text-sm sm:text-base leading-relaxed max-w-xl mx-auto lg:mx-0">
              {subtitle}
            </p>

            {/* Direct Online Ordering CTAs */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-1">
              <button
                onClick={() => {
                  selectCategory('All');
                  document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-6 sm:px-7 py-3 bg-[#6D1D3A] hover:bg-[#53142B] text-white text-xs sm:text-sm font-semibold tracking-wide rounded-md shadow-sm transition-all flex items-center gap-2 group cursor-pointer"
              >
                <span>{settings?.heroButtonText || 'Shop Collection'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => {
                  selectCategory('Anarkali Kurtis');
                  document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-6 py-3 bg-white hover:bg-[#FAF8F5] text-[#1C1917] border border-[#E5DFD7] hover:border-[#6D1D3A] text-xs sm:text-sm font-semibold rounded-md transition-colors cursor-pointer"
              >
                Explore Anarkalis
              </button>

              <a
                href="tel:9310078735"
                className="px-4 py-3 text-xs font-semibold text-[#6D1D3A] hover:underline flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Wholesale Orders: +91 9310078735</span>
              </a>
            </div>

            {/* Clean Online Store Metrics */}
            <div className="pt-5 grid grid-cols-3 gap-4 border-t border-[#E5DFD7] text-left">
              <div>
                <p className="text-lg sm:text-xl font-bold text-[#6D1D3A] font-mono tabular-nums">15</p>
                <p className="text-[11px] text-[#6B625D] font-medium">Curated Categories</p>
              </div>
              <div>
                <p className="text-lg sm:text-xl font-bold text-[#166534] font-mono tabular-nums">48 Hr</p>
                <p className="text-[11px] text-[#6B625D] font-medium">Express Dispatch</p>
              </div>
              <div>
                <p className="text-lg sm:text-xl font-bold text-[#1C1917] font-mono tabular-nums">7 Days</p>
                <p className="text-[11px] text-[#6B625D] font-medium">Easy Exchange</p>
              </div>
            </div>
          </div>

          {/* Showcase Editorial Photography */}
          <div className="lg:col-span-5">
            <div className="relative rounded-lg overflow-hidden bg-[#F3EFEA] aspect-[4/3] border border-[#E5DFD7] shadow-md">
              <img
                src={heroImage}
                alt="Women's Ethnic Fashion Showcase"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center transition-transform duration-700 hover:scale-103"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-white flex justify-between items-end gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-white/80 font-medium">
                    Featured Craftsmanship
                  </p>
                  <p className="font-serif text-base sm:text-lg font-semibold text-white">
                    Gulmohar Zardozi Anarkali
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-white shrink-0">
                  Pure Chanderi Silk
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Clean Online Shopping Guarantees Strip */}
        <div className="mt-8 pt-5 border-t border-[#E5DFD7] grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="flex items-center gap-3">
            <Truck className="w-4 h-4 text-[#6D1D3A] shrink-0" />
            <div>
              <p className="font-semibold text-[#1C1917]">Free Delivery</p>
              <p className="text-[11px] text-[#6B625D]">On orders over ₹1,499</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <RefreshCw className="w-4 h-4 text-[#166534] shrink-0" />
            <div>
              <p className="font-semibold text-[#1C1917]">7-Day Doorstep Return</p>
              <p className="text-[11px] text-[#6B625D]">Instant size exchanges</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-[#6D1D3A] shrink-0" />
            <div>
              <p className="font-semibold text-[#1C1917]">Verified Fabrics</p>
              <p className="text-[11px] text-[#6B625D]">Authentic silk, mulmul & cotton</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CreditCard className="w-4 h-4 text-[#B45309] shrink-0" />
            <div>
              <p className="font-semibold text-[#1C1917]">UPI, Card & Cash on Delivery</p>
              <p className="text-[11px] text-[#6B625D]">100% secure online checkout</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
