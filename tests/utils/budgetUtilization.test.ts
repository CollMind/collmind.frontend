import { describe, it, expect } from 'vitest';
import {
  BUDGET_UTILIZATION_THRESHOLDS,
  describeBudgetUtilizationGap,
  evaluateBudgetUtilization,
  toBudgetUtilizationStatus,
  usedFromAvailable,
} from '@/utils/budgetUtilization';

/**
 * ⚠️ **MIRROR OF: `collmind.backend/src/modules/shared/budget/
 * budget-threshold.service.ts`** (`toStatus` + `DEFAULT_THRESHOLDS`).
 * Merdiven orada değişirse burada da değişmeli; sapma kırmızıya döner.
 *
 * ── ⛔ NEDEN BU DOSYAYI KODU YAZAN AJAN YAZDI ──────────────────────────
 * `CLAUDE.md §3` "bir ajan kendi yazdığı kodun testini yazmaz" der ve bu
 * bir SINIR VAKASI: pin yoksa **mutasyon sınaması da yapılamıyor** ⇒ kapı
 * HİÇ DOĞMUYOR. Pinsiz bir TEK KARAR NOKTASI bırakmak `T-344 S3` vakasını
 * (`useTargetRoiThreshold` bugün hâlâ pinsiz) bir kez daha üretirdi.
 * ⇒ `qa-engineer` gözden geçirecek; bu dosya bir teslim değil, bir KAPI.
 *
 * ── SINIR SEMANTİĞİ BİR TERCİH DEĞİL, BİR ÖLÇÜM ───────────────────────
 * `CLAUDE.md §2.3` "`>95` mi `>=95` mi çözülmemiştir" diyordu. Kanonik
 * uygulama `>=` kullanıyor (backend `toStatus`), ve aşağıdaki üç sınır
 * vakası tam olarak onu pinler. `exceeded = 100` backend'de TANIMLI ama
 * `toStatus` OKUMUYOR — dördüncü bir renk yok, `%100` de `RED`'dir ve
 * `%95`'ten FARKLI BİR ŞEY DEĞİLDİR.
 */
describe('budgetUtilization — merdiven (backend `toStatus` ikizi)', () => {
  it('eşikler backend `DEFAULT_THRESHOLDS` ile aynı', () => {
    expect(BUDGET_UTILIZATION_THRESHOLDS).toEqual({ warning: 80, critical: 95 });
  });

  it('%79.9 ⇒ GREEN (warning sınırının ALTINDA)', () => {
    expect(toBudgetUtilizationStatus(79.9)).toBe('GREEN');
  });

  it('⛔ SINIR: %80 ⇒ AMBER (`>=`, `>` DEĞİL)', () => {
    expect(toBudgetUtilizationStatus(80)).toBe('AMBER');
  });

  it('%94.9 ⇒ AMBER', () => {
    expect(toBudgetUtilizationStatus(94.9)).toBe('AMBER');
  });

  it('⛔ SINIR: %95 ⇒ RED (`>=`, `>` DEĞİL)', () => {
    expect(toBudgetUtilizationStatus(95)).toBe('RED');
  });

  it('⛔ %100 de RED — `100` AYRI bir eşik DEĞİL (ölen `>=80/>=100` kopyası)', () => {
    // Eski `BudgetSummaryCard`/`BudgetEnvelopeCard` merdiveni %95'i "yakın
    // limit (sarı)" sayıyordu; kanonik merdiven onu KIRMIZI sayar.
    expect(toBudgetUtilizationStatus(100)).toBe('RED');
    expect(toBudgetUtilizationStatus(140)).toBe('RED');
  });
});

