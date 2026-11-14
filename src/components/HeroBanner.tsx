import React from 'react';
import { motion } from 'motion/react';
import { useStore } from '../context/StoreContext.tsx';
import { ArrowRight, ArrowUpRight, ShieldCheck, RefreshCw, Truck, CreditCard, Phone } from 'lucide-react';

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

  const headline = settings?.heroHeadline || 'Silhouettes tailored for quiet Indian elegance.';
  const subtitle =
    settings?.heroSubtitle ||
    'Handcrafted Chanderi Anarkalis, breathable chikankari mulmul kurtis, and effortless co-ord sets cut exclusively for girls and women.';
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
    <section className="relative overflow-hidden bg-[#F7F6F2] border-b border-[#E2DFD7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-14">
        {/* 21st.dev Editorial Lookbook & Product Rail Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          {/* Left Narrative Column */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6 py-2">
            <div className="space-y-5 text-center lg:text-left">
              <motion.p
                custom={0}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="text-xs font-medium tracking-[0.16em] uppercase text-[#164E3F]"
              >
                Atelier Edit · 2026 Womenswear Capsule
              </motion.p>

              <motion.h1
                custom={1}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="font-serif text-4xl sm:text-5xl lg:text-[3.4rem] font-semibold tracking-tight text-[#141413] leading-[1.06]"
              >
                {headline}
              </motion.h1>

              <motion.p
                custom={2}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="text-[#63615C] text-sm sm:text-[15px] leading-relaxed max-w-md mx-auto lg:mx-0"
              >
                {subtitle}
              </motion.p>

              {/* Single Dominant Primary CTA + Secondary Outline */}
              <motion.div
                custom={3}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-1"
              >
                <button
                  type="button"
                  onClick={() => {
                    selectCategory('All');
                    document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-6 py-3 bg-[#141413] hover:bg-[#164E3F] text-white text-xs sm:text-sm font-medium tracking-wide rounded-md transition-colors flex items-center gap-2 group cursor-pointer"
                >
                  <span>{settings?.heroButtonText || 'Shop All Styles'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    selectCategory('Anarkali Kurtis');
                    document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-5 py-3 bg-white hover:bg-[#EFECE6] text-[#141413] border border-[#E2DFD7] hover:border-[#141413] text-xs sm:text-sm font-medium rounded-md transition-colors cursor-pointer"
                >
                  Festive Anarkalis
                </button>
              </motion.div>

              <motion.div
                custom={4}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="flex items-center justify-center lg:justify-start gap-2 text-xs text-[#63615C] pt-1"
              >
                <Phone className="w-3.5 h-3.5 text-[#164E3F]" />
                <span>Wholesale &amp; Boutique Inquiries:</span>
                <a href="tel:9310078735" className="font-mono font-semibold text-[#141413] hover:text-[#164E3F] hover:underline">
                  +91 9310078735
                </a>
              </motion.div>
            </div>

            {/* Clean Architectural Metrics Row */}
            <div className="pt-5 grid grid-cols-3 gap-4 border-t border-[#E2DFD7] text-left">
              <div>
                <p className="text-xl font-semibold text-[#141413] font-mono tabular-nums">15</p>
                <p className="text-[11px] text-[#63615C]">Ethnic Categories</p>
              </div>
              <div>
                <p className="text-xl font-semibold text-[#164E3F] font-mono tabular-nums">48 Hr</p>
                <p className="text-[11px] text-[#63615C]">Express Dispatch</p>
              </div>
              <div>
                <p className="text-xl font-semibold text-[#141413] font-mono tabular-nums">7 Days</p>
                <p className="text-[11px] text-[#63615C]">Easy Exchange</p>
              </div>
            </div>
          </div>

          {/* Right Lookbook Rail: 21st.dev Asymmetric Editorial Grid */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-12 gap-3.5 min-h-[420px]">
            {/* Look 01: Tall Feature Card */}
            <motion.button
              type="button"
              onClick={() => openLookByCategory('Anarkali Kurtis')}
              custom={2}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="sm:col-span-7 relative rounded-lg overflow-hidden bg-[#EFECE6] border border-[#E2DFD7] group text-left min-h-[320px] sm:min-h-[430px] cursor-pointer"
            >
              <img
                src={heroPrimaryImage}
                alt="Gulmohar Chanderi Silk Anarkali"
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-white flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-mono tracking-wider text-white/80">
                    Look 01 · Wedding &amp; Festive
                  </p>
                  <p className="font-serif text-xl sm:text-2xl font-medium text-white leading-snug">
                    Gulmohar Zardozi Anarkali
                  </p>
                </div>
                <span className="p-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 text-white group-hover:bg-white group-hover:text-[#141413] transition-colors shrink-0">
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
                className="relative flex-1 min-h-[200px] rounded-lg overflow-hidden bg-[#EFECE6] border border-[#E2DFD7] group text-left cursor-pointer"
              >
                <img
                  src="/src/assets/images/lookbook_ivory_cotton_kurti_1794459730588.jpg"
                  alt="Ivory Handloom Chikankari Mulmul Kurti"
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                <div className="absolute bottom-3.5 left-3.5 right-3.5 text-white flex items-end justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-mono text-white/80">Look 02 · Pure Mulmul</p>
                    <p className="font-serif text-lg font-medium text-white">Ivory Chikankari Edit</p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-white/90 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
                </div>
              </motion.button>

              <motion.button
                type="button"
                onClick={() => openLookByCategory('Kurti Sets')}
                custom={4}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="relative flex-1 min-h-[200px] rounded-lg overflow-hidden bg-[#EFECE6] border border-[#E2DFD7] group text-left cursor-pointer"
              >
                <img
                  src="/src/assets/images/lookbook_emerald_silk_kurti_1794459731453.jpg"
                  alt="Royal Emerald Chanderi Silk Straight Kurti Set"
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                <div className="absolute bottom-3.5 left-3.5 right-3.5 text-white flex items-end justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-mono text-white/80">Look 03 · Chanderi Silk</p>
                    <p className="font-serif text-lg font-medium text-white">Emerald Zari Set</p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-white/90 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
                </div>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Full-Width Guarantee Strip Below Split */}
        <div className="mt-8 pt-6 border-t border-[#E2DFD7] grid grid-cols-2 lg:grid-cols-4 gap-5 text-xs">
          <div className="flex items-center gap-3">
            <Truck className="w-4 h-4 text-[#164E3F] shrink-0" />
            <div>
              <p className="font-semibold text-[#141413]">Free Express Shipping</p>
              <p className="text-[11px] text-[#63615C]">Complimentary over ₹1,499</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <RefreshCw className="w-4 h-4 text-[#164E3F] shrink-0" />
            <div>
              <p className="font-semibold text-[#141413]">7-Day Doorstep Exchange</p>
              <p className="text-[11px] text-[#63615C]">Hassle-free size swaps</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-[#164E3F] shrink-0" />
            <div>
              <p className="font-semibold text-[#141413]">Certified Natural Weaves</p>
              <p className="text-[11px] text-[#63615C]">Chanderi silk, mulmul &amp; cotton</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CreditCard className="w-4 h-4 text-[#8E6D3B] shrink-0" />
            <div>
              <p className="font-semibold text-[#141413]">UPI, Card &amp; Cash on Delivery</p>
              <p className="text-[11px] text-[#63615C]">Encrypted Indian checkout</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
