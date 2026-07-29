import { useCallback, useState } from 'react';
import { useQueryClient, QueryKey } from '@tanstack/react-query';
import { getVersionConflict, VersionConflictErrorBody } from '@/utils/versionConflict';

/**
 * T-034f — Shared 409 STALE_VERSION/MISSING_VERSION handling for plan and
 * agreement mutations.
 *
 * Usage: call once per component that owns version-guarded mutations, pass
 * the resulting `conflict` + `reload`/`dismiss` into `<VersionConflictDialog>`,
 * and call `handleError(error)` from each mutation's `onError`. `handleError`
 * returns `true` when it recognized (and captured) a version conflict so the
 * caller can skip its own generic error toast for that case if desired.
 *
 * `reload` invalidates the given query key(s) — it does NOT retry the failed
 * mutation. The user must review the fresh data and redo their edit
 * explicitly (see versionConflict.ts module doc for why auto-retry is
 * forbidden here).
 */
export function useVersionConflict(queryKeys: QueryKey[]) {
  const [conflict, setConflict] = useState<VersionConflictErrorBody | null>(
    null
  );
  const queryClient = useQueryClient();

  const handleError = useCallback((error: unknown): boolean => {
    const found = getVersionConflict(error);
    if (found) {
      setConflict(found);
      return true;
    }
    return false;
  }, []);

  const reload = useCallback(() => {
    queryKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
    setConflict(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, JSON.stringify(queryKeys)]);

  const dismiss = useCallback(() => setConflict(null), []);

  return { conflict, handleError, reload, dismiss };
}
