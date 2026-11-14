import React from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { X, Ruler } from 'lucide-react';

export const SizeGuideModal: React.FC = () => {
  const { sizeGuideModalOpen, setSizeGuideModalOpen } = useStore();

  if (!sizeGuideModalOpen) return null;

  const measurements = [
    { size: 'XS', bust: '32-33', waist: '26-27', hip: '35-36', kurtiLength: '42' },
    { size: 'S', bust: '34-35', waist: '28-29', hip: '37-38', kurtiLength: '43' },
    { size: 'M', bust: '36-37', waist: '30-31', hip: '39-40', kurtiLength: '44' },
    { size: 'L', bust: '38-39', waist: '32-33', hip: '41-42', kurtiLength: '44' },
    { size: 'XL', bust: '40-42', waist: '34-36', hip: '43-45', kurtiLength: '45' },
    { size: 'XXL', bust: '43-45', waist: '37-39', hip: '46-48', kurtiLength: '45' },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-4 flex items-center justify-center">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-[#E2DFD7] overflow-hidden my-auto font-sans text-[#141413]">
        <div className="flex items-center justify-between p-5 border-b border-[#E2DFD7] bg-[#F7F6F2]">
          <div className="flex items-center gap-2">
            <Ruler className="w-5 h-5 text-[#164E3F]" />
            <h3 className="font-serif text-lg font-semibold text-[#141413]">
              Women&apos;s Ethnic Size Guide &amp; Body Measurements
            </h3>
          </div>
          <button
            onClick={() => setSizeGuideModalOpen(false)}
            className="p-1.5 rounded-md text-[#63615C] hover:text-[#141413] hover:bg-[#EFECE6] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-[#63615C]">
            All measurements in the chart below are in <strong>Inches</strong>. Our kurtis and ethnic silhouettes are
            tailored with a 2-inch garment ease margin for breathable comfort.
          </p>

          <div className="overflow-x-auto border border-[#E2DFD7] rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F6F2] text-[#164E3F] font-semibold border-b border-[#E2DFD7]">
                <tr>
                  <th className="p-3">Size</th>
                  <th className="p-3">Bust (in)</th>
                  <th className="p-3">Waist (in)</th>
                  <th className="p-3">Hips (in)</th>
                  <th className="p-3">Length (in)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DFD7]">
                {measurements.map((row) => (
                  <tr key={row.size} className="hover:bg-[#F7F6F2]">
                    <td className="p-3 font-bold text-[#164E3F]">{row.size}</td>
                    <td className="p-3 font-mono tabular-nums text-[#141413]">{row.bust}&rdquo;</td>
                    <td className="p-3 font-mono tabular-nums text-[#141413]">{row.waist}&rdquo;</td>
                    <td className="p-3 font-mono tabular-nums text-[#141413]">{row.hip}&rdquo;</td>
                    <td className="p-3 font-mono tabular-nums text-[#141413]">{row.kurtiLength}&rdquo;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3.5 bg-[#F7F6F2] border border-[#E2DFD7] rounded-lg text-[11px] text-[#63615C] space-y-1">
            <p>
              <strong className="text-[#141413]">Fit Recommendation:</strong> If you prefer a relaxed silhouette for
              Anarkalis or Straight Kurtis, consider choosing one size up.
            </p>
            <p>For bulk sizing orders or assistance, call +91 9310078735.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
