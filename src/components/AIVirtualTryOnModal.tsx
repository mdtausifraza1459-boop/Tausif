import React, { useState } from 'react';
import { Sparkles, X, Upload, Trash2, AlertCircle, ShieldCheck, RefreshCw } from 'lucide-react';
import { Product } from '../types.ts';

interface AIVirtualTryOnModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

export const AIVirtualTryOnModal: React.FC<AIVirtualTryOnModalProps> = ({ product, isOpen, onClose }) => {
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tryOnResult, setTryOnResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please upload a valid image file (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size must be under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setUserPhoto(event.target?.result as string);
      setTryOnResult(null);
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateTryOn = async () => {
    if (!userPhoto) {
      setErrorMsg('Please upload your photo to preview the virtual try-on.');
      return;
    }
    if (!consentGiven) {
      setErrorMsg('Please check the consent box to process your photo securely.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/ai/virtual-try-on', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          productName: product.name,
          productCategory: product.category,
          productImage: product.images[0] || '',
          userPhoto,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.visualizationUrl) {
        setTryOnResult(data.visualizationUrl);
      } else {
        setErrorMsg(
          data.error ||
            'Virtual try-on visualization is currently unavailable. Please try again in a few moments.'
        );
      }
    } catch {
      setErrorMsg('Connection error while contacting styling server.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePhoto = () => {
    setUserPhoto(null);
    setTryOnResult(null);
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-4 flex items-center justify-center font-sans">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-[#E5DFD7] overflow-hidden my-auto max-h-[92vh] flex flex-col text-[#1C1917]">
        <div className="flex items-center justify-between p-4 bg-[#6D1D3A] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-white/15 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold">Virtual Try-On Studio</h3>
              <p className="text-[11px] text-white/80">Preview {product.name} silhouette</p>
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
          <div className="p-3 bg-[#FAF8F5] rounded-md border border-[#E5DFD7] space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-[#6D1D3A]">
              <ShieldCheck className="w-4 h-4" />
              <span>Private &amp; Secure Image Processing</span>
            </p>
            <p className="text-[11px] text-[#6B625D] leading-relaxed">
              Your photo is processed strictly in-memory for preview generation and is never stored or shared publicly.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA] rounded-md text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <div className="p-3 bg-[#FAF8F5] border border-[#E5DFD7] rounded-lg space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B625D] block">
                Selected Garment
              </span>
              <div className="aspect-[3/4] rounded overflow-hidden bg-white border border-[#E5DFD7]">
                <img
                  src={product.images[0]}
                  alt={product.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <p className="font-semibold text-xs text-[#1C1917] truncate">{product.name}</p>
              <p className="text-[11px] text-[#6D1D3A] font-mono font-bold tabular-nums">
                ₹{product.discountedPrice.toLocaleString()}
              </p>
            </div>

            <div className="p-3 bg-[#FAF8F5] border border-[#E5DFD7] rounded-lg space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B625D] block">
                {tryOnResult ? 'Generated Silhouette Preview' : 'Your Photo'}
              </span>

              {tryOnResult ? (
                <div className="relative aspect-[3/4] rounded overflow-hidden bg-white border border-[#A7F3D0]">
                  <img
                    src={tryOnResult}
                    alt="Virtual try-on preview"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
              ) : userPhoto ? (
                <div className="relative aspect-[3/4] rounded overflow-hidden bg-white border border-[#E5DFD7]">
                  <img
                    src={userPhoto}
                    alt="Uploaded photo"
                    className="w-full h-full object-cover object-top"
                  />
                  <button
                    type="button"
                    onClick={handleDeletePhoto}
                    className="absolute top-2 right-2 p-1.5 bg-[#B91C1C] text-white rounded-md shadow cursor-pointer"
                    title="Delete uploaded photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="aspect-[3/4] rounded border-2 border-dashed border-[#E5DFD7] hover:border-[#6D1D3A] bg-white flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-colors">
                  <Upload className="w-7 h-7 text-[#6D1D3A] mb-2" />
                  <span className="font-semibold text-[#1C1917] text-xs">Upload Photo</span>
                  <span className="text-[10px] text-[#6B625D] mt-1">
                    Front-facing portrait or full-length photo
                  </span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              )}

              {userPhoto && !tryOnResult && (
                <button
                  type="button"
                  onClick={handleDeletePhoto}
                  className="text-[11px] text-[#B91C1C] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove photo</span>
                </button>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-[#E5DFD7]">
            <label className="flex items-start gap-2.5 text-xs text-[#1C1917] cursor-pointer">
              <input
                type="checkbox"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                className="mt-0.5 rounded accent-[#6D1D3A]"
              />
              <span className="leading-snug text-[11px] text-[#6B625D]">
                I consent to private, temporary in-memory processing of my uploaded photo to preview how this outfit drapes.
              </span>
            </label>
          </div>

          <button
            type="button"
            onClick={handleGenerateTryOn}
            disabled={loading || !userPhoto || !consentGiven}
            className="w-full py-3 bg-[#6D1D3A] hover:bg-[#53142B] text-white text-xs font-semibold uppercase tracking-wider rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Generating Preview...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{tryOnResult ? 'Regenerate Preview' : 'Generate Virtual Try-On'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
