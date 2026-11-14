import React, { useState } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { Product } from '../types.ts';
import { MessageSquare, X, Send, Headset, Sparkles, ArrowRight } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  suggestedProducts?: Product[];
}

export const AIShoppingAssistant: React.FC = () => {
  const { assistantOpen, setAssistantOpen, user, setQuickViewProduct, settings, showToast } = useStore();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Welcome to Zohra Luxe! Ask me for occasion styling (Wedding, Eid, Office, Casual), fabric care, sizing guidance, or request a human stylist anytime.',
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  // Human escalation modal/drawer state inside chat
  const [showEscalation, setShowEscalation] = useState(false);
  const [escEmail, setEscEmail] = useState(user?.email || '');
  const [escName, setEscName] = useState(user?.name || '');
  const [escOrderId, setEscOrderId] = useState('');
  const [escNote, setEscNote] = useState('');
  const [escalating, setEscalating] = useState(false);

  const sendMessage = async (textOverride?: string) => {
    const query = (textOverride ?? input).trim();
    if (!query || sending) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text: query };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    if (!textOverride) setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/ai/shopping-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: nextHistory.slice(-6).map((m) => ({ role: m.role, text: m.text })),
        }),
      });
      const data = await res.json();
      if (res.ok && data.reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            text: data.reply,
            suggestedProducts: data.suggestedProducts || [],
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `s-${Date.now()}`,
            role: 'system',
            text:
              data.error ||
              'Our AI stylist is temporarily unavailable. Tap "Escalate to Human Stylist" below for immediate assistance.',
          },
        ]);
        setShowEscalation(true);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `s-${Date.now()}`,
          role: 'system',
          text: 'Network interruption. You can escalate directly to our boutique concierge below.',
        },
      ]);
      setShowEscalation(true);
    } finally {
      setSending(false);
    }
  };

  const handleEscalate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escEmail.trim()) return;
    setEscalating(true);
    try {
      const token = localStorage.getItem('zohra_token');
      const res = await fetch('/api/ai/shopping-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          escalateToHuman: true,
          customerEmail: escEmail.trim(),
          customerName: escName.trim(),
          orderId: escOrderId.trim() || undefined,
          message: escNote.trim() || 'Requested human styling & order assistance',
          history: messages.map((m) => ({ role: m.role, text: m.text })),
        }),
      });
      const data = await res.json();
      if (res.ok && data.escalated) {
        setMessages((prev) => [
          ...prev,
          {
            id: `esc-${Date.now()}`,
            role: 'system',
            text: data.message,
          },
        ]);
        setShowEscalation(false);
        showToast({
          title: 'Escalated to Human Stylist',
          subtitle: `Ticket ${data.ticketId} created`,
          type: 'success',
        });
      } else {
        showToast({ title: 'Escalation Error', subtitle: data.error, type: 'error' });
      }
    } catch {
      showToast({ title: 'Network Error', subtitle: 'Could not reach support desk.', type: 'error' });
    } finally {
      setEscalating(false);
    }
  };

  return (
    <>
      {!assistantOpen && (
        <button
          type="button"
          onClick={() => setAssistantOpen(true)}
          aria-label="Open Zohra Stylist & Support Concierge"
          className="fixed bottom-20 md:bottom-6 right-5 z-40 px-4 py-2.5 bg-[#164E3F] hover:bg-[#0F3A2E] text-white rounded-full shadow-xl border border-[#D4AF6A]/40 flex items-center gap-2 text-xs font-semibold cursor-pointer transition-transform hover:scale-105"
        >
          <Sparkles className="w-4 h-4 text-[#D4AF6A]" />
          <span className="hidden sm:inline">Stylist Concierge</span>
        </button>
      )}

      {assistantOpen && (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-50 bg-white border border-[#E2DFD7] rounded-xl shadow-2xl flex flex-col max-h-[82vh] overflow-hidden text-[#141413]">
          <div className="px-4 py-3 bg-[#141413] text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D4AF6A]" />
              <div>
                <p className="font-serif text-base font-semibold leading-tight">Zohra Atelier Concierge</p>
                <p className="text-[10px] text-[#CBC7BE]">Catalog AI + Human Stylist Escalation</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowEscalation(!showEscalation)}
                className="px-2 py-1 text-[10px] font-semibold bg-[#164E3F] hover:bg-[#0F3A2E] text-white rounded flex items-center gap-1 cursor-pointer"
              >
                <Headset className="w-3 h-3" />
                <span>Human Help</span>
              </button>
              <button
                type="button"
                onClick={() => setAssistantOpen(false)}
                className="p-1 text-white/70 hover:text-white cursor-pointer"
                aria-label="Close concierge"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F7F6F2] min-h-[260px]">
            {messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-lg text-xs leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-[#141413] text-white'
                      : m.role === 'system'
                      ? 'bg-[#ECF4F1] text-[#164E3F] border border-[#164E3F]/20'
                      : 'bg-white text-[#141413] border border-[#E2DFD7]'
                  }`}
                >
                  {m.text}
                </div>

                {m.suggestedProducts && m.suggestedProducts.length > 0 && (
                  <div className="mt-2 space-y-1.5 w-full max-w-[85%]">
                    {m.suggestedProducts.map((sp) => (
                      <button
                        key={sp.id}
                        type="button"
                        onClick={() => {
                          setQuickViewProduct(sp);
                          setAssistantOpen(false);
                        }}
                        className="w-full p-2 bg-white border border-[#E2DFD7] hover:border-[#164E3F] rounded-lg flex items-center gap-2.5 text-left cursor-pointer"
                      >
                        <img
                          src={sp.images[0]}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-9 h-12 object-cover rounded shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold truncate">{sp.name}</p>
                          <p className="text-[10px] font-mono text-[#164E3F]">
                            ₹{(sp.flashSalePrice || sp.discountedPrice).toLocaleString()}
                          </p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-[#63615C]" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {showEscalation && (
              <form
                onSubmit={handleEscalate}
                className="bg-white border border-[#164E3F]/30 rounded-lg p-3.5 space-y-2.5 text-xs shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#164E3F] flex items-center gap-1.5">
                    <Headset className="w-3.5 h-3.5" />
                    <span>Connect with Human Stylist</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowEscalation(false)}
                    className="text-[11px] text-[#63615C] cursor-pointer"
                  >
                    Hide
                  </button>
                </div>
                <input
                  required
                  type="email"
                  value={escEmail}
                  onChange={(e) => setEscEmail(e.target.value)}
                  placeholder="Your Email *"
                  className="w-full px-2.5 py-1.5 border border-[#E2DFD7] rounded"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={escName}
                    onChange={(e) => setEscName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full px-2.5 py-1.5 border border-[#E2DFD7] rounded"
                  />
                  <input
                    value={escOrderId}
                    onChange={(e) => setEscOrderId(e.target.value)}
                    placeholder="Order ID (Optional)"
                    className="w-full px-2.5 py-1.5 border border-[#E2DFD7] rounded font-mono"
                  />
                </div>
                <textarea
                  rows={2}
                  value={escNote}
                  onChange={(e) => setEscNote(e.target.value)}
                  placeholder="How can our stylist or support desk help?"
                  className="w-full px-2.5 py-1.5 border border-[#E2DFD7] rounded"
                />
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="submit"
                    disabled={escalating}
                    className="flex-1 py-2 bg-[#164E3F] hover:bg-[#0F3A2E] text-white font-semibold rounded cursor-pointer"
                  >
                    {escalating ? 'Creating Ticket...' : 'Create Support Ticket'}
                  </button>
                  {settings?.whatsappNumber && (
                    <a
                      href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 border border-[#164E3F] text-[#164E3F] font-semibold rounded"
                    >
                      WhatsApp
                    </a>
                  )}
                </div>
              </form>
            )}
          </div>

          <div className="px-3 pt-2 bg-white border-t border-[#E2DFD7] flex gap-1.5 overflow-x-auto no-scrollbar">
            {['Eid festive outfit under ₹3,500', 'Office wear cotton kurtis', '7-day return policy'].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => sendMessage(chip)}
                className="px-2 py-1 bg-[#F7F6F2] hover:bg-[#ECF4F1] border border-[#E2DFD7] rounded text-[10px] text-[#141413] whitespace-nowrap cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="p-3 bg-white flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4 text-[#63615C] shrink-0" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about outfits, sizes, or orders..."
              className="flex-1 text-xs border border-[#E2DFD7] rounded px-3 py-2 focus:outline-none focus:border-[#141413]"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="p-2 bg-[#141413] hover:bg-[#164E3F] disabled:opacity-40 text-white rounded cursor-pointer"
              aria-label="Send message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
