import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { Order, ReturnExchangeRequest, DigitalGiftCard, OrderComplaint } from '../types.ts';
import {
  X,
  User as UserIcon,
  Package,
  Heart,
  MapPin,
  LogOut,
  ShoppingBag,
  Plus,
  Shield,
  Bell,
  Sparkles,
  Trash2,
  KeyRound,
  Copy,
  Gift,
  Crown,
  MessageSquareWarning,
} from 'lucide-react';

export const CustomerAccountModal: React.FC = () => {
  const {
    authModalOpen,
    setAuthModalOpen,
    authMode,
    setAuthMode,
    user,
    token,
    login,
    register,
    logout,
    refreshUserProfile,
    wishlist,
    products,
    addToCart,
    toggleWishlist,
    setTrackingModalOpen,
    setLastOrderId,
    setActiveView,
    showToast,
    customerNotifications,
    unreadNotificationCount,
    markCustomerNotificationsRead,
    vipStatus,
    reorderFromOrder,
    setGiftCardModalOpen,
  } = useStore();

  const [activeTab, setActiveTab] = useState<'orders' | 'wishlist' | 'addresses' | 'loyalty' | 'notifications' | 'profile'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [returnsList, setReturnsList] = useState<ReturnExchangeRequest[]>([]);
  const [userGiftCards, setUserGiftCards] = useState<DigitalGiftCard[]>([]);
  const [userComplaints, setUserComplaints] = useState<OrderComplaint[]>([]);
  const [abandonedConsent, setAbandonedConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [forgotMode, setForgotMode] = useState<'none' | 'request' | 'confirm'>('none');
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetNewPass, setResetNewPass] = useState('');
  const [resetNotice, setResetNotice] = useState<string | null>(null);

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regReferral, setRegReferral] = useState('');
  const [regBirthdayMonth, setRegBirthdayMonth] = useState<number | ''>('');
  const [regBirthdayConsent, setRegBirthdayConsent] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddrName, setNewAddrName] = useState('');
  const [newAddrPhone, setNewAddrPhone] = useState('');
  const [newAddrStreet, setNewAddrStreet] = useState('');
  const [newAddrCity, setNewAddrCity] = useState('');
  const [newAddrState, setNewAddrState] = useState('Delhi');
  const [newAddrPincode, setNewAddrPincode] = useState('');

  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileBdayConsent, setProfileBdayConsent] = useState(false);
  const [profileBdayMonth, setProfileBdayMonth] = useState<number>(1);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (user && token && authModalOpen) {
      setLoadingOrders(true);
      setProfileName(user.name || '');
      setProfilePhone(user.phone || '');
      setProfileBdayConsent(Boolean(user.birthdayConsent));
      setProfileBdayMonth(user.birthdayMonth || 1);
      setAbandonedConsent(Boolean(user.abandonedCartConsent));
      setMarketingConsent(Boolean(user.marketingConsent));

      fetch('/api/user/orders', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.orders) setOrders(data.orders);
          if (data?.returns) setReturnsList(data.returns);
          setLoadingOrders(false);
        })
        .catch(() => setLoadingOrders(false));

      fetch('/api/user/gift-cards', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.giftCards) setUserGiftCards(d.giftCards);
        })
        .catch(() => {});

      fetch(`/api/user/complaints?email=${encodeURIComponent(user.email)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.complaints) setUserComplaints(d.complaints);
        })
        .catch(() => {});
    }
  }, [user, token, authModalOpen]);

  if (!authModalOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const res = await login(loginEmail, loginPassword);
    if (!res.success) {
      setLoginError(res.error || 'Failed to sign in');
    } else {
      showToast({ title: 'Welcome Back', subtitle: 'Signed in to your Zohra Luxe account.', type: 'success' });
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetNotice(null);
    setLoginError(null);
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: resetEmail }),
    });
    const data = await res.json();
    if (res.ok) {
      setResetNotice(data.message || 'Recovery token issued.');
      setForgotMode('confirm');
    } else {
      setLoginError(data.error || 'Unable to initiate recovery.');
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: resetEmail, token: resetToken, newPassword: resetNewPass }),
    });
    const data = await res.json();
    if (res.ok) {
      setForgotMode('none');
      setResetNotice(null);
      setLoginEmail(resetEmail);
      showToast({ title: 'Password Updated', subtitle: 'Please sign in with your new password.', type: 'success' });
    } else {
      setLoginError(data.error || 'Failed to reset password.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    const res = await register(
      regName,
      regEmail,
      regPassword,
      regPhone,
      regReferral || undefined,
      regBirthdayConsent && regBirthdayMonth ? Number(regBirthdayMonth) : undefined,
      regBirthdayConsent
    );
    if (!res.success) {
      setRegError(res.error || 'Failed to create account');
    } else {
      showToast({ title: 'Account Created', subtitle: 'Welcome to Zohra Luxe.', type: 'success' });
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const res = await fetch('/api/user/address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: newAddrName,
          phone: newAddrPhone,
          street: newAddrStreet,
          city: newAddrCity,
          state: newAddrState,
          pincode: newAddrPincode,
          isDefault: true,
        }),
      });
      if (res.ok) {
        await refreshUserProfile();
        setShowAddAddress(false);
        setNewAddrName('');
        setNewAddrPhone('');
        setNewAddrStreet('');
        setNewAddrCity('');
        setNewAddrPincode('');
        showToast({ title: 'Address Saved', subtitle: 'Default shipping address updated.', type: 'success' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAddress = async (addrId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/user/address/${addrId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await refreshUserProfile();
        showToast({ title: 'Address Removed', subtitle: 'Saved address deleted.', type: 'info' });
      }
    } catch {
      // ignore
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSavingProfile(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: profileName,
          phone: profilePhone,
          birthdayConsent: profileBdayConsent,
          birthdayMonth: profileBdayConsent ? profileBdayMonth : undefined,
        }),
      });
      await fetch('/api/user/consents', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          abandonedCartConsent: abandonedConsent,
          marketingConsent: marketingConsent,
        }),
      });
      if (res.ok) {
        await refreshUserProfile();
        showToast({ title: 'Profile & Consents Updated', subtitle: 'Preferences saved securely.', type: 'success' });
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const wishlistProducts = products.filter((p) => wishlist.includes(p.id));
  const isOwnerOrPartner = Boolean(user && user.role === 'admin');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 flex items-center justify-center">
      <div className="relative w-full max-w-4xl bg-[#F7F6F2] rounded-xl shadow-2xl border border-[#E2DFD7] overflow-hidden my-auto max-h-[92vh] flex flex-col font-sans text-[#141413]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-[#E2DFD7]">
          <div className="flex items-center gap-2.5">
            <UserIcon className="w-5 h-5 text-[#164E3F]" />
            <h2 className="font-serif text-xl font-bold text-[#141413]">
              {user ? `Welcome, ${user.name}` : authMode === 'login' ? 'Customer Sign In' : 'Create Customer Account'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setAuthModalOpen(false)}
            aria-label="Close account modal"
            className="p-1.5 rounded-md text-[#63615C] hover:text-[#141413] hover:bg-[#EFECE6] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {!user ? (
            <div className="max-w-md mx-auto py-2">
              <div className="flex rounded-md bg-[#EFECE6] p-1 mb-6 border border-[#E2DFD7]">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setForgotMode('none');
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded transition-colors cursor-pointer ${
                    authMode === 'login' ? 'bg-[#164E3F] text-white' : 'text-[#63615C]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setForgotMode('none');
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded transition-colors cursor-pointer ${
                    authMode === 'register' ? 'bg-[#164E3F] text-white' : 'text-[#63615C]'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {authMode === 'login' ? (
                forgotMode === 'request' ? (
                  <form onSubmit={handleRequestReset} className="space-y-4">
                    <h3 className="font-serif text-lg font-semibold flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-[#164E3F]" />
                      <span>Recover Account Password</span>
                    </h3>
                    {loginError && (
                      <div className="p-3 bg-[#FEF2F2] text-[#B91C1C] text-xs rounded-md border border-[#FECACA]">
                        {loginError}
                      </div>
                    )}
                    <div>
                      <label className="text-[11px] font-semibold text-[#63615C] block mb-1">Registered Email</label>
                      <input
                        type="email"
                        required
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full text-xs px-3 py-2.5 border border-[#E2DFD7] rounded-md bg-white focus:outline-none focus:border-[#164E3F]"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3 bg-[#164E3F] hover:bg-[#0F3A2E] text-white text-xs font-semibold uppercase tracking-wider rounded-md cursor-pointer"
                    >
                      Request Recovery Token
                    </button>
                    <button
                      type="button"
                      onClick={() => setForgotMode('none')}
                      className="w-full text-xs text-[#63615C] hover:text-[#141413] underline cursor-pointer"
                    >
                      Back to Sign In
                    </button>
                  </form>
                ) : forgotMode === 'confirm' ? (
                  <form onSubmit={handleConfirmReset} className="space-y-4">
                    {resetNotice && (
                      <div className="p-3 bg-[#ECFDF5] text-[#166534] text-xs rounded-md border border-[#A7F3D0]">
                        {resetNotice}
                      </div>
                    )}
                    {loginError && (
                      <div className="p-3 bg-[#FEF2F2] text-[#B91C1C] text-xs rounded-md border border-[#FECACA]">
                        {loginError}
                      </div>
                    )}
                    <div>
                      <label className="text-[11px] font-semibold text-[#63615C] block mb-1">Reset Token</label>
                      <input
                        type="text"
                        required
                        value={resetToken}
                        onChange={(e) => setResetToken(e.target.value)}
                        placeholder="Paste recovery token"
                        className="w-full text-xs px-3 py-2.5 border border-[#E2DFD7] rounded-md bg-white font-mono focus:outline-none focus:border-[#164E3F]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#63615C] block mb-1">New Password</label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={resetNewPass}
                        onChange={(e) => setResetNewPass(e.target.value)}
                        placeholder="Min 6 characters"
                        className="w-full text-xs px-3 py-2.5 border border-[#E2DFD7] rounded-md bg-white focus:outline-none focus:border-[#164E3F]"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3 bg-[#164E3F] hover:bg-[#0F3A2E] text-white text-xs font-semibold uppercase tracking-wider rounded-md cursor-pointer"
                    >
                      Set New Password
                    </button>
                    <button
                      type="button"
                      onClick={() => setForgotMode('none')}
                      className="w-full text-xs text-[#63615C] hover:text-[#141413] underline cursor-pointer"
                    >
                      Back to Sign In
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    {loginError && (
                      <div className="p-3 bg-[#FEF2F2] text-[#B91C1C] text-xs rounded-md border border-[#FECACA]">
                        {loginError}
                      </div>
                    )}

                    <div>
                      <label className="text-[11px] font-semibold text-[#63615C] block mb-1">Email Address</label>
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full text-xs px-3 py-2.5 border border-[#E2DFD7] rounded-md bg-white focus:outline-none focus:border-[#164E3F]"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-[#63615C]">Password</label>
                        <button
                          type="button"
                          onClick={() => {
                            setForgotMode('request');
                            setResetEmail(loginEmail);
                            setLoginError(null);
                          }}
                          className="text-[11px] font-semibold text-[#164E3F] hover:underline cursor-pointer"
                        >
                          Forgot Password?
                        </button>
                      </div>
                      <input
                        type="password"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full text-xs px-3 py-2.5 border border-[#E2DFD7] rounded-md bg-white focus:outline-none focus:border-[#164E3F]"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-[#164E3F] hover:bg-[#0F3A2E] text-white text-xs font-semibold uppercase tracking-wider rounded-md transition-colors cursor-pointer"
                    >
                      Sign In
                    </button>

                    <p className="text-center text-xs text-[#63615C]">
                      New to Zohra Luxe?{' '}
                      <button
                        type="button"
                        onClick={() => setAuthMode('register')}
                        className="text-[#164E3F] font-bold underline cursor-pointer"
                      >
                        Create Account
                      </button>
                    </p>

                    <div className="pt-3 border-t border-[#E2DFD7] text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthModalOpen(false);
                          setActiveView('admin');
                        }}
                        className="text-xs text-[#164E3F] hover:underline font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>Store Owner &amp; Partner Admin Login</span>
                      </button>
                    </div>
                  </form>
                )
              ) : (
                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  {regError && (
                    <div className="p-3 bg-[#FEF2F2] text-[#B91C1C] text-xs rounded-md border border-[#FECACA]">
                      {regError}
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] font-semibold text-[#63615C] block mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Riya Sen"
                      className="w-full text-xs px-3 py-2.5 border border-[#E2DFD7] rounded-md bg-white focus:outline-none focus:border-[#164E3F]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-[#63615C] block mb-1">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full text-xs px-3 py-2.5 border border-[#E2DFD7] rounded-md bg-white focus:outline-none focus:border-[#164E3F]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#63615C] block mb-1">Mobile Phone</label>
                      <input
                        type="tel"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="+91 98765 00000"
                        className="w-full text-xs px-3 py-2.5 border border-[#E2DFD7] rounded-md bg-white focus:outline-none focus:border-[#164E3F]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#63615C] block mb-1">Password *</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full text-xs px-3 py-2.5 border border-[#E2DFD7] rounded-md bg-white focus:outline-none focus:border-[#164E3F]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#63615C] block mb-1">
                      Referral Code (Optional — Earn Welcome Loyalty Bonus)
                    </label>
                    <input
                      type="text"
                      value={regReferral}
                      onChange={(e) => setRegReferral(e.target.value.toUpperCase())}
                      placeholder="e.g. ZOHRA-XXXXXX"
                      className="w-full text-xs px-3 py-2.5 border border-[#E2DFD7] rounded-md bg-white font-mono uppercase focus:outline-none focus:border-[#164E3F]"
                    />
                  </div>

                  <div className="p-3 bg-white border border-[#E2DFD7] rounded-md space-y-2 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={regBirthdayConsent}
                        onChange={(e) => setRegBirthdayConsent(e.target.checked)}
                        className="accent-[#164E3F]"
                      />
                      <span className="text-[#141413] font-medium">
                        Opt in to receive seasonal birthday reward points (optional)
                      </span>
                    </label>
                    {regBirthdayConsent && (
                      <select
                        value={regBirthdayMonth}
                        onChange={(e) => setRegBirthdayMonth(Number(e.target.value))}
                        className="w-full text-xs px-3 py-2 border border-[#E2DFD7] rounded bg-[#F7F6F2]"
                      >
                        <option value="">Select Birth Month</option>
                        {[
                          'January',
                          'February',
                          'March',
                          'April',
                          'May',
                          'June',
                          'July',
                          'August',
                          'September',
                          'October',
                          'November',
                          'December',
                        ].map((m, idx) => (
                          <option key={m} value={idx + 1}>
                            {m}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#164E3F] hover:bg-[#0F3A2E] text-white text-xs font-semibold uppercase tracking-wider rounded-md transition-colors cursor-pointer"
                  >
                    Create Account
                  </button>

                  <p className="text-center text-xs text-[#63615C]">
                    Already registered?{' '}
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className="text-[#164E3F] font-bold underline cursor-pointer"
                    >
                      Sign In
                    </button>
                  </p>
                </form>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {isOwnerOrPartner && (
                <div className="p-4 bg-[#141413] text-white rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-white/15 text-[#D4AF6A] text-[10px] font-bold uppercase px-2 py-0.5 rounded">
                        Authorized Store Admin
                      </span>
                      <h4 className="font-serif font-bold text-base">Admin Control Center</h4>
                    </div>
                    <p className="text-xs text-[#F7F6F2]/80">
                      Signed in as {user.email}. Open the admin panel to manage products, orders, partners, and customers.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthModalOpen(false);
                      setActiveView('admin');
                    }}
                    className="px-4 py-2 bg-white text-[#141413] text-xs font-bold uppercase rounded-md hover:bg-[#F7F6F2] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Open Admin Dashboard
                  </button>
                </div>
              )}

              {/* Account Navigation Tabs */}
              <div className="flex border-b border-[#E2DFD7] overflow-x-auto text-xs font-semibold uppercase tracking-wider">
                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className={`py-3 px-3.5 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === 'orders'
                      ? 'border-[#164E3F] text-[#164E3F]'
                      : 'border-transparent text-[#63615C] hover:text-[#141413]'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>Orders ({orders.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('wishlist')}
                  className={`py-3 px-3.5 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === 'wishlist'
                      ? 'border-[#164E3F] text-[#164E3F]'
                      : 'border-transparent text-[#63615C] hover:text-[#141413]'
                  }`}
                >
                  <Heart className="w-4 h-4" />
                  <span>Wishlist ({wishlist.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('addresses')}
                  className={`py-3 px-3.5 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === 'addresses'
                      ? 'border-[#164E3F] text-[#164E3F]'
                      : 'border-transparent text-[#63615C] hover:text-[#141413]'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  <span>Addresses ({user.addresses?.length || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('loyalty')}
                  className={`py-3 px-3.5 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === 'loyalty'
                      ? 'border-[#164E3F] text-[#164E3F]'
                      : 'border-transparent text-[#63615C] hover:text-[#141413]'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Rewards ({user.loyaltyPoints || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('notifications')}
                  className={`py-3 px-3.5 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === 'notifications'
                      ? 'border-[#164E3F] text-[#164E3F]'
                      : 'border-transparent text-[#63615C] hover:text-[#141413]'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  <span>Alerts {unreadNotificationCount > 0 ? `(${unreadNotificationCount})` : ''}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className={`py-3 px-3.5 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === 'profile'
                      ? 'border-[#164E3F] text-[#164E3F]'
                      : 'border-transparent text-[#63615C] hover:text-[#141413]'
                  }`}
                >
                  <UserIcon className="w-4 h-4" />
                  <span>Profile</span>
                </button>

                <button
                  type="button"
                  onClick={logout}
                  className="py-3 px-3.5 border-b-2 border-transparent text-[#B91C1C] hover:underline transition-colors flex items-center gap-1.5 ml-auto whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>

              {activeTab === 'orders' && (
                <div className="space-y-4">
                  {loadingOrders ? (
                    <p className="text-center py-8 text-xs text-[#63615C]">Loading order history...</p>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-12 text-[#63615C] text-xs space-y-3 bg-white rounded-lg border border-[#E2DFD7]">
                      <p>You have not placed any orders yet.</p>
                      <button
                        type="button"
                        onClick={() => setAuthModalOpen(false)}
                        className="px-4 py-2 bg-[#164E3F] text-white rounded-md text-xs font-semibold cursor-pointer"
                      >
                        Explore Collections
                      </button>
                    </div>
                  ) : (
                    orders.map((ord) => {
                      const orderRet = returnsList.find((r) => r.orderId === ord.id);
                      return (
                        <div key={ord.id} className="p-4 bg-white rounded-lg border border-[#E2DFD7] space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E2DFD7]">
                            <div>
                              <span className="font-mono font-bold text-sm text-[#164E3F]">{ord.id}</span>
                              <span className="text-[11px] text-[#63615C] ml-2">
                                {new Date(ord.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                                  ord.orderStatus === 'Delivered' || ord.orderStatus === 'Refunded'
                                    ? 'bg-[#ECFDF5] text-[#166534] border-[#A7F3D0]'
                                    : ord.orderStatus === 'Cancelled'
                                    ? 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]'
                                    : 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'
                                }`}
                              >
                                {ord.orderStatus}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setLastOrderId(ord.id);
                                  setAuthModalOpen(false);
                                  setTrackingModalOpen(true);
                                }}
                                className="text-xs text-[#164E3F] underline font-semibold cursor-pointer"
                              >
                                Track / Return
                              </button>
                            </div>
                          </div>

                          <div className="divide-y divide-[#E2DFD7]">
                            {ord.items.map((it, idx) => (
                              <div key={idx} className="py-2 flex items-center gap-3">
                                <img
                                  src={it.image || '/src/assets/images/category_kurtis_showcase_1794109164419.jpg'}
                                  alt={it.name}
                                  referrerPolicy="no-referrer"
                                  className="w-11 h-14 rounded object-cover border border-[#E2DFD7]"
                                />
                                <div className="flex-1">
                                  <p className="text-xs font-semibold text-[#141413]">{it.name}</p>
                                  <p className="text-[11px] text-[#63615C]">
                                    Size: {it.size} · Shade: {it.color} · Qty: {it.quantity}
                                  </p>
                                </div>
                                <span className="text-xs font-mono font-bold tabular-nums">
                                  ₹{(it.price * it.quantity).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>

                          {orderRet && (
                            <div className="p-2 bg-[#F7F6F2] border border-[#E2DFD7] rounded text-[11px] text-[#141413]">
                              {orderRet.type.toUpperCase()} Request {orderRet.id}:{' '}
                              <strong className="uppercase">{orderRet.status.replace(/_/g, ' ')}</strong>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center justify-between text-xs pt-2 border-t border-[#E2DFD7] gap-2">
                            <div className="text-[11px] text-[#63615C]">
                              {ord.courierDetails?.trackingNumber ? (
                                <span>
                                  Sent via <strong>{ord.courierDetails.provider}</strong> (AWB:{' '}
                                  <code className="font-mono">{ord.courierDetails.trackingNumber}</code>)
                                </span>
                              ) : (
                                <span>Payment: {ord.paymentMethod.toUpperCase()} ({ord.paymentStatus})</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  const receiptText = `=== ZOHRA LUXE OFFICIAL TAX INVOICE ===\nOrder ID: ${ord.id}\nDate: ${new Date(ord.createdAt).toLocaleString()}\nCustomer: ${ord.customerName}\nEmail: ${ord.customerEmail}\nPhone: ${ord.customerPhone}\nDelivery Address: ${ord.deliveryAddress.street}, ${ord.deliveryAddress.city}, ${ord.deliveryAddress.state} - ${ord.deliveryAddress.pincode}\nPayment Method: ${ord.paymentMethod.toUpperCase()} (${ord.paymentStatus})\n\nITEMS:\n${ord.items.map((it) => `- ${it.name} | Size: ${it.size} | Color: ${it.color} | Qty: ${it.quantity} | Price: ₹${it.price}`).join('\n')}\n\nTOTAL: ₹${ord.total}`;
                                  const blob = new Blob([receiptText], { type: 'text/plain' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `Invoice_${ord.id}.txt`;
                                  a.click();
                                  URL.revokeObjectURL(url);
                                }}
                                className="text-xs text-[#164E3F] hover:underline font-semibold cursor-pointer"
                              >
                                Invoice
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  reorderFromOrder(ord);
                                  setAuthModalOpen(false);
                                }}
                                className="px-3 py-1 bg-[#164E3F] text-white rounded text-xs font-semibold hover:bg-[#0F3A2E] transition-colors cursor-pointer"
                              >
                                1-Click Reorder
                              </button>

                              <span className="font-bold text-[#141413]">
                                Total: <strong className="font-mono text-[#164E3F] tabular-nums">₹{ord.total.toLocaleString()}</strong>
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {userComplaints.length > 0 && (
                    <div className="p-4 bg-white rounded-lg border border-[#E2DFD7] space-y-2.5 text-xs">
                      <h4 className="font-bold uppercase tracking-wider text-[#141413] flex items-center gap-1.5">
                        <MessageSquareWarning className="w-4 h-4 text-[#8E6D3B]" />
                        <span>Order Support Tickets ({userComplaints.length})</span>
                      </h4>
                      {userComplaints.map((c) => (
                        <div key={c.id} className="p-2.5 bg-[#F7F6F2] rounded border border-[#E2DFD7] flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-[#141413]">{c.subject}</p>
                            <p className="text-[11px] text-[#63615C] font-mono">
                              Order {c.orderId} · {c.status.toUpperCase()} · {c.messages?.length || 1} message(s)
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setLastOrderId(c.orderId);
                              setAuthModalOpen(false);
                              setTrackingModalOpen(true);
                            }}
                            className="text-xs font-semibold text-[#164E3F] hover:underline cursor-pointer"
                          >
                            View Thread
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'wishlist' && (
                <div className="space-y-4">
                  {wishlistProducts.length === 0 ? (
                    <div className="text-center py-12 text-[#63615C] text-xs bg-white rounded-lg border border-[#E2DFD7]">
                      <p>Your wishlist is currently empty.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {wishlistProducts.map((p) => (
                        <div
                          key={p.id}
                          className="p-3 bg-white rounded-lg border border-[#E2DFD7] flex flex-col justify-between"
                        >
                          <div className="aspect-[3/4] rounded overflow-hidden bg-[#EFECE6] mb-2">
                            <img src={p.images[0]} alt={p.name} referrerPolicy="no-referrer" className="w-full h-full object-cover object-top" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-[#141413] line-clamp-1">{p.name}</p>
                            <p className="text-xs font-mono font-bold text-[#164E3F] mt-1 tabular-nums">
                              ₹{p.discountedPrice.toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[#E2DFD7]">
                            <button
                              type="button"
                              onClick={() => {
                                addToCart(p, p.sizes[0] || 'M', p.colors[0]?.name || 'Standard', 1, false);
                                toggleWishlist(p.id);
                              }}
                              className="flex-1 py-1.5 bg-[#164E3F] text-white text-[11px] font-semibold rounded hover:bg-[#0F3A2E] flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>Move to Bag</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleWishlist(p.id)}
                              className="p-1.5 text-[#63615C] hover:text-[#B91C1C] rounded border border-[#E2DFD7] cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'addresses' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#164E3F]">Saved Addresses</h3>
                    <button
                      type="button"
                      onClick={() => setShowAddAddress(!showAddAddress)}
                      className="px-3 py-1.5 bg-[#164E3F] text-white text-xs font-semibold rounded-md flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Address</span>
                    </button>
                  </div>

                  {showAddAddress && (
                    <form onSubmit={handleSaveAddress} className="p-4 bg-white rounded-lg border border-[#E2DFD7] space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          required
                          placeholder="Full Name"
                          value={newAddrName}
                          onChange={(e) => setNewAddrName(e.target.value)}
                          className="text-xs px-3 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2]"
                        />
                        <input
                          type="tel"
                          required
                          placeholder="Mobile Phone"
                          value={newAddrPhone}
                          onChange={(e) => setNewAddrPhone(e.target.value)}
                          className="text-xs px-3 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2]"
                        />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="House / Flat No., Street, Landmark"
                        value={newAddrStreet}
                        onChange={(e) => setNewAddrStreet(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2]"
                      />
                      <div className="grid grid-cols-3 gap-3">
                        <input
                          type="text"
                          required
                          placeholder="City"
                          value={newAddrCity}
                          onChange={(e) => setNewAddrCity(e.target.value)}
                          className="text-xs px-3 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2]"
                        />
                        <input
                          type="text"
                          required
                          placeholder="State"
                          value={newAddrState}
                          onChange={(e) => setNewAddrState(e.target.value)}
                          className="text-xs px-3 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2]"
                        />
                        <input
                          type="text"
                          required
                          maxLength={6}
                          placeholder="PIN Code"
                          value={newAddrPincode}
                          onChange={(e) => setNewAddrPincode(e.target.value)}
                          className="text-xs px-3 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2]"
                        />
                      </div>
                      <button type="submit" className="px-4 py-2 bg-[#141413] text-white text-xs font-semibold rounded-md cursor-pointer">
                        Save Address
                      </button>
                    </form>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {user.addresses.map((addr) => (
                      <div key={addr.id} className="p-4 bg-white rounded-lg border border-[#E2DFD7] space-y-1 text-xs">
                        <div className="flex justify-between items-center font-bold text-[#141413]">
                          <span>{addr.fullName}</span>
                          <div className="flex items-center gap-2">
                            {addr.isDefault && (
                              <span className="text-[10px] text-[#166534] bg-[#ECFDF5] px-2 py-0.5 rounded">Default</span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteAddress(addr.id)}
                              title="Delete saved address"
                              className="text-[#63615C] hover:text-[#B91C1C] cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-[#63615C]">{addr.street}</p>
                        <p className="text-[#63615C]">
                          {addr.city}, {addr.state} - {addr.pincode}
                        </p>
                        <p className="text-[#63615C] pt-1 font-mono">Phone: {addr.phone}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'loyalty' && (
                <div className="space-y-4">
                  {/* VIP Membership Tier Card */}
                  {vipStatus && (
                    <div className="p-5 bg-[#141413] text-white rounded-lg border border-[#2E2D2A] space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Crown className="w-5 h-5 text-[#D4AF6A]" />
                          <div>
                            <span className="text-[10px] uppercase tracking-widest text-[#D4AF6A] font-semibold block">
                              Atelier VIP Status
                            </span>
                            <h4 className="font-serif text-xl font-bold">{vipStatus.tier.name}</h4>
                          </div>
                        </div>
                        <div className="text-right font-mono text-xs">
                          <span className="text-[#CBC7BE] block">Lifetime Spend</span>
                          <strong className="text-[#D4AF6A]">₹{vipStatus.lifetimeSpend.toLocaleString()}</strong>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 text-[11px] text-[#CBC7BE]">
                        <span>• {vipStatus.tier.discountPercent}% Extra Privilege</span>
                        <span>• {vipStatus.tier.pointsMultiplier}× Loyalty Points</span>
                        {vipStatus.tier.freeShippingAlways && <span>• Always Free Express Shipping</span>}
                        {vipStatus.tier.earlyAccessFlashSales && <span>• Early Flash Sale Access</span>}
                      </div>
                      {vipStatus.nextTier && (
                        <p className="text-[11px] text-[#D4AF6A]">
                          Spend ₹{vipStatus.spendToNextTier.toLocaleString()} more to unlock{' '}
                          <strong>{vipStatus.nextTier.name}</strong> ({vipStatus.nextTier.discountPercent}% VIP discount).
                        </p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-5 bg-white rounded-lg border border-[#E2DFD7] space-y-1">
                      <span className="text-[11px] uppercase tracking-wider font-semibold text-[#63615C]">
                        Available Loyalty Balance
                      </span>
                      <p className="font-mono text-3xl font-bold text-[#164E3F] tabular-nums">
                        {user.loyaltyPoints || 0} pts
                      </p>
                      <p className="text-xs text-[#63615C]">
                        Worth <strong className="text-[#141413]">₹{(user.loyaltyPoints || 0).toLocaleString()}</strong>{' '}
                        instant discount at checkout (1 pt = ₹1).
                      </p>
                    </div>

                    <div className="p-5 bg-white rounded-lg border border-[#E2DFD7] space-y-2">
                      <span className="text-[11px] uppercase tracking-wider font-semibold text-[#8E6D3B]">
                        Your Referral Code
                      </span>
                      <div className="flex items-center gap-2">
                        <code className="px-3 py-1.5 bg-[#F7F6F2] border border-[#E2DFD7] rounded font-mono text-sm font-bold text-[#141413]">
                          {user.referralCode || 'ZOHRA-VIP'}
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            if (user.referralCode) {
                              navigator.clipboard?.writeText(user.referralCode);
                              showToast({ title: 'Copied', subtitle: 'Referral code copied.', type: 'success' });
                            }
                          }}
                          className="p-2 border border-[#E2DFD7] rounded hover:bg-[#F7F6F2] cursor-pointer"
                          title="Copy referral code"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-[11px] text-[#63615C]">
                        Share with friends to earn bonus loyalty points when they register and shop.
                      </p>
                    </div>
                  </div>

                  {/* Digital Gift Cards Wallet */}
                  <div className="bg-white rounded-lg border border-[#E2DFD7] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#141413] flex items-center gap-1.5">
                        <Gift className="w-4 h-4 text-[#8E6D3B]" />
                        <span>Digital Gift Cards ({userGiftCards.length})</span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthModalOpen(false);
                          setGiftCardModalOpen(true);
                        }}
                        className="px-3 py-1 bg-[#141413] text-white text-[11px] font-semibold rounded cursor-pointer"
                      >
                        Buy / Check Card
                      </button>
                    </div>
                    {userGiftCards.length === 0 ? (
                      <p className="text-xs text-[#63615C]">
                        No gift cards linked to your email yet. Send an instant digital gift card for birthdays or Eid.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {userGiftCards.map((gc) => (
                          <div key={gc.id} className="p-3 bg-[#F7F6F2] border border-[#E2DFD7] rounded space-y-1 text-xs">
                            <div className="flex justify-between font-mono font-bold text-[#141413]">
                              <span>{gc.code}</span>
                              <span className="text-[#164E3F]">₹{gc.currentBalance.toLocaleString()}</span>
                            </div>
                            <p className="text-[10px] text-[#63615C]">
                              Status: {gc.status.toUpperCase()} · For {gc.recipientName}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-lg border border-[#E2DFD7] p-4 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#141413]">Points Activity Ledger</h4>
                    {!user.loyaltyHistory || user.loyaltyHistory.length === 0 ? (
                      <p className="text-xs text-[#63615C] py-4">
                        No points activity yet. Earn loyalty points on orders placed!
                      </p>
                    ) : (
                      <div className="divide-y divide-[#EFECE6] text-xs">
                        {user.loyaltyHistory.map((entry) => (
                          <div key={entry.id} className="py-2 flex items-center justify-between">
                            <div>
                              <p className="font-medium text-[#141413]">{entry.description}</p>
                              <p className="text-[10px] font-mono text-[#63615C]">
                                {new Date(entry.date).toLocaleDateString()}
                              </p>
                            </div>
                            <span
                              className={`font-mono font-bold tabular-nums ${
                                entry.points >= 0 ? 'text-[#166534]' : 'text-[#B91C1C]'
                              }`}
                            >
                              {entry.points >= 0 ? `+${entry.points}` : entry.points} pts
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#164E3F]">
                      Order &amp; Stock Alerts
                    </h3>
                    {unreadNotificationCount > 0 && (
                      <button
                        type="button"
                        onClick={() => markCustomerNotificationsRead()}
                        className="text-xs font-semibold text-[#164E3F] hover:underline cursor-pointer"
                      >
                        Mark All Read
                      </button>
                    )}
                  </div>
                  <div className="bg-white rounded-lg border border-[#E2DFD7] divide-y divide-[#EFECE6]">
                    {customerNotifications.length === 0 ? (
                      <p className="p-8 text-center text-xs text-[#63615C]">
                        No notifications yet. Order updates, restock alerts, and price drops appear here.
                      </p>
                    ) : (
                      customerNotifications.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            markCustomerNotificationsRead(n.id);
                            if (n.linkId && (n.category === 'order' || n.category === 'payment' || n.category === 'return')) {
                              setLastOrderId(n.linkId);
                              setAuthModalOpen(false);
                              setTrackingModalOpen(true);
                            }
                          }}
                          className={`w-full text-left p-4 hover:bg-[#F7F6F2] transition-colors cursor-pointer ${
                            !n.isRead ? 'bg-[#ECF4F1]/40' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-[#141413]">{n.title}</span>
                            <span className="text-[10px] font-mono text-[#63615C]">
                              {new Date(n.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-[#63615C] mt-1">{n.message}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'profile' && (
                <form onSubmit={handleUpdateProfile} className="max-w-lg space-y-4 text-xs bg-white p-6 rounded-lg border border-[#E2DFD7]">
                  <div>
                    <label className="text-[11px] font-semibold text-[#63615C] block mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2] focus:outline-none focus:border-[#164E3F]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#63615C] block mb-1">Registered Email</label>
                    <input
                      type="email"
                      disabled
                      value={user.email}
                      className="w-full px-3 py-2 border border-[#E2DFD7] rounded-md bg-[#EFECE6] text-[#63615C] font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#63615C] block mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2] font-mono focus:outline-none focus:border-[#164E3F]"
                    />
                  </div>
                  <div className="p-3 bg-[#F7F6F2] border border-[#E2DFD7] rounded space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profileBdayConsent}
                        onChange={(e) => setProfileBdayConsent(e.target.checked)}
                        className="accent-[#164E3F]"
                      />
                      <span className="font-medium">Birthday reward preference consent</span>
                    </label>
                    {profileBdayConsent && (
                      <select
                        value={profileBdayMonth}
                        onChange={(e) => setProfileBdayMonth(Number(e.target.value))}
                        className="w-full px-3 py-1.5 border border-[#E2DFD7] rounded bg-white"
                      >
                        {[
                          'January',
                          'February',
                          'March',
                          'April',
                          'May',
                          'June',
                          'July',
                          'August',
                          'September',
                          'October',
                          'November',
                          'December',
                        ].map((m, idx) => (
                          <option key={m} value={idx + 1}>
                            {m}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="p-3 bg-[#F7F6F2] border border-[#E2DFD7] rounded space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#164E3F]">
                      Privacy &amp; Communication Consents
                    </p>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={abandonedConsent}
                        onChange={(e) => setAbandonedConsent(e.target.checked)}
                        className="accent-[#164E3F]"
                      />
                      <span className="font-medium">Abandoned Bag Recovery Reminders (only sent with consent)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={marketingConsent}
                        onChange={(e) => setMarketingConsent(e.target.checked)}
                        className="accent-[#164E3F]"
                      />
                      <span className="font-medium">Seasonal Eid, Festive &amp; VIP Collection Updates</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-5 py-2.5 bg-[#164E3F] text-white font-semibold rounded-md hover:bg-[#0F3A2E] cursor-pointer"
                  >
                    {savingProfile ? 'Saving...' : 'Update Profile & Consents'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
