import { toNumber } from './numberUtils';

/**
 * BÜTÇE KULLANIM ORANI — **TEK KARAR NOKTASI.**
 *
 * ── `CLAUDE.md §7`: ARANDI MI, NEREDE, HANGİ TERİMLERLE ─────────────────
 * ```
 * rg -i "utilization|consumptionPercent|usagePercent|isNearLimit|>= 80|>= 95|>= 100" src
 * rg -n "getRAGStatus|getProgressColor|ragFilter"                                  src
 * ```
 * ⇒ Ölçüm (2026-08-31), ve **brief'in öncülü kısmen yanlış çıktı**:
 * ```
 * BudgetEnvelopeList  <80 good · <95 warning · else critical   ≡ KANONİK (>=80 AMBER, >=95 RED)
 * AgreementList       >=95 kırmızı · >=80 sarı                 ≡ KANONİK sınırlar (ama KONUSU anlaşma TAVANI)
 * BudgetEnvelopeCard  >=80 · >=100                             ⛔ SAPMA — 100'ü "kritik" sanıyor  (ölü kod, KALDIRILDI)
 * BudgetSummaryCard   >=80 · >=100                             ⛔ SAPMA — canlı  (`/budget/:id`)
 * ```
 * Yani üç merdiven "üç farklı sınır" değil, **iki sınır kümesi**ydi; asıl
 * sapma `critical = 95` yerine `100` kullanan iki kopyaydı.
 *
 * ── ⚠️ TWIN OF: `collmind.backend/src/modules/shared/budget/
 *    budget-threshold.service.ts` (`toStatus` + `DEFAULT_THRESHOLDS`) ────
 * Merdiven ORADAKİ ile birebir aynı sırada okunur:
 * ```
 * percent >= critical            → RED
 * warning <= percent < critical  → AMBER
 * percent < warning              → GREEN
 * ```
 * ⇒ `CLAUDE.md §2.3`'ün *"sınır semantiği (`>95` mi `>=95` mi) çözülmemiştir"*
 * uyarısı burada bir TERCİHLE değil, bir ÖLÇÜMLE kapanıyor: kanonik
 * uygulama `>=` kullanıyor, bu dosya onu aynalıyor. `exceeded = 100`
 * backend'de TANIMLI ama `toStatus` onu OKUMUYOR — dördüncü bir renk yok,
 * ve bu kopya da üretmez.
 *
 * ── ⛔ NEDEN KONFİGÜRASYONDAN OKUNMUYOR (ve bu bir BORÇ, bir tasarım değil)
 * `BudgetAlertConfiguration` eşikleri tenant başına DB'de tutuyor, ama
 * ölçüldü (2026-08-31, `CLAUDE.md §2.3`'teki `T-101`/`T-108` borcunun
 * bugünkü hâli):
 * ```
 * rg -l "BudgetAlertConfiguration" collmind.backend/src -g '*.controller.ts'  → BOŞ
 * ```
 * **Eşiklerin HTTP yüzeyi YOK** — frontend'in okuyabileceği bir uç
 * bulunmuyor. Envelope başına sunucu-tarafı bir renk de yok:
 * `budget_envelopes` tablosunda `reserved_amount` KOLONU dahi yok ve
 * `GET /budget/envelopes` bir `status` alanı döndürmüyor. Envelope başına
 * `status` üreten TEK uç `GET /finance-reporting/budget-variance`, ve onun
 * rol kapısı `{ADMIN,FINANCE,CATEGORY_MANAGER,READONLY}` — `/budget`
 * ekranı ise `PLANNER`'a da açık, yani o uç bu ekranın evrenini
 * KARŞILAMIYOR.
 *
 * ⇒ Bu yüzden sabitler burada, **tek bir yerde**, backend'in
 * `DEFAULT_THRESHOLDS`'ının aynası olarak duruyor.
 * ⛔ **`T-108` (eşik konfigürasyonuna üretim yolu) açıldığında DEĞİŞECEK
 * TEK NOKTA BURASIDIR** — bileşenlerde bir daha eşik sayısı yazılmaz.
 *
 * ── `§2.5`: SESSİZ SIFIR YOK ────────────────────────────────────────────
 * Eski davranış: `allocated > 0 ? … : 0` ⇒ tahsisi okunamayan bir zarf
 * **%0 kullanım = YEŞİL** görünüyordu — yani bir ÖLÇÜM YOKLUĞU, en iyi
 * durumun rengiyle kullanıcıya sunuluyordu. Burada karşılığı
 * `NOT_EVALUABLE`'dır ve ekranda `—` olarak çıkar, `0` DEĞİL.
 * (Backend aynı kararı veriyor: `allocated=0 → utilizationPercent/status
 * null`, `finance-reporting.service.ts`.)
 */

export type BudgetUtilizationStatus = 'GREEN' | 'AMBER' | 'RED';

/** ⚠️ TWIN OF backend `DEFAULT_THRESHOLDS` — bkz. modül başlığı. */
export const BUDGET_UTILIZATION_THRESHOLDS = {
  warning: 80,
  critical: 95,
} as const;

