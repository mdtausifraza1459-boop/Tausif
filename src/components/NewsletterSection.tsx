import React, { useState } from 'react';
import { Mail, Check } from 'lucide-react';

export const NewsletterSection: React.FC = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
  };

  return (
    <section className="py-12 bg-white border-t border-[#E5DFD7]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center space-y-3.5">
        <p className="text-xs uppercase font-bold tracking-[0.18em] text-[#6D1D3A]">
          Zohra Luxe Private Invitation
        </p>

        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1917]">
          Receive 10% Off Your First Ethnic Order
        </h2>

        <p className="text-xs sm:text-sm text-[#6B625D] max-w-lg mx-auto leading-relaxed">
          Join for early previews of festive capsules, seasonal kurti launches, and apply coupon code{' '}
          <strong className="text-[#6D1D3A] font-mono">WELCOME10</strong> at checkout.
        </p>

        {subscribed ? (
          <div className="max-w-md mx-auto p-3.5 bg-[#ECFDF5] border border-[#A7F3D0] rounded-md text-[#166534] text-xs flex items-center justify-center gap-2 font-semibold">
            <Check className="w-4 h-4 shrink-0" />
            <span>
              Subscribed. Use code <strong className="font-mono">WELCOME10</strong> at checkout for 10% off.
            </span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="max-w-md mx-auto flex flex-col sm:flex-row gap-2 pt-2">
            <div className="relative flex-1">
              <Mail className="w-4 h-4 text-[#6B625D] absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full text-xs pl-10 pr-4 py-2.5 bg-[#FAF8F5] border border-[#E5DFD7] rounded-md focus:outline-none focus:border-[#6D1D3A] text-[#1C1917] focus:bg-white"
              />
            </div>
            <button
              type="submit"
              className="py-2.5 px-6 bg-[#6D1D3A] hover:bg-[#53142B] text-white text-xs font-semibold uppercase tracking-wider rounded-md transition-colors cursor-pointer whitespace-nowrap"
            >
              Subscribe
            </button>
          </form>
        )}

        <p className="text-[11px] text-[#6B625D]">
          Zero spam. Unsubscribe with one click anytime.
        </p>
      </div>
    </section>
  );
};
