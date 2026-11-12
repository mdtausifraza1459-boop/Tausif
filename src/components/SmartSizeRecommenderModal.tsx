import React, { useState } from 'react';
import { Ruler, X, Check, Info } from 'lucide-react';
import { Product } from '../types.ts';

interface SmartSizeRecommenderModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onSelectSize: (size: string) => void;
}

export const SmartSizeRecommenderModal: React.FC<SmartSizeRecommenderModalProps> = ({
  product,
  isOpen,
  onClose,
  onSelectSize,
}) => {
  const [heightCm, setHeightCm] = useState('162');
  const [weightKg, setWeightKg] = useState('58');
  const [bustIn, setBustIn] = useState('36');
  const [waistIn, setWaistIn] = useState('30');
  const [hipIn, setHipIn] = useState('39');
  const [fitPreference, setFitPreference] = useState<'regular' | 'relaxed' | 'snug'>('regular');
  const [recommendedSize, setRecommendedSize] = useState<string | null>('M');
  const [recommendationReason, setRecommendationReason] = useState<string>('');

  if (!isOpen) return null;

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    const bust = parseFloat(bustIn);
    const waist = parseFloat(waistIn);
    const hip = parseFloat(hipIn);

    let baseSize = 'M';
    if (bust <= 33 && waist <= 27 && hip <= 36) baseSize = 'XS';
    else if (bust <= 35 && waist <= 29 && hip <= 38) baseSize = 'S';
    else if (bust <= 37 && waist <= 31 && hip <= 40) baseSize = 'M';
    else if (bust <= 39 && waist <= 33 && hip <= 42) baseSize = 'L';
    else if (bust <= 42 && waist <= 36 && hip <= 45) baseSize = 'XL';
    else baseSize = 'XXL';

    let finalSize = baseSize;
    if (fitPreference === 'relaxed') {
      const order = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
      const idx = order.indexOf(baseSize);
      if (idx !== -1 && idx < order.length - 1) finalSize = order[idx + 1];
    } else if (fitPreference === 'snug') {
      const order = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
      const idx = order.indexOf(baseSize);
      if (idx > 0) finalSize = order[idx - 1];
    }

    setRecommendedSize(finalSize);
    setRecommendationReason(
      `Based on your ${bust}" bust, ${waist}" waist, and ${fitPreference} fit preference for this ${product.category}, size ${finalSize} offers optimal drape with 2-inch tailoring ease.`
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-4 flex items-center justify-center font-sans">
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-[#E5DFD7] overflow-hidden my-auto max-h-[92vh] flex flex-col text-[#1C1917]">
        <div className="flex items-center justify-between p-4 bg-[#6D1D3A] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-white/15 flex items-center justify-center">
              <Ruler className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold">Smart Size Recommender</h3>
              <p className="text-[11px] text-white/80">Tailored fit estimate for {product.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          <div className="p-3 bg-[#FAF8F5] rounded-md border border-[#E5DFD7] flex items-start gap-2 text-[#1C1917]">
            <Info className="w-4 h-4 text-[#6D1D3A] shrink-0 mt-0.5" />
            <p className="text-[11px] text-[#6B625D] leading-relaxed">
              Recommendations are calculated estimates from your measurements and our ethnic wear ease margins.
            </p>
          </div>

          <form onSubmit={handleCalculate} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-[#6B625D] block mb-1">Height (cm)</label>
                <input
                  type="number"
                  required
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-[#E5DFD7] rounded-md bg-[#FAF8F5] focus:border-[#6D1D3A] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#6B625D] block mb-1">Weight (kg)</label>
                <input
                  type="number"
                  required
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-[#E5DFD7] rounded-md bg-[#FAF8F5] focus:border-[#6D1D3A] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-[#6B625D] block mb-1">Bust (in)</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={bustIn}
                  onChange={(e) => setBustIn(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 border border-[#E5DFD7] rounded-md bg-[#FAF8F5] focus:border-[#6D1D3A] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#6B625D] block mb-1">Waist (in)</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={waistIn}
                  onChange={(e) => setWaistIn(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 border border-[#E5DFD7] rounded-md bg-[#FAF8F5] focus:border-[#6D1D3A] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#6B625D] block mb-1">Hip (in)</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={hipIn}
                  onChange={(e) => setHipIn(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 border border-[#E5DFD7] rounded-md bg-[#FAF8F5] focus:border-[#6D1D3A] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#6B625D] block mb-1">Preferred Drape</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'snug', label: 'Tailored Fit' },
                  { id: 'regular', label: 'Classic Regular' },
                  { id: 'relaxed', label: 'Relaxed Flow' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFitPreference(item.id as any)}
                    className={`py-2 px-2 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                      fitPreference === item.id
                        ? 'border-[#6D1D3A] bg-[#FBF2F5] text-[#6D1D3A]'
                        : 'border-[#E5DFD7] text-[#1C1917] hover:border-[#6D1D3A]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-[#6D1D3A] hover:bg-[#53142B] text-white font-semibold rounded-md transition-colors cursor-pointer text-xs uppercase tracking-wide"
            >
              Calculate Best Fit
            </button>
          </form>

          {recommendedSize && (
            <div className="p-4 bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#166534]">
                  Recommended Fit
                </span>
                <span className="text-lg font-bold font-mono text-[#166534] bg-white px-3 py-0.5 rounded border border-[#A7F3D0]">
                  Size {recommendedSize}
                </span>
              </div>
              <p className="text-[11px] text-[#166534] leading-relaxed">
                {recommendationReason ||
                  `Size ${recommendedSize} fits your measurements comfortably with standard tailoring ease.`}
              </p>
              <button
                type="button"
                onClick={() => {
                  onSelectSize(recommendedSize);
                  onClose();
                }}
                className="w-full py-2 bg-[#166534] hover:bg-[#14532D] text-white text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer mt-1"
              >
                <Check className="w-4 h-4" />
                <span>Apply Size {recommendedSize}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
