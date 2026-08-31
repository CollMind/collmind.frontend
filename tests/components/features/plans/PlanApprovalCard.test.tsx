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
// CATEGORY_MANAGER)`. `FINANCE` (Finance Manager, eski TS key `FINANCE_MANAGER`
// — `Z7`, 2026-08-17) bu düğmeyi KASITLI olarak görmüyor: FM yalnız escalation
// hattındaki `PENDING_FINANCE_REVIEW` planları onaylar (ADR 0002), ve bu liste
// yalnız `PENDING_APPROVAL` planları döndürür (`plan.service.ts:396`) — FM için
// bu düğme hiçbir zaman geçerli değil.
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

  it('FINANCE görmüyor (yalnız escalation/PENDING_FINANCE_REVIEW hattında onaylar — ADR 0002)', () => {
    renderCard(UserRole.FINANCE);
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

/**
 * ⛔ `T-344` / `Z73 §3` **ŞART 3 — `B3` ÖLÜMÜ, BEKLENEN-DEĞİŞİM PİNLİ.**
 *
 * Banner eskiden `toNumberOrZero(plan.overallRoi) < 20` ile karar veriyordu.
 * Üç kusur birden:
 * ```
 * 1  eşik KODDAN        → §2.3 ihlali
 * 2  null ROI ⇒ 0       → "hesaplanamadı" olan HER plan uyarı alıyordu (§2.5)
 * 3  RAG rengi OKUNMUYOR→ RED/AMBER/LTA planlar da banner görüyordu, yani
 *                         `Z71 §1`'in ENGELLEMEK için yazdığı ÇİFTE SAYIM
 * ```
 * Aşağıdaki `banner-sız` vakaların HEPSİ **dün banner GÖRÜYORDU**. Bu bir
 * düzeltme, ama **görünür bir değişimdir** — ve pin onu bir randevuya
 * çevirir: biri `B3`'ü geri getirirse burası kırmızıya döner.
 */
function renderCardWith(
  overrides: Partial<Plan>,
  targetRoiThreshold: number | null
) {
  return renderWithClient(
    <PlanApprovalCard
      plan={{ ...basePlan, ...overrides }}
      userRole={UserRole.CATEGORY_MANAGER}
      targetRoiThreshold={targetRoiThreshold}
      onReview={noop}
      onApprove={noop}
      onReject={noop}
      isApproving={false}
      isRejecting={false}
    />
  );
}

describe('PlanApprovalCard — T-344: below-target banner (B3 ölümü)', () => {
  it('⭐ GREEN ∧ ROI < hedef ⇒ banner VAR, ve eşik KONFİGÜRASYONDAN gelir', () => {
    renderCardWith({ ragStatus: 'GREEN', overallRoi: 10.5 }, 20);
    expect(screen.getByTestId('below-target-roi-banner')).toBeInTheDocument();
    // ⛔ Metin okunuyor, kutunun varlığı değil (T-332).
    expect(screen.getByText(/hedef %20\.0/i)).toBeInTheDocument();
  });

  it('⭐ eşik 15 ise ROI 10.5 yine altta — ve METİN 15 der (hardcode `20` ÖLDÜ)', () => {
    // ⛔ AYIRT EDİCİ VAKA: `20` sabiti kalsaydı bu test yine YEŞİL olurdu
    // (10.5 < 20 de doğru), ama metin `%20.0` derdi. Assertion metni okuyor.
    renderCardWith({ ragStatus: 'GREEN', overallRoi: 10.5 }, 15);
    expect(screen.getByText(/hedef %15\.0/i)).toBeInTheDocument();
  });

  it('⭐ eşik 5 ise ROI 10.5 hedefin ÜSTÜNDE ⇒ banner YOK (sabit `20` olsaydı VARDI)', () => {
    renderCardWith({ ragStatus: 'GREEN', overallRoi: 10.5 }, 5);
    expect(screen.queryByTestId('below-target-roi-banner')).not.toBeInTheDocument();
  });

  it('⛔ BEKLENEN DEĞİŞİM — `null` ROI: DÜN banner vardı, BUGÜN YOK', () => {
    renderCardWith({ ragStatus: 'GREEN', overallRoi: null }, 20);
    expect(screen.queryByTestId('below-target-roi-banner')).not.toBeInTheDocument();
    // Ve ROI hücresi `%0,0` DEĞİL, "—" gösterir.
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('⛔ BEKLENEN DEĞİŞİM — RED: DÜN banner vardı, BUGÜN YOK (kadran konuşuyor)', () => {
    renderCardWith({ ragStatus: 'RED', overallRoi: 1 }, 20);
    expect(screen.queryByTestId('below-target-roi-banner')).not.toBeInTheDocument();
  });

  it('⛔ BEKLENEN DEĞİŞİM — AMBER: DÜN banner vardı, BUGÜN YOK', () => {
    renderCardWith({ ragStatus: 'AMBER', overallRoi: 1 }, 20);
    expect(screen.queryByTestId('below-target-roi-banner')).not.toBeInTheDocument();
  });

  it('⛔ BEKLENEN DEĞİŞİM — LTA_ONLY (renk YOK): DÜN banner vardı, BUGÜN YOK', () => {
    renderCardWith(
      { ragStatus: null, ragExclusionReason: 'LTA_ONLY', overallRoi: 1 },
      20
    );
    expect(screen.queryByTestId('below-target-roi-banner')).not.toBeInTheDocument();
  });

  it('⛔ eşik KONFİGÜRE DEĞİLSE hiçbir yargı verilmez (varsayılan `20` YOK)', () => {
    renderCardWith({ ragStatus: 'GREEN', overallRoi: 1 }, null);
    expect(screen.queryByTestId('below-target-roi-banner')).not.toBeInTheDocument();
  });
});
