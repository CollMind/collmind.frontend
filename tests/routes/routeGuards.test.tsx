import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import authReducer from '@/store/slices/auth.slice';
import { User, UserRole, UserStatus } from '@/types/user.types';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

// T-179: `src/routes/index.tsx`'in `requiredRole` kapıları deprecated
// (`MANAGER`/`FINANCE`) dizelere kurulmuştu ve `hasRole` `ADMIN` dışında
// deny-by-default olduğu için kanonik roller (`CATEGORY_MANAGER`,
// `FINANCE_MANAGER`) ilgili route'lara giremiyordu — `docs/analysis/
// 0056-rbac-ve-rls-tasarim-notu.md §A.4.1`.
//
// Bu dosya iki farklı şeyi ayrı ayrı sınar (§2.7 #6 — "ayırt edici" test):
//
//   Part A — DAVRANIŞ: gerçek `routeConfig` + gerçek `ProtectedRoute` +
//   gerçek `hasRole` üzerinden, dört ölçülen route için hem GİREBİLEN hem
//   GİREMEYEN bir rolle iki ayrı assertion. Ağır sayfa bileşenleri (data
//   fetch eden) `vi.mock` ile stub'lanır — MSW ile her endpoint'i mock'lamak
//   bu testin amacı değil, RBAC kapısının kendisidir.
//
//   Part B — REGRESYON GUARD'I: `routeConfig`'teki TÜM `requiredRole`
//   dizilerini (38'i de, yalnız bugün düzeltilen 12'sini değil) tarayıp
//   deprecated (`MANAGER`/`FINANCE`/`APPROVER`) bir dizenin BİR DAHA asla
//   sessizce geri gelmediğini doğrular. `CLAUDE.md`'nin istediği "backend
//   @Roles ile frontend requiredRole arasındaki ayrışmayı yakalayan
//   mekanizma"nın frontend tarafı budur; backend @Roles ile otomatik
//   karşılaştırma ayrı bir araç/karar gerektirir (bkz. task raporu).

vi.mock('@/components/layout/AppLayout', () => ({
  // Header/Sidebar kendi API çağrılarını yapıyor (bildirimler, kullanıcı
  // bilgisi vb.) — bu test yalnız route GATE'ini ölçüyor, layout chrome'unu
  // değil. Gerçek AppLayout MSW'de mock'lanmamış isteklere düşer ve
  // `onUnhandledRequest: 'error'` testi kırar.
  AppLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  ),
}));

vi.mock('@/components/features/dashboard/DashboardPage', () => ({
  // Rol reddedilince `ProtectedRoute` `/dashboard`'a yönlendiriyor —
  // redirect hedefinin kendisi de veri çeken ağır bir sayfa.
  DashboardPage: () => <div>Dashboard Stub</div>,
}));

vi.mock('@/components/features/plans/PlanApprovalsPage', () => ({
  PlanApprovalsPage: () => <div>PlanApprovalsPage Stub</div>,
}));

vi.mock('@/components/features/agreements/AgreementApprovalsPage', () => ({
  AgreementApprovalsPage: () => <div>AgreementApprovalsPage Stub</div>,
}));

vi.mock('@/components/finance/FinanceDashboard', () => ({
  FinanceDashboard: () => <div>FinanceDashboard Stub</div>,
}));

vi.mock('@/components/features/off-invoice/OffInvoiceUploadPage', () => ({
  OffInvoiceUploadPage: () => <div>OffInvoiceUploadPage Stub</div>,
}));

// Mock edilmemiş diğer tüm sayfalar `routeConfig` içinde import edilmiş
// haldedir ve modül-yükleme sırasında çalıştırılabilir; ama render
// EDİLMEDİKLERİ sürece (yalnız test ettiğimiz path'in `element`'i render
// olur) sorun çıkarmazlar — react-router yalnız eşleşen route'un element'ini
// mount eder.

// `routeConfig`'i mock'lardan SONRA import et (vi.mock hoisted olduğu için
// sıralama garanti, ama açıklık için burada tutuluyor).
import { routeConfig } from '@/routes';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });

