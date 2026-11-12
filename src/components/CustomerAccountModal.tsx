import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { Order } from '../types.ts';
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
    wishlist,
    products,
    addToCart,
    toggleWishlist,
    setTrackingModalOpen,
    setLastOrderId,
    setActiveView,
    showToast,
  } = useStore();

  const [activeTab, setActiveTab] = useState<'orders' | 'wishlist' | 'addresses' | 'profile'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regError, setRegError] = useState<string | null>(null);

  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddrName, setNewAddrName] = useState('');
  const [newAddrPhone, setNewAddrPhone] = useState('');
  const [newAddrStreet, setNewAddrStreet] = useState('');
  const [newAddrCity, setNewAddrCity] = useState('');
  const [newAddrState, setNewAddrState] = useState('Delhi');
  const [newAddrPincode, setNewAddrPincode] = useState('');

  useEffect(() => {
    if (user && token && authModalOpen) {
      setLoadingOrders(true);
      fetch('/api/user/orders', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.orders) setOrders(data.orders);
          setLoadingOrders(false);
        })
        .catch(() => setLoadingOrders(false));
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

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    const res = await register(regName, regEmail, regPassword, regPhone);
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
        setShowAddAddress(false);
        showToast({ title: 'Address Saved', subtitle: 'Default shipping address updated.', type: 'success' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const wishlistProducts = products.filter((p) => wishlist.includes(p.id));
  const isOwnerOrPartner = Boolean(user && user.role === 'admin');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 flex items-center justify-center">
      <div className="relative w-full max-w-4xl bg-[#FAF8F5] rounded-xl shadow-2xl border border-[#E5DFD7] overflow-hidden my-auto max-h-[92vh] flex flex-col font-sans text-[#1C1917]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-[#E5DFD7]">
          <div className="flex items-center gap-2.5">
            <UserIcon className="w-5 h-5 text-[#6D1D3A]" />
            <h2 className="font-serif text-xl font-bold text-[#1C1917]">
              {user ? `Welcome, ${user.name}` : authMode === 'login' ? 'Customer Sign In' : 'Create Customer Account'}
            </h2>
          </div>
          <button
            onClick={() => setAuthModalOpen(false)}
            aria-label="Close account modal"
            className="p-1.5 rounded-md text-[#6B625D] hover:text-[#1C1917] hover:bg-[#F3EFEA] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {!user ? (
            <div className="max-w-md mx-auto py-2">
              <div className="flex rounded-md bg-[#F3EFEA] p-1 mb-6 border border-[#E5DFD7]">
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className={`flex-1 py-2 text-xs font-semibold rounded transition-colors cursor-pointer ${
                    authMode === 'login' ? 'bg-[#6D1D3A] text-white' : 'text-[#6B625D]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className={`flex-1 py-2 text-xs font-semibold rounded transition-colors cursor-pointer ${
                    authMode === 'register' ? 'bg-[#6D1D3A] text-white' : 'text-[#6B625D]'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {authMode === 'login' ? (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  {loginError && (
                    <div className="p-3 bg-[#FEF2F2] text-[#B91C1C] text-xs rounded-md border border-[#FECACA]">
                      {loginError}
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] font-semibold text-[#6B625D] block mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="e.g. aanya.sharma@example.com"
                      className="w-full text-xs px-3 py-2.5 border border-[#E5DFD7] rounded-md bg-white focus:outline-none focus:border-[#6D1D3A]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#6B625D] block mb-1">Password</label>
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-xs px-3 py-2.5 border border-[#E5DFD7] rounded-md bg-white focus:outline-none focus:border-[#6D1D3A]"
                    />
                  </div>

                  <div className="p-3 bg-white rounded-md border border-[#E5DFD7] text-[11px] text-[#6B625D]">
                    <p className="font-semibold text-[#1C1917]">Demo Customer Shopper Account</p>
                    <p>Email: <code className="font-mono text-[#6D1D3A]">aanya.sharma@example.com</code></p>
                    <p>Password: <code className="font-mono text-[#6D1D3A]">password123</code></p>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginEmail('aanya.sharma@example.com');
                        setLoginPassword('password123');
                      }}
                      className="mt-1.5 text-[11px] text-[#6D1D3A] underline font-bold cursor-pointer"
                    >
                      Auto-fill Customer Credentials
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#6D1D3A] hover:bg-[#53142B] text-white text-xs font-semibold uppercase tracking-wider rounded-md transition-colors cursor-pointer"
                  >
                    Sign In
                  </button>

                  <p className="text-center text-xs text-[#6B625D]">
                    New to Zohra Luxe?{' '}
                    <button
                      type="button"
                      onClick={() => setAuthMode('register')}
                      className="text-[#6D1D3A] font-bold underline cursor-pointer"
                    >
                      Create Account
                    </button>
                  </p>

                  <div className="pt-3 border-t border-[#E5DFD7] text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthModalOpen(false);
                        setActiveView('admin');
                      }}
                      className="text-xs text-[#6D1D3A] hover:underline font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>Store Owner &amp; Partner Admin Login</span>
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  {regError && (
                    <div className="p-3 bg-[#FEF2F2] text-[#B91C1C] text-xs rounded-md border border-[#FECACA]">
                      {regError}
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] font-semibold text-[#6B625D] block mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Riya Sen"
                      className="w-full text-xs px-3 py-2.5 border border-[#E5DFD7] rounded-md bg-white focus:outline-none focus:border-[#6D1D3A]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#6B625D] block mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full text-xs px-3 py-2.5 border border-[#E5DFD7] rounded-md bg-white focus:outline-none focus:border-[#6D1D3A]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#6B625D] block mb-1">Mobile Phone</label>
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+91 98765 00000"
                      className="w-full text-xs px-3 py-2.5 border border-[#E5DFD7] rounded-md bg-white focus:outline-none focus:border-[#6D1D3A]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#6B625D] block mb-1">Password</label>
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full text-xs px-3 py-2.5 border border-[#E5DFD7] rounded-md bg-white focus:outline-none focus:border-[#6D1D3A]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#6D1D3A] hover:bg-[#53142B] text-white text-xs font-semibold uppercase tracking-wider rounded-md transition-colors cursor-pointer"
                  >
                    Create Account
                  </button>

                  <p className="text-center text-xs text-[#6B625D]">
                    Already registered?{' '}
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className="text-[#6D1D3A] font-bold underline cursor-pointer"
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
                <div className="p-4 bg-[#4B1328] text-white rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-white/15 text-[#FDE68A] text-[10px] font-bold uppercase px-2 py-0.5 rounded">
                        Authorized Store Admin
                      </span>
                      <h4 className="font-serif font-bold text-base">Admin Control Center</h4>
                    </div>
                    <p className="text-xs text-[#FAF8F5]/80">
                      Signed in as {user.email}. Open the admin panel to manage products, orders, partners, and customers.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setAuthModalOpen(false);
                      setActiveView('admin');
                    }}
                    className="px-4 py-2 bg-white text-[#4B1328] text-xs font-bold uppercase rounded-md hover:bg-[#FAF8F5] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Open Admin Dashboard
                  </button>
                </div>
              )}

              {/* Account Navigation Tabs */}
              <div className="flex border-b border-[#E5DFD7] overflow-x-auto text-xs font-semibold uppercase tracking-wider">
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === 'orders'
                      ? 'border-[#6D1D3A] text-[#6D1D3A]'
                      : 'border-transparent text-[#6B625D] hover:text-[#1C1917]'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>Orders ({orders.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('wishlist')}
                  className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === 'wishlist'
                      ? 'border-[#6D1D3A] text-[#6D1D3A]'
                      : 'border-transparent text-[#6B625D] hover:text-[#1C1917]'
                  }`}
                >
                  <Heart className="w-4 h-4" />
                  <span>Wishlist ({wishlist.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('addresses')}
                  className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === 'addresses'
                      ? 'border-[#6D1D3A] text-[#6D1D3A]'
                      : 'border-transparent text-[#6B625D] hover:text-[#1C1917]'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  <span>Addresses</span>
                </button>

                <button
                  onClick={() => setActiveTab('profile')}
                  className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === 'profile'
                      ? 'border-[#6D1D3A] text-[#6D1D3A]'
                      : 'border-transparent text-[#6B625D] hover:text-[#1C1917]'
                  }`}
                >
                  <UserIcon className="w-4 h-4" />
                  <span>Profile</span>
                </button>

                <button
                  onClick={logout}
                  className="py-3 px-4 border-b-2 border-transparent text-[#B91C1C] hover:underline transition-colors flex items-center gap-2 ml-auto whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>

              {activeTab === 'orders' && (
                <div className="space-y-4">
                  {loadingOrders ? (
                    <p className="text-center py-8 text-xs text-[#6B625D]">Loading order history...</p>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-12 text-[#6B625D] text-xs space-y-3 bg-white rounded-lg border border-[#E5DFD7]">
                      <p>You have not placed any orders yet.</p>
                      <button
                        onClick={() => setAuthModalOpen(false)}
                        className="px-4 py-2 bg-[#6D1D3A] text-white rounded-md text-xs font-semibold cursor-pointer"
                      >
                        Explore Collections
                      </button>
                    </div>
                  ) : (
                    orders.map((ord) => (
                      <div key={ord.id} className="p-4 bg-white rounded-lg border border-[#E5DFD7] space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E5DFD7]">
                          <div>
                            <span className="font-mono font-bold text-sm text-[#6D1D3A]">{ord.id}</span>
                            <span className="text-[11px] text-[#6B625D] ml-2">
                              {new Date(ord.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                                ord.orderStatus === 'Delivered'
                                  ? 'bg-[#ECFDF5] text-[#166534] border-[#A7F3D0]'
                                  : 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'
                              }`}
                            >
                              {ord.orderStatus}
                            </span>
                            <button
                              onClick={() => {
                                setLastOrderId(ord.id);
                                setAuthModalOpen(false);
                                setTrackingModalOpen(true);
                              }}
                              className="text-xs text-[#6D1D3A] underline font-semibold cursor-pointer"
                            >
                              Track Live
                            </button>
                          </div>
                        </div>

                        <div className="divide-y divide-[#E5DFD7]">
                          {ord.items.map((it, idx) => (
                            <div key={idx} className="py-2 flex items-center gap-3">
                              <img
                                src={it.image || '/src/assets/images/category_kurtis_showcase_1794109164419.jpg'}
                                alt={it.name}
                                referrerPolicy="no-referrer"
                                className="w-11 h-14 rounded object-cover border border-[#E5DFD7]"
                              />
                              <div className="flex-1">
                                <p className="text-xs font-semibold text-[#1C1917]">{it.name}</p>
                                <p className="text-[11px] text-[#6B625D]">
                                  Size: {it.size} · Shade: {it.color} · Qty: {it.quantity}
                                </p>
                              </div>
                              <span className="text-xs font-mono font-bold tabular-nums">
                                ₹{(it.price * it.quantity).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-wrap items-center justify-between text-xs pt-2 border-t border-[#E5DFD7] gap-2">
                          <div className="text-[11px] text-[#6B625D]">
                            {ord.courierDetails && (
                              <span>
                                Sent via <strong>{ord.courierDetails.provider}</strong> (AWB:{' '}
                                <code className="font-mono">{ord.courierDetails.trackingNumber}</code>)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                const receiptText = `=== ZOHRA LUXE OFFICIAL TAX INVOICE ===\nOrder ID: ${ord.id}\nDate: ${new Date(ord.createdAt).toLocaleString()}\nCustomer: ${ord.customerName}\nEmail: ${ord.customerEmail}\nPhone: ${ord.customerPhone}\nDelivery Address: ${ord.deliveryAddress.street}, ${ord.deliveryAddress.city}, ${ord.deliveryAddress.state} - ${ord.deliveryAddress.pincode}\nPayment Method: ${ord.paymentMethod.toUpperCase()}\n\nITEMS:\n${ord.items.map((it) => `- ${it.name} | Size: ${it.size} | Color: ${it.color} | Qty: ${it.quantity} | Price: ₹${it.price}`).join('\n')}\n\nTOTAL PAID: ₹${ord.total}\n\nThank you for shopping at Zohra Luxe!`;
                                const blob = new Blob([receiptText], { type: 'text/plain' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `Invoice_${ord.id}.txt`;
                                a.click();
                                URL.revokeObjectURL(url);
                              }}
                              className="text-xs text-[#6D1D3A] hover:underline font-semibold cursor-pointer"
                            >
                              Invoice
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                ord.items.forEach((it) => {
                                  const prod = products.find((p) => p.id === it.productId);
                                  if (prod) addToCart(prod, it.size, it.color, it.quantity, false);
                                });
                                setAuthModalOpen(false);
                                showToast({
                                  title: `Reordered Items from ${ord.id}`,
                                  subtitle: 'Added to your shopping bag.',
                                  type: 'success',
                                  showBagActions: true,
                                });
                              }}
                              className="px-3 py-1 bg-[#6D1D3A] text-white rounded text-xs font-semibold hover:bg-[#53142B] transition-colors cursor-pointer"
                            >
                              Reorder
                            </button>

                            <span className="font-bold text-[#1C1917]">
                              Total: <strong className="font-mono text-[#6D1D3A] tabular-nums">₹{ord.total.toLocaleString()}</strong>
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'wishlist' && (
                <div className="space-y-4">
                  {wishlistProducts.length === 0 ? (
                    <div className="text-center py-12 text-[#6B625D] text-xs bg-white rounded-lg border border-[#E5DFD7]">
                      <p>Your wishlist is currently empty.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {wishlistProducts.map((p) => (
                        <div
                          key={p.id}
                          className="p-3 bg-white rounded-lg border border-[#E5DFD7] flex flex-col justify-between"
                        >
                          <div className="aspect-[3/4] rounded overflow-hidden bg-[#F3EFEA] mb-2">
                            <img src={p.images[0]} alt={p.name} referrerPolicy="no-referrer" className="w-full h-full object-cover object-top" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-[#1C1917] line-clamp-1">{p.name}</p>
                            <p className="text-xs font-mono font-bold text-[#6D1D3A] mt-1 tabular-nums">
                              ₹{p.discountedPrice.toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[#E5DFD7]">
                            <button
                              onClick={() => {
                                addToCart(p, p.sizes[0] || 'M', p.colors[0]?.name || 'Standard', 1, false);
                                toggleWishlist(p.id);
                              }}
                              className="flex-1 py-1.5 bg-[#6D1D3A] text-white text-[11px] font-semibold rounded hover:bg-[#53142B] flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>Move to Bag</span>
                            </button>
                            <button
                              onClick={() => toggleWishlist(p.id)}
                              className="p-1.5 text-[#6B625D] hover:text-[#B91C1C] rounded border border-[#E5DFD7] cursor-pointer"
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
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#6D1D3A]">Saved Addresses</h3>
                    <button
                      onClick={() => setShowAddAddress(!showAddAddress)}
                      className="px-3 py-1.5 bg-[#6D1D3A] text-white text-xs font-semibold rounded-md flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Address</span>
                    </button>
                  </div>

                  {showAddAddress && (
                    <form onSubmit={handleSaveAddress} className="p-4 bg-white rounded-lg border border-[#E5DFD7] space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          required
                          placeholder="Full Name"
                          value={newAddrName}
                          onChange={(e) => setNewAddrName(e.target.value)}
                          className="text-xs px-3 py-2 border border-[#E5DFD7] rounded-md bg-[#FAF8F5]"
                        />
                        <input
                          type="tel"
                          required
                          placeholder="Mobile Phone"
                          value={newAddrPhone}
                          onChange={(e) => setNewAddrPhone(e.target.value)}
                          className="text-xs px-3 py-2 border border-[#E5DFD7] rounded-md bg-[#FAF8F5]"
                        />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="House / Flat No., Street, Landmark"
                        value={newAddrStreet}
                        onChange={(e) => setNewAddrStreet(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-[#E5DFD7] rounded-md bg-[#FAF8F5]"
                      />
                      <div className="grid grid-cols-3 gap-3">
                        <input
                          type="text"
                          required
                          placeholder="City"
                          value={newAddrCity}
                          onChange={(e) => setNewAddrCity(e.target.value)}
                          className="text-xs px-3 py-2 border border-[#E5DFD7] rounded-md bg-[#FAF8F5]"
                        />
                        <input
                          type="text"
                          required
                          placeholder="State"
                          value={newAddrState}
                          onChange={(e) => setNewAddrState(e.target.value)}
                          className="text-xs px-3 py-2 border border-[#E5DFD7] rounded-md bg-[#FAF8F5]"
                        />
                        <input
                          type="text"
                          required
                          maxLength={6}
                          placeholder="PIN Code"
                          value={newAddrPincode}
                          onChange={(e) => setNewAddrPincode(e.target.value)}
                          className="text-xs px-3 py-2 border border-[#E5DFD7] rounded-md bg-[#FAF8F5]"
                        />
                      </div>
                      <button type="submit" className="px-4 py-2 bg-[#1C1917] text-white text-xs font-semibold rounded-md cursor-pointer">
                        Save Address
                      </button>
                    </form>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {user.addresses.map((addr) => (
                      <div key={addr.id} className="p-4 bg-white rounded-lg border border-[#E5DFD7] space-y-1 text-xs">
                        <div className="flex justify-between font-bold text-[#1C1917]">
                          <span>{addr.fullName}</span>
                          {addr.isDefault && (
                            <span className="text-[10px] text-[#166534] bg-[#ECFDF5] px-2 py-0.5 rounded">Default</span>
                          )}
                        </div>
                        <p className="text-[#6B625D]">{addr.street}</p>
                        <p className="text-[#6B625D]">
                          {addr.city}, {addr.state} - {addr.pincode}
                        </p>
                        <p className="text-[#6B625D] pt-1 font-mono">Phone: {addr.phone}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'profile' && (
                <div className="max-w-lg space-y-3 text-xs bg-white p-6 rounded-lg border border-[#E5DFD7]">
                  <div>
                    <span className="text-[11px] text-[#6B625D] block">Account Name</span>
                    <span className="font-semibold text-sm text-[#1C1917]">{user.name}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#6B625D] block">Registered Email</span>
                    <span className="font-semibold text-sm text-[#1C1917] font-mono">{user.email}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#6B625D] block">Phone Number</span>
                    <span className="font-semibold text-sm text-[#1C1917] font-mono">{user.phone || 'Not added'}</span>
                  </div>
                  <div className="pt-4 border-t border-[#E5DFD7]">
                    <span className="text-[11px] text-[#6D1D3A] font-semibold">Verified Retail Member</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
