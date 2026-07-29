import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { VersionConflictErrorBody } from '@/utils/versionConflict';

interface VersionConflictDialogProps {
  conflict: VersionConflictErrorBody | null;
  /** Invalidates/refetches the affected query. Does NOT retry the mutation. */
  onReload: () => void;
  onDismiss: () => void;
}

/**
 * T-034f — Shown when a plan/agreement mutation is rejected with 409
 * STALE_VERSION or MISSING_VERSION. Deliberately offers only two actions:
 * "Yeniden Yükle" (refetch the current server state) and "Kapat" (dismiss,
 * keep the possibly-stale view open). It never resubmits the user's edit —
 * see src/utils/versionConflict.ts for why automatic retry is forbidden.
 */
export function VersionConflictDialog({
  conflict,
  onReload,
  onDismiss,
}: VersionConflictDialogProps) {
  if (!conflict) return null;

  const isMissingVersion = conflict.code === 'MISSING_VERSION';

  return (
    <Dialog open={!!conflict} onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <DialogTitle className="text-lg">
                {isMissingVersion
                  ? 'Kayıt Sürümü Eksik'
                  : 'Kayıt Başka Biri Tarafından Değiştirildi'}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-gray-500">
                {isMissingVersion
                  ? 'Bu düzenleme kaydın hangi sürümüne dayandığını bilmiyor. Kaydı yeniden yükleyip tekrar deneyin.'
                  : 'Siz bu kaydı görüntülerken başka bir kullanıcı değişiklik yaptı. Değişikliğiniz kaydedilmedi. Güncel değerleri gözden geçirip düzenlemenizi tekrar yapmanız gerekiyor.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {!isMissingVersion && conflict.current && (
          <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm">
            <div className="font-medium text-amber-900 mb-1">
              Sunucudaki güncel değerler
            </div>
            <dl className="space-y-0.5 text-amber-800">
              {Object.entries(conflict.current).map(([key, value]) => (
                <div key={key} className="flex justify-between gap-4">
                  <dt className="text-amber-700">{key}</dt>
                  <dd className="font-mono">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onDismiss}>
            Kapat
          </Button>
          <Button
            onClick={onReload}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            Yeniden Yükle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
