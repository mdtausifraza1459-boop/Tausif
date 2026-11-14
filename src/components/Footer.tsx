import React from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';
import { Shield, Heart, Truck, RefreshCw, Mail, Phone, Award, CreditCard, Building2, Sparkles, Gift, Smartphone } from 'lucide-react';

export const Footer: React.FC = () => {
  const {
    selectCategory,
    setActiveView,
    setTrackingModalOpen,
    setSizeGuideModalOpen,
    setWholesaleModalOpen,
    setInfoPageModal,
    setLookbookModalOpen,
    setGiftCardModalOpen,
    settings,
  } = useStore();
  const { canPromptInstall, isInstalled, promptInstall } = usePWAInstall();

  return (
    <footer id="contact" className="bg-[#141413] text-[#A8A59E] border-t border-[#262522]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Summary */}
          <div className="lg:col-span-2 space-y-4 lg:pr-6 lg:border-r lg:border-[#262522]">
            <div>
              <span className="font-serif text-2xl sm:text-3xl font-semibold tracking-[0.06em] text-white uppercase">
                {settings?.brandName || 'ZOHRA LUXE'}
              </span>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#D4AF6A] mt-1">
                {settings?.tagline || "Girls' & Women's Ethnic Couture"}
              </p>
            </div>
            <p className="text-xs text-[#A8A59E] leading-relaxed max-w-sm">
              Your trusted online boutique exclusively for women&apos;s kurtis, short kurtis, embroidered anarkalis, co-ord sets, and festive ethnic wear across India.
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#E2DFD7] pt-1">
              <span className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-[#D4AF6A]" />
                <span>Pan-India Express Delivery</span>
              </span>
              <span className="flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-[#D4AF6A]" />
                <span>{settings?.returnPolicyDays || 7}-Day Easy Exchanges</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-[#D4AF6A]" />
                <span>Authentic Craftsmanship</span>
              </span>
            </div>
          </div>

          {/* Silhouettes */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-semibold tracking-wider text-white">Kurti Silhouettes</h4>
            <ul className="space-y-2 text-xs">
              {[
                "Women's Kurtis",
                'Short Kurtis',
                'Long Kurtis',
                'Anarkali Kurtis',
                'Straight Cut Kurtis',
                'A-Line Kurtis',
                'Printed Kurtis',
                'Cotton Kurtis',
              ].map((c) => (
                <li key={c}>
                  <button
                    type="button"
                    onClick={() => {
                      selectCategory(c);
                      document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="hover:text-white transition-colors cursor-pointer text-left"
                  >
                    {c}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Boutique Information & Policies */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-semibold tracking-wider text-white">Boutique &amp; Policies</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button type="button" onClick={() => setInfoPageModal('about')} className="hover:text-white transition-colors cursor-pointer">
                  About Zohra Luxe
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setInfoPageModal('shipping')} className="hover:text-white transition-colors cursor-pointer">
                  Shipping Policy
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setInfoPageModal('returns')} className="hover:text-white transition-colors cursor-pointer">
                  Return &amp; Refund Policy
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setInfoPageModal('faq')} className="hover:text-white transition-colors cursor-pointer">
                  Help &amp; FAQs
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setInfoPageModal('privacy')} className="hover:text-white transition-colors cursor-pointer">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setInfoPageModal('terms')} className="hover:text-white transition-colors cursor-pointer">
                  Terms &amp; Conditions
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setInfoPageModal('contact')} className="hover:text-white transition-colors cursor-pointer">
                  Contact Support Desk
                </button>
              </li>
            </ul>
          </div>

          {/* Customer Care, Wholesale & Admin */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-semibold tracking-wider text-white">Customer Care</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button type="button" onClick={() => setTrackingModalOpen(true)} className="hover:text-white transition-colors cursor-pointer">
                  Track Your Order
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setSizeGuideModalOpen(true)} className="hover:text-white transition-colors cursor-pointer">
                  Women&apos;s Size Guide
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setLookbookModalOpen(true)}
                  className="text-[#D4AF6A] hover:text-white transition-colors flex items-center gap-1.5 font-medium cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Lookbook &amp; Outfit Builder</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setGiftCardModalOpen(true)}
                  className="hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Gift className="w-3.5 h-3.5 text-[#D4AF6A]" />
                  <span>Digital Gift Cards</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setWholesaleModalOpen(true)}
                  className="text-[#D4AF6A] hover:text-white transition-colors flex items-center gap-1.5 font-medium cursor-pointer"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Wholesale B2B Portal</span>
                </button>
              </li>
              {canPromptInstall && !isInstalled && (
                <li>
                  <button
                    type="button"
                    onClick={() => promptInstall()}
                    className="text-[#E2DFD7] hover:text-white transition-colors flex items-center gap-1.5 font-medium cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-[#D4AF6A]" />
                    <span>Install Store App</span>
                  </button>
                </li>
              )}
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('admin');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-white/80 hover:text-white transition-colors flex items-center gap-1.5 font-medium pt-1 cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5 text-[#D4AF6A]" />
                  <span>Store Owner &amp; Partner Admin</span>
                </button>
              </li>
            </ul>

            <div className="pt-2 space-y-2 text-xs">
              <div className="p-3 bg-[#1E1D1B] rounded-md border border-[#2F2D29] text-white space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#D4AF6A]">
                  Wholesale &amp; Bulk Pricing
                </p>
                <p className="text-[11px] text-[#E2DFD7]">
                  For retail stores &amp; wholesale rates, call or WhatsApp:
                </p>
                <a
                  href="tel:9310078735"
                  className="text-xs font-semibold text-[#D4AF6A] hover:underline flex items-center gap-1.5 font-mono"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>+91 9310078735</span>
                </a>
              </div>

              <p className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#E2DFD7]" />
                <span>{settings?.supportEmail || 'care@zohraluxe.com'}</span>
              </p>
              <p className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#E2DFD7]" />
                <span className="font-mono">{settings?.supportPhone || '+91 9310078735'}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Legal Bar */}
      <div className="border-t border-[#262522] py-5 bg-[#0E0E0D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#A8A59E]">
          <p>© 2026 {settings?.brandName || 'Zohra Luxe'} Fashion. Exclusively Girls&apos; &amp; Women&apos;s Clothing.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-[#D4AF6A]" /> 100% Authentic
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <CreditCard className="w-3 h-3 text-[#D4AF6A]" /> Encrypted Checkout
            </span>
            <span>·</span>
            <span>
              Crafted with <Heart className="w-3 h-3 inline text-[#164E3F] fill-current" /> in India
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
