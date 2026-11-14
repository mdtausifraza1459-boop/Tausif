import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  LayoutDashboard,
  Shirt,
  Layers,
  Warehouse,
  ShoppingBag,
  Users,
  CreditCard,
  RotateCcw,
  Building2,
  Tag,
  Star,
  BarChart3,
  TrendingUp,
  Bell,
  FileEdit,
  Settings,
  UserCheck,
  History,
  HardDrive,
  LogOut,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  X,
  Zap,
  Crown,
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import {
  AbandonedCartRecord,
  AdminPermission,
  AdminRolePreset,
  AdminWidgetPref,
  BackupRecord,
  BundleOffer,
  Category,
  Coupon,
  DigitalGiftCard,
  FlashSaleRule,
  LookbookCollection,
  MarketingCampaign,
  NotificationItem,
  Order,
  OrderComplaint,
  PaymentTransaction,
  Product,
  ProductQuestion,
  ReturnExchangeRequest,
  Review,
  ScheduledReportConfig,
  StockMovement,
  SupportInquiry,
  VipTierConfig,
  WebsiteSettings,
  WholesaleAccount,
  WholesaleOrderRequest,
  ActivityLog,
} from '../types.ts';
import { AdminLoginGate } from './admin/AdminLoginGate.tsx';
import {
  ProductsCatalogView,
  InventoryManagementView,
  CategoriesManagementView,
} from './admin/AdminCatalogInventory.tsx';
import {
  OrdersManagementView,
  PaymentsLedgerView,
  ReturnsManagementView,
} from './admin/AdminOrdersOperations.tsx';
import {
  CustomersDirectoryView,
  WholesaleB2BView,
  CouponsOffersView,
  ReviewsModerationView,
} from './admin/AdminCustomersWholesale.tsx';
import {
  ReportsAnalyticsView,
  FinancePnlExpensesView,
  NotificationsCenterView,
  CmsContentView,
  TeamPermissionsView,
  StoreSettingsView,
  SecurityLogsSessionsView,
  BackupsRecoveryView,
} from './admin/AdminFinanceCmsSecurity.tsx';
import {
  GrowthPromotionsView,
  CrmLoyaltyView,
  BusinessIntelligenceView,
} from './admin/AdminGrowthBI.tsx';

type AdminTab =
  | 'overview'
  | 'products'
  | 'inventory'
  | 'categories'
  | 'orders'
  | 'payments'
  | 'returns'
  | 'customers'
  | 'wholesale'
  | 'coupons'
  | 'growth'
  | 'crm'
  | 'bi'
  | 'reviews'
  | 'reports'
  | 'finance'
  | 'notifications'
  | 'cms'
  | 'team'
  | 'settings'
  | 'logs'
  | 'backups';

interface NoticeState {
  type: 'success' | 'error';
  text: string;
}