const baseUser: Omit<User, 'role'> = {
  id: '1',
  email: 'test@example.com',
  fullName: 'Test User',
  firstName: 'Test',
  lastName: 'User',
  status: UserStatus.ACTIVE,
  tenantId: 'tenant-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

function renderAtPath(path: string, role: UserRole) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        isAuthenticated: true,
        user: { ...baseUser, role } as User,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        isLoading: false,
        error: null,
      },
    },
  });

  // T-040'ın `renderWithProviders` deseniyle aynı gerekçe: `<Navigate>`
  // gerçek bir yönlendirmeyi ancak bir SIBLING route onu "tüketirse" tamamlar
  // — `createMemoryRouter`/`RouterProvider` burada ayrıca `undici`/MSW ile
  // çakışan bir dahili "data router" fetch'i tetikliyor (`AbortSignal`
  // TypeError, gerçek ağ isteği YOK) — bu yüzden `MemoryRouter`+`Routes`
  // (data-router olmayan, "declarative" API) kullanılıyor; ProtectedRoute
  // testleri zaten bu deseni kanıtlamış durumda.
  return render(
    <Provider store={store}>
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            {routeConfig.map((route) =>
              route.path ? (
                <Route
                  key={route.path}
                  path={route.path}
                  element={route.element}
                />
              ) : null
            )}
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </Provider>
  );
}

