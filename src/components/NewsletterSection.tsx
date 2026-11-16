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
    <section className="py-10 px-4 sm:px-6 bg-[#FAF8F4] border-t border-[#EADFD8]">
      <div className="max-w-4xl mx-auto bg-gradient-to-br from-[#191615] via-[#2C2122] to-[#57272E] text-white rounded-2xl p-8 sm:p-10 text-center space-y-3.5 shadow-md border border-[#EADFD8]/20">
        <p className="text-xs uppercase font-semibold tracking-[0.2em] text-[#E8C5C8]">
          Private Club
        </p>

        <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-white">
          Special Offer: 10% Off Your First Order
        </h2>

        <p className="text-xs sm:text-sm text-white/85 max-w-md mx-auto">
          Use code <strong className="text-[#E8C5C8] font-mono">WELCOME10</strong> at checkout.
        </p>

        {subscribed ? (
          <div className="max-w-md mx-auto p-3 bg-white/10 border border-[#E8C5C8]/40 rounded-md text-[#E8C5C8] text-xs flex items-center justify-center gap-2 font-semibold">
            <Check className="w-4 h-4 shrink-0" />
            <span>
              Subscribed — apply <strong className="font-mono text-white">WELCOME10</strong> at checkout.
            </span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="max-w-md mx-auto flex flex-col sm:flex-row gap-2.5 pt-1">
            <div className="relative flex-1">
              <Mail className="w-4 h-4 text-[#665E5B] absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full text-xs pl-10 pr-4 py-2.5 bg-white border border-[#EADFD8] rounded-md focus:outline-none focus:border-[#9E5660] text-[#191615] placeholder:text-[#665E5B] transition-colors"
              />
            </div>
            <button
              type="submit"
              className="py-2.5 px-6 bg-[#9E5660] hover:bg-[#84424C] text-white text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer whitespace-nowrap shadow-xs"
            >
              Join
            </button>
          </form>
        )}
      </div>
    </section>
  );
};

