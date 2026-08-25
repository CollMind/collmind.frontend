import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/auth.slice';
import { FinanceDashboard } from '@/components/finance/FinanceDashboard';
import { financeReportingEndpoints } from '@/api/endpoints/finance-reporting.endpoints';
import { UserRole, UserStatus, User } from '@/types/user.types';
import { useMe } from '@/services/users.service';

// T-287 K3 vaka 1: `/finance` ekran kapısı `CATEGORY_MANAGER`'ı içeri alıyor
// (`routes/index.tsx`'in `path: '/finance'` girdisi, `{A,CM,F,RO}`) ama üç widget'ın çağırdığı
// rota kümesi CM'i içermiyor (`finance-reporting.controller.ts`'in `budget-at-risk` ·
// `variance-analysis` · `cash-flow-projection` uçları → `{A,F,RO}`). Sonuç: CM ekrana girer, üç widget canlı
// `403` verir. Bu suite önce KUSURU görür (`financeReportingEndpoints`
// mock'larının reject ile "backend 403 verdi" simülasyonu), sonra düzeltme
// sonrası bu üç çağrının CM için HİÇ YAPILMADIĞINI (widget seviyesinde
// koşullu render) doğrular. Ekran kapısı DEĞİŞMEZ — dört widget CM için hâlâ
// çalışır (pozitif yarı).

// ⛔ KRİTİK (code-reviewer B1, 2026-08-26): `FinanceDashboard` rolü
// `useMe()`'den okur, redux'tan DEĞİL. Rolü yalnız store'a koymak bu pini
// AYIRT EDİCİLİKTEN TÜMÜYLE YOKSUN bırakıyordu — MSW handler'ı `/users/me`
// için koşulsuz `ADMIN` döndürüyor, `hasRole` ADMIN'i geçiriyor, ve
// `canSeeRestrictedWidgets` HER ROL için `true` oluyordu.
// Mutasyonla ölçüldü: `CATEGORY_MANAGER` izinli listeye GERİ EKLENDİĞİNDE —
// yani bu task'ın önlemek için var olduğu TAM REGRESYON — suite YEŞİL kalıyordu.
// Doğru şekil kardeş testte zaten vardı (OffInvoiceTransactionsPage.resilience).
// `DISIPLIN`: "fixture, ayırt etmek istediği iki tarafta FARKLI değer taşımalı".
vi.mock('@/services/users.service', async () => {
  const actual = await vi.importActual<
    typeof import('@/services/users.service')
  >('@/services/users.service');
  return { ...actual, useMe: vi.fn() };
});

vi.mock('@/api/endpoints/finance-reporting.endpoints', async () => {
  const actual = await vi.importActual<
    typeof import('@/api/endpoints/finance-reporting.endpoints')
  >('@/api/endpoints/finance-reporting.endpoints');
  return {
    ...actual,
    financeReportingEndpoints: {
      getBudgetUtilization: vi.fn(),
      getSpendTrend: vi.fn(),
      getSpendComposition: vi.fn(),
      getPlanPerformance: vi.fn(),
      getBudgetAtRisk: vi.fn(),
      getMechanicEffectiveness: vi.fn(),
      getVarianceAnalysis: vi.fn(),
      getCashFlowProjection: vi.fn(),
    },
  };
});

// Bu suite yalnız RBAC KAPISINI (hangi widget hiç istek yapıyor/render
// oluyor) ölçüyor, widget içeriğini değil — §2.7 #6 izolasyonu. Gerçek
// widget'lar `financeReportingEndpoints`'in dönüş şekline bağımlı karmaşık
// render mantığı taşıyor; burada stub'lanıyorlar ama YİNE DE kendi
// `useQuery`'lerini tetikleyip mock edilen endpoint fonksiyonunu çağırıyor
// gibi davranmaları gerekmiyor çünkü assertion'lar doğrudan
// `financeReportingEndpoints` mock'larının ÇAĞRILIP ÇAĞRILMADIĞINI ölçüyor
// — bu çağrılar FinanceDashboard'ın KENDİ (export-amaçlı) `useQuery`
// kopyalarından gelir, widget stub'larından değil.
vi.mock('@/components/finance/widgets/BudgetUtilizationWidget', () => ({
  BudgetUtilizationWidget: () => <div>BudgetUtilizationWidget Stub</div>,
}));
vi.mock('@/components/finance/widgets/SpendTrendWidget', () => ({
  SpendTrendWidget: () => <div>SpendTrendWidget Stub</div>,
}));
vi.mock('@/components/finance/widgets/SpendCompositionWidget', () => ({
  SpendCompositionWidget: () => <div>SpendCompositionWidget Stub</div>,
}));
vi.mock('@/components/finance/widgets/PlanPerformanceWidget', () => ({
  PlanPerformanceWidget: () => <div>PlanPerformanceWidget Stub</div>,
}));
vi.mock('@/components/finance/widgets/BudgetAtRiskWidget', () => ({
  BudgetAtRiskWidget: () => <div>BudgetAtRiskWidget Stub</div>,
}));
vi.mock('@/components/finance/widgets/MechanicEffectivenessWidget', () => ({
  MechanicEffectivenessWidget: () => (
    <div>MechanicEffectivenessWidget Stub</div>
  ),
}));
vi.mock('@/components/finance/widgets/VarianceAnalysisWidget', () => ({
  VarianceAnalysisWidget: () => <div>VarianceAnalysisWidget Stub</div>,
}));
vi.mock('@/components/finance/widgets/CashFlowProjectionWidget', () => ({
  CashFlowProjectionWidget: () => <div>CashFlowProjectionWidget Stub</div>,
}));

