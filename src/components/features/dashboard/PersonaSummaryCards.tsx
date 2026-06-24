import { MetricCard } from './MetricCard';
import type { DashboardPersona } from '@/utils/roleUtils';
import type { DashboardSummaryDto } from '@/api/endpoints/dashboard.endpoints';
import type { PendingTasksDto } from '@/api/endpoints/dashboard.endpoints';

interface PersonaSummaryCardsProps {
  persona: DashboardPersona;
  summary: DashboardSummaryDto;
  tasks: PendingTasksDto;
  periodCode: string;
}

export function PersonaSummaryCards({
  persona,
  summary,
  tasks,
  periodCode,
}: PersonaSummaryCardsProps) {
  const pendingApprovalsCount = tasks.pendingApprovals.length;
  const submittedClaimsCount = tasks.submittedClaims.length;

  if (persona === 'admin') {
    return (
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard
          title="Aktif anlaşma"
          value={String(summary.activeAgreementCount)}
          subtitle={`${periodCode} dönemi`}
        />
        <MetricCard
          title="Onay bekleyen"
          value={String(summary.pendingApprovalCount)}
          subtitle="anlaşma"
          className="[&_p:nth-child(2)]:text-amber-800"
        />
        <MetricCard
          title="Açık görev"
          value={String(summary.openTaskCount)}
          subtitle="hakediş + fatura"
          className="[&_p:nth-child(2)]:text-red-700"
        />
      </div>
    );
  }

  if (persona === 'finance') {
    return (
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard
          title="Aktif anlaşma"
          value={String(summary.activeAgreementCount)}
          subtitle={`${periodCode} dönemi`}
        />
        <MetricCard
          title="Fatura bekleyen"
          value={String(tasks.awaitingInvoiceClaims.length)}
          subtitle="hakediş"
          className="[&_p:nth-child(2)]:text-red-700"
        />
        <MetricCard
          title="Açık görev"
          value={String(summary.openTaskCount)}
          subtitle="toplam"
        />
      </div>
    );
  }

  if (persona === 'category') {
    return (
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard
          title="Onay bekleyen"
          value={String(pendingApprovalsCount)}
          subtitle="anlaşma"
          className="[&_p:nth-child(2)]:text-amber-800"
        />
        <MetricCard
          title="Hakediş onayı"
          value={String(submittedClaimsCount)}
          subtitle="karar bekleyen"
          className="[&_p:nth-child(2)]:text-indigo-800"
        />
        <MetricCard
          title="Aktif anlaşma"
          value={String(summary.activeAgreementCount)}
          subtitle={`${periodCode} dönemi`}
        />
      </div>
    );
  }

  if (persona === 'readonly') {
    return (
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard
          title="Aktif anlaşma"
          value={String(summary.activeAgreementCount)}
          subtitle={`${periodCode} dönemi`}
        />
        <MetricCard
          title="Onay bekleyen"
          value={String(summary.pendingApprovalCount)}
          subtitle="anlaşma"
        />
        <MetricCard
          title="Açık görünürlük"
          value={String(summary.openTaskCount)}
          subtitle="hakediş + fatura"
        />
      </div>
    );
  }

  // planner (default)
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <MetricCard
        title="Aktif anlaşma"
        value={String(summary.activeAgreementCount)}
        subtitle={`${periodCode} dönemi`}
      />
      <MetricCard
        title="Onay bekleyen"
        value={String(pendingApprovalsCount)}
        subtitle="anlaşma"
        className="[&_p:nth-child(2)]:text-amber-800"
      />
      <MetricCard
        title="Açık görev"
        value={String(summary.openTaskCount)}
        subtitle="hakediş + fatura"
        className="[&_p:nth-child(2)]:text-red-700"
      />
    </div>
  );
}
