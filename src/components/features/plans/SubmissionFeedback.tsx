import { AlertTriangle, XCircle } from 'lucide-react';
import type { SubmissionResult } from '@/api/endpoints/plans.endpoints';

/**
 * `T-344` / `Z73 §3` şart 2 — **BU DALGANIN VAR-OLUŞ CÜMLESİ.**
 *
 * > ### **"UYARI KULLANICIYA ULAŞIR."**
 *
 * `Q13` uyarı katmanı (`RED` *"ciro kaybı"* · `AMBER` *"kârsız büyüme"* ·
 * `LTA_ONLY` *"değerlendirme dışı"* · *"hedefin altında"*) backend'de
 * `2026-08-02`'den beri hesaplanıyordu — ve **hiç kimse görmedi**, çünkü
 * onu üreten rota (`POST /plans/:id/submit-for-approval`) frontend'in
 * **hiç çağırmadığı** uçtu (`ADR 0005` ölçümü). Bu bileşen o katmanın
 * **ilk kullanıcı yüzeyidir**.
 *
 * ── İKİ KUTU, VE BU AYRIM DAVRANIŞSALDIR ────────────────────────────────
 * ```
 * validationErrors   KIRMIZI   plan GÖNDERİLMEDİ, DRAFT kaldı
 * warnings           SARI      plan GÖNDERİLDİ — bu bir RED DEĞİL
 * ```
 * ⛔ İkisini tek kutuda göstermek `K-2.2.7c`'yi kırardı: uyarı **bloklamaz**
 * (`ADR 0005 K2` gerekçe-2, `Z73 §2` — *"bugün submit edebilen yarın da
 * edebilmeli"*). Kullanıcı kırmızı bir kutu görüp planının gönderilmediğini
 * sanarsa, uyarı katmanı **karşı yönde bir yanlış** üretmiş olur.
 */
export function SubmissionFeedback({ result }: { result: SubmissionResult }) {
  const validationErrors = result.validationErrors ?? [];
  const warnings = result.budgetCheck?.warnings ?? [];

  if (validationErrors.length === 0 && warnings.length === 0) return null;

  return (
    <div className="space-y-3" data-testid="submission-feedback">
      {validationErrors.length > 0 && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-4"
          data-testid="submission-validation-errors"
        >
          <div className="mb-2 flex items-center gap-2 font-semibold text-red-900">
            <XCircle className="h-5 w-5 text-red-600" />
            Plan gönderilemedi — düzeltilmesi gerekenler
          </div>
          <ul className="list-inside list-disc space-y-1 text-sm text-red-800">
            {validationErrors.map((message, idx) => (
              <li key={idx}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 p-4"
          data-testid="submission-warnings"
        >
          <div className="mb-2 flex items-center gap-2 font-semibold text-amber-900">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Dikkat edilmesi gerekenler
          </div>
          {/*
            ⛔ Bu cümle bir SÜS DEĞİL. Sarı bir kutu, kırmızı bir kutunun
            yanında dururken "bu da bir hata mı?" diye okunur — ve okuyan
            kişi planının gönderilmediğini sanar.
          */}
          <div className="mb-2 text-xs text-amber-700">
            Bu uyarılar gönderimi <strong>engellemez</strong>
            {result.success ? ' — plan onaya gönderildi.' : '.'}
          </div>
          <ul className="list-inside list-disc space-y-1 text-sm text-amber-800">
            {warnings.map((message, idx) => (
              <li key={idx}>{message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
