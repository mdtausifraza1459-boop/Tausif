import React from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { MessageCircle } from 'lucide-react';

export const WhatsAppButton: React.FC = () => {
  const { settings } = useStore();
  const phone = settings?.whatsappNumber || '+919310078735';
  const cleanPhone = phone.replace(/[^0-9]/g, '');

  const message = encodeURIComponent(
    'Hello Zohra Luxe, I would like to inquire about wholesale pricing and bulk orders for your women\'s kurtis.'
  );
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${message}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Wholesale & Order Support on WhatsApp: +91 9310078735"
      className="fixed bottom-20 md:bottom-6 right-5 z-40 bg-[#164E3F] hover:bg-[#0F3A2E] text-white p-3.5 rounded-full shadow-xl hover:scale-105 transition-all flex items-center gap-2 group cursor-pointer border border-white/15"
    >
      <MessageCircle className="w-5 h-5 fill-current" />
      <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 text-xs font-semibold tracking-wide">
        Wholesale: +91 9310078735
      </span>
    </a>
  );
};
