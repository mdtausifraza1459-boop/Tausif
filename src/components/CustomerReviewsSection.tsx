import React from 'react';
import { Star, Quote, CheckCircle2 } from 'lucide-react';

export const CustomerReviewsSection: React.FC = () => {
  const testimonials = [
    {
      name: 'Ananya Singhania',
      city: 'Mumbai',
      kurti: 'Gulmohar Anarkali Set',
      rating: 5,
      comment:
        'Subtle rose-gold embroidery and an effortless drape. Truly boutique quality.',
    },
    {
      name: 'Dr. Radhika Sen',
      city: 'Kolkata',
      kurti: 'Parijat Silk Kurti',
      rating: 5,
      comment:
        'Pure raw silk with breathable mulmul lining and immaculate tailoring.',
    },
    {
      name: 'Tanvi Mehra',
      city: 'Bengaluru',
      kurti: 'Lilac Co-ord Set',
      rating: 5,
      comment:
        'Works beautifully for both festive lunches and office days. Quick delivery.',
    },
  ];

  const topEdgeAccents = [
    'border-t-2 border-t-[#164E3F]',
    'border-t-2 border-t-[#9F1239]',
    'border-t-2 border-t-[#D4AF6A]',
  ];

  return (
    <section className="py-12 bg-gradient-to-b from-[#FAF6EE] to-[#F3ECE0] border-t border-[#E7DEC9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-8">
          <p className="text-xs uppercase font-semibold tracking-[0.18em] text-[#9F1239] mb-1.5">
            Client Notes
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#141413]">
            Loved Across India
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, idx) => (
            <article
              key={idx}
              className={`bg-white p-6 rounded-lg border border-[#E7DEC9] ${
                topEdgeAccents[idx % topEdgeAccents.length]
              } flex flex-col justify-between transition-all hover:shadow-md hover:shadow-[#8E6D3B]/10`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-0.5 text-[#D97706]">
                    {[...Array(5)].map((_, sIdx) => (
                      <Star
                        key={sIdx}
                        className={`w-3.5 h-3.5 ${sIdx < t.rating ? 'fill-current' : 'text-[#E2DFD7]'}`}
                      />
                    ))}
                  </div>
                  <Quote className="w-4 h-4 text-[#D4AF6A]/70" />
                </div>

                <p className="font-serif text-base text-[#141413] leading-relaxed">
                  &ldquo;{t.comment}&rdquo;
                </p>
              </div>

              <div className="pt-3.5 mt-4 border-t border-[#EFECE6] flex items-center justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-xs text-[#141413]">{t.name} · <span className="font-normal text-[#63615C]">{t.city}</span></h4>
                  <p className="text-[11px] text-[#9F1239] font-medium truncate">{t.kurti}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] text-[#164E3F] font-semibold shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified</span>
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
