import React from 'react';
import { motion } from 'motion/react';
import { useStore } from '../context/StoreContext.tsx';
import { ArrowRight, ArrowUpRight, ShieldCheck, RefreshCw, Truck, CreditCard } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.07,
      duration: 0.45,
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
    <section className="relative overflow-hidden bg-gradient-to-br from-[#FAF8F4] via-[#F4EDE2] to-[#FFFFFF] border-b border-[#EADFD8]">
      {/* Subtle Rose-Gold Ambient Glow */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#E8C5C8]/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-0 w-[26rem] h-[26rem] rounded-full bg-[#B58A4A]/10 blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          {/* Left Narrative Column */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6 py-2">
            <div className="space-y-4 text-center lg:text-left">
              <motion.p
                custom={0}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="text-xs font-semibold tracking-[0.18em] uppercase text-[#9E5660]"
              >
                New Season · 2026
              </motion.p>

              <motion.h1
                custom={1}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="font-serif text-3xl sm:text-4xl lg:text-[2.9rem] font-semibold tracking-tight text-[#191615] leading-[1.12]"
              >
                {headline}
              </motion.h1>

              <motion.p
                custom={2}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="text-[#665E5B] text-sm leading-relaxed max-w-md mx-auto lg:mx-0"
              >
                {subtitle}
              </motion.p>

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
                  className="px-6 py-3 bg-[#9E5660] hover:bg-[#84424C] text-white text-xs sm:text-sm font-semibold tracking-wide rounded-md shadow-sm transition-colors flex items-center gap-2 group cursor-pointer"
                >
                  <span>{settings?.heroButtonText || 'Shop Collection'}</span>
                  <ArrowRight className="w-4 h-4 text-[#F4EDE2] group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    selectCategory('Anarkali Kurtis');
                    document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-5 py-3 bg-white hover:bg-[#F9EEF0] text-[#191615] hover:text-[#9E5660] border border-[#EADFD8] hover:border-[#9E5660] text-xs sm:text-sm font-semibold rounded-md transition-colors cursor-pointer"
                >
                  Anarkali Edit
                </button>
              </motion.div>
            </div>

            {/* Clean Architectural Metrics Row */}
            <div className="pt-5 grid grid-cols-3 gap-4 border-t border-[#EADFD8] text-left">
              <div>
                <p className="text-xl font-semibold text-[#9E5660] font-mono tabular-nums">15</p>
                <p className="text-xs text-[#665E5B]">Silhouettes</p>
              </div>
              <div>
                <p className="text-xl font-semibold text-[#191615] font-mono tabular-nums">48 Hr</p>
                <p className="text-xs text-[#665E5B]">Dispatch</p>
              </div>
              <div>
                <p className="text-xl font-semibold text-[#B58A4A] font-mono tabular-nums">7 Days</p>
                <p className="text-xs text-[#665E5B]">Easy Exchange</p>
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
              className="sm:col-span-7 relative rounded-xl overflow-hidden bg-[#F4EDE2] border border-[#EADFD8] shadow-sm group text-left min-h-[300px] sm:min-h-[410px] cursor-pointer"
            >
              <img
                src={heroPrimaryImage}
                alt="Gulmohar Chanderi Silk Anarkali"
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#191615]/80 via-black/10 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-white flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-mono tracking-wider text-[#E8C5C8]">Festive Edit</p>
                  <p className="font-serif text-xl font-semibold text-white leading-snug">
                    Gulmohar Anarkali
                  </p>
                </div>
                <span className="p-2 rounded-full bg-white/15 backdrop-blur-sm border border-[#E8C5C8]/40 text-white group-hover:bg-[#9E5660] group-hover:border-[#9E5660] transition-colors shrink-0">
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
                className="relative flex-1 min-h-[190px] rounded-xl overflow-hidden bg-[#F4EDE2] border border-[#EADFD8] shadow-sm group text-left cursor-pointer"
              >
                <img
                  src="/src/assets/images/lookbook_ivory_cotton_kurti_1794459730588.jpg"
                  alt="Ivory Handloom Chikankari Mulmul Kurti"
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#191615]/75 via-black/10 to-transparent" />
                <div className="absolute bottom-3.5 left-3.5 right-3.5 text-white flex items-end justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-mono text-[#E8C5C8]">Pure Mulmul</p>
                    <p className="font-serif text-lg font-semibold text-white">Ivory Chikankari</p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-[#E8C5C8] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
                </div>
              </motion.button>

              <motion.button
                type="button"
                onClick={() => openLookByCategory('Kurti Sets')}
                custom={4}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="relative flex-1 min-h-[190px] rounded-xl overflow-hidden bg-[#F4EDE2] border border-[#EADFD8] shadow-sm group text-left cursor-pointer"
              >
                <img
                  src="/src/assets/images/lookbook_emerald_silk_kurti_1794459731453.jpg"
                  alt="Chanderi Silk Straight Kurti Set"
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#191615]/75 via-black/10 to-transparent" />
                <div className="absolute bottom-3.5 left-3.5 right-3.5 text-white flex items-end justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-mono text-[#E8C5C8]">Chanderi Silk</p>
                    <p className="font-serif text-lg font-semibold text-white">Festive Silk Sets</p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-[#E8C5C8] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
                </div>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Clean Single-Line Guarantee Strip Below Split */}
        <div className="mt-8 pt-5 border-t border-[#EADFD8] grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full bg-white border border-[#EADFD8] text-[#9E5660] flex items-center justify-center shrink-0">
              <Truck className="w-3.5 h-3.5" />
            </span>
            <span className="font-medium text-[#191615]">Free Delivery Over ₹1,499</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full bg-white border border-[#EADFD8] text-[#9E5660] flex items-center justify-center shrink-0">
              <RefreshCw className="w-3.5 h-3.5" />
            </span>
            <span className="font-medium text-[#191615]">7-Day Easy Exchange</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full bg-white border border-[#EADFD8] text-[#B58A4A] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
            </span>
            <span className="font-medium text-[#191615]">Pure Silk &amp; Mulmul</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full bg-white border border-[#EADFD8] text-[#191615] flex items-center justify-center shrink-0">
              <CreditCard className="w-3.5 h-3.5" />
            </span>
            <span className="font-medium text-[#191615]">UPI, Card &amp; COD</span>
          </div>
        </div>
      </div>
    </section>
  );
};

