/**
 * T-034f — Frontend counterpart of backend optimistic-locking (T-034).
 *
 * Backend is strict-mode: plan/agreement mutations require `version` and
 * respond 409 with `code: 'STALE_VERSION' | 'MISSING_VERSION'` on conflict
 * (see collmind.backend `versioned-update.helper.ts` and
 * docs/analysis/0005-optimistic-locking-design.md §5).
 *
 * Rule (do not violate): a 409 conflict is surfaced to the user, never
 * auto-retried. Auto-retry ("refetch version, resend the same mutation")
 * would silently overwrite a change the user never saw — exactly the
 * lost-update bug optimistic locking exists to prevent, now hidden behind a
 * false sense of protection. The only sanctioned recovery is: show the
 * conflict, let the user explicitly reload, let them redo their edit.
 */

export const STALE_VERSION_CODE = 'STALE_VERSION';
export const MISSING_VERSION_CODE = 'MISSING_VERSION';

/**
 * Shape of the 409 body backend returns for optimistic-locking failures.
 * Mirrors `staleVersionConflict()` / `missingVersionConflict()` in
 * collmind.backend `src/modules/shared/persistence/versioned-update.helper.ts`.
 */
export interface VersionConflictErrorBody {
  statusCode: 409;
  code: typeof STALE_VERSION_CODE | typeof MISSING_VERSION_CODE;
  message: string;
  entity?: string;
  entityId?: string;
  expectedVersion?: number;
  currentVersion?: number;
  /** Only user-input fields — never derived/financial (backend contract). */
  current?: Record<string, unknown>;
}

interface AxiosLikeError {
  response?: {
    status?: number;
    data?: unknown;
  };
}

function isVersionConflictBody(data: unknown): data is VersionConflictErrorBody {
  if (!data || typeof data !== 'object') return false;
  const code = (data as { code?: unknown }).code;
  return code === STALE_VERSION_CODE || code === MISSING_VERSION_CODE;
}

/**
 * Extracts the version-conflict body from a caught error, or `null` if the
 * error is not a 409 optimistic-locking conflict. Use this — never sniff
 * `error.response.status === 409` alone, other 409s exist in this API
 * (e.g. `ALREADY_SETTLED`) and must not be routed into the reload dialog.
 */
export function getVersionConflict(
  error: unknown
): VersionConflictErrorBody | null {
  const axiosError = error as AxiosLikeError | undefined;
  if (axiosError?.response?.status !== 409) return null;
  const data = axiosError.response.data;
  return isVersionConflictBody(data) ? data : null;
}
