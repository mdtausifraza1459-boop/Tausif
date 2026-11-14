import React, { useState } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { Gift, X, CheckCircle2, Copy, Check } from 'lucide-react';

export const DigitalGiftCardModal: React.FC = () => {
  const { giftCardModalOpen, setGiftCardModalOpen, user, showToast } = useStore();
  const [amount, setAmount] = useState(2500);
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [senderName, setSenderName] = useState(user?.name || '');
  const [message, setMessage] = useState('Wishing you timeless elegance with Zohra Luxe.');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [issuedCard, setIssuedCard] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  // Check Balance state
  const [checkCode, setCheckCode] = useState('');
  const [balanceResult, setBalanceResult] = useState<any | null>(null);
  const [balanceErr, setBalanceErr] = useState('');

  if (!giftCardModalOpen) return null;

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const token = localStorage.getItem('zohra_token');
      const res = await fetch('/api/gift-cards/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ amount, recipientName, recipientEmail, senderName, message }),
      });
      const data = await res.json();
      if (res.ok && data.giftCard) {
        setIssuedCard(data.giftCard);
        showToast({
          title: 'Digital Gift Card Issued',
          subtitle: `Code ${data.giftCard.code} (₹${data.giftCard.initialBalance.toLocaleString()})`,
          type: 'success',
        });
      } else {
        setError(data.error || 'Could not issue gift card.');
      }
    } catch {
      setError('Connection failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    setBalanceErr('');
    setBalanceResult(null);
    if (!checkCode.trim()) return;
    try {
      const res = await fetch('/api/gift-cards/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: checkCode.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.valid) setBalanceResult(data);
      else setBalanceErr(data.error || 'Gift card unavailable.');
    } catch {
      setBalanceErr('Failed to verify gift card.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-xl border border-[#E2DFD7] shadow-2xl overflow-hidden text-[#141413]">
        <div className="px-6 py-4 bg-[#141413] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Gift className="w-5 h-5 text-[#D4AF6A]" />
            <div>
              <h2 className="font-serif text-xl font-semibold">Zohra Luxe Digital Gift Card</h2>
              <p className="text-[11px] text-[#CBC7BE]">Instant e-gift privilege redeemable at checkout</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setGiftCardModalOpen(false);
              setIssuedCard(null);
            }}
            className="p-1.5 text-white/70 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[82vh] overflow-y-auto space-y-6">
          {issuedCard ? (
            <div className="bg-[#ECF4F1] border border-[#164E3F]/30 rounded-xl p-5 space-y-4 text-center">
              <CheckCircle2 className="w-10 h-10 text-[#164E3F] mx-auto" />
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#164E3F]">Gift Card Ready</p>
                <h3 className="font-serif text-2xl font-semibold">
                  ₹{issuedCard.initialBalance.toLocaleString()} for {issuedCard.recipientName}
                </h3>
                <p className="text-xs text-[#63615C]">
                  Valid until <span className="font-mono">{issuedCard.expiresAt}</span>
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 bg-white px-4 py-2.5 rounded-lg border border-[#E2DFD7] max-w-xs mx-auto">
                <span className="font-mono font-bold text-base tracking-wider text-[#141413]">
                  {issuedCard.code}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(issuedCard.code);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="p-1 text-[#164E3F] cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setIssuedCard(null)}
                className="text-xs font-semibold text-[#164E3F] hover:underline cursor-pointer"
              >
                Issue Another Gift Card
              </button>
            </div>
          ) : (
            <form onSubmit={handlePurchase} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#63615C] block">
                  Select Gift Value (INR)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1000, 2500, 5000, 10000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(val)}
                      className={`py-2 text-xs font-mono font-semibold rounded border cursor-pointer ${
                        amount === val
                          ? 'bg-[#164E3F] text-white border-[#164E3F]'
                          : 'bg-[#F7F6F2] text-[#141413] border-[#E2DFD7]'
                      }`}
                    >
                      ₹{val.toLocaleString()}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={500}
                  max={50000}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[#63615C] font-medium mb-1">Recipient Name *</label>
                  <input
                    required
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="e.g., Ayesha Khan"
                    className="w-full px-3 py-2 border border-[#E2DFD7] rounded"
                  />
                </div>
                <div>
                  <label className="block text-[#63615C] font-medium mb-1">Recipient Email *</label>
                  <input
                    type="email"
                    required
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="ayesha@example.com"
                    className="w-full px-3 py-2 border border-[#E2DFD7] rounded"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block text-[#63615C] font-medium mb-1">Your Name *</label>
                <input
                  required
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Sender full name"
                  className="w-full px-3 py-2 border border-[#E2DFD7] rounded"
                />
              </div>

              <div className="text-xs">
                <label className="block text-[#63615C] font-medium mb-1">Personal Note</label>
                <textarea
                  rows={2}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E2DFD7] rounded"
                />
              </div>

              {error && <p className="text-xs text-[#B91C1C] font-medium">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-[#164E3F] hover:bg-[#0F3A2E] text-white text-xs font-semibold uppercase tracking-wider rounded-md cursor-pointer"
              >
                {submitting ? 'Generating Gift Card...' : `Issue Digital Gift Card (₹${Number(amount || 0).toLocaleString()})`}
              </button>
            </form>
          )}

          <div className="pt-4 border-t border-[#E2DFD7] space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#63615C]">
              Check Gift Card Balance
            </h4>
            <form onSubmit={handleCheckBalance} className="flex gap-2">
              <input
                value={checkCode}
                onChange={(e) => setCheckCode(e.target.value.toUpperCase())}
                placeholder="Enter ZLGC-XXXXXX"
                className="flex-1 px-3 py-2 text-xs font-mono border border-[#E2DFD7] rounded uppercase"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#141413] text-white text-xs font-semibold rounded cursor-pointer"
              >
                Verify
              </button>
            </form>
            {balanceErr && <p className="text-xs text-[#B91C1C]">{balanceErr}</p>}
            {balanceResult && (
              <p className="text-xs text-[#164E3F] bg-[#ECF4F1] p-2.5 rounded border border-[#164E3F]/20">
                Active Balance: <strong className="font-mono">₹{balanceResult.currentBalance.toLocaleString()}</strong> · Expires{' '}
                <span className="font-mono">{balanceResult.expiresAt}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
