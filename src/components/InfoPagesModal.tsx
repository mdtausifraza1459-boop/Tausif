import React, { useState } from 'react';
import { useStore, InfoPageType } from '../context/StoreContext.tsx';
import { X, Mail, Phone, Send, CheckCircle2, ChevronDown } from 'lucide-react';

const PAGE_TITLES: Record<Exclude<InfoPageType, null>, string> = {
  about: 'About Zohra Luxe',
  contact: 'Contact & Wholesale Desk',
  shipping: 'Shipping & Express Dispatch Policy',
  returns: 'Returns, Exchanges & Refund Policy',
  privacy: 'Privacy & Data Protection Policy',
  terms: 'Terms & Conditions',
  faq: 'Frequently Asked Questions',
};

export const InfoPagesModal: React.FC = () => {
  const { infoPageModal, setInfoPageModal, settings, user } = useStore();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [subject, setSubject] = useState('Order or Product Inquiry');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  if (!infoPageModal) return null;

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/support/inquire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, subject, message }),
      });
      const data = await res.json();
      if (res.ok) {
        setSent(true);
        setMessage('');
      } else {
        setError(data.error || 'Unable to submit inquiry.');
      }
    } catch {
      setError('Network error sending message.');
    } finally {
      setSending(false);
    }
  };

  const tabs: { id: Exclude<InfoPageType, null>; label: string }[] = [
    { id: 'about', label: 'About Us' },
    { id: 'contact', label: 'Contact' },
    { id: 'shipping', label: 'Shipping' },
    { id: 'returns', label: 'Returns' },
    { id: 'faq', label: 'FAQ' },
    { id: 'privacy', label: 'Privacy' },
    { id: 'terms', label: 'Terms' },
  ];

  const faqs = settings?.faqItems?.length
    ? settings.faqItems
    : [
        {
          id: 'faq-1',
          question: 'How long does express pan-India delivery take?',
          answer: 'Orders are dispatched within 24–48 business hours and arrive within 3–5 business days across major Indian cities.',
        },
        {
          id: 'faq-2',
          question: 'What is your return and size exchange policy?',
          answer: `We offer a ${settings?.returnPolicyDays || 7}-day doorstep return and size exchange window for unworn garments with original tags intact.`,
        },
        {
          id: 'faq-3',
          question: 'How do boutiques or bulk resellers order at wholesale rates?',
          answer: 'Open the Wholesale Portal in the header or call/WhatsApp our trade desk directly at +91 9310078735.',
        },
      ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 flex items-center justify-center font-sans text-[#141413]">
      <div className="relative w-full max-w-3xl bg-[#F7F6F2] rounded-xl shadow-2xl border border-[#E2DFD7] overflow-hidden my-auto max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-[#E2DFD7]">
          <h2 className="font-serif text-xl font-bold text-[#141413]">{PAGE_TITLES[infoPageModal]}</h2>
          <button
            type="button"
            onClick={() => setInfoPageModal(null)}
            aria-label="Close information modal"
            className="p-1.5 rounded-md text-[#63615C] hover:text-[#141413] hover:bg-[#EFECE6] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Strip */}
        <div className="bg-white border-b border-[#E2DFD7] px-4 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setInfoPageModal(t.id)}
              className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                infoPageModal === t.id
                  ? 'border-[#164E3F] text-[#164E3F]'
                  : 'border-transparent text-[#63615C] hover:text-[#141413]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs leading-relaxed">
          {infoPageModal === 'about' && (
            <div className="bg-white p-6 rounded-xl border border-[#E2DFD7] space-y-4">
              <h3 className="font-serif text-2xl font-bold text-[#141413]">Crafted for Women&apos;s Ethnic Elegance</h3>
              <p className="text-[#63615C] whitespace-pre-line">
                {settings?.aboutUsText ||
                  'Zohra Luxe celebrates Indian textile craftsmanship through contemporary kurtis, embroidered Chanderi Anarkalis, handwoven cotton mulmul daily wear, and festive ethnic ensembles. Every garment is stitched with pure cotton linings and inspected before dispatch.'}
              </p>
            </div>
          )}

          {infoPageModal === 'shipping' && (
            <div className="bg-white p-6 rounded-xl border border-[#E2DFD7] space-y-3">
              <h3 className="font-serif text-xl font-bold text-[#141413]">Pan-India Express Shipping</h3>
              <p className="text-[#63615C] whitespace-pre-line">
                {settings?.shippingPolicyText ||
                  `Complimentary Express Shipping is included on all orders above ₹${settings?.freeShippingThreshold || 1499}. Orders below the threshold carry a flat shipping fee of ₹${settings?.standardShippingFee || 99}.`}
              </p>
            </div>
          )}

          {infoPageModal === 'returns' && (
            <div className="bg-white p-6 rounded-xl border border-[#E2DFD7] space-y-3">
              <h3 className="font-serif text-xl font-bold text-[#141413]">
                {settings?.returnPolicyDays || 7}-Day Returns &amp; Exchanges
              </h3>
              <p className="text-[#63615C] whitespace-pre-line">{settings?.returnPolicyText}</p>
            </div>
          )}

          {infoPageModal === 'privacy' && (
            <div className="bg-white p-6 rounded-xl border border-[#E2DFD7] space-y-3">
              <h3 className="font-serif text-xl font-bold text-[#141413]">Customer Data &amp; Privacy</h3>
              <p className="text-[#63615C] whitespace-pre-line">{settings?.privacyPolicyText}</p>
            </div>
          )}

          {infoPageModal === 'terms' && (
            <div className="bg-white p-6 rounded-xl border border-[#E2DFD7] space-y-3">
              <h3 className="font-serif text-xl font-bold text-[#141413]">Terms &amp; Conditions of Sale</h3>
              <p className="text-[#63615C] whitespace-pre-line">{settings?.termsConditionsText}</p>
            </div>
          )}

          {infoPageModal === 'faq' && (
            <div className="space-y-3">
              {faqs.map((item) => {
                const isOpen = openFaqId === item.id;
                return (
                  <div key={item.id} className="bg-white rounded-lg border border-[#E2DFD7] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenFaqId(isOpen ? null : item.id)}
                      className="w-full p-4 text-left font-semibold text-[#141413] flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <span>{item.question}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && <div className="px-4 pb-4 text-[#63615C] border-t border-[#E2DFD7] pt-3">{item.answer}</div>}
                  </div>
                );
              })}
            </div>
          )}

          {infoPageModal === 'contact' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-white rounded-lg border border-[#E2DFD7] space-y-1">
                  <span className="text-[11px] font-bold uppercase text-[#164E3F] flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> Wholesale &amp; Support Line
                  </span>
                  <p className="font-mono font-bold text-sm text-[#141413]">
                    {settings?.supportPhone || '+91 9310078735'}
                  </p>
                  <p className="text-[11px] text-[#63615C]">Mon–Sat · 10:00 AM to 7:30 PM IST</p>
                </div>
                <div className="p-4 bg-white rounded-lg border border-[#E2DFD7] space-y-1">
                  <span className="text-[11px] font-bold uppercase text-[#164E3F] flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> Official Email Desk
                  </span>
                  <p className="font-mono font-bold text-sm text-[#141413]">
                    {settings?.supportEmail || 'care@zohraluxe.com'}
                  </p>
                  <p className="text-[11px] text-[#63615C]">
                    {settings?.contactInfoText || 'Average response within 4 business hours.'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleInquirySubmit} className="bg-white p-5 rounded-xl border border-[#E2DFD7] space-y-3">
                <h3 className="font-serif text-lg font-bold text-[#141413]">Send a Message to Our Support Team</h3>
                {sent && (
                  <div className="p-3 bg-[#ECFDF5] border border-[#A7F3D0] text-[#166534] rounded-md flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Inquiry received! Our team will respond shortly.</span>
                  </div>
                )}
                {error && <div className="p-3 bg-[#FEF2F2] text-[#B91C1C] rounded-md border border-[#FECACA]">{error}</div>}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Name"
                    className="px-3 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2]"
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email Address"
                    className="px-3 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2]"
                  />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone (Optional)"
                    className="px-3 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2]"
                  />
                </div>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject"
                  className="w-full px-3 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2]"
                />
                <textarea
                  rows={3}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your question, order ID, or wholesale inquiry..."
                  className="w-full px-3 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2]"
                />
                <button
                  type="submit"
                  disabled={sending}
                  className="px-5 py-2.5 bg-[#164E3F] hover:bg-[#0F3A2E] text-white font-semibold rounded-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sending ? 'Sending...' : 'Send Message'}</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
