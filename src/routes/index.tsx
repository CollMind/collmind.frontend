import { createBrowserRouter } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { LoginPage } from '@/components/features/auth/LoginPage';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { DashboardPage } from '@/components/features/dashboard/DashboardPage';
import { BudgetPage } from '@/components/features/budget/BudgetPage';
import { BudgetEnvelopeDetail } from '@/components/budget/BudgetEnvelopeDetail';
import { BudgetLedgerPage } from '@/components/budget/BudgetLedgerPage';
import { AgreementsPage } from '@/components/features/agreements/AgreementsPage';
import { AgreementDetail } from '@/components/agreements/AgreementDetail';
import { AgreementEditPage } from '@/components/features/agreements/AgreementEditPage';
import { AgreementApprovalsPage } from '@/components/features/agreements/AgreementApprovalsPage';
import { PlansPage } from '@/components/features/plans/PlansPage';
import { PlanDetailPage } from '@/components/features/plans/PlanDetailPage';
import { PlanApprovalsPage } from '@/components/features/plans/PlanApprovalsPage';
import { FinanceDashboard } from '@/components/finance/FinanceDashboard';
import { UsersPage } from '@/components/features/users/UsersPage';
import { UserDetailPage } from '@/components/features/users/UserDetailPage';
import { ProfilePage } from '@/components/features/users/ProfilePage';

import { CustomersPage } from '@/components/features/customers/CustomersPage';
import { CustomerDetailPage } from '@/components/features/customers/CustomerDetailPage';
import { CustomerCreatePage } from '@/components/features/customers/CustomerCreatePage';
import { CustomerEditPage } from '@/components/features/customers/CustomerEditPage';
import { CustomerImportPage } from '@/components/features/customers/CustomerImportPage';
import { TenantsPage } from '@/components/features/tenants/TenantsPage';
import { TenantDetailPage } from '@/components/features/tenants/TenantDetailPage';
import { TenantCreatePage } from '@/components/features/tenants/TenantCreatePage';
import { ChannelManagementPage } from '@/components/features/admin/ChannelManagementPage';
import { CategoryManagementPage } from '@/components/features/admin/CategoryManagementPage';
import { CplManagementPage } from '@/components/features/admin/CplManagementPage';
import { BrandManagementPage } from '@/components/features/admin/BrandManagementPage';
import { RegionManagementPage } from '@/components/features/admin/RegionManagementPage';
import { TacticManagementPage } from '@/components/features/admin/TacticManagementPage';
import { MechanicManagementPage } from '@/components/features/admin/MechanicManagementPage';
import { GenericUnitManagementPage } from '@/components/features/admin/GenericUnitManagementPage';
import { ForecastingUnitManagementPage } from '@/components/features/admin/ForecastingUnitManagementPage';
import { SkuManagementPage } from '@/components/features/admin/SkuManagementPage';
import { AdminOverviewPage } from '@/components/features/admin/AdminOverviewPage';
import { BaselineImportPage } from '@/components/features/admin/BaselineImportPage';
import { KpiManagementPage } from '@/components/features/admin/KpiManagementPage';
import { AuditLogPage } from '@/components/features/admin/AuditLogPage';
import { ConfigurationPage } from '@/components/features/admin/ConfigurationPage';
import { OffInvoiceUploadPage } from '@/components/features/off-invoice/OffInvoiceUploadPage';
import { OffInvoiceTransactionsPage } from '@/components/features/off-invoice/OffInvoiceTransactionsPage';
import { OnInvoiceUploadPage } from '@/components/features/on-invoice/OnInvoiceUploadPage';
import { useMe } from '@/services/users.service';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

