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
    <section className="py-14 bg-[#F7F6F2] border-t border-[#E2DFD7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-xs uppercase font-medium tracking-[0.18em] text-[#164E3F] mb-2">
            Verified Customer Notes
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#141413]">
            Worn Across Celebrations in India
          </h2>
          <p className="text-xs sm:text-sm text-[#63615C] mt-2">
            Authentic reflections from customers on silhouette drape, breathable natural weaves, and tailored fit.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, idx) => (
            <article
              key={idx}
              className="bg-white p-6 rounded-lg border border-[#E2DFD7] flex flex-col justify-between transition-colors hover:border-[#141413]"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-0.5 text-[#8E6D3B]">
                    {[...Array(5)].map((_, sIdx) => (
                      <Star
                        key={sIdx}
                        className={`w-3.5 h-3.5 ${sIdx < t.rating ? 'fill-current' : 'text-[#E2DFD7]'}`}
                      />
                    ))}
                  </div>
                  <Quote className="w-5 h-5 text-[#E2DFD7]" />
                </div>

                <p className="font-serif text-[17px] text-[#141413] leading-relaxed">
                  &ldquo;{t.comment}&rdquo;
                </p>
              </div>

              <div className="pt-4 mt-5 border-t border-[#E2DFD7]">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-xs sm:text-sm text-[#141413]">{t.name}</h4>
                    <p className="text-[11px] text-[#63615C]">{t.city}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#164E3F] font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verified Buyer</span>
                  </span>
                </div>
                <p className="text-[11px] text-[#63615C] mt-1.5 truncate">
                  Style: <span className="text-[#141413] font-medium">{t.kurti}</span>
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