describe('budgetUtilization — §2.5: SESSİZ SIFIR YOK', () => {
  it('normal yol: 800/1000 ⇒ %80 AMBER', () => {
    expect(evaluateBudgetUtilization(1000, 800)).toEqual({
      kind: 'EVALUATED',
      percent: 80,
      status: 'AMBER',
    });
  });

  it('⛔ tahsis OKUNAMAZ ⇒ NOT_EVALUABLE, `%0`/GREEN DEĞİL', () => {
    // Eski davranış: `allocated > 0 ? … : 0` ⇒ %0 ⇒ `good` ⇒ zarf YEŞİL.
    // Bir ÖLÇÜM YOKLUĞU en iyi durumun rengiyle sunuluyordu.
    for (const bad of [null, undefined, '', 'abc', NaN]) {
      const e = evaluateBudgetUtilization(bad as never, 500);
      expect(e.kind).toBe('NOT_EVALUABLE');
      if (e.kind === 'NOT_EVALUABLE') {
        expect(e.reason).toBe('ALLOCATION_UNREADABLE');
      }
    }
  });

  it('⛔ tahsis 0 ya da negatif ⇒ NO_ALLOCATION (payda yok, oran TANIMSIZ)', () => {
    expect(evaluateBudgetUtilization(0, 500)).toEqual({
      kind: 'NOT_EVALUABLE',
      reason: 'NO_ALLOCATION',
    });
    expect(evaluateBudgetUtilization(-1, 500)).toEqual({
      kind: 'NOT_EVALUABLE',
      reason: 'NO_ALLOCATION',
    });
  });

  it('⛔ kullanılan tutar OKUNAMAZ ⇒ USED_UNREADABLE, `0` DEĞİL', () => {
    // `BudgetSummaryCard`'ın eski `reservedAmount ?? 0`'ı tam buydu:
    // rezerve sorgusu HATA verince oran eksik hesaplanıp gerçek sayı gibi
    // basılıyordu.
    const e = evaluateBudgetUtilization(1000, null);
    expect(e.kind).toBe('NOT_EVALUABLE');
    if (e.kind === 'NOT_EVALUABLE') expect(e.reason).toBe('USED_UNREADABLE');
  });

  it('`decimal` kolonları DİZGE gelir (`pg`) ve okunur', () => {
    expect(evaluateBudgetUtilization('1000.0000', '950.0000')).toEqual({
      kind: 'EVALUATED',
      percent: 95,
      status: 'RED',
    });
  });

  it('her NOT_EVALUABLE sebebinin kullanıcıya bir cümlesi var', () => {
    for (const r of [
      'ALLOCATION_UNREADABLE',
      'NO_ALLOCATION',
      'USED_UNREADABLE',
    ] as const) {
      expect(describeBudgetUtilizationGap(r).length).toBeGreaterThan(0);
    }
  });

  it('aşım gerçek bir durumdur: yüzde 120 kırpılmaz', () => {
    const e = evaluateBudgetUtilization(1000, 1200);
    expect(e).toEqual({ kind: 'EVALUATED', percent: 120, status: 'RED' });
  });
});

describe('usedFromAvailable — ÖZDEŞLİK, türetme değil', () => {
  /**
   * `v_budget_summary` (migration `1803000000000`):
   *   `available = allocated − reserved − consumed`
   * ⇒ `reserved + consumed = allocated − available`.
   */
  it('allocated − available === reserved + consumed', () => {
    const allocated = 1000,
      reserved = 300,
      consumed = 250;
    const available = allocated - reserved - consumed;
    expect(usedFromAvailable(allocated, available)).toBe(reserved + consumed);
  });

  it('⛔ okunamayan uç ⇒ `null`, `0` DEĞİL (çağıran NOT_EVALUABLE görür)', () => {
    expect(usedFromAvailable(1000, undefined)).toBeNull();
    expect(usedFromAvailable(undefined, 100)).toBeNull();
    expect(usedFromAvailable('abc', 100)).toBeNull();
    expect(
      evaluateBudgetUtilization(1000, usedFromAvailable(1000, undefined)).kind
    ).toBe('NOT_EVALUABLE');
  });

  it('rezervasyon ORANA GİRER — ölen `reserved=0` sessizliğinin kapısı', () => {
    // `GET /budget/envelopes` `reservedAmount` DÖNDÜRMÜYOR (kolon yok).
    // Eski kod `consumed/allocated` hesaplıyordu ⇒ aşağıdaki zarf %50
    // (GREEN) görünürdü. Özdeşlik üzerinden %90 ⇒ AMBER.
    const allocated = 1000;
    const consumedOnly = 500; // eski payda-üstü
    const available = 100; // 1000 − 400 rezerve − 500 tüketilen
    expect(evaluateBudgetUtilization(allocated, consumedOnly)).toEqual({
      kind: 'EVALUATED',
      percent: 50,
      status: 'GREEN',
    });
    expect(
      evaluateBudgetUtilization(allocated, usedFromAvailable(allocated, available))
    ).toEqual({ kind: 'EVALUATED', percent: 90, status: 'AMBER' });
  });
});
