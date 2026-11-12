import React from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { Shield, Heart, Truck, RefreshCw, Mail, Phone, Award, CreditCard } from 'lucide-react';

export const Footer: React.FC = () => {
  const { selectCategory, setActiveView, setTrackingModalOpen, setSizeGuideModalOpen, settings } = useStore();

  return (
    <footer id="contact" className="bg-[#1C1917] text-[#A8A29E] border-t border-[#292524]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Summary */}
          <div className="lg:col-span-2 space-y-4 lg:pr-6 lg:border-r lg:border-[#292524]">
            <div>
              <span className="font-serif text-2xl font-bold tracking-tight text-white uppercase">
                {settings?.brandName || 'ZOHRA LUXE'}
              </span>
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#D6D3D1] mt-1">
                Girls' & Women's Ethnic Couture
              </p>
            </div>
            <p className="text-xs text-[#A8A29E] leading-relaxed max-w-sm">
              Your trusted online boutique exclusively for women's kurtis, short kurtis, embroidered anarkalis, co-ord sets, and festive ethnic wear across India.
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#D6D3D1] pt-1">
              <span className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-[#FDE68A]" />
                <span>Pan-India Express Delivery</span>
              </span>
              <span className="flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-[#FDE68A]" />
                <span>7-Day Easy Exchanges</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-[#FDE68A]" />
                <span>Authentic Craftsmanship</span>
              </span>
            </div>
          </div>

          {/* Silhouettes */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-bold tracking-wider text-white">Kurti Silhouettes</h4>
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

          {/* Festive & Sets */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-bold tracking-wider text-white">Festive & Sets</h4>
            <ul className="space-y-2 text-xs">
              {[
                'Party Wear Kurtis',
                'Festive Wear',
                'Ethnic Wear',
                'Co-ord Sets',
                "Women's Tunics",
                'Kurti Sets',
                'Dupattas',
              ].map((c) => (
                <li key={c}>
                  <button
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

          {/* Customer Care, Wholesale & Admin */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-bold tracking-wider text-white">Customer Care</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => setTrackingModalOpen(true)} className="hover:text-white transition-colors cursor-pointer">
                  Track Your Order
                </button>
              </li>
              <li>
                <button onClick={() => setSizeGuideModalOpen(true)} className="hover:text-white transition-colors cursor-pointer">
                  Women's Size Guide
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setActiveView('admin');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-[#FDE68A] hover:text-white transition-colors flex items-center gap-1.5 font-semibold pt-1 cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Store Owner & Partner Admin</span>
                </button>
              </li>
            </ul>

            <div className="pt-2 space-y-2 text-xs">
              <div className="p-3 bg-[#292524] rounded-md border border-[#3F3A36] text-white space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#FDE68A]">
                  Wholesale & Bulk Pricing
                </p>
                <p className="text-[11px] text-[#D6D3D1]">
                  For retail stores & wholesale rates, call or WhatsApp:
                </p>
                <a
                  href="tel:9310078735"
                  className="text-xs font-bold text-[#FDE68A] hover:underline flex items-center gap-1.5 font-mono"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>+91 9310078735</span>
                </a>
              </div>

              <p className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#D6D3D1]" />
                <span>{settings?.supportEmail || 'care@zohraluxe.com'}</span>
              </p>
              <p className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#D6D3D1]" />
                <span className="font-mono">{settings?.supportPhone || '+91 9310078735'}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Legal Bar */}
      <div className="border-t border-[#292524] py-5 bg-[#141210]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#A8A29E]">
          <p>© 2026 {settings?.brandName || 'Zohra Luxe'} Fashion. Exclusively Girls' & Women's Clothing.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-[#FDE68A]" /> 100% Authentic
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <CreditCard className="w-3 h-3 text-[#FDE68A]" /> Encrypted Checkout
            </span>
            <span>·</span>
            <span>
              Crafted with <Heart className="w-3 h-3 inline text-[#B4436C] fill-current" /> in India
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