export const AdminPortal: React.FC = () => {
  const {
    adminUser,
    adminToken,
    hasAdminPermission,
    updateSuperAdminEmail,
    adminLogout,
    setActiveView,
    refreshProducts,
    refreshCategories,
    refreshSettings,
  } = useStore();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const pushNotice = useCallback((type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice((prev) => (prev?.text === text ? null : prev)), 5500);
  }, []);

  // Backend data state
  const [overview, setOverview] = useState<any>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notificationsList, setNotificationsList] = useState<NotificationItem[]>([]);

  const [productsList, setProductsList] = useState<Product[]>([]);
  const [lowStockItems, setLowStockItems] = useState<Product[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);

  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [shiprocketConfigured, setShiprocketConfigured] = useState(false);
  const [transactionsList, setTransactionsList] = useState<PaymentTransaction[]>([]);
  const [gatewayStatus, setGatewayStatus] = useState<any>(null);
  const [returnsList, setReturnsList] = useState<ReturnExchangeRequest[]>([]);

  const [customersList, setCustomersList] = useState<any[]>([]);
  const [wholesaleAccounts, setWholesaleAccounts] = useState<WholesaleAccount[]>([]);
  const [wholesaleOrders, setWholesaleOrders] = useState<WholesaleOrderRequest[]>([]);
  const [couponsList, setCouponsList] = useState<Coupon[]>([]);
  const [reviewsList, setReviewsList] = useState<(Review & { productName?: string })[]>([]);

  const [reportsData, setReportsData] = useState<any>(null);
  const [pnlData, setPnlData] = useState<any>(null);
  const [settingsData, setSettingsData] = useState<WebsiteSettings | null>(null);

  const [teamList, setTeamList] = useState<any[]>([]);
  const [primaryOwnerEmail, setPrimaryOwnerEmail] = useState('');
  const [rolePresets, setRolePresets] = useState<Record<AdminRolePreset, AdminPermission[]>>({} as any);
  const [allPermissions, setAllPermissions] = useState<AdminPermission[]>([]);

  const [logsList, setLogsList] = useState<ActivityLog[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [supportList, setSupportList] = useState<SupportInquiry[]>([]);
  const [backupsList, setBackupsList] = useState<BackupRecord[]>([]);
  const [backupRetention, setBackupRetention] = useState(15);

  // Growth, CRM & BI states
  const [flashSalesList, setFlashSalesList] = useState<FlashSaleRule[]>([]);
  const [bundlesList, setBundlesList] = useState<BundleOffer[]>([]);
  const [giftCardsList, setGiftCardsList] = useState<DigitalGiftCard[]>([]);
  const [lookbooksList, setLookbooksList] = useState<LookbookCollection[]>([]);
  const [questionsList, setQuestionsList] = useState<(ProductQuestion & { productName?: string })[]>([]);
  const [vipTiersList, setVipTiersList] = useState<VipTierConfig[]>([]);
  const [campaignsList, setCampaignsList] = useState<MarketingCampaign[]>([]);
  const [abandonedCartsList, setAbandonedCartsList] = useState<AbandonedCartRecord[]>([]);
  const [complaintsList, setComplaintsList] = useState<OrderComplaint[]>([]);
  const [biOverview, setBiOverview] = useState<any>(null);
  const [reportSchedules, setReportSchedules] = useState<ScheduledReportConfig[]>([]);
  const [widgets, setWidgets] = useState<AdminWidgetPref[]>([]);
  const [customizingWidgets, setCustomizingWidgets] = useState(false);

  const navItems: { id: AdminTab; label: string; icon: any; perms: AdminPermission[]; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, perms: ['overview.view'] },
    { id: 'orders', label: 'Orders & Dispatch', icon: ShoppingBag, perms: ['orders.view', 'orders.manage', 'delivery.manage'] },
    { id: 'returns', label: 'Returns & Refunds', icon: RotateCcw, perms: ['returns.manage', 'orders.view'] },
    { id: 'products', label: 'Products Catalog', icon: Shirt, perms: ['products.manage', 'inventory.manage'] },
    { id: 'inventory', label: 'Inventory Ledger', icon: Warehouse, perms: ['inventory.manage', 'products.manage'] },
    { id: 'categories', label: 'Categories', icon: Layers, perms: ['categories.manage'] },
    { id: 'customers', label: 'Customers Directory', icon: Users, perms: ['customers.view', 'customers.manage'] },
    { id: 'crm', label: 'CRM & VIP Support', icon: Crown, perms: ['customers.manage', 'orders.manage'] },
    { id: 'growth', label: 'Growth & Merchandising', icon: Zap, perms: ['coupons.manage', 'products.manage', 'content.manage'] },
    { id: 'payments', label: 'Payment Gateway', icon: CreditCard, perms: ['payments.view', 'finance.view'] },
    { id: 'wholesale', label: 'Wholesale B2B', icon: Building2, perms: ['wholesale.manage'] },
    { id: 'coupons', label: 'Coupons & Offers', icon: Tag, perms: ['coupons.manage'] },
    { id: 'reviews', label: 'Reviews Moderation', icon: Star, perms: ['reviews.manage'] },
    { id: 'bi', label: 'Business Intelligence', icon: TrendingUp, perms: ['reports.view', 'finance.view'] },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3, perms: ['reports.view', 'finance.view'] },
    { id: 'finance', label: 'Profit & Loss', icon: TrendingUp, perms: ['finance.view', 'reports.view'] },
    { id: 'notifications', label: 'Notifications', icon: Bell, perms: ['notifications.manage', 'overview.view'], badge: unreadNotifications },
    { id: 'team', label: 'Partners & Roles', icon: UserCheck, perms: ['team.manage', 'staff.manage'] },
    { id: 'cms', label: 'Content & Policies', icon: FileEdit, perms: ['content.manage', 'settings.manage'] },
    { id: 'settings', label: 'Store Settings', icon: Settings, perms: ['settings.manage', 'content.manage'] },
    { id: 'logs', label: 'Security & Logs', icon: History, perms: ['security.logs'] },
    { id: 'backups', label: 'Backups & Recovery', icon: HardDrive, perms: ['backups.manage'] },
  ];

  const allowedNavItems = navItems.filter((item) => hasAdminPermission(...item.perms));

  // Ensure restricted staff land on an allowed tab automatically
  useEffect(() => {
    if (adminUser && allowedNavItems.length > 0 && !allowedNavItems.some((n) => n.id === activeTab)) {
      setActiveTab(allowedNavItems[0].id);
    }
  }, [adminUser, activeTab, allowedNavItems]);

  const fetchTabData = useCallback(
    async (tabOverride?: AdminTab, pnlFrom?: string, pnlTo?: string) => {
      if (!adminToken) return;
      const targetTab = tabOverride || activeTab;
      const headers = { Authorization: `Bearer ${adminToken}` };

      try {
        // Always refresh unread notification badge lightly when authorized
        if (hasAdminPermission('notifications.manage', 'overview.view')) {
          fetch('/api/admin/notifications', { headers })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
              if (d) {
                setNotificationsList(d.notifications || []);
                setUnreadNotifications(d.unreadCount || 0);
              }
            })
            .catch(() => {});
        }

        if (targetTab === 'overview') {
          const [ovRes, wgRes, biRes] = await Promise.all([
            fetch('/api/admin/overview', { headers }),
            fetch('/api/admin/widgets', { headers }),
            fetch('/api/admin/bi/overview', { headers }),
          ]);
          if (ovRes.ok) setOverview(await ovRes.json());
          if (wgRes.ok) setWidgets((await wgRes.json()).widgets || []);
          if (biRes.ok) setBiOverview(await biRes.json());
        } else if (targetTab === 'products') {
          const [pRes, cRes] = await Promise.all([
            fetch('/api/admin/products', { headers }),
            fetch('/api/categories'),
          ]);
          if (pRes.ok) setProductsList((await pRes.json()).products || []);
          if (cRes.ok) setCategoriesList((await cRes.json()).categories || []);
        } else if (targetTab === 'inventory') {
          const res = await fetch('/api/admin/inventory', { headers });
          if (res.ok) {
            const d = await res.json();
            setProductsList(d.products || []);
            setLowStockItems(d.lowStockItems || []);
            setStockMovements(d.stockMovements || []);
          }
        } else if (targetTab === 'categories') {
          const res = await fetch('/api/categories');
          if (res.ok) setCategoriesList((await res.json()).categories || []);
        } else if (targetTab === 'orders') {
          const res = await fetch('/api/admin/orders', { headers });
          if (res.ok) {
            const d = await res.json();
            setOrdersList(d.orders || []);
            setShiprocketConfigured(!!d.shiprocketConfigured);
          }
        } else if (targetTab === 'payments') {
          const res = await fetch('/api/admin/payments', { headers });
          if (res.ok) {
            const d = await res.json();
            setTransactionsList(d.transactions || []);
            setOrdersList(d.orders || []);
            setGatewayStatus(d.gatewayStatus || null);
          }
        } else if (targetTab === 'returns') {
          const res = await fetch('/api/admin/returns', { headers });
          if (res.ok) setReturnsList((await res.json()).returns || []);
        } else if (targetTab === 'customers') {
          const res = await fetch('/api/admin/customers', { headers });
          if (res.ok) setCustomersList((await res.json()).customers || []);
        } else if (targetTab === 'wholesale') {
          const res = await fetch('/api/admin/wholesale', { headers });
          if (res.ok) {
            const d = await res.json();
            setWholesaleAccounts(d.accounts || []);
            setWholesaleOrders(d.orders || []);
          }
        } else if (targetTab === 'coupons') {
          const res = await fetch('/api/admin/coupons', { headers });
          if (res.ok) setCouponsList((await res.json()).coupons || []);
        } else if (targetTab === 'reviews') {
          const res = await fetch('/api/admin/reviews', { headers });
          if (res.ok) setReviewsList((await res.json()).reviews || []);
        } else if (targetTab === 'reports') {
          const [rRes, oRes] = await Promise.all([
            fetch('/api/admin/analytics/reports', { headers }),
            fetch('/api/admin/orders', { headers }),
          ]);
          if (rRes.ok) setReportsData(await rRes.json());
          if (oRes.ok) setOrdersList((await oRes.json()).orders || []);
        } else if (targetTab === 'finance') {
          const qs = new URLSearchParams();
          if (pnlFrom) qs.set('from', pnlFrom);
          if (pnlTo) qs.set('to', pnlTo);
          const res = await fetch(`/api/admin/finance/pnl?${qs.toString()}`, { headers });
          if (res.ok) setPnlData(await res.json());
        } else if (targetTab === 'cms' || targetTab === 'settings') {
          const res = await fetch('/api/admin/settings', { headers });
          if (res.ok) setSettingsData((await res.json()).settings || null);
        } else if (targetTab === 'team') {
          const res = await fetch('/api/admin/team', { headers });
          if (res.ok) {
            const d = await res.json();
            setTeamList(d.admins || []);
            setPrimaryOwnerEmail(d.primaryOwnerEmail || '');
            setRolePresets(d.rolePresets || {});
            setAllPermissions(d.allPermissions || []);
          }
        } else if (targetTab === 'logs') {
          const [lRes, sRes] = await Promise.all([
            fetch('/api/admin/logs', { headers }),
            fetch('/api/admin/support', { headers }),
          ]);
          if (lRes.ok) {
            const d = await lRes.json();
            setLogsList(d.logs || []);
            setActiveSessions(d.activeSessions || []);
          }
          if (sRes.ok) setSupportList((await sRes.json()).inquiries || []);
        } else if (targetTab === 'growth') {
          const [pRes, cRes, fsRes, bnRes, gcRes, lbRes, qaRes] = await Promise.all([
            fetch('/api/products'),
            fetch('/api/categories'),
            fetch('/api/admin/flash-sales', { headers }).catch(() => null),
            fetch('/api/admin/bundles', { headers }).catch(() => null),
            fetch('/api/admin/gift-cards', { headers }).catch(() => null),
            fetch('/api/admin/lookbooks', { headers }).catch(() => null),
            fetch('/api/admin/questions', { headers }).catch(() => null),
          ]);
          if (pRes.ok) setProductsList((await pRes.json()).products || []);
          if (cRes.ok) setCategoriesList((await cRes.json()).categories || []);
          if (fsRes?.ok) setFlashSalesList((await fsRes.json()).flashSales || []);
          if (bnRes?.ok) setBundlesList((await bnRes.json()).bundles || []);
          if (gcRes?.ok) setGiftCardsList((await gcRes.json()).giftCards || []);
          if (lbRes?.ok) setLookbooksList((await lbRes.json()).lookbooks || []);
          if (qaRes?.ok) setQuestionsList((await qaRes.json()).questions || []);
        } else if (targetTab === 'crm') {
          const [vtRes, cpRes, acRes, cmRes, biRes] = await Promise.all([
            fetch('/api/admin/vip-tiers', { headers }).catch(() => null),
            fetch('/api/admin/campaigns', { headers }).catch(() => null),
            fetch('/api/admin/abandoned-carts', { headers }).catch(() => null),
            fetch('/api/admin/complaints', { headers }).catch(() => null),
            fetch('/api/admin/bi/overview', { headers }).catch(() => null),
          ]);
          if (vtRes?.ok) setVipTiersList((await vtRes.json()).vipTiers || []);
          if (cpRes?.ok) setCampaignsList((await cpRes.json()).campaigns || []);
          if (acRes?.ok) setAbandonedCartsList((await acRes.json()).abandonedCarts || []);
          if (cmRes?.ok) setComplaintsList((await cmRes.json()).complaints || []);
          if (biRes?.ok) setBiOverview(await biRes.json());
        } else if (targetTab === 'bi') {
          const [biRes, scRes] = await Promise.all([
            fetch('/api/admin/bi/overview', { headers }),
            fetch('/api/admin/reports/schedules', { headers }),
          ]);
          if (biRes.ok) setBiOverview(await biRes.json());
          if (scRes.ok) setReportSchedules((await scRes.json()).schedules || []);
        } else if (targetTab === 'backups') {
          const res = await fetch('/api/admin/backups', { headers });
          if (res.ok) {
            const d = await res.json();
            setBackupsList(d.backups || []);
            setBackupRetention(d.retentionCount || 15);
          }
        }
      } catch (err) {
        console.error('Admin fetch error:', err);
      }
    },
    [adminToken, activeTab, hasAdminPermission]
  );

  useEffect(() => {
    if (adminToken && adminUser) {
      fetchTabData();
    }
  }, [adminToken, adminUser, activeTab, fetchTabData]);

  // =================== UNAUTHENTICATED LOGIN GATE ===================
  if (!adminToken || !adminUser) {
    return <AdminLoginGate />;
  }

  const refreshStorefrontAll = () => {
    refreshProducts();
    refreshCategories();
    refreshSettings();
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2] flex flex-col font-sans text-[#141413]">
      {/* Top Bar */}
      <header className="bg-white border-b border-[#E2DFD7] px-4 sm:px-8 h-16 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-[#141413] flex items-center justify-center text-[#D4AF6A]">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg font-bold tracking-tight text-[#141413]">
                Zohra Luxe Admin
              </span>
              <span className="text-[10px] uppercase font-bold text-[#164E3F] bg-[#ECF4F1] px-2 py-0.5 rounded border border-[#E2DFD7]">
                {adminUser.isSuperAdmin
                  ? 'Primary Owner'
                  : (adminUser.adminRole || 'Store Partner').replace('_', ' ')}
              </span>
            </div>
            <p className="text-[11px] text-[#63615C] font-mono">{adminUser.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {hasAdminPermission('notifications.manage', 'overview.view') && (
            <button
              type="button"
              onClick={() => setActiveTab('notifications')}
              className="relative p-2 bg-[#F7F6F2] hover:bg-[#EFECE6] border border-[#E2DFD7] rounded-md cursor-pointer"
              title="Admin Notifications"
            >
              <Bell className="w-4 h-4 text-[#141413]" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#B91C1C] text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadNotifications}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveView('store')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#F7F6F2] text-[#141413] border border-[#E2DFD7] rounded-md text-xs font-semibold cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#164E3F]" />
            <span className="hidden sm:inline">Storefront</span>
          </button>

          <button
            type="button"
            onClick={adminLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#B91C1C] hover:bg-red-800 text-white rounded-md text-xs font-semibold cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row">
        {/* RBAC Sidebar */}
        <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-[#E2DFD7] p-3 flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible shrink-0">
          {allowedNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap md:w-full ${
                  isActive
                    ? 'bg-[#ECF4F1] text-[#164E3F]'
                    : 'text-[#63615C] hover:bg-[#F7F6F2] hover:text-[#141413]'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#164E3F]' : 'text-[#63615C]'}`} />
                  <span>{item.label}</span>
                </span>
                {item.badge ? (
                  <span className="px-1.5 py-0.5 bg-[#B91C1C] text-white rounded-full text-[10px] font-bold">
                    {item.badge}
                  </span>
                ) : null}
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
              <button type="button" onClick={() => setNotice(null)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* OVERVIEW WITH CUSTOMIZABLE WIDGETS */}
          {activeTab === 'overview' && (() => {
            const orderedWidgets = [...widgets].sort((a, b) => a.order - b.order);
            const isWidgetVisible = (id: string) => {
              if (orderedWidgets.length === 0) return true;
              const found = orderedWidgets.find((w) => w.id === id);
              return found ? found.visible : true;
            };
            const saveWidgets = async (next: AdminWidgetPref[]) => {
              setWidgets(next);
              const res = await fetch('/api/admin/widgets', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
                body: JSON.stringify({ widgets: next }),
              });
              if (res.ok) pushNotice('success', 'Dashboard widget layout saved.');
            };
            const moveWidget = (idx: number, dir: -1 | 1) => {
              const target = idx + dir;
              if (target < 0 || target >= orderedWidgets.length) return;
              const copy = orderedWidgets.map((w) => ({ ...w }));
              const tempOrder = copy[idx].order;
              copy[idx].order = copy[target].order;
              copy[target].order = tempOrder;
              saveWidgets(copy);
            };
            const alerts: any[] = biOverview?.automatedAlerts || [];
            const forecast = biOverview?.salesForecast;
            const retention = biOverview?.retention;

            return (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="font-serif text-2xl font-bold text-[#141413]">Executive Store Overview</h1>
                    <p className="text-xs text-[#63615C]">
                      Live commerce telemetry, automated business alerts, integration status, and customizable KPI widgets
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCustomizingWidgets((v) => !v)}
                    className="px-3.5 py-2 bg-white border border-[#E2DFD7] hover:border-[#164E3F] rounded-md text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer self-start"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#164E3F]" />
                    <span>{customizingWidgets ? 'Done Customizing' : 'Customize Widgets'}</span>
                  </button>
                </div>

                {customizingWidgets && orderedWidgets.length > 0 && (
                  <div className="bg-white p-4 rounded-lg border border-[#D4AF6A] space-y-2.5 text-xs">
                    <p className="font-bold text-[#141413]">Dashboard Widget Preferences ({adminUser.email})</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {orderedWidgets.map((w, idx) => (
                        <div key={w.id} className="p-2.5 bg-[#F7F6F2] rounded border border-[#E2DFD7] flex items-center justify-between gap-2">
                          <label className="inline-flex items-center gap-2 font-semibold cursor-pointer">
                            <input
                              type="checkbox"
                              checked={w.visible}
                              onChange={() => {
                                const next = orderedWidgets.map((item) =>
                                  item.id === w.id ? { ...item, visible: !item.visible } : item
                                );
                                saveWidgets(next);
                              }}
                            />
                            <span>{w.label}</span>
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveWidget(idx, -1)}
                              disabled={idx === 0}
                              className="p-1 border border-[#E2DFD7] bg-white rounded disabled:opacity-40 cursor-pointer"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveWidget(idx, 1)}
                              disabled={idx === orderedWidgets.length - 1}
                              className="p-1 border border-[#E2DFD7] bg-white rounded disabled:opacity-40 cursor-pointer"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isWidgetVisible('w-revenue') && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-white rounded-lg border border-[#E2DFD7]">
                      <span className="text-[11px] font-bold uppercase text-[#63615C]">Total Sales</span>
                      <p className="text-2xl font-bold text-[#164E3F] font-mono tabular-nums mt-1">
                        ₹{(overview?.metrics?.totalSales || 0).toLocaleString()}
                      </p>
                      <p className="text-[11px] text-[#63615C]">Monthly: ₹{(overview?.metrics?.monthlyRevenue || 0).toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-white rounded-lg border border-[#E2DFD7]">
                      <span className="text-[11px] font-bold uppercase text-[#63615C]">Net Profit (Est.)</span>
                      <p className="text-2xl font-bold text-[#141413] font-mono tabular-nums mt-1">
                        ₹{(overview?.metrics?.netProfit || 0).toLocaleString()}
                      </p>
                      <p className="text-[11px] text-[#63615C]">Based on recorded costs &amp; expenses</p>
                    </div>
                    <div className="p-4 bg-white rounded-lg border border-[#E2DFD7]">
                      <span className="text-[11px] font-bold uppercase text-[#63615C]">Orders Queue</span>
                      <p className="text-2xl font-bold text-[#141413] font-mono tabular-nums mt-1">
                        {overview?.metrics?.totalOrders || 0}
                      </p>
                      <p className="text-[11px] text-[#B45309]">Pending fulfillment: {overview?.metrics?.pendingOrders || 0}</p>
                    </div>
                    <div className="p-4 bg-white rounded-lg border border-[#E2DFD7]">
                      <span className="text-[11px] font-bold uppercase text-[#63615C]">Catalog &amp; Stock</span>
                      <p className="text-2xl font-bold text-[#141413] font-mono tabular-nums mt-1">
                        {overview?.metrics?.totalProducts || 0} styles
                      </p>
                      <p className="text-[11px] text-[#B45309]">Low stock alerts: {overview?.metrics?.lowStockProducts || 0}</p>
                    </div>
                  </div>
                )}

                {isWidgetVisible('w-alerts') && alerts.length > 0 && (
                  <div className="bg-white p-4 rounded-lg border border-[#E2DFD7] space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <h3 className="font-serif text-base font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-[#B45309]" /> Automated Business Alerts ({alerts.length})
                      </h3>
                      {hasAdminPermission('reports.view', 'finance.view') && (
                        <button
                          type="button"
                          onClick={() => setActiveTab('bi')}
                          className="text-xs font-semibold text-[#164E3F] hover:underline cursor-pointer"
                        >
                          Open Full BI →
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {alerts.slice(0, 4).map((al) => (
                        <div key={al.id} className="p-2.5 bg-[#F7F6F2] rounded border border-[#E2DFD7]">
                          <p className="font-bold text-[#141413]">{al.title}</p>
                          <p className="text-[11px] text-[#63615C]">{al.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Retention & Forecast Quick Cards */}
                {(isWidgetVisible('w-retention') || isWidgetVisible('w-forecast')) && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
                    {isWidgetVisible('w-retention') && (
                      <div className="bg-white p-5 rounded-lg border border-[#E2DFD7] space-y-2">
                        <h3 className="font-serif text-lg font-bold">Customer Retention &amp; VIP Snapshot</h3>
                        <p className="font-mono text-sm font-bold text-[#164E3F]">
                          {retention?.retentionRatePercent ?? 0}% Repeat Rate · {retention?.repeatCustomerCount ?? 0} Repeat Buyers
                        </p>
                        <p className="text-[#63615C]">
                          VIP Circle Members: {biOverview?.segments?.summary?.vipMembers ?? 0} · Consented Cart Recovery Opt-Ins:{' '}
                          {biOverview?.segments?.summary?.abandonedCartConsented ?? 0}
                        </p>
                      </div>
                    )}
                    {isWidgetVisible('w-forecast') && (
                      <div className="bg-white p-5 rounded-lg border border-[#E2DFD7] space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-serif text-lg font-bold">Sales Forecast Estimate</h3>
                          <span className="px-2 py-0.5 bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] rounded text-[10px] font-bold uppercase">
                            Statistical Estimate Only
                          </span>
                        </div>
                        <p className="font-mono text-sm font-bold text-[#141413]">
                          Est. Next 30 Days: ₹{(forecast?.estimatedNext30DaysRevenue || 0).toLocaleString()}
                        </p>
                        <p className="text-[11px] text-[#63615C]">
                          Based on {forecast?.basedOnOrderCount || 0} non-cancelled orders · Not a guaranteed projection.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Integration Health + Action Queues */}
                {isWidgetVisible('w-stock') && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-5 rounded-lg border border-[#E2DFD7] space-y-3 text-xs">
                      <h3 className="font-serif text-lg font-bold">Configured External Integrations</h3>
                      <div className="grid grid-cols-2 gap-2.5">
                        {[
                          { label: 'Razorpay Payments', ok: overview?.integrations?.razorpayConfigured },
                          { label: 'Google OAuth Verify', ok: overview?.integrations?.googleOAuthConfigured },
                          { label: 'Shiprocket Courier', ok: overview?.integrations?.shiprocketConfigured },
                          { label: 'Gemini AI Stylist', ok: overview?.integrations?.geminiConfigured },
                        ].map((intg) => (
                          <div
                            key={intg.label}
                            className={`p-2.5 rounded border flex items-center justify-between ${
                              intg.ok
                                ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#166534]'
                                : 'bg-[#F7F6F2] border-[#E2DFD7] text-[#63615C]'
                            }`}
                          >
                            <span className="font-semibold">{intg.label}</span>
                            <span className="font-mono text-[10px] font-bold">{intg.ok ? 'ACTIVE' : 'UNSET'}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-lg border border-[#E2DFD7] space-y-3 text-xs">
                      <h3 className="font-serif text-lg font-bold">Pending Operational Queues</h3>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="p-3 bg-[#F7F6F2] rounded border border-[#E2DFD7]">
                          <p className="text-xl font-bold font-mono text-[#B45309]">{overview?.metrics?.pendingReturns || 0}</p>
                          <p className="text-[11px] text-[#63615C]">Open Returns</p>
                        </div>
                        <div className="p-3 bg-[#F7F6F2] rounded border border-[#E2DFD7]">
                          <p className="text-xl font-bold font-mono text-[#164E3F]">{overview?.metrics?.pendingWholesale || 0}</p>
                          <p className="text-[11px] text-[#63615C]">B2B Approvals</p>
                        </div>
                        <div className="p-3 bg-[#F7F6F2] rounded border border-[#E2DFD7]">
                          <p className="text-xl font-bold font-mono text-[#166534]">{overview?.metrics?.deliveredOrders || 0}</p>
                          <p className="text-[11px] text-[#63615C]">Delivered</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recent Orders */}
                {isWidgetVisible('w-orders') && (
                  <div className="bg-white rounded-lg border border-[#E2DFD7] p-5 space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="font-serif text-lg font-bold">Recent Orders</h3>
                      {hasAdminPermission('orders.view', 'orders.manage') && (
                        <button
                          type="button"
                          onClick={() => setActiveTab('orders')}
                          className="text-xs font-semibold text-[#164E3F] hover:underline cursor-pointer"
                        >
                          Open Orders Console →
                        </button>
                      )}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#F7F6F2] text-[#63615C] font-semibold border-b border-[#E2DFD7]">
                          <tr>
                            <th className="p-3">Order ID</th>
                            <th className="p-3">Customer</th>
                            <th className="p-3">Total</th>
                            <th className="p-3">Payment</th>
                            <th className="p-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2DFD7]">
                          {(overview?.recentOrders || []).map((ord: Order) => (
                            <tr key={ord.id} className="hover:bg-[#F7F6F2]">
                              <td className="p-3 font-mono font-bold text-[#164E3F]">{ord.id}</td>
                              <td className="p-3 font-semibold">{ord.customerName}</td>
                              <td className="p-3 font-mono font-bold">₹{ord.total.toLocaleString()}</td>
                              <td className="p-3 uppercase text-[11px]">{ord.paymentMethod} ({ord.paymentStatus})</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] text-[10px] font-bold uppercase">
                                  {ord.orderStatus}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {activeTab === 'products' && (
            <ProductsCatalogView
              products={productsList}
              categories={categoriesList}
              canEdit={hasAdminPermission('products.manage')}
              adminToken={adminToken}
              pushNotice={pushNotice}
              onRefresh={() => fetchTabData('products')}
              onRefreshStorefront={refreshStorefrontAll}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryManagementView
              products={productsList}
              lowStockItems={lowStockItems}
              stockMovements={stockMovements}
              canAdjust={hasAdminPermission('inventory.manage')}
              adminToken={adminToken}
              pushNotice={pushNotice}
              onRefresh={() => fetchTabData('inventory')}
              onRefreshStorefront={refreshStorefrontAll}
            />
          )}

          {activeTab === 'categories' && (
            <CategoriesManagementView
              categories={categoriesList}
              adminToken={adminToken}
              pushNotice={pushNotice}
              onRefresh={() => fetchTabData('categories')}
              onRefreshStorefront={refreshStorefrontAll}
            />
          )}

          {activeTab === 'orders' && (
            <OrdersManagementView
              orders={ordersList}
              shiprocketConfigured={shiprocketConfigured}
              canManageOrders={hasAdminPermission('orders.manage', 'delivery.manage')}
              canModifyPayment={!!adminUser.isSuperAdmin || hasAdminPermission('payments.refund', 'finance.view')}
              adminToken={adminToken}
              pushNotice={pushNotice}
              onRefresh={() => fetchTabData('orders')}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentsLedgerView
              transactions={transactionsList}
              orders={ordersList}
              gatewayStatus={gatewayStatus}
              canRefund={hasAdminPermission('payments.refund')}
              adminToken={adminToken}
              pushNotice={pushNotice}
              onRefresh={() => fetchTabData('payments')}
            />
          )}

          {activeTab === 'returns' && (
            <ReturnsManagementView
              returnsList={returnsList}
              adminToken={adminToken}
              pushNotice={pushNotice}
              onRefresh={() => fetchTabData('returns')}
              onRefreshStorefront={refreshStorefrontAll}
            />
          )}

          {activeTab === 'customers' && (
            <CustomersDirectoryView
              customers={customersList}
              canManage={hasAdminPermission('customers.manage')}
              adminToken={adminToken}
              pushNotice={pushNotice}
              onRefresh={() => fetchTabData('customers')}
            />
          )}

          {activeTab === 'wholesale' && (
            <WholesaleB2BView
              accounts={wholesaleAccounts}
              orders={wholesaleOrders}
              adminToken={adminToken}
              pushNotice={pushNotice}
              onRefresh={() => fetchTabData('wholesale')}
            />
          )}

          {activeTab === 'coupons' && (
            <CouponsOffersView
              coupons={couponsList}
              adminToken={adminToken}
              pushNotice={pushNotice}
              onRefresh={() => fetchTabData('coupons')}
            />
          )}

          {activeTab === 'growth' && (
            <GrowthPromotionsView
              products={productsList}
              categories={categoriesList}
              flashSales={flashSalesList}
              bundles={bundlesList}
              giftCards={giftCardsList}
              lookbooks={lookbooksList}
              questions={questionsList}
              canManage={hasAdminPermission('coupons.manage', 'products.manage', 'content.manage')}
              adminToken={adminToken}
              pushNotice={pushNotice}
              onRefresh={() => fetchTabData('growth')}
              onRefreshStorefront={refreshStorefrontAll}
            />
          )}

          {activeTab === 'crm' && (
            <CrmLoyaltyView
              vipTiers={vipTiersList}
              campaigns={campaignsList}
              abandonedCarts={abandonedCartsList}
              complaints={complaintsList}
              biData={biOverview}
              canManage={hasAdminPermission('customers.manage', 'orders.manage')}
              adminToken={adminToken}
              pushNotice={pushNotice}
              onRefresh={() => fetchTabData('crm')}
            />
          )}

          {activeTab === 'bi' && (
            <BusinessIntelligenceView
              biData={biOverview}
              schedules={reportSchedules}
              canScheduleReports={hasAdminPermission('reports.view', 'finance.view')}
              adminToken={adminToken}
              pushNotice={pushNotice}
              onRefresh={() => fetchTabData('bi')}
            />
          )}

          {activeTab === 'reviews' && (
            <ReviewsModerationView
              reviews={reviewsList}
              adminToken={adminToken}
              pushNotice={pushNotice}
              onRefresh={() => fetchTabData('reviews')}
              onRefreshStorefront={refreshStorefrontAll}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsAnalyticsView reportsData={reportsData} orders={ordersList} />
          )}

          {activeTab === 'finance' && (
            <FinancePnlExpensesView
              pnl={pnlData}
              canEditExpenses={hasAdminPermission('finance.view')}
              onFilterRange={(from, to) => fetchTabData('finance', from, to)}
              adminToken={adminToken}
              pushNotice={pushNotice}
              onRefresh={() => fetchTabData('finance')}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationsCenterView
              notifications={notificationsList}
              adminToken={adminToken}
              pushNotice={pushNotice}
              onRefresh={() => fetchTabData('notifications')}
            />
          )}

          {activeTab === 'team' && (
            <TeamPermissionsView
              teamList={teamList}
              primaryOwnerEmail={primaryOwnerEmail}
              rolePresets={rolePresets}
              allPermissions={allPermissions}
              callerPermissions={adminUser.permissions || []}
              isCallerOwner={!!adminUser.isSuperAdmin}
              onTransferOwnership={updateSuperAdminEmail}
              adminToken={adminToken}
              pushNotice={pushNotice}
              onRefresh={() => fetchTabData('team')}
            />
          )}

          {activeTab === 'cms' && (
            <CmsContentView
              settingsData={settingsData}
              setSettingsData={setSettingsData}
              adminToken={adminToken}
              pushNotice={pushNotice}
              onRefresh={() => fetchTabData('cms')}
              onRefreshStorefront={refreshStorefrontAll}
            />
          )}

          {activeTab === 'settings' && (
            <StoreSettingsView
              settingsData={settingsData}
              setSettingsData={setSettingsData}
              adminToken={adminToken}
              pushNotice={pushNotice}
              onRefresh={() => fetchTabData('settings')}
              onRefreshStorefront={refreshStorefrontAll}
            />
          )}

          {activeTab === 'logs' && (
            <SecurityLogsSessionsView
              logs={logsList}
              activeSessions={activeSessions}
              inquiries={supportList}
              adminToken={adminToken}
              pushNotice={pushNotice}
              onRefresh={() => fetchTabData('logs')}
            />
          )}

          {activeTab === 'backups' && (
            <BackupsRecoveryView
              backups={backupsList}
              retentionCount={backupRetention}
              adminToken={adminToken}
              pushNotice={pushNotice}
              onRefresh={() => fetchTabData('backups')}
              onRefreshStorefront={refreshStorefrontAll}
            />
          )}
        </main>
      </div>
    </div>
  );
};
