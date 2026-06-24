import { useQuery } from '@tanstack/react-query';
import { dashboardEndpoints } from '@/api/endpoints/dashboard.endpoints';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  summaries: () => [...dashboardKeys.all, 'summary'] as const,
  summary: (period: string) => [...dashboardKeys.summaries(), period] as const,
  pendingTasks: (period: string, includePast: boolean) =>
    [...dashboardKeys.all, 'pending-tasks', period, includePast] as const,
  cplStatus: () => [...dashboardKeys.all, 'cpl-status'] as const,
};

/**
 * Yeni dashboard summary hook'u — GET /dashboard/summary?period=
 * Eski `useDashboardSummary` yerine bu kullanılır; mevcut callers migrate edildi.
 */
export function useDashboardSummaryV2(period: string) {
  return useQuery({
    queryKey: dashboardKeys.summary(period),
    queryFn: () =>
      dashboardEndpoints.getSummary(period).then((res) => res.data),
    enabled: !!period,
  });
}

export function usePendingTasks(period: string, includePast = false) {
  return useQuery({
    queryKey: dashboardKeys.pendingTasks(period, includePast),
    queryFn: () =>
      dashboardEndpoints
        .getPendingTasks(period, includePast)
        .then((res) => res.data),
    enabled: !!period,
  });
}

export function useCplStatus() {
  return useQuery({
    queryKey: dashboardKeys.cplStatus(),
    queryFn: () => dashboardEndpoints.getCplStatus().then((res) => res.data),
  });
}
