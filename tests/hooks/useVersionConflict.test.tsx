import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query';
import React from 'react';
import { http, HttpResponse } from 'msw';
import { server } from '../setup';
import { useVersionConflict } from '@/hooks/useVersionConflict';
import { VersionConflictDialog } from '@/components/common/VersionConflictDialog';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useVersionConflict', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('handleError captures a STALE_VERSION conflict and returns true', () => {
    const { result } = renderHook(
      () => useVersionConflict([['plan', 'p1']]),
      { wrapper }
    );

    expect(result.current.conflict).toBeNull();

    let handled = false;
    act(() => {
      handled = result.current.handleError({
        response: {
          status: 409,
          data: {
            statusCode: 409,
            code: 'STALE_VERSION',
            message: 'This record was modified by another user.',
            entity: 'PLAN_SKU',
            currentVersion: 9,
            expectedVersion: 7,
            current: { plannedVolume: 1350 },
          },
        },
      });
    });

    expect(handled).toBe(true);
    expect(result.current.conflict?.code).toBe('STALE_VERSION');
    expect(result.current.conflict?.currentVersion).toBe(9);
  });

  it('handleError returns false and leaves conflict null for unrelated errors', () => {
    const { result } = renderHook(
      () => useVersionConflict([['plan', 'p1']]),
      { wrapper }
    );

    let handled = true;
    act(() => {
      handled = result.current.handleError({
        response: { status: 400, data: { message: 'Invalid volume' } },
      });
    });

    expect(handled).toBe(false);
    expect(result.current.conflict).toBeNull();
  });

  it('dismiss clears the conflict without touching the query cache', () => {
    const { result } = renderHook(
      () => useVersionConflict([['plan', 'p1']]),
      { wrapper }
    );

    act(() => {
      result.current.handleError({
        response: { status: 409, data: { code: 'MISSING_VERSION' } },
      });
    });
    expect(result.current.conflict).not.toBeNull();

    act(() => result.current.dismiss());
    expect(result.current.conflict).toBeNull();
  });
});

/**
 * End-to-end proof (T-034f acceptance criteria): a mutation that fails with
 * 409 STALE_VERSION surfaces the conflict dialog to the user AND is never
 * automatically retried. If this test fails after removing the "no retry"
 * guarantee, it's because the mutation endpoint was hit more than once.
 */
function SkuVolumeEditorHarness() {
  const versionConflict = useVersionConflict([['plan', 'plan-1']]);
  const mutation = useMutation({
    mutationFn: async (volume: number) => {
      const res = await fetch(
        'http://localhost:3000/plans/plan-1/fus/fu-1/skus/sku-1/volume',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plannedVolume: volume, version: 7 }),
        }
      );
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
      <button onClick={() => mutation.mutate(1350)}>Kaydet</button>
      <VersionConflictDialog
        conflict={versionConflict.conflict}
        onReload={versionConflict.reload}
        onDismiss={versionConflict.dismiss}
      />
    </div>
  );
}

describe('version conflict end-to-end (no auto-retry)', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('shows the reload dialog on 409 STALE_VERSION and does not resubmit automatically', async () => {
    // `delay: null` disables userEvent v14's internal real setTimeout-based
    // pacing between simulated pointer/keyboard events. With it left on
    // default, this test's click -> waitFor round trip depends on real
    // macrotasks firing promptly; under CPU contention from other
    // concurrently-running processes on the same machine, those real
    // timers can be delayed enough to blow past `waitFor`'s default 1000ms
    // budget, independent of anything wrong with the code under test (see
    // T-040 — this was flaky under load, not on an idle machine).
    const user = userEvent.setup({ delay: null });
    let callCount = 0;

    server.use(
      http.patch(
        'http://localhost:3000/plans/plan-1/fus/fu-1/skus/sku-1/volume',
        () => {
          callCount += 1;
          return HttpResponse.json(
            {
              statusCode: 409,
              code: 'STALE_VERSION',
              message:
                'This record was modified by another user. Review the current values and retry.',
              entity: 'PLAN_SKU',
              entityId: 'sku-1',
              expectedVersion: 7,
              currentVersion: 8,
              current: { plannedVolume: 1200 },
            },
            { status: 409 }
          );
        }
      )
    );

    render(<SkuVolumeEditorHarness />, { wrapper });

    await user.click(screen.getByText('Kaydet'));

    // Conflict dialog appears with an explicit reload action.
    await waitFor(() => {
      expect(
        screen.getByText('Kayıt Başka Biri Tarafından Değiştirildi')
      ).toBeInTheDocument();
    });
    expect(screen.getByText('Yeniden Yükle')).toBeInTheDocument();

    // The mutation endpoint was hit exactly once — no silent resend of the
    // user's stale edit.
    expect(callCount).toBe(1);

    // Waiting a tick (simulating "time passing" while the dialog is open)
    // must not trigger a retry either.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(callCount).toBe(1);

    // Clicking "Yeniden Yükle" only invalidates the query cache — it must
    // NOT resend the original PATCH.
    await user.click(screen.getByText('Yeniden Yükle'));
    expect(callCount).toBe(1);

    await waitFor(() => {
      expect(
        screen.queryByText('Kayıt Başka Biri Tarafından Değiştirildi')
      ).not.toBeInTheDocument();
    });
  });

  it('shows a distinct message for 409 MISSING_VERSION without retrying', async () => {
    const user = userEvent.setup({ delay: null });
    let callCount = 0;

    server.use(
      http.patch(
        'http://localhost:3000/plans/plan-1/fus/fu-1/skus/sku-1/volume',
        () => {
          callCount += 1;
          return HttpResponse.json(
            {
              statusCode: 409,
              code: 'MISSING_VERSION',
              message: "A 'version' field is required for this update.",
              entity: 'PLAN_SKU',
            },
            { status: 409 }
          );
        }
      )
    );

    render(<SkuVolumeEditorHarness />, { wrapper });

    await user.click(screen.getByText('Kaydet'));

    await waitFor(() => {
      expect(screen.getByText('Kayıt Sürümü Eksik')).toBeInTheDocument();
    });
    expect(callCount).toBe(1);
  });
});
