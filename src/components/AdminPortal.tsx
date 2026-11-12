import React, { useState } from 'react';
import { Product, Category, Order, Coupon, WebsiteSettings, ActivityLog, SupportInquiry } from '../types.ts';
import { useStore } from '../context/StoreContext.tsx';
import {
  Shield,
  LayoutDashboard,
  Shirt,
  Layers,
  ShoppingBag,
  Users,
  CreditCard,
  Tag,
  Settings,
  BarChart3,
  History,
  LogOut,
  Plus,
  Trash2,
  Edit,
  Search,
  CheckCircle,
  RotateCcw,
  Download,
  AlertTriangle,
  ArrowLeft,
  X,
  ExternalLink,
  Eye,
  EyeOff,
  UserCheck,
} from 'lucide-react';

interface NoticeState {
  type: 'success' | 'error';
  text: string;
}

export const AdminPortal: React.FC = () => {
  const {
    adminUser,
    adminToken,
    adminPasswordLogin,
    adminGoogleLogin,
    updateSuperAdminEmail,
    adminLogout,
    setActiveView,
    refreshProducts,
    refreshCategories,
    refreshSettings,
  } = useStore();

  // Private Login State — Never prefill or expose credentials publicly
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [newAdminEmailInput, setNewAdminEmailInput] = useState('');
  const [updateEmailMsg, setUpdateEmailMsg] = useState<string | null>(null);
  const [updatingEmail, setUpdatingEmail] = useState(false);

  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'team'
    | 'products'
    | 'categories'
    | 'orders'
    | 'customers'
    | 'payments'
    | 'coupons'
    | 'settings'
    | 'reports'
    | 'logs'
  >('overview');

  const [notice, setNotice] = useState<NoticeState | null>(null);
  const pushNotice = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice((prev) => (prev?.text === text ? null : prev)), 5000);
  };

  // Dashboard Data State
  const [overview, setOverview] = useState<any>(null);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [couponsList, setCouponsList] = useState<Coupon[]>([]);
  const [settingsData, setSettingsData] = useState<WebsiteSettings | null>(null);
  const [reportsData, setReportsData] = useState<any>(null);
  const [logsList, setLogsList] = useState<ActivityLog[]>([]);
  const [supportList, setSupportList] = useState<SupportInquiry[]>([]);

  // Team / Partners Management State
  const [teamList, setTeamList] = useState<any[]>([]);
  const [newPartnerName, setNewPartnerName] = useState('');
  const [newPartnerEmail, setNewPartnerEmail] = useState('');
  const [newPartnerPhone, setNewPartnerPhone] = useState('');
  const [newPartnerPassword, setNewPartnerPassword] = useState('');
  const [teamLoading, setTeamLoading] = useState(false);
  const [editingPartner, setEditingPartner] = useState<any | null>(null);
  const [confirmRemovePartnerId, setConfirmRemovePartnerId] = useState<string | null>(null);

  // Customers Directory State
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState<'all' | 'activeOrders' | 'deliveredOrders' | 'blocked'>('all');
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const [confirmDeleteCustomerId, setConfirmDeleteCustomerId] = useState<string | null>(null);
  const [confirmCleanupDelivered, setConfirmCleanupDelivered] = useState(false);
  const [cleaningDelivered, setCleaningDelivered] = useState(false);

  // Products, Categories, Coupons Inline Delete Confirmations (Zero confirm())
  const [confirmDeleteProductId, setConfirmDeleteProductId] = useState<string | null>(null);
  const [confirmDeleteCouponCode, setConfirmDeleteCouponCode] = useState<string | null>(null);

  // Admin Modals
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [orderDetailModal, setOrderDetailModal] = useState<Order | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [couponModalOpen, setCouponModalOpen] = useState(false);

  // Filters within Admin
  const [productSearch, setProductSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');

  const fetchAdminData = async () => {
    if (!adminToken) return;
    try {
      const headers = { Authorization: `Bearer ${adminToken}` };

      if (activeTab === 'overview') {
        const [oRes, tRes] = await Promise.all([
          fetch('/api/admin/overview', { headers }),
          fetch('/api/admin/team', { headers }),
        ]);
        if (oRes.ok) setOverview(await oRes.json());
        if (tRes.ok) setTeamList((await tRes.json()).admins || []);
      } else if (activeTab === 'team') {
        const res = await fetch('/api/admin/team', { headers });
        if (res.ok) setTeamList((await res.json()).admins || []);
      } else if (activeTab === 'products') {
        const res = await fetch('/api/admin/products', { headers });
        if (res.ok) setProductsList((await res.json()).products || []);
      } else if (activeTab === 'categories') {
        const res = await fetch('/api/categories');
        if (res.ok) setCategoriesList((await res.json()).categories || []);
      } else if (activeTab === 'orders' || activeTab === 'payments') {
        const res = await fetch('/api/admin/orders', { headers });
        if (res.ok) setOrdersList((await res.json()).orders || []);
      } else if (activeTab === 'customers') {
        const res = await fetch('/api/admin/customers', { headers });
        if (res.ok) setCustomersList((await res.json()).customers || []);
      } else if (activeTab === 'coupons') {
        const res = await fetch('/api/admin/coupons', { headers });
        if (res.ok) setCouponsList((await res.json()).coupons || []);
      } else if (activeTab === 'settings') {
        const res = await fetch('/api/admin/settings', { headers });
        if (res.ok) setSettingsData((await res.json()).settings);
      } else if (activeTab === 'reports') {
        const res = await fetch('/api/admin/analytics/reports', { headers });
        if (res.ok) setReportsData(await res.json());
      } else if (activeTab === 'logs') {
        const [lRes, sRes] = await Promise.all([
          fetch('/api/admin/logs', { headers }),
          fetch('/api/admin/support', { headers }),
        ]);
        if (lRes.ok) setLogsList((await lRes.json()).logs || []);
        if (sRes.ok) setSupportList((await sRes.json()).inquiries || []);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    }
  };

  React.useEffect(() => {
    if (adminToken) {
      fetchAdminData();
    }
  }, [adminToken, activeTab]);

  const handleExportCSV = () => {
    if (!ordersList || ordersList.length === 0) return;
    const headers = ['Order ID', 'Customer Name', 'Email', 'Phone', 'Total (INR)', 'Payment', 'Status', 'Date'];
    const rows = ordersList.map((o) => [
      o.id,
      `"${o.customerName}"`,
      o.customerEmail,
      o.customerPhone,
      o.total,
      o.paymentMethod,
      o.orderStatus,
      new Date(o.createdAt).toLocaleDateString(),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `zohra_luxe_sales_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // =================== UNAUTHENTICATED LOGIN GATE (STRICTLY PRIVATE) ===================
  if (!adminToken || !adminUser) {
    const handlePasswordSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoginError(null);
      setLoginSuccess(null);

      const userEmail = usernameInput.trim().toLowerCase();
      if (!userEmail || !userEmail.includes('@')) {
        setLoginError('Please enter a valid authorized Gmail address.');
        return;
      }
      if (!passwordInput.trim()) {
        setLoginError('Admin password is required.');
        return;
      }

      setLoading(true);
      const res = await adminPasswordLogin(userEmail, passwordInput.trim());
      setLoading(false);

      if (!res.success) {
        setLoginError(res.error || 'Authentication failed. Access denied.');
      } else {
        setLoginSuccess(`Access granted for ${userEmail}. Launching Dashboard...`);
      }
    };

    const handleGoogleQuickAuth = async () => {
      setLoginError(null);
      setLoginSuccess(null);

      const enteredEmail = usernameInput.trim().toLowerCase();
      if (!enteredEmail || !enteredEmail.includes('@')) {
        setLoginError('Enter your authorized Gmail address above before continuing with Google Sign-In.');
        return;
      }

      setLoading(true);
      const res = await adminGoogleLogin(enteredEmail);
      setLoading(false);
      if (!res.success) {
        setLoginError(res.error || 'Google account rejected. Access restricted to Owner & active Partners.');
      } else {
        setLoginSuccess(`Verified via Google (${enteredEmail}). Launching Dashboard...`);
      }
    };

    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans text-[#1C1917]">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-lg bg-[#6D1D3A] flex items-center justify-center text-white shadow-sm">
            <Shield className="w-7 h-7" />
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1917]">
            Admin Control Center
          </h2>
          <p className="text-xs text-[#6B625D]">
            Restricted access for the Primary Store Owner and authorized Store Partners via Gmail.
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-6 sm:px-10 rounded-xl border border-[#E5DFD7] shadow-sm space-y-5">
            {loginError && (
              <div className="p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-md text-[#B91C1C] text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">
                  <p className="font-bold">Access Denied</p>
                  <p className="text-[11px] mt-0.5">{loginError}</p>
                </div>
              </div>
            )}

            {loginSuccess && (
              <div className="p-3.5 bg-[#ECFDF5] border border-[#A7F3D0] rounded-md text-[#166534] text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span className="font-semibold">{loginSuccess}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-[#6B625D] uppercase tracking-wider block mb-1">
                  Authorized Gmail Address
                </label>
                <input
                  type="email"
                  required
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Enter your authorized Gmail"
                  autoComplete="email"
                  className="w-full text-xs px-3.5 py-2.5 border border-[#E5DFD7] rounded-md focus:outline-none focus:border-[#6D1D3A] font-mono text-[#1C1917] bg-[#FAF8F5] focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#6B625D] uppercase tracking-wider block mb-1">
                  Admin Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="w-full text-xs px-3.5 py-2.5 pr-10 border border-[#E5DFD7] rounded-md focus:outline-none focus:border-[#6D1D3A] font-mono text-[#1C1917] bg-[#FAF8F5] focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-2.5 text-[#6B625D] hover:text-[#1C1917] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-[#6D1D3A] hover:bg-[#53142B] text-white text-xs font-semibold uppercase tracking-wider rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Shield className="w-4 h-4" />
                <span>{loading ? 'Authenticating...' : 'Sign In to Admin Panel'}</span>
              </button>
            </form>

            <div className="pt-1">
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-[#E5DFD7]" />
                <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-[#6B625D]">
                  or Gmail verification
                </span>
                <div className="flex-grow border-t border-[#E5DFD7]" />
              </div>

              <button
                type="button"
                onClick={handleGoogleQuickAuth}
                disabled={loading}
                className="w-full py-2.5 px-3 bg-white hover:bg-[#FAF8F5] border border-[#E5DFD7] rounded-md text-xs font-semibold text-[#1C1917] transition-colors flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google (Owner or Partner Gmail)</span>
              </button>
            </div>

            <div className="pt-3 text-center border-t border-[#E5DFD7]">
              <button
                type="button"
                onClick={() => setActiveView('store')}
                className="text-xs text-[#6B625D] hover:text-[#6D1D3A] inline-flex items-center justify-center gap-1.5 font-semibold cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Customer Storefront</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Derived Customer Stats & Filtering
  const deliveredCustomersCount = customersList.filter((c) => c.hasDeliveredOrders).length;
  const filteredCustomers = customersList.filter((cust) => {
    const q = customerSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (cust.name || '').toLowerCase().includes(q) ||
      (cust.email || '').toLowerCase().includes(q) ||
      (cust.phone || '').toLowerCase().includes(q);
    if (!matchesSearch) return false;

    if (customerFilter === 'deliveredOrders') return !!cust.hasDeliveredOrders;
    if (customerFilter === 'activeOrders') return (cust.activeOrdersCount || 0) > 0;
    if (customerFilter === 'blocked') return cust.status === 'blocked';
    return true;
  });

  // =================== AUTHENTICATED ADMIN CONSOLE ===================
  return (
    <div className="min-h-screen bg-[#F8F7F4] flex flex-col font-sans text-[#1C1917]">
      {/* Unified SaaS Header */}
      <header className="bg-white border-b border-[#E5DFD7] px-4 sm:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-[#6D1D3A] flex items-center justify-center text-white">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg font-bold tracking-tight text-[#1C1917]">
                Zohra Luxe Admin
              </span>
              <span className="text-[11px] font-semibold text-[#6D1D3A] bg-[#FBF2F5] px-2 py-0.5 rounded border border-[#E5DFD7]">
                {adminUser.isSuperAdmin ? 'Primary Owner' : 'Store Partner'}
              </span>
            </div>
            <p className="text-[11px] text-[#6B625D] font-mono">{adminUser.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setActiveView('store')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#FAF8F5] text-[#1C1917] border border-[#E5DFD7] rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#6D1D3A]" />
            <span>Storefront</span>
          </button>
          <button
            type="button"
            onClick={adminLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#B91C1C] hover:bg-red-800 text-white rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar Navigation (No thick border-l-4) */}
        <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-[#E5DFD7] p-3 space-y-1 shrink-0">
          {[
            { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
            { id: 'team', label: 'Admin Team & Partners', icon: UserCheck },
            { id: 'products', label: 'Products Catalog', icon: Shirt },
            { id: 'categories', label: 'Categories', icon: Layers },
            { id: 'orders', label: 'Customer Orders', icon: ShoppingBag },
            { id: 'customers', label: 'Customers Directory', icon: Users },
            { id: 'payments', label: 'Payment Transactions', icon: CreditCard },
            { id: 'coupons', label: 'Coupons & Offers', icon: Tag },
            { id: 'settings', label: 'Store Settings', icon: Settings },
            { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
            { id: 'logs', label: 'Activity Logs & Support', icon: History },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id as any);
                  setConfirmCleanupDelivered(false);
                  setConfirmDeleteCustomerId(null);
                  setConfirmRemovePartnerId(null);
                  setConfirmDeleteProductId(null);
                  setConfirmDeleteCouponCode(null);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#FBF2F5] text-[#6D1D3A]'
                    : 'text-[#6B625D] hover:bg-[#FAF8F5] hover:text-[#1C1917]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#6D1D3A]' : 'text-[#6B625D]'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Main Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
          {notice && (
            <div
              className={`p-3.5 rounded-md border text-xs flex items-center justify-between gap-2 ${
                notice.type === 'success'
                  ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#166534]'
                  : 'bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C]'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {notice.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{notice.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="p-0.5 cursor-pointer"
                aria-label="Dismiss message"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ================= TAB 1: OVERVIEW ================= */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-serif text-2xl font-bold text-[#1C1917]">Executive Store Overview</h1>
                  <p className="text-xs text-[#6B625D]">
                    Real-time store revenue, inventory health, and admin team controls
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-4 py-2 bg-[#6D1D3A] hover:bg-[#53142B] text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV Report</span>
                </button>
              </div>

              {/* Super Admin Configuration */}
              <div className="bg-white rounded-lg border border-[#E5DFD7] p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5DFD7] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-md bg-[#FBF2F5] flex items-center justify-center text-[#6D1D3A]">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#1C1917]">Super Admin Access Configuration</h3>
                      <p className="text-[11px] text-[#6B625D]">
                        Primary Store Owner authorization and ownership transfer
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#ECFDF5] text-[#166534] text-[11px] font-semibold rounded border border-[#A7F3D0]">
                    <CheckCircle className="w-3.5 h-3.5" /> Verified Owner
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 bg-[#FAF8F5] rounded-md border border-[#E5DFD7] space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B625D]">
                      Primary Owner Gmail
                    </span>
                    <p className="font-mono text-xs font-bold text-[#6D1D3A] break-all">
                      {overview?.superAdminEmail || adminUser?.email}
                    </p>
                    <p className="text-[11px] text-[#6B625D]">
                      Active Store Partners ({teamList.length}) can also access this panel with their own Gmail under Admin Team &amp; Partners.
                    </p>
                  </div>

                  {adminUser?.isSuperAdmin ? (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!newAdminEmailInput.trim()) return;
                        setUpdatingEmail(true);
                        setUpdateEmailMsg(null);
                        const res = await updateSuperAdminEmail(newAdminEmailInput.trim());
                        setUpdatingEmail(false);
                        if (res.success) {
                          setUpdateEmailMsg(`Super Admin ownership transferred to ${newAdminEmailInput.trim()}.`);
                          setNewAdminEmailInput('');
                          fetchAdminData();
                        } else {
                          setUpdateEmailMsg(res.error || 'Failed to transfer Super Admin email.');
                        }
                      }}
                      className="p-3.5 bg-white rounded-md border border-[#E5DFD7] space-y-2"
                    >
                      <label className="text-[11px] font-bold text-[#1C1917] block">
                        Transfer Primary Ownership Gmail
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          required
                          value={newAdminEmailInput}
                          onChange={(e) => setNewAdminEmailInput(e.target.value)}
                          placeholder="newowner@gmail.com"
                          className="flex-1 px-3 py-1.5 text-xs border border-[#E5DFD7] rounded-md bg-[#FAF8F5] focus:border-[#6D1D3A] focus:outline-none font-mono"
                        />
                        <button
                          type="submit"
                          disabled={updatingEmail}
                          className="px-3.5 py-1.5 bg-[#6D1D3A] hover:bg-[#53142B] text-white text-xs font-semibold rounded-md cursor-pointer transition-colors"
                        >
                          {updatingEmail ? 'Saving...' : 'Update'}
                        </button>
                      </div>
                      {updateEmailMsg && (
                        <p className="text-[11px] font-semibold text-[#166534]">{updateEmailMsg}</p>
                      )}
                    </form>
                  ) : (
                    <div className="p-3.5 bg-white rounded-md border border-[#E5DFD7] space-y-1 flex flex-col justify-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B625D]">
                        Partner Session
                      </span>
                      <p className="font-mono text-xs font-semibold text-[#1C1917] break-all">
                        {adminUser?.email}
                      </p>
                      <p className="text-[11px] text-[#6B625D]">
                        Authorized Store Partner access enabled for inventory, orders, and customers.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* KPI Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-white rounded-lg border border-[#E5DFD7] space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B625D]">Total Revenue</span>
                  <p className="text-2xl font-bold text-[#6D1D3A] font-mono tabular-nums">
                    ₹{overview?.metrics?.totalSales?.toLocaleString() || '0'}
                  </p>
                  <p className="text-[11px] text-[#166534]">Verified active &amp; delivered orders</p>
                </div>

                <div className="p-4 bg-white rounded-lg border border-[#E5DFD7] space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B625D]">Monthly Sales</span>
                  <p className="text-2xl font-bold text-[#1C1917] font-mono tabular-nums">
                    ₹{overview?.metrics?.monthlyRevenue?.toLocaleString() || '0'}
                  </p>
                  <p className="text-[11px] text-[#6B625D]">Current calendar month</p>
                </div>

                <div className="p-4 bg-white rounded-lg border border-[#E5DFD7] space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B625D]">Total Orders</span>
                  <p className="text-2xl font-bold text-[#1C1917] font-mono tabular-nums">
                    {overview?.metrics?.totalOrders || '0'}
                  </p>
                  <p className="text-[11px] text-[#6B625D]">
                    Pending: <strong>{overview?.metrics?.pendingOrders || 0}</strong>
                  </p>
                </div>

                <div className="p-4 bg-white rounded-lg border border-[#E5DFD7] space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B625D]">Total Styles</span>
                  <p className="text-2xl font-bold text-[#1C1917] font-mono tabular-nums">
                    {overview?.metrics?.totalProducts || '0'}
                  </p>
                  <p className="text-[11px] text-[#166534]">Women&apos;s Fashion Catalog</p>
                </div>

                <div className="p-4 bg-white rounded-lg border border-[#E5DFD7] space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B625D]">Low Stock Items</span>
                  <p className="text-2xl font-bold text-[#B45309] font-mono tabular-nums">
                    {overview?.metrics?.lowStockProducts || '0'}
                  </p>
                  <p className="text-[11px] text-[#6B625D]">Under 10 units remaining</p>
                </div>

                <div className="p-4 bg-white rounded-lg border border-[#E5DFD7] space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B625D]">Delivered Orders</span>
                  <p className="text-2xl font-bold text-[#166534] font-mono tabular-nums">
                    {overview?.metrics?.deliveredOrders || '0'}
                  </p>
                  <p className="text-[11px] text-[#166534]">Fulfilled completely</p>
                </div>

                <div className="p-4 bg-white rounded-lg border border-[#E5DFD7] space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B625D]">Registered Customers</span>
                  <p className="text-2xl font-bold text-[#1C1917] font-mono tabular-nums">
                    {overview?.metrics?.totalCustomers || '0'}
                  </p>
                  <p className="text-[11px] text-[#6B625D]">Active shopper profiles</p>
                </div>

                <div className="p-4 bg-white rounded-lg border border-[#E5DFD7] space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B625D]">Authorized Admins</span>
                  <p className="text-2xl font-bold text-[#6D1D3A] font-mono tabular-nums">
                    {teamList.length || 1}
                  </p>
                  <p className="text-[11px] text-[#6B625D]">Owner &amp; store partners</p>
                </div>
              </div>

              {/* Recent Orders */}
              <div className="bg-white rounded-lg border border-[#E5DFD7] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-lg font-bold text-[#1C1917]">Recent Orders</h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="text-xs text-[#6D1D3A] font-semibold hover:underline cursor-pointer"
                  >
                    Manage All Orders
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF8F5] text-[#6B625D] font-semibold border-b border-[#E5DFD7]">
                      <tr>
                        <th className="p-3">Order ID</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Items</th>
                        <th className="p-3">Total</th>
                        <th className="p-3">Payment</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5DFD7]">
                      {overview?.recentOrders?.map((ord: Order) => (
                        <tr key={ord.id} className="hover:bg-[#FAF8F5]">
                          <td className="p-3 font-mono font-bold text-[#6D1D3A]">{ord.id}</td>
                          <td className="p-3">
                            <p className="font-semibold text-[#1C1917]">{ord.customerName}</p>
                            <p className="text-[11px] text-[#6B625D]">{ord.customerEmail}</p>
                          </td>
                          <td className="p-3 font-mono tabular-nums">{ord.items.length} piece(s)</td>
                          <td className="p-3 font-mono font-bold tabular-nums text-[#1C1917]">
                            ₹{ord.total.toLocaleString()}
                          </td>
                          <td className="p-3 uppercase text-[11px] font-semibold text-[#6B625D]">
                            {ord.paymentMethod}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">
                              {ord.orderStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: ADMIN TEAM / STORE PARTNERS ================= */}
          {activeTab === 'team' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-serif text-2xl font-bold text-[#1C1917]">
                    Store Admin Team &amp; Partners
                  </h1>
                  <p className="text-xs text-[#6B625D]">
                    Authorize store partners to open this Admin Panel using their own Gmail account, or edit and remove existing partner access.
                  </p>
                </div>
                <span className="px-3 py-1.5 bg-[#ECFDF5] text-[#166534] text-xs font-semibold rounded-md border border-[#A7F3D0] inline-flex items-center gap-1.5 self-start sm:self-center">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Active Admins: {teamList.length || 1}</span>
                </span>
              </div>

              {/* Add Partner Form */}
              <div className="bg-white rounded-lg border border-[#E5DFD7] p-5 space-y-4">
                <div className="border-b border-[#E5DFD7] pb-3">
                  <h3 className="text-sm font-bold text-[#1C1917]">Add Authorized Store Partner</h3>
                  <p className="text-[11px] text-[#6B625D]">
                    Added partners can log in using their own Gmail via Password or Google Sign-In. Unauthorized Gmails are blocked with HTTP 403.
                  </p>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newPartnerEmail.trim() || !newPartnerEmail.includes('@')) {
                      pushNotice('error', 'Please enter a valid partner Gmail address.');
                      return;
                    }

                    setTeamLoading(true);
                    try {
                      const res = await fetch('/api/admin/team/add', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${adminToken}`,
                        },
                        body: JSON.stringify({
                          name: newPartnerName.trim() || 'Store Partner',
                          email: newPartnerEmail.trim().toLowerCase(),
                          phone: newPartnerPhone.trim() || undefined,
                          password: newPartnerPassword.trim(),
                        }),
                      });
                      const data = await res.json();
                      if (res.ok) {
                        pushNotice(
                          'success',
                          data.message || `Partner ${newPartnerEmail.trim().toLowerCase()} added successfully.`
                        );
                        setNewPartnerName('');
                        setNewPartnerEmail('');
                        setNewPartnerPhone('');
                        setNewPartnerPassword('');
                        fetchAdminData();
                      } else {
                        pushNotice('error', data.error || 'Failed to add store partner.');
                      }
                    } catch {
                      pushNotice('error', 'Network failure while adding store partner.');
                    } finally {
                      setTeamLoading(false);
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="font-semibold text-[#1C1917] block mb-1">Partner Name *</label>
                      <input
                        type="text"
                        required
                        value={newPartnerName}
                        onChange={(e) => setNewPartnerName(e.target.value)}
                        placeholder="e.g. Store Partner"
                        className="w-full p-2.5 border border-[#E5DFD7] rounded-md bg-[#FAF8F5] focus:bg-white focus:border-[#6D1D3A] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-[#1C1917] block mb-1">Partner Gmail Address *</label>
                      <input
                        type="email"
                        required
                        value={newPartnerEmail}
                        onChange={(e) => setNewPartnerEmail(e.target.value)}
                        placeholder="partner@gmail.com"
                        className="w-full p-2.5 border border-[#E5DFD7] rounded-md bg-[#FAF8F5] focus:bg-white focus:border-[#6D1D3A] focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-[#1C1917] block mb-1">Login Password *</label>
                      <input
                        type="text"
                        required
                        value={newPartnerPassword}
                        onChange={(e) => setNewPartnerPassword(e.target.value)}
                        placeholder="Set partner password"
                        className="w-full p-2.5 border border-[#E5DFD7] rounded-md bg-[#FAF8F5] focus:bg-white focus:border-[#6D1D3A] focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-[#1C1917] block mb-1">Phone Number (Optional)</label>
                      <input
                        type="tel"
                        value={newPartnerPhone}
                        onChange={(e) => setNewPartnerPhone(e.target.value)}
                        placeholder="e.g. 9310078735"
                        className="w-full p-2.5 border border-[#E5DFD7] rounded-md bg-[#FAF8F5] focus:bg-white focus:border-[#6D1D3A] focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={teamLoading}
                      className="px-5 py-2.5 bg-[#6D1D3A] hover:bg-[#53142B] text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{teamLoading ? 'Adding Partner...' : 'Add Store Partner'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Partners Table */}
              <div className="bg-white rounded-lg border border-[#E5DFD7] overflow-hidden">
                <div className="p-4 bg-[#FAF8F5] border-b border-[#E5DFD7] flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[#1C1917]">
                      Authorized Administrators ({teamList.length || 1})
                    </h3>
                    <p className="text-[11px] text-[#6B625D]">
                      Only active accounts listed here can access this Admin Control Center.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={fetchAdminData}
                    className="px-3 py-1.5 bg-white hover:bg-[#F3EFEA] border border-[#E5DFD7] rounded-md text-xs font-semibold text-[#1C1917] flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#6D1D3A]" />
                    <span>Refresh</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF8F5] text-[#6B625D] font-semibold border-b border-[#E5DFD7]">
                      <tr>
                        <th className="p-3.5">Administrator</th>
                        <th className="p-3.5">Role</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Phone</th>
                        <th className="p-3.5 text-right">Manage Access</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5DFD7]">
                      {teamList.map((member) => {
                        const isPrimary = !!member.isSuperAdmin;
                        const isCurrentLogged = adminUser?.email?.toLowerCase() === member.email?.toLowerCase();

                        return (
                          <tr key={member.id} className="hover:bg-[#FAF8F5]">
                            <td className="p-3.5">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                                    isPrimary ? 'bg-[#6D1D3A] text-white' : 'bg-[#F3EFEA] text-[#1C1917]'
                                  }`}
                                >
                                  {member.name ? member.name.charAt(0) : 'A'}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-[#1C1917]">{member.name || 'Store Admin'}</span>
                                    {isCurrentLogged && (
                                      <span className="text-[10px] text-[#6D1D3A] font-semibold">· Current Session</span>
                                    )}
                                  </div>
                                  <p className="font-mono text-[11px] text-[#6D1D3A]">{member.email}</p>
                                </div>
                              </div>
                            </td>

                            <td className="p-3.5">
                              {isPrimary ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FBF2F5] text-[#6D1D3A] font-bold text-[11px] rounded border border-[#E5DFD7]">
                                  <Shield className="w-3 h-3" /> Primary Owner
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FAF8F5] text-[#1C1917] font-semibold text-[11px] rounded border border-[#E5DFD7]">
                                  <Users className="w-3 h-3 text-[#6D1D3A]" /> Store Partner
                                </span>
                              )}
                            </td>

                            <td className="p-3.5">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                  member.status === 'blocked'
                                    ? 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]'
                                    : 'bg-[#ECFDF5] text-[#166534] border-[#A7F3D0]'
                                }`}
                              >
                                {member.status === 'blocked' ? 'Blocked' : 'Active'}
                              </span>
                            </td>

                            <td className="p-3.5 text-[#6B625D] font-mono tabular-nums">
                              {member.phone || '—'}
                            </td>

                            <td className="p-3.5 text-right">
                              {isPrimary ? (
                                <span className="text-[11px] text-[#6B625D] italic">Protected Primary Owner</span>
                              ) : confirmRemovePartnerId === member.id ? (
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        const res = await fetch(`/api/admin/team/${member.id}`, {
                                          method: 'DELETE',
                                          headers: { Authorization: `Bearer ${adminToken}` },
                                        });
                                        const data = await res.json();
                                        setConfirmRemovePartnerId(null);
                                        if (res.ok) {
                                          pushNotice('success', data.message || `Removed partner ${member.email}`);
                                          fetchAdminData();
                                        } else {
                                          pushNotice('error', data.error || 'Failed to remove partner');
                                        }
                                      } catch {
                                        pushNotice('error', 'Failed to remove partner');
                                      }
                                    }}
                                    className="px-2.5 py-1 bg-[#B91C1C] text-white rounded text-[11px] font-semibold cursor-pointer"
                                  >
                                    Confirm Remove
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmRemovePartnerId(null)}
                                    className="px-2 py-1 border border-[#E5DFD7] text-[#1C1917] rounded text-[11px] font-semibold cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setEditingPartner(member)}
                                    className="px-2.5 py-1 border border-[#E5DFD7] hover:border-[#6D1D3A] text-[#1C1917] hover:text-[#6D1D3A] rounded text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Edit className="w-3 h-3" />
                                    <span>Edit</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const res = await fetch(`/api/admin/team/${member.id}/toggle`, {
                                        method: 'POST',
                                        headers: { Authorization: `Bearer ${adminToken}` },
                                      });
                                      if (res.ok) {
                                        pushNotice('success', `Updated access status for ${member.email}.`);
                                        fetchAdminData();
                                      }
                                    }}
                                    className={`px-2.5 py-1 rounded text-[11px] font-semibold border cursor-pointer ${
                                      member.status === 'blocked'
                                        ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#166534]'
                                        : 'bg-[#FFFBEB] border-[#FDE68A] text-[#B45309]'
                                    }`}
                                  >
                                    {member.status === 'blocked' ? 'Activate' : 'Block'}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setConfirmRemovePartnerId(member.id)}
                                    className="px-2.5 py-1 bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FECACA] text-[#B91C1C] rounded text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Remove</span>
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 3: PRODUCTS MANAGEMENT ================= */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-serif text-2xl font-bold text-[#1C1917]">Products Catalog</h1>
                  <p className="text-xs text-[#6B625D]">
                    Manage women&apos;s kurtis, anarkalis, pricing, photos, and stock levels
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(null);
                    setProductModalOpen(true);
                  }}
                  className="px-4 py-2.5 bg-[#6D1D3A] hover:bg-[#53142B] text-white text-xs font-semibold uppercase tracking-wider rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Product</span>
                </button>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-[#6B625D] absolute left-3 top-3" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search by garment title, category, or fabric..."
                  className="w-full text-xs pl-9 pr-4 py-2.5 bg-white border border-[#E5DFD7] rounded-md focus:outline-none focus:border-[#6D1D3A]"
                />
              </div>

              <div className="bg-white rounded-lg border border-[#E5DFD7] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF8F5] text-[#6B625D] font-semibold border-b border-[#E5DFD7]">
                      <tr>
                        <th className="p-3">Garment</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Pricing</th>
                        <th className="p-3">Sizes</th>
                        <th className="p-3">Stock</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5DFD7]">
                      {productsList
                        .filter(
                          (p) =>
                            p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                            p.category.toLowerCase().includes(productSearch.toLowerCase())
                        )
                        .map((prod) => (
                          <tr key={prod.id} className="hover:bg-[#FAF8F5]">
                            <td className="p-3 flex items-center gap-3">
                              <img
                                src={
                                  prod.images[0] || '/src/assets/images/category_kurtis_showcase_1794109164419.jpg'
                                }
                                alt={prod.name}
                                referrerPolicy="no-referrer"
                                className="w-10 h-14 object-cover rounded border border-[#E5DFD7]"
                              />
                              <div>
                                <p className="font-semibold text-[#1C1917]">{prod.name}</p>
                                <p className="text-[10px] text-[#6B625D] font-mono">{prod.id}</p>
                              </div>
                            </td>
                            <td className="p-3">{prod.category}</td>
                            <td className="p-3">
                              <span className="font-mono font-bold text-[#6D1D3A] tabular-nums">
                                ₹{prod.discountedPrice.toLocaleString()}
                              </span>
                              {prod.originalPrice > prod.discountedPrice && (
                                <span className="block text-[10px] text-[#6B625D] line-through font-mono tabular-nums">
                                  ₹{prod.originalPrice.toLocaleString()}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-[11px] text-[#6B625D]">{prod.sizes.join(' · ')}</td>
                            <td className="p-3 font-mono tabular-nums">
                              <span className={prod.stockQuantity < 10 ? 'text-[#B91C1C] font-bold' : ''}>
                                {prod.stockQuantity} pcs
                              </span>
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                  prod.isPublished !== false
                                    ? 'bg-[#ECFDF5] text-[#166534] border-[#A7F3D0]'
                                    : 'bg-[#FAF8F5] text-[#6B625D] border-[#E5DFD7]'
                                }`}
                              >
                                {prod.isPublished !== false ? 'Live' : 'Draft'}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              {confirmDeleteProductId === prod.id ? (
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await fetch(`/api/admin/products/${prod.id}`, {
                                        method: 'DELETE',
                                        headers: { Authorization: `Bearer ${adminToken}` },
                                      });
                                      setConfirmDeleteProductId(null);
                                      pushNotice('success', `Deleted "${prod.name}".`);
                                      fetchAdminData();
                                      refreshProducts();
                                    }}
                                    className="px-2 py-1 bg-[#B91C1C] text-white rounded text-[11px] font-semibold cursor-pointer"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteProductId(null)}
                                    className="px-2 py-1 border border-[#E5DFD7] text-[#1C1917] rounded text-[11px] cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingProduct(prod);
                                      setProductModalOpen(true);
                                    }}
                                    className="p-1.5 hover:bg-[#FAF8F5] border border-[#E5DFD7] rounded text-[#1C1917] cursor-pointer"
                                    title="Edit Product"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteProductId(prod.id)}
                                    className="p-1.5 hover:bg-[#FEF2F2] border border-[#FECACA] rounded text-[#B91C1C] cursor-pointer"
                                    title="Delete Product"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 4: CATEGORIES ================= */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-serif text-2xl font-bold text-[#1C1917]">Categories Management</h1>
                  <p className="text-xs text-[#6B625D]">
                    Dedicated girls&apos; and women&apos;s fashion collection taxonomy
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCategoryModalOpen(true)}
                  className="px-4 py-2.5 bg-[#6D1D3A] hover:bg-[#53142B] text-white text-xs font-semibold uppercase tracking-wider rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Category</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoriesList.map((cat) => (
                  <div key={cat.id} className="p-4 bg-white rounded-lg border border-[#E5DFD7] space-y-2.5">
                    <div className="flex items-center gap-3">
                      <img
                        src={cat.image}
                        alt={cat.name}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-md object-cover border border-[#E5DFD7] shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-serif font-bold text-sm text-[#1C1917] truncate">{cat.name}</h4>
                        <span className="text-[11px] text-[#6D1D3A] font-mono font-semibold tabular-nums">
                          {cat.productCount || 0} styles live
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-[#6B625D] line-clamp-2">{cat.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= TAB 5: CUSTOMER ORDERS ================= */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-serif text-2xl font-bold text-[#1C1917]">Customer Orders Console</h1>
                  <p className="text-xs text-[#6B625D]">
                    Confirm orders, assign courier AWB tracking, or issue refunds
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-4 py-2 bg-[#1C1917] hover:bg-[#6D1D3A] text-white text-xs font-semibold rounded-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#6B625D] absolute left-3 top-3" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search by Order ID, customer name, or mobile number..."
                    className="w-full text-xs pl-9 pr-4 py-2.5 bg-white border border-[#E5DFD7] rounded-md focus:outline-none focus:border-[#6D1D3A]"
                  />
                </div>
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="text-xs px-3 py-2 bg-white border border-[#E5DFD7] rounded-md focus:outline-none focus:border-[#6D1D3A]"
                >
                  <option value="all">All Order Statuses</option>
                  <option value="Order Placed">Order Placed</option>
                  <option value="Order Confirmed">Order Confirmed</option>
                  <option value="Processing">Processing</option>
                  <option value="Packed">Packed</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Out for Delivery">Out for Delivery</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Returned">Returned</option>
                </select>
              </div>

              <div className="bg-white rounded-lg border border-[#E5DFD7] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF8F5] text-[#6B625D] font-semibold border-b border-[#E5DFD7]">
                      <tr>
                        <th className="p-3">Order ID</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Garments</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Payment</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5DFD7]">
                      {ordersList
                        .filter((o) => {
                          const q = orderSearch.toLowerCase();
                          const matchesQ =
                            o.id.toLowerCase().includes(q) ||
                            o.customerName.toLowerCase().includes(q) ||
                            o.customerPhone.includes(orderSearch);
                          const matchesS =
                            orderStatusFilter === 'all' ||
                            o.orderStatus.toLowerCase() === orderStatusFilter.toLowerCase();
                          return matchesQ && matchesS;
                        })
                        .map((ord) => (
                          <tr key={ord.id} className="hover:bg-[#FAF8F5]">
                            <td className="p-3 font-mono font-bold text-[#6D1D3A]">{ord.id}</td>
                            <td className="p-3">
                              <p className="font-semibold text-[#1C1917]">{ord.customerName}</p>
                              <p className="text-[11px] text-[#6B625D] font-mono">{ord.customerPhone}</p>
                              <p className="text-[10px] text-[#6B625D]">{ord.deliveryAddress.city}</p>
                            </td>
                            <td className="p-3">
                              {ord.items.map((it, idx) => (
                                <p key={idx} className="line-clamp-1">
                                  {it.name} ({it.size}, {it.color}) × {it.quantity}
                                </p>
                              ))}
                            </td>
                            <td className="p-3 font-mono font-bold tabular-nums text-[#1C1917]">
                              ₹{ord.total.toLocaleString()}
                            </td>
                            <td className="p-3 uppercase text-[10px] font-semibold">
                              <span>{ord.paymentMethod}</span>
                              <span className="block text-[10px] text-[#166534]">({ord.paymentStatus})</span>
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                  ord.orderStatus === 'Delivered'
                                    ? 'bg-[#ECFDF5] text-[#166534] border-[#A7F3D0]'
                                    : ord.orderStatus === 'Cancelled'
                                    ? 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]'
                                    : 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'
                                }`}
                              >
                                {ord.orderStatus}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => setOrderDetailModal(ord)}
                                className="px-3 py-1.5 bg-[#6D1D3A] hover:bg-[#53142B] text-white rounded text-[11px] font-semibold cursor-pointer"
                              >
                                Manage Order
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 6: CUSTOMERS MANAGEMENT ================= */}
          {activeTab === 'customers' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-serif text-2xl font-bold text-[#1C1917]">Customers Management</h1>
                  <p className="text-xs text-[#6B625D]">
                    Edit customer profiles, block or remove individual entries, and clean up customers whose orders have been delivered.
                  </p>
                </div>

                {!confirmCleanupDelivered ? (
                  <button
                    type="button"
                    disabled={deliveredCustomersCount === 0}
                    onClick={() => setConfirmCleanupDelivered(true)}
                    className="px-4 py-2 bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA] text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap self-start sm:self-center"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Delivered Customers ({deliveredCustomersCount})</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 bg-[#FEF2F2] border border-[#FECACA] px-3 py-2 rounded-md text-xs">
                    <span className="font-semibold text-[#B91C1C]">
                      Remove {deliveredCustomersCount} delivered customer(s)?
                    </span>
                    <button
                      type="button"
                      disabled={cleaningDelivered}
                      onClick={async () => {
                        setCleaningDelivered(true);
                        try {
                          const res = await fetch('/api/admin/customers/cleanup/delivered', {
                            method: 'DELETE',
                            headers: { Authorization: `Bearer ${adminToken}` },
                          });
                          const data = await res.json();
                          setConfirmCleanupDelivered(false);
                          if (res.ok) {
                            pushNotice(
                              'success',
                              data.message || `Removed ${data.removedCount} customer record(s).`
                            );
                            fetchAdminData();
                          } else {
                            pushNotice('error', data.error || 'Failed to clean up delivered customers.');
                          }
                        } catch {
                          pushNotice('error', 'Failed to communicate with server.');
                        } finally {
                          setCleaningDelivered(false);
                        }
                      }}
                      className="px-2.5 py-1 bg-[#B91C1C] text-white rounded font-semibold cursor-pointer"
                    >
                      {cleaningDelivered ? 'Removing...' : 'Confirm'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmCleanupDelivered(false)}
                      className="px-2.5 py-1 bg-white border border-[#E5DFD7] text-[#1C1917] rounded font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Search & Segmented Filters */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#6B625D] absolute left-3 top-3" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search customers by name, email, or phone..."
                    className="w-full text-xs pl-9 pr-4 py-2.5 bg-white border border-[#E5DFD7] rounded-md focus:outline-none focus:border-[#6D1D3A]"
                  />
                </div>

                <div className="flex items-center gap-1 p-1 bg-white border border-[#E5DFD7] rounded-md overflow-x-auto">
                  {[
                    { id: 'all', label: `All (${customersList.length})` },
                    {
                      id: 'activeOrders',
                      label: `Active Orders (${customersList.filter((c) => c.activeOrdersCount > 0).length})`,
                    },
                    {
                      id: 'deliveredOrders',
                      label: `Delivered (${deliveredCustomersCount})`,
                    },
                    {
                      id: 'blocked',
                      label: `Blocked (${customersList.filter((c) => c.status === 'blocked').length})`,
                    },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setCustomerFilter(tab.id as any)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer whitespace-nowrap ${
                        customerFilter === tab.id
                          ? 'bg-[#6D1D3A] text-white'
                          : 'text-[#6B625D] hover:text-[#1C1917]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg border border-[#E5DFD7] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF8F5] text-[#6B625D] font-semibold border-b border-[#E5DFD7]">
                      <tr>
                        <th className="p-3.5">Customer</th>
                        <th className="p-3.5">Contact</th>
                        <th className="p-3.5">Orders Summary</th>
                        <th className="p-3.5">Total Spend</th>
                        <th className="p-3.5">Account Status</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5DFD7]">
                      {filteredCustomers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-10 text-center text-xs text-[#6B625D]">
                            No customer records match your current search or filter.
                          </td>
                        </tr>
                      ) : (
                        filteredCustomers.map((cust) => (
                          <tr key={cust.id} className="hover:bg-[#FAF8F5]">
                            <td className="p-3.5 font-semibold text-[#1C1917]">{cust.name}</td>
                            <td className="p-3.5 text-[#6B625D]">
                              <p className="font-mono text-[11px] text-[#1C1917]">{cust.email}</p>
                              <p className="text-[11px] font-mono">{cust.phone || '—'}</p>
                            </td>
                            <td className="p-3.5 font-mono tabular-nums">
                              <span className="font-bold text-[#1C1917]">{cust.orderCount} total</span>
                              <span className="block text-[10px] text-[#6B625D]">
                                Delivered: {cust.deliveredOrdersCount || 0} · Active: {cust.activeOrdersCount || 0}
                              </span>
                            </td>
                            <td className="p-3.5 font-mono font-bold tabular-nums text-[#6D1D3A]">
                              ₹{(cust.totalSpent || 0).toLocaleString()}
                            </td>
                            <td className="p-3.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                  cust.status === 'active'
                                    ? 'bg-[#ECFDF5] text-[#166534] border-[#A7F3D0]'
                                    : 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]'
                                }`}
                              >
                                {cust.status || 'active'}
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              {confirmDeleteCustomerId === cust.id ? (
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const res = await fetch(`/api/admin/customers/${cust.id}`, {
                                        method: 'DELETE',
                                        headers: { Authorization: `Bearer ${adminToken}` },
                                      });
                                      const data = await res.json();
                                      setConfirmDeleteCustomerId(null);
                                      if (res.ok) {
                                        pushNotice('success', data.message || `Removed customer ${cust.name}.`);
                                        fetchAdminData();
                                      } else {
                                        pushNotice('error', data.error || 'Failed to remove customer.');
                                      }
                                    }}
                                    className="px-2.5 py-1 bg-[#B91C1C] text-white rounded text-[11px] font-semibold cursor-pointer"
                                  >
                                    Confirm Remove
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteCustomerId(null)}
                                    className="px-2 py-1 border border-[#E5DFD7] text-[#1C1917] rounded text-[11px] cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setEditingCustomer(cust)}
                                    className="px-2.5 py-1 border border-[#E5DFD7] hover:border-[#6D1D3A] text-[#1C1917] hover:text-[#6D1D3A] rounded text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Edit className="w-3 h-3" />
                                    <span>Edit</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const newStatus = cust.status === 'active' ? 'blocked' : 'active';
                                      await fetch(`/api/admin/customers/${cust.id}/status`, {
                                        method: 'PATCH',
                                        headers: {
                                          'Content-Type': 'application/json',
                                          Authorization: `Bearer ${adminToken}`,
                                        },
                                        body: JSON.stringify({ status: newStatus }),
                                      });
                                      pushNotice('success', `Customer ${cust.name} marked as ${newStatus}.`);
                                      fetchAdminData();
                                    }}
                                    className={`px-2.5 py-1 rounded text-[11px] font-semibold border cursor-pointer ${
                                      cust.status === 'active'
                                        ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#B45309]'
                                        : 'bg-[#ECFDF5] border-[#A7F3D0] text-[#166534]'
                                    }`}
                                  >
                                    {cust.status === 'active' ? 'Block' : 'Unblock'}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteCustomerId(cust.id)}
                                    className="px-2.5 py-1 bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FECACA] text-[#B91C1C] rounded text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Remove</span>
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 7: PAYMENTS ================= */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              <div>
                <h1 className="font-serif text-2xl font-bold text-[#1C1917]">Payment Transactions</h1>
                <p className="text-xs text-[#6B625D]">
                  Track UPI settlements, card charges, Cash on Delivery collections, and refunds
                </p>
              </div>

              <div className="bg-white rounded-lg border border-[#E5DFD7] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF8F5] text-[#6B625D] font-semibold border-b border-[#E5DFD7]">
                      <tr>
                        <th className="p-3">Order ID</th>
                        <th className="p-3">Transaction Reference</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Method</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5DFD7]">
                      {ordersList.map((ord) => (
                        <tr key={ord.id} className="hover:bg-[#FAF8F5]">
                          <td className="p-3 font-mono font-bold text-[#6D1D3A]">{ord.id}</td>
                          <td className="p-3 font-mono text-[11px] text-[#6B625D]">
                            {ord.transactionId || 'COD-COLLECTION-PENDING'}
                          </td>
                          <td className="p-3 font-semibold text-[#1C1917]">{ord.customerName}</td>
                          <td className="p-3 uppercase font-medium">{ord.paymentMethod}</td>
                          <td className="p-3 font-mono font-bold tabular-nums">₹{ord.total.toLocaleString()}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                ord.paymentStatus === 'paid'
                                  ? 'bg-[#ECFDF5] text-[#166534] border-[#A7F3D0]'
                                  : ord.paymentStatus === 'refunded'
                                  ? 'bg-[#FBF2F5] text-[#6D1D3A] border-[#E5DFD7]'
                                  : 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'
                              }`}
                            >
                              {ord.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 8: COUPONS & OFFERS ================= */}
          {activeTab === 'coupons' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-serif text-2xl font-bold text-[#1C1917]">Coupons &amp; Promotional Offers</h1>
                  <p className="text-xs text-[#6B625D]">
                    Create percentage or fixed discount codes with minimum cart rules
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCouponModalOpen(true)}
                  className="px-4 py-2.5 bg-[#6D1D3A] hover:bg-[#53142B] text-white text-xs font-semibold uppercase tracking-wider rounded-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Coupon</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {couponsList.map((c) => (
                  <div key={c.code} className="p-4 bg-white rounded-lg border border-[#E5DFD7] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-[#6D1D3A] bg-[#FAF8F5] px-2.5 py-1 rounded border border-[#E5DFD7]">
                        {c.code}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                          c.isActive
                            ? 'bg-[#ECFDF5] text-[#166534] border-[#A7F3D0]'
                            : 'bg-[#FAF8F5] text-[#6B625D] border-[#E5DFD7]'
                        }`}
                      >
                        {c.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </div>

                    <p className="text-xs text-[#6B625D]">{c.description}</p>

                    <div className="text-[11px] text-[#6B625D] space-y-0.5 font-mono tabular-nums">
                      <p>
                        Discount:{' '}
                        <strong className="text-[#1C1917]">
                          {c.discountType === 'percentage' ? `${c.discountValue}%` : `₹${c.discountValue}`}
                        </strong>
                      </p>
                      <p>Min Purchase: <strong className="text-[#1C1917]">₹{c.minOrderValue}</strong></p>
                      <p>Used: <strong className="text-[#1C1917]">{c.usedCount || 0} times</strong></p>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-[#E5DFD7]">
                      {confirmDeleteCouponCode === c.code ? (
                        <>
                          <button
                            type="button"
                            onClick={async () => {
                              await fetch(`/api/admin/coupons/${c.code}`, {
                                method: 'DELETE',
                                headers: { Authorization: `Bearer ${adminToken}` },
                              });
                              setConfirmDeleteCouponCode(null);
                              pushNotice('success', `Coupon ${c.code} deleted.`);
                              fetchAdminData();
                            }}
                            className="flex-1 py-1 bg-[#B91C1C] text-white rounded text-xs font-semibold cursor-pointer"
                          >
                            Confirm Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteCouponCode(null)}
                            className="px-3 py-1 border border-[#E5DFD7] text-xs rounded cursor-pointer"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={async () => {
                              await fetch(`/api/admin/coupons/${c.code}/toggle`, {
                                method: 'PATCH',
                                headers: { Authorization: `Bearer ${adminToken}` },
                              });
                              fetchAdminData();
                            }}
                            className="flex-1 py-1.5 text-xs font-semibold rounded border border-[#E5DFD7] hover:bg-[#FAF8F5] cursor-pointer"
                          >
                            {c.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteCouponCode(c.code)}
                            className="p-1.5 text-[#B91C1C] hover:bg-[#FEF2F2] rounded cursor-pointer"
                            title="Delete Coupon"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= TAB 9: STORE SETTINGS ================= */}
          {activeTab === 'settings' && settingsData && (
            <div className="space-y-6 max-w-3xl">
              <div>
                <h1 className="font-serif text-2xl font-bold text-[#1C1917]">Store Settings &amp; Policies</h1>
                <p className="text-xs text-[#6B625D]">
                  Configure brand identity, wholesale announcement banner, shipping thresholds, and support contact info
                </p>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await fetch('/api/admin/settings', {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${adminToken}`,
                    },
                    body: JSON.stringify(settingsData),
                  });
                  if (res.ok) {
                    pushNotice('success', 'Store settings updated successfully.');
                    refreshSettings();
                  } else {
                    pushNotice('error', 'Failed to update settings.');
                  }
                }}
                className="bg-white p-6 rounded-lg border border-[#E5DFD7] space-y-4 text-xs"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold block mb-1">Brand Name</label>
                    <input
                      type="text"
                      value={settingsData.brandName}
                      onChange={(e) => setSettingsData({ ...settingsData, brandName: e.target.value })}
                      className="w-full p-2.5 border border-[#E5DFD7] rounded-md bg-[#FAF8F5]"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Header Wordmark</label>
                    <input
                      type="text"
                      value={settingsData.logoText}
                      onChange={(e) => setSettingsData({ ...settingsData, logoText: e.target.value })}
                      className="w-full p-2.5 border border-[#E5DFD7] rounded-md bg-[#FAF8F5]"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Top Announcement Banner</label>
                  <input
                    type="text"
                    value={settingsData.announcement}
                    onChange={(e) => setSettingsData({ ...settingsData, announcement: e.target.value })}
                    className="w-full p-2.5 border border-[#E5DFD7] rounded-md bg-[#FAF8F5]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold block mb-1">Wholesale &amp; WhatsApp Contact</label>
                    <input
                      type="text"
                      value={settingsData.whatsappNumber}
                      onChange={(e) => setSettingsData({ ...settingsData, whatsappNumber: e.target.value })}
                      className="w-full p-2.5 border border-[#E5DFD7] rounded-md bg-[#FAF8F5] font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Support Email</label>
                    <input
                      type="email"
                      value={settingsData.supportEmail}
                      onChange={(e) => setSettingsData({ ...settingsData, supportEmail: e.target.value })}
                      className="w-full p-2.5 border border-[#E5DFD7] rounded-md bg-[#FAF8F5]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold block mb-1">Free Delivery Minimum (INR)</label>
                    <input
                      type="number"
                      value={settingsData.freeShippingThreshold}
                      onChange={(e) =>
                        setSettingsData({ ...settingsData, freeShippingThreshold: Number(e.target.value) })
                      }
                      className="w-full p-2.5 border border-[#E5DFD7] rounded-md bg-[#FAF8F5] font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Standard Delivery Fee (INR)</label>
                    <input
                      type="number"
                      value={settingsData.standardShippingFee}
                      onChange={(e) =>
                        setSettingsData({ ...settingsData, standardShippingFee: Number(e.target.value) })
                      }
                      className="w-full p-2.5 border border-[#E5DFD7] rounded-md bg-[#FAF8F5] font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Return &amp; Exchange Policy</label>
                  <textarea
                    rows={3}
                    value={settingsData.returnPolicyText}
                    onChange={(e) => setSettingsData({ ...settingsData, returnPolicyText: e.target.value })}
                    className="w-full p-2.5 border border-[#E5DFD7] rounded-md bg-[#FAF8F5]"
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#6D1D3A] hover:bg-[#53142B] text-white text-xs font-semibold uppercase tracking-wider rounded-md cursor-pointer"
                >
                  Save Website Settings
                </button>
              </form>
            </div>
          )}

          {/* ================= TAB 10: REPORTS & ANALYTICS ================= */}
          {activeTab === 'reports' && reportsData && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-serif text-2xl font-bold text-[#1C1917]">Sales Reports &amp; Analytics</h1>
                  <p className="text-xs text-[#6B625D]">
                    Revenue performance across daily, weekly, monthly, and top-selling categories
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-4 py-2 bg-[#6D1D3A] text-white text-xs font-semibold rounded-md hover:bg-[#53142B] flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Spreadsheet</span>
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-white rounded-lg border border-[#E5DFD7] space-y-1">
                  <span className="text-[11px] font-bold text-[#6B625D] uppercase">Today&apos;s Sales</span>
                  <p className="text-xl font-bold font-mono tabular-nums text-[#6D1D3A]">
                    ₹{reportsData.dailySales.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-white rounded-lg border border-[#E5DFD7] space-y-1">
                  <span className="text-[11px] font-bold text-[#6B625D] uppercase">Last 7 Days</span>
                  <p className="text-xl font-bold font-mono tabular-nums text-[#1C1917]">
                    ₹{reportsData.weeklySales.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-white rounded-lg border border-[#E5DFD7] space-y-1">
                  <span className="text-[11px] font-bold text-[#6B625D] uppercase">Monthly Revenue</span>
                  <p className="text-xl font-bold font-mono tabular-nums text-[#1C1917]">
                    ₹{reportsData.monthlySales.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-white rounded-lg border border-[#E5DFD7] space-y-1">
                  <span className="text-[11px] font-bold text-[#6B625D] uppercase">Annual Revenue</span>
                  <p className="text-xl font-bold font-mono tabular-nums text-[#1C1917]">
                    ₹{reportsData.yearlySales.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-lg border border-[#E5DFD7] space-y-4">
                <h3 className="font-serif text-lg font-bold text-[#1C1917]">Top Selling Products</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF8F5] text-[#6B625D] font-semibold border-b border-[#E5DFD7]">
                      <tr>
                        <th className="p-3">Product Name</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Units Sold</th>
                        <th className="p-3">Gross Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5DFD7]">
                      {reportsData.topProducts.map((p: any, idx: number) => (
                        <tr key={idx} className="hover:bg-[#FAF8F5]">
                          <td className="p-3 font-semibold text-[#1C1917]">{p.name}</td>
                          <td className="p-3 text-[#6B625D]">{p.category}</td>
                          <td className="p-3 font-mono tabular-nums">{p.qty} pcs</td>
                          <td className="p-3 font-mono font-bold tabular-nums text-[#6D1D3A]">
                            ₹{p.revenue.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 11: LOGS & SUPPORT ================= */}
          {activeTab === 'logs' && (
            <div className="space-y-6">
              <div>
                <h1 className="font-serif text-2xl font-bold text-[#1C1917]">Audit Logs &amp; Support</h1>
                <p className="text-xs text-[#6B625D]">
                  Chronological audit history and incoming customer support inquiries
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="bg-white rounded-lg border border-[#E5DFD7] p-5 space-y-4">
                  <h3 className="font-serif text-lg font-bold text-[#1C1917]">Security &amp; Action Logs</h3>
                  <div className="space-y-3">
                    {logsList.map((log) => (
                      <div key={log.id} className="p-3 bg-[#FAF8F5] rounded-md border border-[#E5DFD7] text-xs">
                        <div className="flex justify-between font-semibold text-[#1C1917]">
                          <span>{log.action}</span>
                          <span className="text-[10px] text-[#6B625D] font-mono tabular-nums">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-[#6B625D] mt-0.5">{log.details}</p>
                        <span className="text-[10px] text-[#6D1D3A] font-mono">{log.adminEmail}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-[#E5DFD7] p-5 space-y-4">
                  <h3 className="font-serif text-lg font-bold text-[#1C1917]">Support Inquiries</h3>
                  <div className="space-y-3">
                    {supportList.map((inq) => (
                      <div key={inq.id} className="p-3 bg-[#FAF8F5] rounded-md border border-[#E5DFD7] text-xs space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[#1C1917]">{inq.subject}</span>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                              inq.status === 'resolved'
                                ? 'bg-[#ECFDF5] text-[#166534] border-[#A7F3D0]'
                                : 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'
                            }`}
                          >
                            {inq.status}
                          </span>
                        </div>
                        <p className="text-[#6B625D]">{inq.message}</p>
                        <div className="flex items-center justify-between pt-1">
                          <span className="font-mono text-[11px] text-[#6B625D]">
                            {inq.name} · {inq.phone || inq.email}
                          </span>
                          <button
                            type="button"
                            onClick={async () => {
                              await fetch(`/api/admin/support/${inq.id}`, {
                                method: 'PATCH',
                                headers: { Authorization: `Bearer ${adminToken}` },
                              });
                              fetchAdminData();
                            }}
                            className="text-xs font-semibold text-[#6D1D3A] hover:underline cursor-pointer"
                          >
                            Mark {inq.status === 'open' ? 'Resolved' : 'Reopen'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ================= MODALS ================= */}
      {productModalOpen && (
        <ProductFormModal
          product={editingProduct}
          onClose={() => {
            setProductModalOpen(false);
            setEditingProduct(null);
          }}
          onSaved={() => {
            setProductModalOpen(false);
            setEditingProduct(null);
            pushNotice('success', 'Product catalog record saved.');
            fetchAdminData();
            refreshProducts();
          }}
          adminToken={adminToken}
          categories={categoriesList}
        />
      )}

      {orderDetailModal && (
        <OrderManagementModal
          order={orderDetailModal}
          onClose={() => setOrderDetailModal(null)}
          onUpdated={(msg) => {
            setOrderDetailModal(null);
            if (msg) pushNotice('success', msg);
            fetchAdminData();
          }}
          adminToken={adminToken}
        />
      )}

      {categoryModalOpen && (
        <CategoryCreateModal
          onClose={() => setCategoryModalOpen(false)}
          onSaved={() => {
            setCategoryModalOpen(false);
            pushNotice('success', 'New category created.');
            fetchAdminData();
            refreshCategories();
          }}
          adminToken={adminToken}
        />
      )}

      {couponModalOpen && (
        <CouponCreateModal
          onClose={() => setCouponModalOpen(false)}
          onSaved={() => {
            setCouponModalOpen(false);
            pushNotice('success', 'New coupon offer created.');
            fetchAdminData();
          }}
          adminToken={adminToken}
        />
      )}

      {editingPartner && (
        <EditPartnerModal
          partner={editingPartner}
          adminToken={adminToken}
          onClose={() => setEditingPartner(null)}
          onSaved={(msg) => {
            setEditingPartner(null);
            pushNotice('success', msg);
            fetchAdminData();
          }}
        />
      )}

      {editingCustomer && (
        <EditCustomerModal
          customer={editingCustomer}
          adminToken={adminToken}
          onClose={() => setEditingCustomer(null)}
          onSaved={(msg) => {
            setEditingCustomer(null);
            pushNotice('success', msg);
            fetchAdminData();
          }}
        />
      )}
    </div>
  );
};

// =================== SUB-MODALS ===================

interface EditPartnerModalProps {
  partner: any;
  adminToken: string;
  onClose: () => void;
  onSaved: (msg: string) => void;
}

const EditPartnerModal: React.FC<EditPartnerModalProps> = ({ partner, adminToken, onClose, onSaved }) => {
  const [name, setName] = useState(partner.name || '');
  const [email, setEmail] = useState(partner.email || '');
  const [phone, setPhone] = useState(partner.phone || '');
  const [status, setStatus] = useState<'active' | 'blocked'>(partner.status === 'blocked' ? 'blocked' : 'active');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/team/${partner.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          status,
          ...(newPassword.trim() ? { password: newPassword.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onSaved(data.message || `Updated partner ${email}.`);
      } else {
        setError(data.error || 'Failed to update partner record.');
      }
    } catch {
      setError('Connection error while updating partner details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs p-4 flex items-center justify-center">
      <div className="bg-white rounded-xl border border-[#E5DFD7] max-w-md w-full p-6 space-y-4 text-xs shadow-2xl">
        <div className="flex justify-between items-center border-b border-[#E5DFD7] pb-3">
          <h3 className="font-serif text-lg font-bold text-[#1C1917]">Edit Store Partner</h3>
          <button type="button" onClick={onClose} className="p-1 text-[#6B625D] hover:text-[#1C1917] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA] rounded-md">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="font-semibold block mb-1">Partner Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 border border-[#E5DFD7] rounded-md bg-[#FAF8F5]"
            />
          </div>
          <div>
            <label className="font-semibold block mb-1">Partner Gmail *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2.5 border border-[#E5DFD7] rounded-md bg-[#FAF8F5] font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold block mb-1">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 border border-[#E5DFD7] rounded-md bg-[#FAF8F5] font-mono"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full p-2.5 border border-[#E5DFD7] rounded-md bg-[#FAF8F5]"
              >
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
          </div>
          <div>
            <label className="font-semibold block mb-1">New Password (Leave blank to keep existing)</label>
            <input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Optional password reset"
              className="w-full p-2.5 border border-[#E5DFD7] rounded-md bg-[#FAF8F5] font-mono"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-[#6D1D3A] hover:bg-[#53142B] text-white font-semibold rounded-md cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Partner Changes'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-[#E5DFD7] text-[#1C1917] font-semibold rounded-md cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface EditCustomerModalProps {
  customer: any;
  adminToken: string;
  onClose: () => void;
  onSaved: (msg: string) => void;
}

const EditCustomerModal: React.FC<EditCustomerModalProps> = ({ customer, adminToken, onClose, onSaved }) => {
  const [name, setName] = useState(customer.name || '');
  const [email, setEmail] = useState(customer.email || '');
  const [phone, setPhone] = useState(customer.phone || '');
  const [status, setStatus] = useState<'active' | 'blocked'>(customer.status === 'blocked' ? 'blocked' : 'active');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/customers/${customer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ name, email, phone, status }),
      });
      const data = await res.json();
      if (res.ok) {
        onSaved(`Customer profile updated for ${name}.`);
      } else {
        setError(data.error || 'Failed to update customer profile.');
      }
    } catch {
      setError('Connection error while updating customer record.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs p-4 flex items-center justify-center">
      <div className="bg-white rounded-xl border border-[#E5DFD7] max-w-md w-full p-6 space-y-4 text-xs shadow-2xl">
        <div className="flex justify-between items-center border-b border-[#E5DFD7] pb-3">
          <h3 className="font-serif text-lg font-bold text-[#1C1917]">Edit Customer Details</h3>
          <button type="button" onClick={onClose} className="p-1 text-[#6B625D] hover:text-[#1C1917] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA] rounded-md">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="font-semibold block mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 border border-[#E5DFD7] rounded-md bg-[#FAF8F5]"
            />
          </div>
          <div>
            <label className="font-semibold block mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2.5 border border-[#E5DFD7] rounded-md bg-[#FAF8F5] font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold block mb-1">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 border border-[#E5DFD7] rounded-md bg-[#FAF8F5] font-mono"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Account Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full p-2.5 border border-[#E5DFD7] rounded-md bg-[#FAF8F5]"
              >
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-[#6D1D3A] hover:bg-[#53142B] text-white font-semibold rounded-md cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Customer Details'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-[#E5DFD7] text-[#1C1917] font-semibold rounded-md cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ProductFormModalProps {
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
  adminToken: string;
  categories: Category[];
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({ product, onClose, onSaved, adminToken, categories }) => {
  const [name, setName] = useState(product?.name || '');
  const [category, setCategory] = useState(product?.category || categories[0]?.name || "Women's Kurtis");
  const [originalPrice, setOriginalPrice] = useState(product?.originalPrice || 2999);
  const [discountedPrice, setDiscountedPrice] = useState(product?.discountedPrice || 1799);
  const [fabric, setFabric] = useState(product?.fabric || 'Pure Chanderi Silk');
  const [stockQuantity, setStockQuantity] = useState(product?.stockQuantity || 25);
  const [description, setDescription] = useState(product?.description || '');
  const [isNewArrival, setIsNewArrival] = useState(product?.isNewArrival ?? true);
  const [isBestSeller, setIsBestSeller] = useState(product?.isBestSeller ?? false);
  const [isPublished, setIsPublished] = useState(product?.isPublished ?? true);
  const [images, setImages] = useState<string[]>(
    product?.images && product.images.length
      ? product.images
      : ['/src/assets/images/category_kurtis_showcase_1794109164419.jpg']
  );
  const [newImageUrl, setNewImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name,
        category,
        originalPrice,
        discountedPrice,
        fabric,
        stockQuantity,
        description,
        isNewArrival,
        isBestSeller,
        isPublished,
        images,
        sizes: product?.sizes || ['XS', 'S', 'M', 'L', 'XL'],
        colors: product?.colors || [{ name: 'Blush Pink', hex: '#E8C5C8' }],
      };

      const url = product ? `/api/admin/products/${product.id}` : '/api/admin/products';
      const method = product ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) onSaved();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-4 flex items-center justify-center">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-[#E5DFD7] p-6 space-y-4 my-auto max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-[#E5DFD7] pb-3">
          <h3 className="font-serif text-lg font-bold text-[#1C1917]">
            {product ? `Edit Garment: ${product.name}` : 'Add Women’s Garment Product'}
          </h3>
          <button type="button" onClick={onClose} className="cursor-pointer">
            <X className="w-5 h-5 text-[#6B625D]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold block mb-1">Garment Title</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maya Zardozi Silk Straight Kurti"
              className="w-full p-2.5 border border-[#E5DFD7] rounded-md bg-[#FAF8F5]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2.5 border border-[#E5DFD7] rounded-md bg-[#FAF8F5]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-semibold block mb-1">Fabric</label>
              <input
                type="text"
                required
                value={fabric}
                onChange={(e) => setFabric(e.target.value)}
                className="w-full p-2.5 border border-[#E5DFD7] rounded-md bg-[#FAF8F5]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-semibold block mb-1">MRP (INR)</label>
              <input
                type="number"
                required
                value={originalPrice}
                onChange={(e) => setOriginalPrice(Number(e.target.value))}
                className="w-full p-2.5 border border-[#E5DFD7] rounded-md bg-[#FAF8F5] font-mono"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Offer Price (INR)</label>
              <input
                type="number"
                required
                value={discountedPrice}
                onChange={(e) => setDiscountedPrice(Number(e.target.value))}
                className="w-full p-2.5 border border-[#E5DFD7] rounded-md bg-[#FAF8F5] font-mono"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Stock</label>
              <input
                type="number"
                required
                value={stockQuantity}
                onChange={(e) => setStockQuantity(Number(e.target.value))}
                className="w-full p-2.5 border border-[#E5DFD7] rounded-md bg-[#FAF8F5] font-mono"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold block mb-1">Description</label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 border border-[#E5DFD7] rounded-md bg-[#FAF8F5]"
            />
          </div>

          <div className="space-y-2">
            <label className="font-semibold block">Product Images</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="Image URL or /src/assets/images/ path"
                className="flex-1 p-2 border border-[#E5DFD7] rounded-md bg-[#FAF8F5]"
              />
              <button
                type="button"
                onClick={() => {
                  if (newImageUrl.trim()) {
                    setImages([...images, newImageUrl.trim()]);
                    setNewImageUrl('');
                  }
                }}
                className="px-3 py-1 bg-[#1C1917] text-white rounded-md text-xs cursor-pointer"
              >
                Add Image
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pt-2">
              {images.map((img, i) => (
                <div key={i} className="relative w-16 h-20 rounded border border-[#E5DFD7] overflow-hidden shrink-0">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                    className="absolute top-0 right-0 bg-[#B91C1C] text-white p-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={isNewArrival}
                onChange={(e) => setIsNewArrival(e.target.checked)}
                className="accent-[#6D1D3A]"
              />
              <span>New Arrival</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={isBestSeller}
                onChange={(e) => setIsBestSeller(e.target.checked)}
                className="accent-[#6D1D3A]"
              />
              <span>Best Seller</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="accent-[#6D1D3A]"
              />
              <span>Published Live</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-[#6D1D3A] hover:bg-[#53142B] text-white text-xs font-semibold uppercase rounded-md cursor-pointer"
          >
            {submitting ? 'Saving...' : product ? 'Update Product' : 'Publish Product'}
          </button>
        </form>
      </div>
    </div>
  );
};

interface OrderManagementModalProps {
  order: Order;
  onClose: () => void;
  onUpdated: (msg?: string) => void;
  adminToken: string;
}

const OrderManagementModal: React.FC<OrderManagementModalProps> = ({ order, onClose, onUpdated, adminToken }) => {
  const [status, setStatus] = useState(order.orderStatus);
  const [courierProvider, setCourierProvider] = useState(order.courierDetails?.provider || 'BlueDart Express');
  const [trackingNumber, setTrackingNumber] = useState(order.courierDetails?.trackingNumber || '');
  const [confirmRefund, setConfirmRefund] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status, courierProvider, trackingNumber }),
      });
      onUpdated(`Order ${order.id} updated to ${status}.`);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleRefund = async () => {
    setSaving(true);
    try {
      await fetch(`/api/admin/orders/${order.id}/refund`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      onUpdated(`Refund processed for Order ${order.id}.`);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-4 flex items-center justify-center">
      <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-[#E5DFD7] p-6 space-y-4 my-auto text-xs">
        <div className="flex justify-between items-center border-b border-[#E5DFD7] pb-3">
          <div>
            <h3 className="font-serif text-lg font-bold text-[#1C1917]">Manage Order {order.id}</h3>
            <p className="text-xs text-[#6B625D]">{order.customerName} · {order.customerPhone}</p>
          </div>
          <button type="button" onClick={onClose} className="cursor-pointer">
            <X className="w-5 h-5 text-[#6B625D]" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="font-semibold block mb-1">Order Lifecycle Stage</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full p-2.5 border border-[#E5DFD7] rounded-md bg-[#FAF8F5] font-medium"
            >
              <option value="Order Placed">Stage 1: Order Placed</option>
              <option value="Order Confirmed">Stage 2: Order Confirmed</option>
              <option value="Processing">Stage 3: Processing</option>
              <option value="Packed">Stage 4: Packed &amp; Ready</option>
              <option value="Shipped">Stage 5: Shipped</option>
              <option value="Out for Delivery">Stage 6: Out for Delivery</option>
              <option value="Delivered">Stage 7: Delivered</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Returned">Returned</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold block mb-1">Courier Partner</label>
              <input
                type="text"
                value={courierProvider}
                onChange={(e) => setCourierProvider(e.target.value)}
                className="w-full p-2 border border-[#E5DFD7] rounded-md bg-[#FAF8F5]"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">AWB Tracking Number</label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="w-full p-2 border border-[#E5DFD7] rounded-md bg-[#FAF8F5] font-mono"
              />
            </div>
          </div>

          <div className="p-3 bg-[#FAF8F5] rounded-md border border-[#E5DFD7] space-y-1">
            <span className="font-bold text-[#6D1D3A]">Ordered Garments:</span>
            {order.items.map((it, idx) => (
              <p key={idx} className="text-[#1C1917]">
                {it.name} · Size {it.size} · {it.color} · Qty {it.quantity} (₹{(it.price * it.quantity).toLocaleString()})
              </p>
            ))}
          </div>

          {confirmRefund && (
            <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-md space-y-2">
              <p className="font-semibold text-[#B91C1C]">
                Confirm refund of ₹{order.total.toLocaleString()} for Order {order.id}?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleRefund}
                  disabled={saving}
                  className="px-3 py-1.5 bg-[#B91C1C] text-white rounded font-semibold cursor-pointer"
                >
                  Confirm Refund
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmRefund(false)}
                  className="px-3 py-1.5 bg-white border border-[#E5DFD7] rounded font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleUpdate}
              disabled={saving}
              className="flex-1 py-2.5 bg-[#6D1D3A] hover:bg-[#53142B] text-white font-semibold uppercase rounded-md cursor-pointer"
            >
              {saving ? 'Updating...' : 'Save Order Update'}
            </button>
            {order.paymentStatus === 'paid' && !confirmRefund && (
              <button
                type="button"
                onClick={() => setConfirmRefund(true)}
                disabled={saving}
                className="px-4 py-2.5 bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] font-semibold uppercase rounded-md cursor-pointer"
              >
                Refund
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface CategoryCreateModalProps {
  onClose: () => void;
  onSaved: () => void;
  adminToken: string;
}

const CategoryCreateModal: React.FC<CategoryCreateModalProps> = ({ onClose, onSaved, adminToken }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [image] = useState('/src/assets/images/category_kurtis_showcase_1794109164419.jpg');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/admin/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ name, description, image }),
      });
      onSaved();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-xl border border-[#E5DFD7] max-w-md w-full space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-serif text-lg font-bold text-[#1C1917]">Create Category</h3>
          <button type="button" onClick={onClose} className="cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="font-semibold block mb-1">Category Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Silk Tunics"
              className="w-full p-2.5 border border-[#E5DFD7] rounded-md bg-[#FAF8F5]"
            />
          </div>
          <div>
            <label className="font-semibold block mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 border border-[#E5DFD7] rounded-md bg-[#FAF8F5]"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 bg-[#6D1D3A] text-white font-semibold uppercase rounded-md cursor-pointer"
          >
            Create Category
          </button>
        </form>
      </div>
    </div>
  );
};

interface CouponCreateModalProps {
  onClose: () => void;
  onSaved: () => void;
  adminToken: string;
}

const CouponCreateModal: React.FC<CouponCreateModalProps> = ({ onClose, onSaved, adminToken }) => {
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState(15);
  const [minOrderValue, setMinOrderValue] = useState(1999);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          code,
          discountType,
          discountValue,
          minOrderValue,
          description: `${discountValue}${discountType === 'percentage' ? '%' : '₹'} off on orders above ₹${minOrderValue}`,
        }),
      });
      onSaved();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-xl border border-[#E5DFD7] max-w-md w-full space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-serif text-lg font-bold text-[#1C1917]">Create Promotional Coupon</h3>
          <button type="button" onClick={onClose} className="cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="font-semibold block mb-1">Coupon Code</label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. FESTIVE25"
              className="w-full p-2.5 border border-[#E5DFD7] rounded-md bg-[#FAF8F5] uppercase font-mono font-bold"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold block mb-1">Discount Type</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                className="w-full p-2.5 border border-[#E5DFD7] rounded-md bg-[#FAF8F5]"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed INR (₹)</option>
              </select>
            </div>
            <div>
              <label className="font-semibold block mb-1">Discount Value</label>
              <input
                type="number"
                required
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                className="w-full p-2.5 border border-[#E5DFD7] rounded-md bg-[#FAF8F5] font-mono"
              />
            </div>
          </div>
          <div>
            <label className="font-semibold block mb-1">Minimum Order Value (INR)</label>
            <input
              type="number"
              required
              value={minOrderValue}
              onChange={(e) => setMinOrderValue(Number(e.target.value))}
              className="w-full p-2.5 border border-[#E5DFD7] rounded-md bg-[#FAF8F5] font-mono"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 bg-[#6D1D3A] text-white font-semibold uppercase rounded-md cursor-pointer"
          >
            Create Offer
          </button>
        </form>
      </div>
    </div>
  );
};
