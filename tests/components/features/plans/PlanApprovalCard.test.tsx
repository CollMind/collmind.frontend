import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PlanApprovalCard } from '@/components/features/plans/PlanApprovalsPage';
import { Plan } from '@/api/endpoints/plans.endpoints';
import { UserRole } from '@/types/user.types';

// T-182: `PlanApprovalsPage.tsx`'te Onayla/Reddet düğmeleri hiçbir rol
// kontrolü olmadan render ediliyordu (`userRole|hasRole|UserRole` geçiş
// sayısı: 0). `READONLY` düğmeyi görüyor, tıklıyor, backend 403 veriyordu.
// Gerçek onaycılar `plan.controller.ts:461,492` — `@Roles(ADMIN,
// CATEGORY_MANAGER)`. `FINANCE_MANAGER` bu düğmeyi KASITLI olarak görmüyor:
// FM yalnız escalation hattındaki `PENDING_FINANCE_REVIEW` planları onaylar
// (ADR 0002), ve bu liste yalnız `PENDING_APPROVAL` planları döndürür
// (`plan.service.ts:396`) — FM için bu düğme hiçbir zaman geçerli değil.
//
// §2.7 #6: pozitif/negatif çift assertion — yalnız pozitif yazılsaydı bu
// suite "düğme hep görünüyor" (bugünkü kusur) ile "doğru gated" arasını
// ayırt edemezdi.

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });

const renderWithClient = (ui: React.ReactElement) =>
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      {ui}
    </QueryClientProvider>
  );

// createdBy intentionally omitted: the card fires a nested
// `userEndpoints.getById` query only `enabled: !!plan.createdBy`. Omitting
// it keeps this test isolated from network/MSW.
const basePlan: Plan = {
  id: 'plan-1',
  version: 1,
  planCode: 'PLN-2026-001',
  planName: 'Test Plan',
  cplId: 'cpl-1',
  channelId: 'channel-1',
  categoryId: 'category-1',
  startDate: '2026-01-01',
  endDate: '2026-03-31',
  periodMonth: '2026-01',
  status: 'PENDING_APPROVAL',
  totalPlannedVolume: 1000,
  totalSpend: 50000,
  totalGp: 10000,
  overallRoi: 25,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const noop = () => {};

function renderCard(userRole: UserRole | undefined) {
  return renderWithClient(
    <PlanApprovalCard
      plan={basePlan}
      userRole={userRole}
      onReview={noop}
      onApprove={noop}
      onReject={noop}
      isApproving={false}
      isRejecting={false}
    />
  );
}

describe('PlanApprovalCard — T-182 role gating', () => {
  it('CATEGORY_MANAGER görüyor (backend: plan.controller.ts:461,492)', () => {
    renderCard(UserRole.CATEGORY_MANAGER);
    expect(screen.getByRole('button', { name: /onayla/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reddet/i })).toBeInTheDocument();
  });

  it('ADMIN görüyor (hasRole bypass)', () => {
    renderCard(UserRole.ADMIN);
    expect(screen.getByRole('button', { name: /onayla/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reddet/i })).toBeInTheDocument();
  });

  it('READONLY görmüyor (bugünkü kusur: önceden herkes görüyordu)', () => {
    renderCard(UserRole.READONLY);
    expect(
      screen.queryByRole('button', { name: /onayla/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /reddet/i })
    ).not.toBeInTheDocument();
  });

  it('FINANCE_MANAGER görmüyor (yalnız escalation/PENDING_FINANCE_REVIEW hattında onaylar — ADR 0002)', () => {
    renderCard(UserRole.FINANCE_MANAGER);
    expect(
      screen.queryByRole('button', { name: /onayla/i })
    ).not.toBeInTheDocument();
  });

  it('PLANNER görmüyor', () => {
    renderCard(UserRole.PLANNER);
    expect(
      screen.queryByRole('button', { name: /onayla/i })
    ).not.toBeInTheDocument();
  });

  it('rol tanımsızken görmüyor', () => {
    renderCard(undefined);
    expect(
      screen.queryByRole('button', { name: /onayla/i })
    ).not.toBeInTheDocument();
  });

  it('"Detay İncele" düğmesi role bakılmaksızın her zaman görünüyor', () => {
    // Not: /detay incele/i regex'i Türkçe İ/i büyük-küçük dönüşümünü JS
    // regex motorunun locale-agnostic case-folding'i yüzünden eşleştiremez
    // — tam metin eşleşmesi kullanılıyor.
    renderCard(UserRole.READONLY);
    expect(
      screen.getByRole('button', { name: 'Detay İncele' })
    ).toBeInTheDocument();
  });
});