export type BudgetUtilizationNotEvaluableReason =
  /** Tahsis edilen tutar okunamadı (alan yok / sayıya çözülmedi). */
  | 'ALLOCATION_UNREADABLE'
  /** Tahsis 0 ya da negatif — payda yok, oran TANIMSIZ (`%0` DEĞİL). */
  | 'NO_ALLOCATION'
  /** Kullanılan tutar okunamadı. */
  | 'USED_UNREADABLE';

export type BudgetUtilizationEvaluation =
  | {
      kind: 'EVALUATED';
      /** 0..∞ arası yüzde. 100'ü aşabilir (aşım gerçek bir durumdur). */
      percent: number;
      status: BudgetUtilizationStatus;
    }
  | { kind: 'NOT_EVALUABLE'; reason: BudgetUtilizationNotEvaluableReason };

/** Ekranda değerlendirilemeyen bir oranın yerine basılan işaret. */
export const BUDGET_UTILIZATION_NOT_EVALUABLE_LABEL = '—';

const NOT_EVALUABLE_EXPLANATIONS: Record<
  BudgetUtilizationNotEvaluableReason,
  string
> = {
  ALLOCATION_UNREADABLE:
    'Tahsis edilen tutar okunamadı; kullanım oranı hesaplanamaz.',
  NO_ALLOCATION:
    'Bu zarfta tahsis edilen tutar yok; kullanım oranı tanımlı değil.',
  USED_UNREADABLE:
    'Kullanılan tutar okunamadı; kullanım oranı hesaplanamaz.',
};

export function describeBudgetUtilizationGap(
  reason: BudgetUtilizationNotEvaluableReason
): string {
  return NOT_EVALUABLE_EXPLANATIONS[reason];
}

/**
 * `percent` → renk. ⚠️ SIRA backend'inkiyle aynı: önce `critical`, sonra
 * `warning`. Ters sırada `warning > critical` bir konfigürasyon asla
 * `AMBER` üretemezdi (backend `T-101 K4` notu).
 */
export function toBudgetUtilizationStatus(
  percent: number
): BudgetUtilizationStatus {
  if (percent >= BUDGET_UTILIZATION_THRESHOLDS.critical) return 'RED';
  if (percent >= BUDGET_UTILIZATION_THRESHOLDS.warning) return 'AMBER';
  return 'GREEN';
}

/**
 * TEK KARAR: bir zarfın (ya da bir zarf toplamının) kullanım oranı ve rengi.
 *
 * `used` = tüketilen + rezerve edilen. Bu iki bileşenin NEREDEN geldiği
 * çağırana bağlıdır (payload'lar farklı — bkz. `usedFromAvailable`), ama
 * KARAR, `null` politikası ve eşikler yalnız burada yaşar.
 */
export function evaluateBudgetUtilization(
  allocated: string | number | null | undefined,
  used: string | number | null | undefined
): BudgetUtilizationEvaluation {
  const allocatedNum = toNumber(allocated ?? null);
  if (allocatedNum === null) {
    return { kind: 'NOT_EVALUABLE', reason: 'ALLOCATION_UNREADABLE' };
  }
  if (allocatedNum <= 0) {
    return { kind: 'NOT_EVALUABLE', reason: 'NO_ALLOCATION' };
  }
  const usedNum = toNumber(used ?? null);
  if (usedNum === null) {
    return { kind: 'NOT_EVALUABLE', reason: 'USED_UNREADABLE' };
  }
  const percent = (usedNum / allocatedNum) * 100;
  return { kind: 'EVALUATED', percent, status: toBudgetUtilizationStatus(percent) };
}

/**
 * `GET /budget/envelopes` yolunun `used` kaynağı — ve bu bir TÜRETME değil,
 * bir ÖZDEŞLİK.
 *
 * ⛔ Ölçüldü (2026-08-31): `budget_envelopes` tablosunda `reserved_amount`
 * KOLONU YOK (`budget-envelope.entity.ts`), yani `GET /budget/envelopes`
 * yanıtında `reservedAmount` alanı **hiç gelmiyor** — bugüne kadar
 * `safeNumber(undefined) === 0` ile sessizce sıfır sayılıyordu ve
 * REZERVASYONLAR KULLANIM ORANINA HİÇ GİRMİYORDU.
 *
 * Ama `availableAmount` kanonik olarak `v_budget_summary`'den geliyor
 * (`budget.service.ts#findAllEnvelopes`), ve view'ın tanımı (migration
 * `1803000000000`, `pg_get_viewdef` ile okundu):
 * ```
 * available_amount = allocated_amount − reserved − consumed
 * ```
 * ⇒ `reserved + consumed = allocated − available`. Yani kullanılan tutar
 * ELDEKİ ALANLARDAN TAM OLARAK okunabiliyor; uydurulmuyor.
 *
 * ⚠️ Ve bilinçli olarak `consumedAmount` KOLONU ile karıştırılmıyor: o
 * kolon ile view'ın ledger-türevli `consumed`'ı iki ayrı kaynaktır;
 * `allocated − available` ikisini de tek kaynaktan (view) alır.
 */
export function usedFromAvailable(
  allocated: string | number | null | undefined,
  available: string | number | null | undefined
): number | null {
  const allocatedNum = toNumber(allocated ?? null);
  const availableNum = toNumber(available ?? null);
  if (allocatedNum === null || availableNum === null) return null;
  return allocatedNum - availableNum;
}
