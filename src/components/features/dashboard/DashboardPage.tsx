import { useState } from 'react';
import { FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useMe } from '@/services/users.service';
import {
  useDashboardSummaryV2,
  usePendingTasks,
  useCplStatus,
} from '@/services/dashboard.service';
import { isReadOnly, getPrimaryPersona } from '@/utils/roleUtils';
import { UserRole } from '@/types/user.types';

import { PeriodSelect } from './PeriodSelect';
import { PersonaSummaryCards } from './PersonaSummaryCards';
import { BudgetUtilizationPanel } from './BudgetUtilizationPanel';
import {
  PendingApprovalsSection,
  PendingManualClaimsSection,
  SubmittedClaimsSection,
  AwaitingInvoiceClaimsSection,
} from './PendingTasksSections';
import { CplStatusTable } from './CplStatusTable';

// Sabit dönem listesi — backend'de open-periods endpoint'i olmadığından
// mevcut ay + 2 önceki ay varsayılan seçenekler olarak sunulur.
function buildDefaultPeriods(): string[] {
  const periods: string[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    periods.push(`${y}-${m}`);
  }
  return periods;
}

function getDashboardTitle(persona: ReturnType<typeof getPrimaryPersona>): {
  title: string;
  subtitle: string;
} {
  if (persona === 'finance')
    return {
      title: 'Finans Paneli',
      subtitle: 'Actuals, fatura ve defter akislari',
    };
  if (persona === 'category')
    return {
      title: 'Onay Paneli',
      subtitle: 'Bekleyen kararlar ve ekip goruntulugu',
    };
  if (persona === 'readonly')
    return {
      title: 'Yonetici Ozeti',
      subtitle: 'Salt okunur harcama ve anlasma gorunumu',
    };
  if (persona === 'admin')
    return {
      title: 'Operasyon Paneli',
      subtitle: 'Tum is akilarina hizli erisim',
    };
  return { title: 'Panelim', subtitle: 'Anlasma ve hakediş gorevleri' };
}

const DEFAULT_PERIODS = buildDefaultPeriods();

export function DashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState(DEFAULT_PERIODS[0]);

  const { data: user, isLoading: userLoading } = useMe();
  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
  } = useDashboardSummaryV2(selectedPeriod);
  const {
    data: tasks,
    isLoading: tasksLoading,
    isError: tasksError,
  } = usePendingTasks(selectedPeriod, false);
  const { data: cplStatus, isLoading: cplLoading } = useCplStatus();

  const isLoading = userLoading || summaryLoading || tasksLoading || cplLoading;

  if (isLoading && !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if ((summaryError || tasksError) && !summary) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Dashboard verileri yuklenemedi. Lutfen sayfayi yenileyin.
      </div>
    );
  }

  const role = user?.role ?? UserRole.READONLY;
  const persona = getPrimaryPersona(role);
  const readonly = isReadOnly(role);
  const { title, subtitle } = getDashboardTitle(persona);

  // RBAC: Planner onay aksiyonu yapamaz, CategoryManager duzenleme yapamaz
  const canCreateAgreement =
    !readonly &&
    (role === UserRole.ADMIN ||
      role === UserRole.PLANNER ||
      role === UserRole.MANAGER ||
      // T-028a: backend @Roles MANAGER→CATEGORY_MANAGER konsolidasyonu
      // (deprecated alias korunur, canonical eklenir).
      role === UserRole.CATEGORY_MANAGER);
  const canMutate = !readonly;

  return (
    <div className="mx-auto max-w-[1280px] space-y-3 p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 rounded-xl border border-black/10 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[18px] font-medium text-gray-900">{title}</h1>
            <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
          </div>

          <div className="flex items-center gap-3">
            <PeriodSelect
              value={selectedPeriod}
              onValueChange={setSelectedPeriod}
              options={DEFAULT_PERIODS}
            />
            {!readonly && (
              <>
                {canCreateAgreement && (
                  <Link to="/agreements/new">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs"
                    >
                      <FileText className="mr-1.5 h-3.5 w-3.5" />
                      Yeni Anlasma
                    </Button>
                  </Link>
                )}
              </>
            )}
          </div>
        </div>

        {/* Persona summary cards */}
        {summary && tasks && (
          <PersonaSummaryCards
            persona={persona}
            summary={summary}
            tasks={tasks}
            periodCode={summary.periodCode || selectedPeriod}
          />
        )}
      </div>

      {/* Budget utilization — Finance ve Admin rollerine */}
      {summary?.budgetUtilization &&
        (persona === 'admin' || persona === 'finance') && (
          <BudgetUtilizationPanel
            budgetUtilization={summary.budgetUtilization}
            period={summary.periodCode || selectedPeriod}
          />
        )}

      {/* Hizli erisim linkleri */}
      <div className="rounded-xl border border-black/10 bg-white px-5 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-medium text-gray-900">Hizli erisim</h2>
            <p className="mt-1 text-xs text-gray-500">
              Rolun icin oncelikli akislar
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canCreateAgreement && (
              <Link
                to="/agreements/new"
                className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700"
              >
                + Yeni Anlasma
              </Link>
            )}
            {(persona === 'category' || persona === 'admin') && (
              <Link
                to="/agreements"
                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800"
              >
                Onay Kuyrugu
              </Link>
            )}
            {(persona === 'finance' || persona === 'admin') && (
              <Link
                to="/actuals"
                className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800"
              >
                Actuals Yukle
              </Link>
            )}
            <Link
              to="/plans"
              className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700"
            >
              Planlama Grid'i
            </Link>
            <Link
              to="/agreements"
              className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700"
            >
              Anlasma Durumu
            </Link>
          </div>
        </div>
      </div>

      {/* Pending approvals */}
      {tasks && (
        <PendingApprovalsSection
          items={tasks.pendingApprovals}
          canCreateAgreement={canCreateAgreement}
        />
      )}

      {/* Claim sections — 3 sutun */}
      {tasks && (
        <div className="grid gap-3 lg:grid-cols-3">
          <PendingManualClaimsSection
            items={tasks.pendingManualClaims}
            canMutate={canMutate}
          />
          <SubmittedClaimsSection items={tasks.submittedClaims} />
          <AwaitingInvoiceClaimsSection
            items={tasks.awaitingInvoiceClaims}
            canMutate={canMutate}
          />
        </div>
      )}

      {/* CPL status tablosu */}
      {cplStatus && (
        <CplStatusTable
          items={cplStatus.items}
          canCreateAgreement={canCreateAgreement}
        />
      )}
    </div>
  );
}