describe('route RBAC gates (src/routes/index.tsx)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Part A — behavioral: real routeConfig + real ProtectedRoute + real hasRole', () => {
    it('/plan-approvals: CATEGORY_MANAGER girebilir (T-179 öncesi kırıktı)', async () => {
      renderAtPath('/plan-approvals', UserRole.CATEGORY_MANAGER);
      expect(
        await screen.findByText('PlanApprovalsPage Stub')
      ).toBeInTheDocument();
    });

    it('/plan-approvals: PLANNER giremez (backend `GET /plans/pending-approvals` @Roles onu içermiyor — plan.controller.ts:106)', async () => {
      renderAtPath('/plan-approvals', UserRole.PLANNER);
      expect(await screen.findByText('Dashboard Stub')).toBeInTheDocument();
      expect(
        screen.queryByText('PlanApprovalsPage Stub')
      ).not.toBeInTheDocument();
    });

    it('/agreement-approvals: FINANCE girebilir (T-179 öncesi kırıktı)', async () => {
      renderAtPath('/agreement-approvals', UserRole.FINANCE);
      expect(
        await screen.findByText('AgreementApprovalsPage Stub')
      ).toBeInTheDocument();
    });

    it('/agreement-approvals: PLANNER giremez (backend `GET /agreements/pending-approvals` @Roles onu içermiyor — agreement.controller.ts:85-90)', async () => {
      renderAtPath('/agreement-approvals', UserRole.PLANNER);
      expect(await screen.findByText('Dashboard Stub')).toBeInTheDocument();
      expect(
        screen.queryByText('AgreementApprovalsPage Stub')
      ).not.toBeInTheDocument();
    });

    it('/finance: FINANCE girebilir (T-179 öncesi kırıktı — kapı deprecated `FINANCE` kullanıyordu)', async () => {
      renderAtPath('/finance', UserRole.FINANCE);
      expect(
        await screen.findByText('FinanceDashboard Stub')
      ).toBeInTheDocument();
    });

    it('/finance: PLANNER giremez (finance-reporting endpoint çoğunluğu PLANNER içermiyor)', async () => {
      renderAtPath('/finance', UserRole.PLANNER);
      expect(await screen.findByText('Dashboard Stub')).toBeInTheDocument();
      expect(
        screen.queryByText('FinanceDashboard Stub')
      ).not.toBeInTheDocument();
    });

    it('/off-invoice/upload: FINANCE girebilir (T-179 öncesi kırıktı)', async () => {
      renderAtPath('/off-invoice/upload', UserRole.FINANCE);
      expect(
        await screen.findByText('OffInvoiceUploadPage Stub')
      ).toBeInTheDocument();
    });

    it('/off-invoice/upload: PLANNER giremez (backend `POST /agreement-transactions/upload` @Roles UserRole.ADMIN+UserRole.FINANCE — agreement-transaction.controller.ts:289 — BRD §7.2 ile çelişiyor, bkz. task raporu)', async () => {
      renderAtPath('/off-invoice/upload', UserRole.PLANNER);
      expect(await screen.findByText('Dashboard Stub')).toBeInTheDocument();
      expect(
        screen.queryByText('OffInvoiceUploadPage Stub')
      ).not.toBeInTheDocument();
    });

    it('ADMIN her zaman girebilir (hasRole admin-bypass) — /plan-approvals kontrolü', async () => {
      renderAtPath('/plan-approvals', UserRole.ADMIN);
      expect(
        await screen.findByText('PlanApprovalsPage Stub')
      ).toBeInTheDocument();
    });
  });

  describe('Part B — regresyon guard\'ı: routeConfig genelinde deprecated rol taraması', () => {
    // ⚠️ B dalgası / R2a (⛔ P0, 2026-08-13) bu listeyi TERSİNE ÇEVİRDİ — kayıt için:
    //   önce (T-179, docs/analysis/0056 §C): 'FINANCE' deprecated'di, 'FINANCE_MANAGER'
    //   kanonikti. Backend enum'u burada TEL PROTOKOLÜ — B dalgası eski jenerik
    //   'FINANCE' rolünü sildi (0 kullanıcı) ve etiketi FINANCE_MANAGER'a devretti;
    //   şimdi 'FINANCE' KANONİK, ham 'FINANCE_MANAGER' string'i (varsa) STALE.
    // `MANAGER`/`APPROVER` `UserRole` enum'ından TAMAMEN kaldırıldı (0 kullanıcı,
    // K-2.6.4b/d) — artık deprecated değil, YOK. Üçü de burada aynı listede kalıyor
    // çünkü ikisi de "bu string route KAPISINDA görünmemeli" anlamına geliyor.
    const DEPRECATED_ROLES = ['MANAGER', 'APPROVER', 'FINANCE_MANAGER'];

    function collectRequiredRoleProps(
      node: React.ReactNode,
      acc: { path: string; roles: string[] }[],
      path: string
    ) {
      if (node == null || typeof node === 'boolean') return;
      if (Array.isArray(node)) {
        node.forEach((child) => collectRequiredRoleProps(child, acc, path));
        return;
      }
      if (!React.isValidElement(node)) return;
      const props = node.props as {
        requiredRole?: string[];
        children?: React.ReactNode;
      };
      if (node.type === ProtectedRoute && props.requiredRole) {
        acc.push({ path, roles: props.requiredRole });
      }
      if (props.children) {
        collectRequiredRoleProps(props.children, acc, path);
      }
    }

    it('routeConfig içindeki HER `requiredRole` dizisi en az bir tane bulunmalı (fixture ölü değil)', () => {
      const found: { path: string; roles: string[] }[] = [];
      for (const route of routeConfig) {
        if (!route.path || !route.element) continue;
        collectRequiredRoleProps(route.element, found, route.path);
      }
      // T-179 ölçümü: 38 `requiredRole` gate'i var. Bu sayı büyüyebilir
      // (yeni route eklenince) ama SIFIRA düşerse guard'ın kendisi kör
      // demektir (§2.7 #9 — kapsam kendini boşaltıyor).
      expect(found.length).toBeGreaterThan(0);
    });

    it('routeConfig içinde HİÇBİR requiredRole dizisi deprecated bir rol İÇERMEMELİ', () => {
      const found: { path: string; roles: string[] }[] = [];
      for (const route of routeConfig) {
        if (!route.path || !route.element) continue;
        collectRequiredRoleProps(route.element, found, route.path);
      }

      const violations = found
        .map(({ path, roles }) => ({
          path,
          deprecated: roles.filter((r) => DEPRECATED_ROLES.includes(r)),
        }))
        .filter((v) => v.deprecated.length > 0);

      expect(violations).toEqual([]);
    });
  });
});
