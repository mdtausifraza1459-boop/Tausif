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
    <section className="py-10 px-4 sm:px-6 bg-[#FCF8F2] border-t border-[#E7DEC9]">
      <div className="max-w-4xl mx-auto bg-gradient-to-br from-[#0F3A2E] via-[#164E3F] to-[#581134] text-white rounded-2xl p-8 sm:p-10 text-center space-y-3.5 shadow-lg border border-[#D4AF6A]/45">
        <p className="text-xs uppercase font-semibold tracking-[0.2em] text-[#F5D076]">
          Private Club
        </p>

        <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-white">
          Get 10% Off Your First Order
        </h2>

        <p className="text-xs sm:text-sm text-white/85 max-w-md mx-auto">
          Early access to festive edits. Use code{' '}
          <strong className="text-[#F5D076] font-mono">WELCOME10</strong> at checkout.
        </p>

        {subscribed ? (
          <div className="max-w-md mx-auto p-3 bg-white/10 border border-[#F5D076]/50 rounded-md text-[#F5D076] text-xs flex items-center justify-center gap-2 font-semibold">
            <Check className="w-4 h-4 shrink-0" />
            <span>
              Subscribed — apply <strong className="font-mono text-white">WELCOME10</strong> at checkout.
            </span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="max-w-md mx-auto flex flex-col sm:flex-row gap-2.5 pt-1">
            <div className="relative flex-1">
              <Mail className="w-4 h-4 text-[#63615C] absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full text-xs pl-10 pr-4 py-2.5 bg-white border border-[#D4AF6A]/40 rounded-md focus:outline-none focus:border-[#F5D076] text-[#141413] placeholder:text-[#63615C] transition-colors"
              />
            </div>
            <button
              type="submit"
              className="py-2.5 px-6 bg-[#F5D076] hover:bg-[#D4AF6A] text-[#141413] text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer whitespace-nowrap shadow-xs"
            >
              Subscribe
            </button>
          </form>
        )}
      </div>
    </section>
  );
};
