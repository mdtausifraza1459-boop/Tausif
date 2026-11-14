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
  const [recommendedSize, setRecommendedSize] = useState<string | null>(null);
  const [recommendationReason, setRecommendationReason] = useState<string>('');
  const [matchedSpec, setMatchedSpec] = useState<{
    bustIn: number;
    waistIn: number;
    hipIn: number;
    lengthIn: number;
  } | null>(null);
  const [availableStock, setAvailableStock] = useState<number | undefined>(undefined);
  const [calculating, setCalculating] = useState(false);

  if (!isOpen) return null;

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCalculating(true);
    try {
      const res = await fetch('/api/size-recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          bustIn: Number(bustIn),
          waistIn: Number(waistIn),
          hipIn: Number(hipIn),
          heightInches: Math.round(Number(heightCm) / 2.54),
          weightKg: Number(weightKg),
          fitPreference,
        }),
      });
      const data = await res.json();
      if (res.ok && data.recommendedSize) {
        setRecommendedSize(data.recommendedSize);
        setRecommendationReason(data.notes || '');
        setMatchedSpec(data.garmentMeasurements || null);
        setAvailableStock(data.availableStockInSize);
        return;
      }
    } catch {
      // Fallback calculation if offline
    } finally {
      setCalculating(false);
    }

    const bust = parseFloat(bustIn) || 36;
    const ease = fitPreference === 'snug' ? 1 : fitPreference === 'relaxed' ? 3 : 2;
    const targetBust = bust + ease;
    let finalSize = 'M';
    if (targetBust <= 34.5) finalSize = 'XS';
    else if (targetBust <= 36.5) finalSize = 'S';
    else if (targetBust <= 38.5) finalSize = 'M';
    else if (targetBust <= 40.5) finalSize = 'L';
    else if (targetBust <= 42.5) finalSize = 'XL';
    else finalSize = 'XXL';

    setRecommendedSize(finalSize);
    setMatchedSpec(product.measurements?.[finalSize] || null);
    setRecommendationReason(
      `Recommended ${finalSize} based on your ${bust}" bust and ${fitPreference} drape preference.`
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-4 flex items-center justify-center font-sans">
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-[#E2DFD7] overflow-hidden my-auto max-h-[92vh] flex flex-col text-[#141413]">
        <div className="flex items-center justify-between p-4 bg-[#141413] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-white/15 flex items-center justify-center">
              <Ruler className="w-4 h-4 text-[#D4AF6A]" />
            </div>
            <div>
              <h3 className="font-serif text-base font-semibold">Smart Garment Fit Finder</h3>
              <p className="text-[11px] text-white/80">Matched against garment pattern specs for {product.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          <div className="p-3 bg-[#F7F6F2] rounded-md border border-[#E2DFD7] flex items-start gap-2 text-[#141413]">
            <Info className="w-4 h-4 text-[#164E3F] shrink-0 mt-0.5" />
            <p className="text-[11px] text-[#63615C] leading-relaxed">
              Enter your body measurements in inches. We compare directly against this garment&apos;s actual pattern measurements and ease allowance.
            </p>
          </div>

          <form onSubmit={handleCalculate} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-[#63615C] block mb-1">Height (cm)</label>
                <input
                  type="number"
                  required
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2] focus:border-[#141413] focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#63615C] block mb-1">Weight (kg)</label>
                <input
                  type="number"
                  required
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2] focus:border-[#141413] focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-[#63615C] block mb-1">Bust (in)</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={bustIn}
                  onChange={(e) => setBustIn(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2] focus:border-[#141413] focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#63615C] block mb-1">Waist (in)</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={waistIn}
                  onChange={(e) => setWaistIn(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2] focus:border-[#141413] focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#63615C] block mb-1">Hip (in)</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={hipIn}
                  onChange={(e) => setHipIn(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2] focus:border-[#141413] focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#63615C] block mb-1">Preferred Drape</label>
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
                        ? 'border-[#164E3F] bg-[#ECF4F1] text-[#164E3F]'
                        : 'border-[#E2DFD7] text-[#141413] hover:border-[#141413]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={calculating}
              className="w-full py-2.5 bg-[#164E3F] hover:bg-[#0F3A2E] text-white font-semibold rounded-md transition-colors cursor-pointer text-xs uppercase tracking-wide disabled:opacity-60"
            >
              {calculating ? 'Computing Garment Match...' : 'Calculate Best Fit'}
            </button>
          </form>

          {recommendedSize && (
            <div className="p-4 bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#166534] block">
                    Recommended Garment Size
                  </span>
                  {availableStock !== undefined && (
                    <span className="text-[11px] font-mono text-[#166534]">
                      {availableStock > 0 ? `${availableStock} units available in ${recommendedSize}` : 'Currently out of stock in this size'}
                    </span>
                  )}
                </div>
                <span className="text-lg font-bold font-mono text-[#166534] bg-white px-3 py-0.5 rounded border border-[#A7F3D0]">
                  Size {recommendedSize}
                </span>
              </div>
              {matchedSpec && (
                <div className="grid grid-cols-4 gap-2 bg-white/80 rounded p-2 border border-[#A7F3D0] text-[11px] font-mono text-[#141413] text-center">
                  <div>
                    <span className="block text-[10px] text-[#63615C] font-sans">Bust</span>
                    <strong>{matchedSpec.bustIn}&ldquo;</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#63615C] font-sans">Waist</span>
                    <strong>{matchedSpec.waistIn}&ldquo;</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#63615C] font-sans">Hip</span>
                    <strong>{matchedSpec.hipIn}&ldquo;</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#63615C] font-sans">Length</span>
                    <strong>{matchedSpec.lengthIn}&ldquo;</strong>
                  </div>
                </div>
              )}
              <p className="text-[11px] text-[#166534] leading-relaxed">{recommendationReason}</p>
              <button
                type="button"
                onClick={() => {
                  onSelectSize(recommendedSize);
                  onClose();
                }}
                className="w-full py-2 bg-[#164E3F] hover:bg-[#0F3A2E] text-white text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer mt-1"
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
