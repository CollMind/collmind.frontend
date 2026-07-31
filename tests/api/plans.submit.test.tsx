import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query';
import React from 'react';
import { http, HttpResponse } from 'msw';
import { server } from '../setup';
import { useVersionConflict } from '@/hooks/useVersionConflict';
import { VersionConflictDialog } from '@/components/common/VersionConflictDialog';

/**
 * T-034f/blocker fix: POST /plans/:id/submit is the one status transition
 * that ALSO requires `version` in the body (T-034b put it in strict mode on
 * the backend — a missing body → 409 MISSING_VERSION, a stale value → 409
 * STALE_VERSION). Before this fix `planEndpoints.submit()` sent no body at
 * all, so every submit attempt failed with 409 MISSING_VERSION and
 * Draft -> Pending Approval was completely broken for Planners.
 *
 * NOTE on test strategy: `@/api/client`'s axios instance cannot be exercised
 * against msw in this project's current jsdom/vitest setup — this is the
 * pre-existing, unrelated infra breakage tracked as T-040 (confirmed here:
 * even a bare `axios.create(...).get(...)` against an msw handler fails with
 * "Invalid base URL" in this environment, independent of any plans code).
 * So the body-shape assertion below mocks `@/api/client` directly (unit
 * style) rather than routing through the broken axios+msw path, and the
 * conflict-dialog test below drives the same onError wiring PlanDetailPage
 * uses via a raw `fetch` mutationFn — matching the pattern already
 * established in tests/hooks/useVersionConflict.test.tsx for the same
 * reason.
 */

const postMock = vi.fn();

vi.mock('@/api/client', () => ({
  default: {
    post: (...args: unknown[]) => postMock(...args),
  },
}));

describe('planEndpoints.submit', () => {
  beforeEach(() => {
    postMock.mockReset();
    postMock.mockResolvedValue({
      data: { id: 'plan-1', status: 'PENDING_APPROVAL', version: 4 },
    });
  });

  it('sends `version` in the POST body (not a bodiless POST)', async () => {
    const { planEndpoints } = await import('@/api/endpoints/plans.endpoints');

    const res = await planEndpoints.submit('plan-1', { version: 3 });

    expect(postMock).toHaveBeenCalledTimes(1);
    expect(postMock).toHaveBeenCalledWith('/plans/plan-1/submit', {
      version: 3,
    });
    expect(res.data.status).toBe('PENDING_APPROVAL');
  });
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

/**
 * Mirrors the wiring in PlanDetailPage: submitMutation -> submit(version) ->
 * on 409, route through the SHARED useVersionConflict/VersionConflictDialog
 * (never a bespoke retry loop). Uses `fetch` directly against msw for the
 * transport — see file-level note above for why (pre-existing T-040 infra
 * issue with axios+msw in this environment, unrelated to this fix).
 */
function SubmitPlanHarness({ planId, version }: { planId: string; version: number }) {
  const versionConflict = useVersionConflict([['plan', planId]]);
  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`http://localhost:3000/plans/${planId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw { response: { status: res.status, data } };
      }
      return res.json();
    },
    onError: (error) => {
      versionConflict.handleError(error);
    },
  });

  return (
    <div>
      <button onClick={() => mutation.mutate()}>Onaya Gönder</button>
      <VersionConflictDialog
        conflict={versionConflict.conflict}
        onReload={versionConflict.reload}
        onDismiss={versionConflict.dismiss}
      />
    </div>
  );
}

describe('plan submit — version conflict (no auto-retry)', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('shows the reload dialog on 409 STALE_VERSION and never resends the submit automatically', async () => {
    // `delay: null` — see the identical comment in
    // tests/hooks/useVersionConflict.test.tsx: removes userEvent's internal
    // real-timer pacing so this test doesn't depend on real macrotasks
    // firing within `waitFor`'s default window under CPU contention (T-040).
    const user = userEvent.setup({ delay: null });
    let callCount = 0;
    let lastBody: unknown = null;

    server.use(
      http.post(
        'http://localhost:3000/plans/plan-1/submit',
        async ({ request }) => {
          callCount += 1;
          lastBody = await request.json();
          return HttpResponse.json(
            {
              statusCode: 409,
              code: 'STALE_VERSION',
              message: 'This record was modified by another user.',
              entity: 'PLAN',
              entityId: 'plan-1',
              expectedVersion: 3,
              currentVersion: 5,
            },
            { status: 409 }
          );
        }
      )
    );

    render(<SubmitPlanHarness planId="plan-1" version={3} />, { wrapper });

    await user.click(screen.getByText('Onaya Gönder'));

    await waitFor(() => {
      expect(
        screen.getByText('Kayıt Başka Biri Tarafından Değiştirildi')
      ).toBeInTheDocument();
    });

    expect(callCount).toBe(1);
    expect(lastBody).toEqual({ version: 3 });

    // Time passing must not trigger a silent retry.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(callCount).toBe(1);

    // "Yeniden Yükle" only invalidates the query cache — it must NOT resend
    // the submit request with the (now known-stale) version.
    await user.click(screen.getByText('Yeniden Yükle'));
    expect(callCount).toBe(1);
  });

  it('shows the missing-version message on 409 MISSING_VERSION without retrying', async () => {
    const user = userEvent.setup({ delay: null });
    let callCount = 0;

    server.use(
      http.post('http://localhost:3000/plans/plan-1/submit', () => {
        callCount += 1;
        return HttpResponse.json(
          {
            statusCode: 409,
            code: 'MISSING_VERSION',
            message: "A 'version' field is required for this update.",
            entity: 'PLAN',
          },
          { status: 409 }
        );
      })
    );

    render(<SubmitPlanHarness planId="plan-1" version={3} />, { wrapper });

    await user.click(screen.getByText('Onaya Gönder'));

    await waitFor(() => {
      expect(screen.getByText('Kayıt Sürümü Eksik')).toBeInTheDocument();
    });
    expect(callCount).toBe(1);
  });
});
