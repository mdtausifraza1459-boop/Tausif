import React from 'react';
import { motion } from 'motion/react';
import { useStore } from '../context/StoreContext.tsx';
import { ArrowRight, ArrowUpRight, ShieldCheck, RefreshCw, Truck, CreditCard } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.55,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  }),
};

export const HeroBanner: React.FC = () => {
  const { settings, selectCategory, products, setQuickViewProduct } = useStore();

  const headline = settings?.heroHeadline || 'Crafted for Quiet Indian Elegance.';
  const subtitle =
    settings?.heroSubtitle ||
    'Handcrafted Chanderi Anarkalis, breathable mulmul kurtis, and effortless co-ord sets.';
  const heroPrimaryImage =
    settings?.heroImage || '/src/assets/images/hero_ethnic_fashion_1794109163430.jpg';

  const openLookByCategory = (category: string) => {
    const match = products.find((p) => p.category.toLowerCase().includes(category.toLowerCase()));
    if (match) {
      setQuickViewProduct(match);
    } else {
      selectCategory(category);
      document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#FCF7EE] via-[#FAF4EC] to-[#FDF2F5] border-b border-[#E6DFD3]">
      {/* Subtle Radiant Silk Color Glows */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#D4AF6A]/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-0 w-[28rem] h-[28rem] rounded-full bg-[#BE185D]/10 blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        {/* Editorial Lookbook & Product Rail Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          {/* Left Narrative Column */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6 py-2">
            <div className="space-y-4 text-center lg:text-left">
              <motion.p
                custom={0}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="text-xs font-semibold tracking-[0.16em] uppercase text-[#9F1239]"
              >
                2026 Festive Edit
              </motion.p>

              <motion.h1
                custom={1}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="font-serif text-3xl sm:text-4xl lg:text-[2.9rem] font-semibold tracking-tight text-[#141413] leading-[1.12]"
              >
                {headline}
              </motion.h1>

              <motion.p
                custom={2}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="text-[#57534E] text-sm leading-relaxed max-w-md mx-auto lg:mx-0"
              >
                {subtitle}
              </motion.p>

              {/* Primary CTA + Secondary Festive Button */}
              <motion.div
                custom={3}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2"
              >
                <button
                  type="button"
                  onClick={() => {
                    selectCategory('All');
                    document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-[#164E3F] to-[#0F3A2E] hover:from-[#0F3A2E] hover:to-[#141413] text-white text-xs sm:text-sm font-semibold tracking-wide rounded-md shadow-md shadow-[#164E3F]/20 transition-all flex items-center gap-2 group cursor-pointer"
                >
                  <span>{settings?.heroButtonText || 'Shop Collection'}</span>
                  <ArrowRight className="w-4 h-4 text-[#F5D076] group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    selectCategory('Anarkali Kurtis');
                    document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-5 py-3 bg-[#FFF1F5] hover:bg-[#9F1239] text-[#881337] hover:text-white border border-[#FBCFE8] hover:border-[#9F1239] text-xs sm:text-sm font-semibold rounded-md transition-colors cursor-pointer"
                >
                  Anarkali Edit
                </button>
              </motion.div>
            </div>

            {/* Clean Architectural Metrics Row */}
            <div className="pt-5 grid grid-cols-3 gap-4 border-t border-[#E6DFD3] text-left">
              <div>
                <p className="text-xl font-semibold text-[#9F1239] font-mono tabular-nums">15</p>
                <p className="text-xs text-[#57534E]">Categories</p>
              </div>
              <div>
                <p className="text-xl font-semibold text-[#164E3F] font-mono tabular-nums">48 Hr</p>
                <p className="text-xs text-[#57534E]">Dispatch</p>
              </div>
              <div>
                <p className="text-xl font-semibold text-[#B45309] font-mono tabular-nums">7 Days</p>
                <p className="text-xs text-[#57534E]">Easy Exchange</p>
              </div>
            </div>
          </div>

          {/* Right Lookbook Rail: Asymmetric Editorial Grid */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-12 gap-3.5 min-h-[400px]">
            {/* Look 01: Tall Feature Card */}
            <motion.button
              type="button"
              onClick={() => openLookByCategory('Anarkali Kurtis')}
              custom={2}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="sm:col-span-7 relative rounded-lg overflow-hidden bg-[#EFECE6] border border-[#D4AF6A]/45 shadow-md group text-left min-h-[300px] sm:min-h-[410px] cursor-pointer"
            >
              <img
                src={heroPrimaryImage}
                alt="Gulmohar Chanderi Silk Anarkali"
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#3B0A1E]/85 via-black/15 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-white flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-mono tracking-wider text-[#F5D076]">
                    Festive Edit
                  </p>
                  <p className="font-serif text-xl font-semibold text-white leading-snug">
                    Gulmohar Anarkali
                  </p>
                </div>
                <span className="p-2 rounded-full bg-[#D4AF6A]/25 backdrop-blur-sm border border-[#F5D076]/50 text-[#F5D076] group-hover:bg-[#F5D076] group-hover:text-[#141413] transition-colors shrink-0">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </div>
            </motion.button>

            {/* Right Stack: Two Complementary Lookbook Cards */}
            <div className="sm:col-span-5 flex flex-col gap-3.5">
              <motion.button
                type="button"
                onClick={() => openLookByCategory('Printed Kurtis')}
                custom={3}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="relative flex-1 min-h-[190px] rounded-lg overflow-hidden bg-[#EFECE6] border border-[#FBCFE8] shadow-sm group text-left cursor-pointer"
              >
                <img
                  src="/src/assets/images/lookbook_ivory_cotton_kurti_1794459730588.jpg"
                  alt="Ivory Handloom Chikankari Mulmul Kurti"
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#4C1D4F]/85 via-black/15 to-transparent" />
                <div className="absolute bottom-3.5 left-3.5 right-3.5 text-white flex items-end justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-mono text-[#FBCFE8]">Pure Mulmul</p>
                    <p className="font-serif text-lg font-semibold text-white">Ivory Chikankari</p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-[#FBCFE8] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
                </div>
              </motion.button>

              <motion.button
                type="button"
                onClick={() => openLookByCategory('Kurti Sets')}
                custom={4}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="relative flex-1 min-h-[190px] rounded-lg overflow-hidden bg-[#EFECE6] border border-[#A7F3D0] shadow-sm group text-left cursor-pointer"
              >
                <img
                  src="/src/assets/images/lookbook_emerald_silk_kurti_1794459731453.jpg"
                  alt="Royal Emerald Chanderi Silk Straight Kurti Set"
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B3B2E]/85 via-black/15 to-transparent" />
                <div className="absolute bottom-3.5 left-3.5 right-3.5 text-white flex items-end justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-mono text-[#6EE7B7]">Chanderi Silk</p>
                    <p className="font-serif text-lg font-semibold text-white">Emerald Zari Set</p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-[#6EE7B7] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
                </div>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Clean Single-Line Guarantee Strip Below Split */}
        <div className="mt-8 pt-5 border-t border-[#E6DFD3] grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full bg-[#ECFDF5] text-[#164E3F] flex items-center justify-center shrink-0">
              <Truck className="w-3.5 h-3.5" />
            </span>
            <span className="font-medium text-[#141413]">Free Delivery Over ₹1,499</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full bg-[#FFF1F5] text-[#9F1239] flex items-center justify-center shrink-0">
              <RefreshCw className="w-3.5 h-3.5" />
            </span>
            <span className="font-medium text-[#141413]">7-Day Easy Exchange</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full bg-[#FEF3C7] text-[#B45309] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
            </span>
            <span className="font-medium text-[#141413]">Pure Silk &amp; Mulmul</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full bg-[#F0FDFA] text-[#0F766E] flex items-center justify-center shrink-0">
              <CreditCard className="w-3.5 h-3.5" />
            </span>
            <span className="font-medium text-[#141413]">UPI, Card &amp; COD</span>
          </div>
        </div>
      </div>
    </section>
  );
};