// Settings Page
const SettingsPage = () => {
  const { data: user, isLoading } = useMe();

  if (isLoading) return <LoadingSpinner />;

  // user is not used but kept for future use

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Application Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Theme
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option>Light</option>
              <option>Dark</option>
              <option>Auto</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Language
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option>English</option>
              <option>Turkish</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

const NotFoundPage = () => (
  <div className="flex flex-col items-center justify-center min-h-[400px]">
    <h1 className="text-4xl font-bold mb-4">404</h1>
    <p className="text-gray-600 mb-4">Page not found</p>
    <Link to="/dashboard" className="text-primary-600 hover:text-primary-700">
      Go to Dashboard
    </Link>
  </div>
);

// T-179: the raw route config is exported separately from `router` so tests
// can drive it through `createMemoryRouter` (jsdom-safe, no real
// `window.history`) instead of introspecting `createBrowserRouter`'s
// internal `RemixRouter` shape or re-declaring the `requiredRole` arrays by
// hand — a hand-copied test fixture would drift from this file exactly the
// way `Sidebar.tsx`'s per-persona menus already have (see T-179 report).
export const routeConfig: RouteObject[] = [
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout>
          <ErrorBoundary>
            <DashboardPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <AppLayout>
          <ErrorBoundary>
            <DashboardPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/customers',
    element: (
      <ProtectedRoute>
        <AppLayout>
          <ErrorBoundary>
            <CustomersPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/customers/new',
    element: (
      <ProtectedRoute requiredRole={['ADMIN', 'PLANNER']}>
        <AppLayout>
          <ErrorBoundary>
            <CustomerCreatePage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/customers/:id',
    element: (
      <ProtectedRoute>
        <AppLayout>
          <ErrorBoundary>
            <CustomerDetailPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/customers/:id/edit',
    element: (
      <ProtectedRoute requiredRole={['ADMIN', 'PLANNER']}>
        <AppLayout>
          <ErrorBoundary>
            <CustomerEditPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/customers/import',
    element: (
      <ProtectedRoute requiredRole={['ADMIN', 'PLANNER']}>
        <AppLayout>
          <ErrorBoundary>
            <CustomerImportPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/users',
    element: (
      <ProtectedRoute requiredRole={['ADMIN']}>
        <AppLayout>
          <ErrorBoundary>
            <UsersPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/users/:id',
    element: (
      <ProtectedRoute requiredRole={['ADMIN']}>
        <AppLayout>
          <ErrorBoundary>
            <UserDetailPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/tenants',
    element: (
      <ProtectedRoute requiredRole={['ADMIN']}>
        <AppLayout>
          <ErrorBoundary>
            <TenantsPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/tenants/new',
    element: (
      <ProtectedRoute requiredRole={['ADMIN']}>
        <AppLayout>
          <ErrorBoundary>
            <TenantCreatePage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/tenants/:id',
    element: (
      <ProtectedRoute requiredRole={['ADMIN']}>
        <AppLayout>
          <ErrorBoundary>
            <TenantDetailPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings',
    element: (
      <ProtectedRoute>
        <AppLayout>
          <ErrorBoundary>
            <SettingsPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/profile',
    element: (
      <ProtectedRoute>
        <AppLayout>
          <ErrorBoundary>
            <ProfilePage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/budget',
    element: (
      <ProtectedRoute>
        <AppLayout>
          <ErrorBoundary>
            <BudgetPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/budget/:id',
    element: (
      <ProtectedRoute>
        <AppLayout>
          <ErrorBoundary>
            <BudgetEnvelopeDetail />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    // T-287 K3 vaka 3: bu kapı `requiredRole` TAŞIMIYORDU, yani beş rol de
    // ekrana giriyordu — ama çağırdığı `GET /ledger`
    // (ledger.controller.ts, `GET /` ucunun `@Roles(ADMIN,FINANCE,PLANNER)`'u) yalnız
    // üç rolü kabul ediyor. Daraltma: ekran kapısı rota kümesine hizalandı
    // (erişim GENİŞLETİLMEDİ — CATEGORY_MANAGER ve READONLY bugün zaten
    // canlı `403` alıyordu).
    // ⛔ `Z43 §2/§4` (`B3` istisna-dalgası `Faz-B`, 2026-08-27) — backend
    // `MODES_LEDGER_READ` hücresi `+READONLY` aldı ({A,F,P} → {A,F,P,RO},
    // `K-2.6.4c`: "İZLEYİCİ bir İZLEME YETENEKLERİ SETİDİR"). İKİ-REPO-TEK-
    // KAPANIŞ: backend `+RO` inip ekran kapısı kapalı kalırsa yetki
    // ULAŞILAMAZ doğar (`EK_E` `🔒` sınıfı) — bu satır aynı commit'te açılır.
    path: '/budget/ledger',
    element: (
      <ProtectedRoute requiredRole={['ADMIN', 'FINANCE', 'PLANNER', 'READONLY']}>
        <AppLayout>
          <ErrorBoundary>
            <BudgetLedgerPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    // ⚠️ B dalgası / R2a (⛔ P0, 2026-08-13): bu dosyadaki tüm `requiredRole` dizileri
    // backend'in TEL değerleriyle (`UserRole` enum'unun taşıdığı string) birebir
    // eşleşmeli — bileşen tipiyle değil. `'FINANCE_MANAGER'` → `'FINANCE'` oldu (11
    // yerde, grep ile değiştirildi); backend eski jenerik `FINANCE` rolünü sildiği
    // için etiketi Finance Manager'a devretti (bkz. backend `user.entity.ts`).
    path: '/agreements',
    element: (
      <ProtectedRoute
        requiredRole={[
          'ADMIN',
          'PLANNER',
          'CATEGORY_MANAGER',
          'FINANCE',
          'READONLY',
        ]}
      >
        <AppLayout>
          <ErrorBoundary>
            <AgreementsPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/agreements/:id',
    element: (
      <ProtectedRoute
        requiredRole={[
          'ADMIN',
          'PLANNER',
          'CATEGORY_MANAGER',
          'FINANCE',
          'READONLY',
        ]}
      >
        <AppLayout>
          <ErrorBoundary>
            <AgreementDetail />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/agreements/:id/edit',
    element: (
      <ProtectedRoute requiredRole={['ADMIN', 'PLANNER']}>
        <AppLayout>
          <ErrorBoundary>
            <AgreementEditPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/agreement-approvals',
    element: (
      <ProtectedRoute
        requiredRole={[
          'ADMIN',
          'CATEGORY_MANAGER',
          'FINANCE',
          'READONLY',
        ]}
      >
        <AppLayout>
          <ErrorBoundary>
            <AgreementApprovalsPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/plans',
    element: (
      <ProtectedRoute
        requiredRole={[
          'ADMIN',
          'PLANNER',
          'CATEGORY_MANAGER',
          'FINANCE',
          'READONLY',
        ]}
      >
        <AppLayout>
          <ErrorBoundary>
            <PlansPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/plans/:id',
    element: (
      <ProtectedRoute
        requiredRole={[
          'ADMIN',
          'PLANNER',
          'CATEGORY_MANAGER',
          'FINANCE',
          'READONLY',
        ]}
      >
        <AppLayout>
          <ErrorBoundary>
            <PlanDetailPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/plan-approvals',
    element: (
      <ProtectedRoute
        requiredRole={['ADMIN', 'CATEGORY_MANAGER', 'READONLY']}
      >
        <AppLayout>
          <ErrorBoundary>
            <PlanApprovalsPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/finance',
    element: (
      <ProtectedRoute
        requiredRole={[
          'ADMIN',
          'FINANCE',
          'CATEGORY_MANAGER',
          'READONLY',
        ]}
      >
        <AppLayout>
          <ErrorBoundary>
            <FinanceDashboard />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/off-invoice/upload',
    element: (
      <ProtectedRoute requiredRole={['ADMIN', 'FINANCE']}>
        <AppLayout>
          <ErrorBoundary>
            <OffInvoiceUploadPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    // T-287 K3 vaka 2: bu ekran `agreement-transaction.controller.ts`
    // `{ADMIN,FINANCE,PLANNER}` rota kümesi üzerine kuruludur (count/
    // transactions/summary) — `READONLY` bu kümede YOK, sayfa yükleme anında
    // `Promise.all` içindeki üç off-invoice çağrısının hepsinde 403 alır ve
    // (kırılganlık ayrı ele alındı, aşağı bkz.) sayfanın TAMAMI kırılır.
    // Daraltma: ekran kapısı rota kümesine hizalandı (erişim
    // GENİŞLETİLMEDİ — READONLY bugün zaten canlı `403` alıyordu).
    // ⛔ `Z43 §2/§4` (`B3` istisna-dalgası `Faz-B`, 2026-08-27) — backend
    // `MODES_LEDGER_READ` hücresi `+READONLY` aldı (count/transactions/
    // stats-summary artık {A,F,P,RO}). İKİ-REPO-TEK-KAPANIŞ: kapı burada
    // aynı commit'te açılır, yoksa `200` dönen API'ye rağmen ekran
    // ULAŞILAMAZ kalır (ürün sahibi: "API `200` olsa da ekran zinciri ayrı
    // kırılabilir — kapanışın kanıtı iki repodan da gelir").
    path: '/off-invoice/transactions',
    element: (
      <ProtectedRoute requiredRole={['ADMIN', 'FINANCE', 'PLANNER', 'READONLY']}>
        <AppLayout>
          <ErrorBoundary>
            <OffInvoiceTransactionsPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    // Aynı sayfa, aynı gerekçe — bkz. `/off-invoice/transactions` yorumu.
    path: '/off-invoice',
    element: (
      <ProtectedRoute requiredRole={['ADMIN', 'FINANCE', 'PLANNER', 'READONLY']}>
        <AppLayout>
          <ErrorBoundary>
            <OffInvoiceTransactionsPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/on-invoice/upload',
    element: (
      <ProtectedRoute requiredRole={['ADMIN', 'FINANCE']}>
        <AppLayout>
          <ErrorBoundary>
            <OnInvoiceUploadPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/on-invoice',
    element: (
      <ProtectedRoute
        requiredRole={['ADMIN', 'FINANCE', 'PLANNER', 'READONLY']}
      >
        <AppLayout>
          <ErrorBoundary>
            <OnInvoiceUploadPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/channel-management',
    element: (
      <ProtectedRoute requiredRole={['ADMIN']}>
        <AppLayout>
          <ErrorBoundary>
            <ChannelManagementPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/category-management',
    element: (
      <ProtectedRoute requiredRole={['ADMIN']}>
        <AppLayout>
          <ErrorBoundary>
            <CategoryManagementPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/cpl-management',
    element: (
      <ProtectedRoute requiredRole={['ADMIN']}>
        <AppLayout>
          <ErrorBoundary>
            <CplManagementPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/brand-management',
    element: (
      <ProtectedRoute requiredRole={['ADMIN']}>
        <AppLayout>
          <ErrorBoundary>
            <BrandManagementPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/region-management',
    element: (
      <ProtectedRoute requiredRole={['ADMIN']}>
        <AppLayout>
          <ErrorBoundary>
            <RegionManagementPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/tactic-management',
    element: (
      <ProtectedRoute requiredRole={['ADMIN']}>
        <AppLayout>
          <ErrorBoundary>
            <TacticManagementPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/mechanic-management',
    element: (
      <ProtectedRoute requiredRole={['ADMIN']}>
        <AppLayout>
          <ErrorBoundary>
            <MechanicManagementPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/generic-unit-management',
    element: (
      <ProtectedRoute requiredRole={['ADMIN']}>
        <AppLayout>
          <ErrorBoundary>
            <GenericUnitManagementPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/forecasting-unit-management',
    element: (
      <ProtectedRoute requiredRole={['ADMIN']}>
        <AppLayout>
          <ErrorBoundary>
            <ForecastingUnitManagementPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/sku-management',
    element: (
      <ProtectedRoute requiredRole={['ADMIN']}>
        <AppLayout>
          <ErrorBoundary>
            <SkuManagementPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/overview',
    element: (
      <ProtectedRoute requiredRole={['ADMIN']}>
        <AppLayout>
          <ErrorBoundary>
            <AdminOverviewPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/users',
    element: (
      <ProtectedRoute requiredRole={['ADMIN']}>
        <AppLayout>
          <ErrorBoundary>
            <UsersPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/baseline-import',
    element: (
      <ProtectedRoute requiredRole={['ADMIN']}>
        <AppLayout>
          <ErrorBoundary>
            <BaselineImportPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/kpi-management',
    element: (
      <ProtectedRoute requiredRole={['ADMIN']}>
        <AppLayout>
          <ErrorBoundary>
            <KpiManagementPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/customers',
    element: (
      <ProtectedRoute requiredRole={['ADMIN']}>
        <AppLayout>
          <ErrorBoundary>
            <CustomersPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/audit-log',
    element: (
      <ProtectedRoute requiredRole={['ADMIN']}>
        <AppLayout>
          <ErrorBoundary>
            <AuditLogPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/configuration',
    element: (
      <ProtectedRoute requiredRole={['ADMIN']}>
        <AppLayout>
          <ErrorBoundary>
            <ConfigurationPage />
          </ErrorBoundary>
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '*',
    element: (
      <ProtectedRoute>
        <AppLayout>
          <NotFoundPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
];

export const router = createBrowserRouter(routeConfig);