const mocked = vi.mocked(financeReportingEndpoints);

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
}

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

function renderDashboard(role: UserRole) {
  // Bileşenin rolü GERÇEKTEN okuduğu yer — pinin ayırt ediciliği buna bağlı.
  vi.mocked(useMe).mockReturnValue({
    data: { ...baseUser, role } as User,
    isLoading: false,
  } as ReturnType<typeof useMe>);

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

  return render(
    <Provider store={store}>
      <QueryClientProvider client={createTestQueryClient()}>
        <FinanceDashboard />
      </QueryClientProvider>
    </Provider>
  );
}

describe('SÖZLEŞME: rota kümesinde olmayan rol, o rotayı çağıran widget’i HİÇ istemez', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const forbidden = Object.assign(new Error('Forbidden'), {
      isAxiosError: true,
      response: { status: 403, data: { message: 'Forbidden' } },
    });
    // CM için backend'in gerçekte döndüreceği 403'ü simüle et.
    mocked.getBudgetAtRisk.mockRejectedValue(forbidden);
    mocked.getVarianceAnalysis.mockRejectedValue(forbidden);
    mocked.getCashFlowProjection.mockRejectedValue(forbidden);
    // CM'e açık dört widget başarıyla döner.
    mocked.getBudgetUtilization.mockResolvedValue({ data: {} } as Awaited<ReturnType<typeof financeReportingEndpoints.getBudgetUtilization>>);
    mocked.getSpendTrend.mockResolvedValue({ data: {} } as Awaited<ReturnType<typeof financeReportingEndpoints.getSpendTrend>>);
    mocked.getSpendComposition.mockResolvedValue({ data: {} } as Awaited<ReturnType<typeof financeReportingEndpoints.getSpendComposition>>);
    mocked.getPlanPerformance.mockResolvedValue({ data: {} } as Awaited<ReturnType<typeof financeReportingEndpoints.getPlanPerformance>>);
    mocked.getMechanicEffectiveness.mockResolvedValue({ data: {} } as Awaited<ReturnType<typeof financeReportingEndpoints.getMechanicEffectiveness>>);
  });

  it('CATEGORY_MANAGER için budget-at-risk/variance-analysis/cash-flow-projection HİÇ ÇAĞRILMAZ (widget koşullu render)', async () => {
    renderDashboard(UserRole.CATEGORY_MANAGER);

    // CM'e açık widget'lardan biri yüklenene kadar bekle (render tamam).
    await waitFor(() =>
      expect(mocked.getBudgetUtilization).toHaveBeenCalled()
    );

    expect(mocked.getBudgetAtRisk).not.toHaveBeenCalled();
    expect(mocked.getVarianceAnalysis).not.toHaveBeenCalled();
    expect(mocked.getCashFlowProjection).not.toHaveBeenCalled();
  });

  it('pozitif yarı: FINANCE için üç widget ÇAĞRILIR (daralma yalnız CM hedefinde)', async () => {
    mocked.getBudgetAtRisk.mockResolvedValue({ data: {} } as Awaited<ReturnType<typeof financeReportingEndpoints.getBudgetAtRisk>>);
    mocked.getVarianceAnalysis.mockResolvedValue({ data: {} } as Awaited<ReturnType<typeof financeReportingEndpoints.getVarianceAnalysis>>);
    mocked.getCashFlowProjection.mockResolvedValue({ data: {} } as Awaited<ReturnType<typeof financeReportingEndpoints.getCashFlowProjection>>);

    renderDashboard(UserRole.FINANCE);

    await waitFor(() => expect(mocked.getBudgetAtRisk).toHaveBeenCalled());
    expect(mocked.getVarianceAnalysis).toHaveBeenCalled();
    expect(mocked.getCashFlowProjection).toHaveBeenCalled();
  });

  it('CATEGORY_MANAGER için dört izinli widget hâlâ görünüyor (ekran kapısı DEĞİŞMEDİ)', async () => {
    renderDashboard(UserRole.CATEGORY_MANAGER);

    await waitFor(() =>
      expect(screen.getByText('Bütçe Kullanım Özeti')).toBeInTheDocument()
    );
    expect(screen.getByText('Spend Trend')).toBeInTheDocument();
    expect(
      screen.getByText('On-Invoice Spend Kompozisyonu')
    ).toBeInTheDocument();
    expect(screen.getByText('Mekanik Etkinlik Raporu')).toBeInTheDocument();
  });
});
