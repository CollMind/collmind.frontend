import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { AgreementTypeBadge, StatusBadge, StepDot } from './DashboardBadges';
import type {
  PendingApprovalItem,
  PendingManualClaimItem,
  SubmittedClaimItem,
  AwaitingInvoiceClaimItem,
} from '@/api/endpoints/dashboard.endpoints';

const TASK_LIST_LIMIT = 5;

/**
 * Fatura bekleme süresi aciliyet rengi eşikleri (gün).
 * UI aciliyet rengi; finansal KPI değil.
 * İdeal: backend urgencyLevel sağlamalı (follow-up).
 */
const DAYS_WAITING_RED_THRESHOLD = 30;
const DAYS_WAITING_AMBER_THRESHOLD = 7;

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `₺${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₺${(amount / 1_000).toFixed(0)}K`;
  return `₺${amount.toFixed(0)}`;
}

function MoreLink({ href, count }: { href: string; count: number }) {
  return (
    <div className="mt-2">
      <Link to={href} className="text-xs font-medium text-blue-700">
        +{count} daha var
      </Link>
    </div>
  );
}

function SectionContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-xl border border-black/10 bg-white px-5 py-4',
        className
      )}
    >
      {children}
    </section>
  );
}

// ---- Onay bekleyen anlaşmalar ----
export function PendingApprovalsSection({
  items: allItems,
  canCreateAgreement,
}: {
  items: PendingApprovalItem[];
  canCreateAgreement: boolean;
}) {
  const items = allItems.slice(0, TASK_LIST_LIMIT);
  const overflow = Math.max(0, allItems.length - items.length);

  return (
    <SectionContainer>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <StepDot value="1" />
          <h2 className="text-sm font-medium text-gray-900">
            Anlaşma — Onay bekleyenler
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge text={`${allItems.length} anlaşma`} tone="approval" />
          {canCreateAgreement && (
            <Link
              to="/agreements/new"
              className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700"
            >
              + Yeni Anlaşma
            </Link>
          )}
        </div>
      </div>

      <div className="mt-4">
        {allItems.length === 0 ? (
          <p className="py-6 text-sm text-gray-500">Bekleyen anlaşma yok.</p>
        ) : (
          items.map((item, idx) => (
            <div
              key={item.agreementId}
              className={cn(
                'grid gap-3 py-[10px] md:grid-cols-[auto_1fr_auto] md:items-center',
                idx < items.length - 1 ? 'border-b border-black/10' : ''
              )}
            >
              <AgreementTypeBadge type={item.agreementType} />
              <div>
                <p className="text-[13px] font-medium text-gray-900">
                  {item.agreementName} — {item.cplName}
                </p>
                <p className="mt-1 text-[11px] text-gray-500">
                  {item.channelCode} · {item.period}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge text="Onay bekliyor" tone="approval" />
                <Link
                  to={`/agreements/${item.agreementId}`}
                  className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700"
                >
                  Detay
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
      {overflow > 0 && <MoreLink href="/agreements" count={overflow} />}
    </SectionContainer>
  );
}

// ---- Hakediş oluşturulacaklar ----
export function PendingManualClaimsSection({
  items: allItems,
  canMutate,
}: {
  items: PendingManualClaimItem[];
  canMutate: boolean;
}) {
  const items = allItems.slice(0, TASK_LIST_LIMIT);
  const overflow = Math.max(0, allItems.length - items.length);

  return (
    <SectionContainer>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <StepDot value="2" />
          <h2 className="text-sm font-medium text-gray-900">
            Hakediş — Oluşturulacaklar
          </h2>
        </div>
        <StatusBadge text={`${allItems.length} anlaşma`} tone="claim" />
      </div>
      <p className="mt-3 text-xs text-gray-500">
        Aktif anlaşmalarda bu dönem için henüz hakediş oluşturulmamış sabit
        destekler.
      </p>

      <div className="mt-4">
        {allItems.length === 0 ? (
          <p className="py-6 text-sm text-gray-500">
            Oluşturulacak hakediş yok.
          </p>
        ) : (
          items.map((item, idx) => (
            <div
              key={item.agreementId}
              className={cn(
                'grid gap-3 py-[10px] md:grid-cols-[auto_1fr_auto] md:items-center',
                idx < items.length - 1 ? 'border-b border-black/10' : ''
              )}
            >
              <AgreementTypeBadge type={item.agreementType} />
              <div>
                <p className="text-[13px] font-medium text-gray-900">
                  {item.agreementName} — {item.cplName}
                </p>
                <p className="mt-1 text-[11px] text-gray-500">
                  {item.channelCode} · {item.period}
                  {item.isPastPeriod && (
                    <span className="font-medium text-red-700">
                      {' '}
                      · gecikmiş
                    </span>
                  )}
                  <span> · {formatCurrency(item.capTotalAmount)}</span>
                </p>
              </div>
              {canMutate && (
                <Link
                  to={`/agreements/${item.agreementId}?tab=claims`}
                  className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700"
                >
                  Hakediş Oluştur
                </Link>
              )}
            </div>
          ))
        )}
      </div>
      {overflow > 0 && <MoreLink href="/agreements" count={overflow} />}
    </SectionContainer>
  );
}

// ---- Onaya gönderilmiş hakedişler ----
export function SubmittedClaimsSection({
  items: allItems,
}: {
  items: SubmittedClaimItem[];
}) {
  const items = allItems.slice(0, TASK_LIST_LIMIT);
  const overflow = Math.max(0, allItems.length - items.length);

  return (
    <SectionContainer>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <StepDot value="2.5" />
          <h2 className="text-sm font-medium text-gray-900">
            Hakediş — Onay bekleyenler
          </h2>
        </div>
        <StatusBadge text={`${allItems.length} hakediş`} tone="submitted" />
      </div>
      <p className="mt-3 text-xs text-gray-500">
        Onaya gönderilmiş, karar bekleyen hakedişler.
      </p>

      <div className="mt-4">
        {allItems.length === 0 ? (
          <p className="py-6 text-sm text-gray-500">
            Onay bekleyen hakediş yok.
          </p>
        ) : (
          items.map((item, idx) => (
            <div
              key={item.agreementId + item.period}
              className={cn(
                'grid gap-3 py-[10px] md:grid-cols-[auto_1fr_auto] md:items-center',
                idx < items.length - 1 ? 'border-b border-black/10' : ''
              )}
            >
              <AgreementTypeBadge type={item.agreementType} />
              <div>
                <p className="text-[13px] font-medium text-gray-900">
                  {item.agreementName} — {item.cplName}
                </p>
                <p className="mt-1 text-[11px] text-gray-500">
                  {item.channelCode} · {item.period} ·{' '}
                  {formatCurrency(item.consumedAmount)}
                </p>
              </div>
              <Link
                to={`/agreements/${item.agreementId}?tab=claims`}
                className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700"
              >
                Detay
              </Link>
            </div>
          ))
        )}
      </div>
      {overflow > 0 && <MoreLink href="/agreements" count={overflow} />}
    </SectionContainer>
  );
}

// ---- Fatura girilecekler ----
export function AwaitingInvoiceClaimsSection({
  items: allItems,
  canMutate,
}: {
  items: AwaitingInvoiceClaimItem[];
  canMutate: boolean;
}) {
  const items = allItems.slice(0, TASK_LIST_LIMIT);
  const overflow = Math.max(0, allItems.length - items.length);

  return (
    <SectionContainer>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <StepDot value="3" />
          <h2 className="text-sm font-medium text-gray-900">
            Fatura — Girilecekler
          </h2>
        </div>
        <StatusBadge text={`${allItems.length} hakediş`} tone="invoice" />
      </div>
      <p className="mt-3 text-xs text-gray-500">
        Hakedişi onaylı, fatura girişi beklenen off-invoice ödemeler.
      </p>

      <div className="mt-4">
        {allItems.length === 0 ? (
          <p className="py-6 text-sm text-gray-500">
            Fatura bekleyen kayıt yok.
          </p>
        ) : (
          items.map((item, idx) => (
            <div
              key={item.agreementId + item.period}
              className={cn(
                'grid gap-3 py-[10px] md:grid-cols-[auto_1fr_auto] md:items-center',
                idx < items.length - 1 ? 'border-b border-black/10' : ''
              )}
            >
              <AgreementTypeBadge type={item.agreementType} />
              <div>
                <p className="text-[13px] font-medium text-gray-900">
                  {item.agreementName} — {item.cplName}
                </p>
                <p className="mt-1 text-[11px] text-gray-500">
                  {item.channelCode} · {item.period}
                  {item.isPastPeriod && (
                    <span className="font-medium text-red-700">
                      {' '}
                      · geçmiş dönem
                    </span>
                  )}
                  {item.daysWaiting !== undefined && (
                    <span
                      className={
                        item.daysWaiting > DAYS_WAITING_RED_THRESHOLD
                          ? 'font-medium text-red-700'
                          : item.daysWaiting > DAYS_WAITING_AMBER_THRESHOLD
                            ? 'font-medium text-amber-800'
                            : ''
                      }
                    >
                      {' '}
                      · {item.daysWaiting} gün
                    </span>
                  )}
                  <span> · {formatCurrency(item.consumedAmount)}</span>
                </p>
              </div>
              {canMutate && (
                <Link
                  to={`/agreements/${item.agreementId}`}
                  className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700"
                >
                  Fatura Gir
                </Link>
              )}
            </div>
          ))
        )}
      </div>
      {overflow > 0 && <MoreLink href="/agreements" count={overflow} />}
    </SectionContainer>
  );
}
