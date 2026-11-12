import React from 'react';
import { Star, Quote, CheckCircle2 } from 'lucide-react';

export const CustomerReviewsSection: React.FC = () => {
  const testimonials = [
    {
      name: 'Ananya Singhania',
      city: 'South Mumbai',
      kurti: 'Gulmohar Rose-Gold Anarkali Set',
      rating: 5,
      comment:
        'The embroidery craftsmanship on this Anarkali is exceptional. The rose-gold threadwork has a subtle lustre rather than harsh foil shine, and the silhouette draped effortlessly.',
    },
    {
      name: 'Dr. Radhika Sen',
      city: 'Kolkata',
      kurti: 'Parijat Sage Mint Silk Kurti',
      rating: 5,
      comment:
        'Finding genuine raw silk with breathable mulmul lining is rare online. The neckline finishing is immaculate and the tailoring fits true to measurements.',
    },
    {
      name: 'Tanvi Mehra',
      city: 'Bengaluru',
      kurti: 'Lilac Whisper Pret Co-ord Set',
      rating: 5,
      comment:
        'The cutwork sleeves on this tunic set are versatile enough for festive lunches and office meetings alike. Fast express delivery right to my doorstep.',
    },
  ];

  return (
    <section className="py-12 bg-[#FAF8F5] border-t border-[#E5DFD7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <p className="text-xs uppercase font-bold tracking-[0.18em] text-[#6D1D3A] mb-1.5">
            Verified Customer Reviews
          </p>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1917]">
            Trusted by Women Across India
          </h2>
          <p className="text-xs sm:text-sm text-[#6B625D] mt-1.5">
            Authentic reviews from customers on silhouette drape, artisanal fabrics, and fit.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, idx) => (
            <article
              key={idx}
              className="bg-white p-6 rounded-lg border border-[#E5DFD7] flex flex-col justify-between"
            >
              <div className="space-y-3">
                <Quote className="w-6 h-6 text-[#E5DFD7]" />
                <div className="flex items-center gap-1.5">
                  <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#166534] text-white text-[11px] font-bold rounded tabular-nums">
                    <span>{t.rating}.0</span>
                    <Star className="w-2.5 h-2.5 fill-current" />
                  </div>
                  <span className="text-xs font-medium text-[#6B625D]">Certified Purchase</span>
                </div>
                <p className="text-xs sm:text-sm text-[#1C1917] leading-relaxed">&ldquo;{t.comment}&rdquo;</p>
              </div>

              <div className="pt-4 mt-4 border-t border-[#E5DFD7]">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-xs sm:text-sm text-[#1C1917]">{t.name}</h4>
                    <p className="text-[11px] text-[#6B625D]">{t.city}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#166534] font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verified Buyer</span>
                  </span>
                </div>
                <p className="text-[11px] text-[#6D1D3A] font-medium mt-1 truncate">
                  Purchased: {t.kurti}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
