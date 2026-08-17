import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AgreementApprovalCard } from '@/components/features/agreements/AgreementApprovalsPage';
import { Agreement, AgreementStatus, AgreementType } from '@/types/agreement.types';
import { UserRole } from '@/types/user.types';

// T-182: `AgreementApprovalsPage.tsx:475` gated the approve/reject pair with
// `userRole === UserRole.MANAGER` — a literal equality against a deprecated
// alias with 0 users (`main.users`, 2026-08-11) and no `hasRole`/`ADMIN`
// bypass. Nobody, including ADMIN, could see the button. The real approvers
// are `agreement.controller.ts:194,219` — `@Roles(UserRole.ADMIN,
// UserRole.CATEGORY_MANAGER, UserRole.FINANCE)` (backend TS key was renamed
// `FINANCE_MANAGER` → `FINANCE` in `Z7`, 2026-08-17; wire value unchanged).
//
// §2.7 #6: every assertion pairs a role that MUST see the buttons with one
// that must NOT — a suite that only asserts the positive case can't tell
// "gated correctly" from "gated to nobody" or "gated to everybody".

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
// `userEndpoints.getById` query only `enabled: !!createdBy`. Omitting it
// keeps this test isolated from network/MSW — it is not what this test
// measures.
const baseAgreement: Agreement = {
  id: 'agr-1',
  version: 1,
  agreementNumber: 'STA-2026-001',
  agreementName: 'Test Agreement',
  agreementType: AgreementType.STA,
  status: AgreementStatus.PENDING,
  cplId: 'cpl-1',
  channelId: 'channel-1',
  fuId: 'fu-1',
  tacticId: 'tactic-1',
  mechanicId: 'mechanic-1',
  capTotalAmount: 50000,
  startDate: '2026-01-01',
  endDate: '2026-03-31',
  justification: 'test',
  tenantId: 'tenant-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const noop = () => {};

function renderCard(userRole: UserRole | undefined) {
  return renderWithClient(
    <AgreementApprovalCard
      agreement={baseAgreement}
      userRole={userRole}
      onReview={noop}
      onApprove={noop}
      onReject={noop}
      isApproving={false}
      isRejecting={false}
    />
  );
}

describe('AgreementApprovalCard — T-182 role gating', () => {
  it('CATEGORY_MANAGER görüyor (backend: agreement.controller.ts:194,219)', () => {
    renderCard(UserRole.CATEGORY_MANAGER);
    expect(screen.getByRole('button', { name: /onayla/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reddet/i })).toBeInTheDocument();
  });

  it('FINANCE görüyor (backend: agreement.controller.ts:194,219)', () => {
    renderCard(UserRole.FINANCE);
    expect(screen.getByRole('button', { name: /onayla/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reddet/i })).toBeInTheDocument();
  });

  it('ADMIN görüyor (hasRole bypass — bugünkü kusurun merkezi)', () => {
    renderCard(UserRole.ADMIN);
    expect(screen.getByRole('button', { name: /onayla/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reddet/i })).toBeInTheDocument();
  });

  it('READONLY görmüyor', () => {
    renderCard(UserRole.READONLY);
    expect(
      screen.queryByRole('button', { name: /onayla/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /reddet/i })
    ).not.toBeInTheDocument();
  });

  it('PLANNER görmüyor (anlaşmayı oluşturan rol, onaylayan değil)', () => {
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

  it('bilinmeyen/silinmiş rol etiketiyle görmüyor (eski MANAGER, B dalgası/R2a ile enum\'dan kaldırıldı — 0 kullanıcı, main.users 2026-08-11)', () => {
    renderCard('MANAGER' as unknown as UserRole);
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
