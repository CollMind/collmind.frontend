/**
 * Grid hücre değeri hesaplama — SKU ve FU seviyesi.
 *
 * `T-334`'ün (`Z83` şeriti) `react-refresh/only-export-components` lint
 * temizliği kapsamında `PlanningGridEnhanced.tsx`'ten TAŞINDI (2026-09-02).
 * Taşıma SALT DOSYA SINIRI değişikliğidir — mantığın tek karakteri
 * değişmemiştir; `PlanningGridEnhanced.tsx` bunları buradan import eder.
 *
 * ⚠️ Sınıf-notu (`Z65 §1a`, hüküm DEĞİL, `PlanningGridEnhanced.tsx`'in eski
 * başlığından taşındı): *"frontend formül HESAPLAMAZ; motor SONUCUNU
 * gösterir."* Bu dosya bugün üçüncü bir formül kopyası taşıyor. Temizlik
 * listesindedir; bu taşıma o temizliği YAPMAZ, yalnızca fast-refresh
 * uyarısını giderir.
 */
import { PlanFu, PlanSku } from '@/api/endpoints/plans.endpoints';
import { toNumber, toNumberOrNull, toNumberOrZero } from '@/utils/numberUtils';

/**
 * `T-349` / `Z79 §8` — null-safe BASE-chain arithmetic (SKU + FU).
 *
 * ⛔ `baseVolume` missing (`null`/`undefined`) is `NOT_EVALUABLE` (`Q20`,
 * `Z78 §1`), not "0 units sold". The `?? 0` this file used to fall back to
 * silently turned a missing baseline into a real zero everywhere it was
 * multiplied or summed — `Q20`'s backend null-propagation (`Z77`) undone in
 * the display layer (`docs/process/BL_BASELINE_HATTI_BRIEF.md §9b`). The
 * emsal for the null-vs-value split is `src/utils/targetRoi.ts`
 * (`TargetRoiEvaluation`); the render side already renders `null` as `-`
 * (`grid-cells.tsx` `formatValue`) — this file only needed to stop
 * MANUFACTURING a `0` before that render happens.
 *
 * ⚠️ **Deliberately narrow.** Only the `baseVolume` axis is closed here.
 * `unitPrice`/`cogs`/`plannedVolume` keep their existing `?? 0` fallback —
 * a sibling, unfixed instance of the same class (reported to Team Lead in
 * the `T-349` handoff, not fixed in this task: 46/12/23 sites, spanning
 * both BASE and PLAN sides, out of this task's `touches:` scope).
 */
function mulBaseVolume(
  baseVolume: number | null | undefined,
  factor: number | null | undefined
): number | null {
  if (baseVolume === null || baseVolume === undefined) return null;
  return baseVolume * (factor ?? 0);
}

function subOrNull(
  a: number | null,
  b: number | null | undefined
): number | null {
  if (a === null) return null;
  return a - (b ?? 0);
}

interface BaseChain {
  gsv: number | null;
  niv: number | null;
  to: number | null;
  cogs: number | null;
  gp: number | null;
}

/** SKU-level base chain: GSV → NIV → TO → GP, `null`-propagating from `baseVolume`. */
function computeBaseChain(
  baseVolume: number | null | undefined,
  unitPrice: number | null | undefined,
  cogs: number | null | undefined,
  baseLtaOn: number | null | undefined,
  baseLtaOff: number | null | undefined
): BaseChain {
  const gsv = mulBaseVolume(baseVolume, unitPrice);
  const niv = subOrNull(gsv, baseLtaOn);
  const to = subOrNull(niv, baseLtaOff);
  const cogsAmt = mulBaseVolume(baseVolume, cogs);
  const gp = to === null || cogsAmt === null ? null : to - cogsAmt;
  return { gsv, niv, to, cogs: cogsAmt, gp };
}

/**
 * FU-level base volume rollup across SKUs.
 *
 * ⚠️ **Row classification is sourced, not invented** (`Z78 §1`, `Q20`, `1a`
 * — *"satırın girdi-alanları evreni iki kolondur: `base_volume`,
 * `planned_volume`"*):
 * - **DOKUNULMAMIŞ** (`baseVolume` AND `plannedVolume` both missing): row
 *   was never planned. Contributes nothing and does not block — matches
 *   `Q20`'s *"katılmıyor, 0 değil"*, which for a SUM is the same number but
 *   NOT the same reasoning (a real, counted zero vs. a row that opts out).
 * - **KISMİ** (`plannedVolume` set, `baseVolume` missing): partial row —
 *   the SKU was touched but its baseline is unknown. The whole FU-level
 *   aggregate becomes `NOT_EVALUABLE` (`null`); it is not silently summed
 *   as if the missing baseline were zero.
 */
function baseVolSum(
  skus: readonly Pick<PlanSku, 'baseVolume' | 'plannedVolume'>[]
): number | null {
  let sum = 0;
  for (const sku of skus) {
    if (sku.baseVolume === null || sku.baseVolume === undefined) {
      if (sku.plannedVolume === null || sku.plannedVolume === undefined) {
        continue;
      }
      return null;
    }
    sum += sku.baseVolume;
  }
  return sum;
}

/** FU-level base chain rollup. Same DOKUNULMAMIŞ/KISMİ classification as {@link baseVolSum}. */
function computeBaseChainAgg(skus: readonly PlanSku[]): BaseChain {
  let gsvSum = 0;
  let cogsSum = 0;
  for (const sku of skus) {
    if (sku.baseVolume === null || sku.baseVolume === undefined) {
      if (sku.plannedVolume === null || sku.plannedVolume === undefined) {
        continue;
      }
      return { gsv: null, niv: null, to: null, cogs: null, gp: null };
    }
    gsvSum += sku.baseVolume * (sku.sku?.unitPrice ?? 0);
    cogsSum += sku.baseVolume * (sku.sku?.cogs ?? 0);
  }
  const ltaOnSum = skus.reduce(
    (s, sku) => s + (sku.baseLtaOnInvoiceSpend ?? 0),
    0
  );
  const ltaOffSum = skus.reduce(
    (s, sku) => s + (sku.baseLtaOffInvoiceSpend ?? 0),
    0
  );
  const niv = gsvSum - ltaOnSum;
  const to = niv - ltaOffSum;
  const gp = to - cogsSum;
  return { gsv: gsvSum, niv, to, cogs: cogsSum, gp };
}

/**
 * Get cell value for SKU based on column code
 */
export function getSkuCellValue(
  planSku: PlanSku,
  colCode: string,
  // Çağrı sitesi (`PlanningGridEnhanced.tsx`) bu parametreyi geçiyor ama
  // fonksiyon gövdesi hiç okumuyor — `no-unused-vars`, `^_` deseniyle susar.
  // Kaldırılmadı: imza SKU hücresinin FU bağlamına erişebileceği bir kanca;
  // silmek çağrı sitesini de değiştirir (davranış dışı bir imza kırılması).
  _planFu?: PlanFu
): number | null {
  const sku = planSku.sku;

  switch (colCode) {
    // Master Data
    case 'BPTT':
      return sku?.unitPrice ?? null;
    case 'COGS':
      return sku?.cogs ?? null;

    // Volume Metrics
    case 'BASE_VOL':
      return planSku.baseVolume ?? null;
    case 'PLAN_VOL':
      return planSku.plannedVolume ?? null;
    case 'INCR_VOL':
      return planSku.incrementalVolume ?? null;
    case 'VOL_UPLIFT_PCT': {
      // `planSku.baseVolume` NOT defaulted to 0 — `!base` already returns
      // `null` for missing/zero alike, so the old `?? 0` changed nothing
      // here except the misleading appearance of a silent-zero.
      const base = planSku.baseVolume;
      if (!base) return null;
      return (((planSku.plannedVolume ?? 0) - base) / base) * 100;
    }

    // GSV
    case 'BASE_GSV':
      return mulBaseVolume(planSku.baseVolume, sku?.unitPrice);
    case 'PLAN_GSV': {
      const planVol = planSku.plannedVolume ?? 0;
      const listPrice = sku?.unitPrice ?? 0;
      return planVol * listPrice;
    }
    case 'INCR_GSV': {
      const baseGsv = mulBaseVolume(planSku.baseVolume, sku?.unitPrice);
      if (baseGsv === null) return null;
      const planGsv = (planSku.plannedVolume ?? 0) * (sku?.unitPrice ?? 0);
      return planGsv - baseGsv;
    }

    // LTA
    case 'LTA_ON_PCT':
      // TODO: Get from LTA context
      return null;
    case 'LTA_OFF_PCT':
      // TODO: Get from LTA context
      return null;
    case 'BASE_LTA_ON':
      return planSku.baseLtaOnInvoiceSpend ?? null;
    case 'BASE_LTA_OFF':
      return planSku.baseLtaOffInvoiceSpend ?? null;
    case 'PLAN_LTA_ON':
      return planSku.plannedLtaOnInvoiceSpend ?? null;
    case 'PLAN_LTA_OFF':
      return planSku.plannedLtaOffInvoiceSpend ?? null;

    // Promo Mechanics - Get from spendBreakdowns or planMechanicValues
    case 'CPP_ON_PCT':
    case 'TPR_ON_PCT':
    case 'WS_TPR_ON_PCT':
    case 'CPP_OFF_PCT':
    case 'WS_TPR_OFF_PCT':
    case 'PRICE_SUPPORT':
    case 'VISIBILITY_MTPH':
    case 'VISIBILITY_GT':
    case 'TPR_LUMPSUM':
      // These are FU-level, inherited at SKU level
      return null;

    case 'CPP_ON_SPEND':
    case 'TPR_ON_SPEND':
    case 'WS_TPR_ON_SPEND':
    case 'CPP_OFF_SPEND':
    case 'WS_TPR_OFF_SPEND':
    case 'PRICE_SUPPORT_SPEND':
    case 'VISIBILITY_MTPH_SPEND':
    case 'VISIBILITY_GT_SPEND':
    case 'TPR_LUMPSUM_SPEND':
      // Get from spendBreakdowns
      if (planSku.spendBreakdowns) {
        const mechanicCode = colCode.replace('_SPEND', '').replace('_PCT', '');
        const breakdown = planSku.spendBreakdowns.find(
          (b) => b.mechanic?.code === mechanicCode
        );
        return breakdown?.calculatedAmount ?? null;
      }
      return null;

    // Total Spend
    case 'TOTAL_PROMO_ON':
      return planSku.promoOnInvoiceSpend ?? null;
    case 'TOTAL_PROMO_OFF':
      return planSku.promoOffInvoiceSpend ?? null;
    case 'TOTAL_LTA_ON':
      return planSku.plannedLtaOnInvoiceSpend ?? null;
    case 'TOTAL_LTA_OFF':
      return planSku.plannedLtaOffInvoiceSpend ?? null;
    case 'TOTAL_PLANNED_ON':
      return (
        (planSku.plannedLtaOnInvoiceSpend ?? 0) +
        (planSku.promoOnInvoiceSpend ?? 0)
      );
    case 'TOTAL_PLANNED_OFF':
      return (
        (planSku.plannedLtaOffInvoiceSpend ?? 0) +
        (planSku.promoOffInvoiceSpend ?? 0)
      );
    case 'TOTAL_PLANNED_SPEND':
      return (
        (planSku.plannedLtaOnInvoiceSpend ?? 0) +
        (planSku.plannedLtaOffInvoiceSpend ?? 0) +
        (planSku.promoOnInvoiceSpend ?? 0) +
        (planSku.promoOffInvoiceSpend ?? 0)
      );
    case 'INCREMENTAL_SPEND': {
      const baseTotal =
        (planSku.baseLtaOnInvoiceSpend ?? 0) +
        (planSku.baseLtaOffInvoiceSpend ?? 0);
      const plannedTotal =
        (planSku.plannedLtaOnInvoiceSpend ?? 0) +
        (planSku.plannedLtaOffInvoiceSpend ?? 0) +
        (planSku.promoOnInvoiceSpend ?? 0) +
        (planSku.promoOffInvoiceSpend ?? 0);
      return plannedTotal - baseTotal;
    }

    // NIV & Turnover
    case 'BASE_NIV':
      return computeBaseChain(
        planSku.baseVolume,
        sku?.unitPrice,
        sku?.cogs,
        planSku.baseLtaOnInvoiceSpend,
        planSku.baseLtaOffInvoiceSpend
      ).niv;
    case 'PLAN_NIV': {
      const planGsv = (planSku.plannedVolume ?? 0) * (sku?.unitPrice ?? 0);
      const totalOnInv =
        (planSku.plannedLtaOnInvoiceSpend ?? 0) +
        (planSku.promoOnInvoiceSpend ?? 0);
      return planGsv - totalOnInv;
    }
    case 'INCR_NIV': {
      const baseNiv = computeBaseChain(
        planSku.baseVolume,
        sku?.unitPrice,
        sku?.cogs,
        planSku.baseLtaOnInvoiceSpend,
        planSku.baseLtaOffInvoiceSpend
      ).niv;
      if (baseNiv === null) return null;
      const planGsv = (planSku.plannedVolume ?? 0) * (sku?.unitPrice ?? 0);
      const totalOnInv =
        (planSku.plannedLtaOnInvoiceSpend ?? 0) +
        (planSku.promoOnInvoiceSpend ?? 0);
      const planNiv = planGsv - totalOnInv;
      return planNiv - baseNiv;
    }
    case 'BASE_TO':
      return computeBaseChain(
        planSku.baseVolume,
        sku?.unitPrice,
        sku?.cogs,
        planSku.baseLtaOnInvoiceSpend,
        planSku.baseLtaOffInvoiceSpend
      ).to;
    case 'PLAN_TO': {
      const planGsv = (planSku.plannedVolume ?? 0) * (sku?.unitPrice ?? 0);
      const totalOnInv =
        (planSku.plannedLtaOnInvoiceSpend ?? 0) +
        (planSku.promoOnInvoiceSpend ?? 0);
      const planNiv = planGsv - totalOnInv;
      const totalOffInv =
        (planSku.plannedLtaOffInvoiceSpend ?? 0) +
        (planSku.promoOffInvoiceSpend ?? 0);
      return planNiv - totalOffInv;
    }
    case 'INCR_TO': {
      const baseTo = computeBaseChain(
        planSku.baseVolume,
        sku?.unitPrice,
        sku?.cogs,
        planSku.baseLtaOnInvoiceSpend,
        planSku.baseLtaOffInvoiceSpend
      ).to;
      if (baseTo === null) return null;
      const planGsv = (planSku.plannedVolume ?? 0) * (sku?.unitPrice ?? 0);
      const totalOnInv =
        (planSku.plannedLtaOnInvoiceSpend ?? 0) +
        (planSku.promoOnInvoiceSpend ?? 0);
      const planNiv = planGsv - totalOnInv;
      const totalOffInv =
        (planSku.plannedLtaOffInvoiceSpend ?? 0) +
        (planSku.promoOffInvoiceSpend ?? 0);
      const planTo = planNiv - totalOffInv;
      return planTo - baseTo;
    }
    case 'TO_UPLIFT_PCT': {
      const baseTo = computeBaseChain(
        planSku.baseVolume,
        sku?.unitPrice,
        sku?.cogs,
        planSku.baseLtaOnInvoiceSpend,
        planSku.baseLtaOffInvoiceSpend
      ).to;
      if (!baseTo) return null;
      const planGsv = (planSku.plannedVolume ?? 0) * (sku?.unitPrice ?? 0);
      const totalOnInv =
        (planSku.plannedLtaOnInvoiceSpend ?? 0) +
        (planSku.promoOnInvoiceSpend ?? 0);
      const planNiv = planGsv - totalOnInv;
      const totalOffInv =
        (planSku.plannedLtaOffInvoiceSpend ?? 0) +
        (planSku.promoOffInvoiceSpend ?? 0);
      const planTo = planNiv - totalOffInv;
      return ((planTo - baseTo) / baseTo) * 100;
    }

    // Profit
    case 'BASE_COGS':
      return mulBaseVolume(planSku.baseVolume, sku?.cogs);
    case 'PLAN_COGS':
      return (planSku.plannedVolume ?? 0) * (sku?.cogs ?? 0);
    case 'BASE_GP': {
      const chain = computeBaseChain(
        planSku.baseVolume,
        sku?.unitPrice,
        sku?.cogs,
        planSku.baseLtaOnInvoiceSpend,
        planSku.baseLtaOffInvoiceSpend
      );
      return chain.gp;
    }
    case 'PLAN_GP':
      return planSku.plannedGp ?? null;
    case 'INCR_GP': {
      const baseGp = computeBaseChain(
        planSku.baseVolume,
        sku?.unitPrice,
        sku?.cogs,
        planSku.baseLtaOnInvoiceSpend,
        planSku.baseLtaOffInvoiceSpend
      ).gp;
      if (baseGp === null) return null;
      const planGp = planSku.plannedGp ?? 0;
      return planGp - baseGp;
    }

    // Margin
    case 'BASE_GM_PCT': {
      const chain = computeBaseChain(
        planSku.baseVolume,
        sku?.unitPrice,
        sku?.cogs,
        planSku.baseLtaOnInvoiceSpend,
        planSku.baseLtaOffInvoiceSpend
      );
      if (!chain.to || chain.gp === null) return null;
      return (chain.gp / chain.to) * 100;
    }
    case 'PLAN_GM_PCT': {
      const planGsv = (planSku.plannedVolume ?? 0) * (sku?.unitPrice ?? 0);
      const totalOnInv =
        (planSku.plannedLtaOnInvoiceSpend ?? 0) +
        (planSku.promoOnInvoiceSpend ?? 0);
      const planNiv = planGsv - totalOnInv;
      const totalOffInv =
        (planSku.plannedLtaOffInvoiceSpend ?? 0) +
        (planSku.promoOffInvoiceSpend ?? 0);
      const planTo = planNiv - totalOffInv;
      if (!planTo) return null;
      const planGp = planSku.plannedGp ?? 0;
      return (planGp / planTo) * 100;
    }
    case 'INCR_GM_PCT': {
      const planGsv = (planSku.plannedVolume ?? 0) * (sku?.unitPrice ?? 0);
      const totalOnInv =
        (planSku.plannedLtaOnInvoiceSpend ?? 0) +
        (planSku.promoOnInvoiceSpend ?? 0);
      const planNiv = planGsv - totalOnInv;
      const totalOffInv =
        (planSku.plannedLtaOffInvoiceSpend ?? 0) +
        (planSku.promoOffInvoiceSpend ?? 0);
      const planTo = planNiv - totalOffInv;
      const baseChain = computeBaseChain(
        planSku.baseVolume,
        sku?.unitPrice,
        sku?.cogs,
        planSku.baseLtaOnInvoiceSpend,
        planSku.baseLtaOffInvoiceSpend
      );
      if (baseChain.to === null) return null;
      const incrTo = planTo - baseChain.to;
      if (!incrTo) return null;
      if (baseChain.gp === null) return null;
      const planGp = planSku.plannedGp ?? 0;
      const incrGp = planGp - baseChain.gp;
      return (incrGp / incrTo) * 100;
    }

    // ROI
    case 'GP_ROI_PCT':
      return toNumber(planSku.gpRoi ?? null);
    case 'TO_ROI_PCT': {
      // `T-334`/`Q6` (`Z66 §1`) — ROI PAYDASI: *yalnız promo · LTA hariç ·
      // incremental*. ⛔ ÖNCE `LTA dahil toplam artımsal harcama`ydı, yani
      // motorun `GP_ROI_PCT` paydasından FARKLI bir taban — aynı ekranda
      // iki ROI, iki payda. Backend `INCR_PROMO_SPEND` kalemini üretiyor
      // (`spend-calculation`, `incremental.promoTotal`); grid onun SKU
      // bileşenlerinden aynı sayıyı kuruyor (tabanda promo harcaması YOK).
      const incrSpend =
        (planSku.promoOnInvoiceSpend ?? 0) +
        (planSku.promoOffInvoiceSpend ?? 0);
      if (!incrSpend || incrSpend <= 0) return null;
      const baseTo = computeBaseChain(
        planSku.baseVolume,
        sku?.unitPrice,
        sku?.cogs,
        planSku.baseLtaOnInvoiceSpend,
        planSku.baseLtaOffInvoiceSpend
      ).to;
      if (baseTo === null) return null;
      const planGsv = (planSku.plannedVolume ?? 0) * (sku?.unitPrice ?? 0);
      const totalOnInv =
        (planSku.plannedLtaOnInvoiceSpend ?? 0) +
        (planSku.promoOnInvoiceSpend ?? 0);
      const planNiv = planGsv - totalOnInv;
      const totalOffInv =
        (planSku.plannedLtaOffInvoiceSpend ?? 0) +
        (planSku.promoOffInvoiceSpend ?? 0);
      const planTo = planNiv - totalOffInv;
      const incrTo = planTo - baseTo;
      return (incrTo / incrSpend) * 100;
    }

    default:
      return null;
  }
}

/**
 * Get cell value for FU (aggregated from SKUs or from FU-level tactics)
 */
export function getFuCellValue(planFu: PlanFu, colCode: string): number | null {
  const skus = planFu.planSkus || [];

  switch (colCode) {
    // Master Data - N/A at FU level
    case 'BPTT':
    case 'COGS':
      return null;

    // Volume Metrics - Aggregated
    case 'BASE_VOL':
      return baseVolSum(skus);
    case 'PLAN_VOL':
      return toNumberOrNull(planFu.totalPlannedVolume);
    case 'INCR_VOL': {
      const baseVol = baseVolSum(skus);
      if (baseVol === null) return null;
      const plannedVol = toNumberOrZero(planFu.totalPlannedVolume);
      return plannedVol - baseVol;
    }
    case 'VOL_UPLIFT_PCT': {
      const baseVol = baseVolSum(skus);
      if (!baseVol) return null;
      const plannedVol = toNumberOrZero(planFu.totalPlannedVolume);
      return ((plannedVol - baseVol) / baseVol) * 100;
    }

    // GSV - Aggregated
    case 'BASE_GSV':
      return computeBaseChainAgg(skus).gsv;
    case 'PLAN_GSV':
      return skus.reduce((sum, sku) => {
        const planVol = sku.plannedVolume ?? 0;
        const listPrice = sku.sku?.unitPrice ?? 0;
        return sum + planVol * listPrice;
      }, 0);
    case 'INCR_GSV': {
      const baseGsv = computeBaseChainAgg(skus).gsv;
      if (baseGsv === null) return null;
      const planGsv = skus.reduce((sum, sku) => {
        const planVol = sku.plannedVolume ?? 0;
        const listPrice = sku.sku?.unitPrice ?? 0;
        return sum + planVol * listPrice;
      }, 0);
      return planGsv - baseGsv;
    }

    // LTA - Aggregated
    case 'BASE_LTA_ON':
      return skus.reduce(
        (sum, sku) => sum + (sku.baseLtaOnInvoiceSpend ?? 0),
        0
      );
    case 'BASE_LTA_OFF':
      return skus.reduce(
        (sum, sku) => sum + (sku.baseLtaOffInvoiceSpend ?? 0),
        0
      );
    case 'PLAN_LTA_ON':
      return skus.reduce(
        (sum, sku) => sum + (sku.plannedLtaOnInvoiceSpend ?? 0),
        0
      );
    case 'PLAN_LTA_OFF':
      return skus.reduce(
        (sum, sku) => sum + (sku.plannedLtaOffInvoiceSpend ?? 0),
        0
      );

    // Promo Mechanics - Get from planMechanicValues (FU level)
    case 'CPP_ON_PCT':
    case 'TPR_ON_PCT':
    case 'WS_TPR_ON_PCT':
    case 'CPP_OFF_PCT':
    case 'WS_TPR_OFF_PCT':
    case 'PRICE_SUPPORT':
    case 'VISIBILITY_MTPH':
    case 'VISIBILITY_GT':
    case 'TPR_LUMPSUM': {
      const mechanicCode = colCode;
      const mechanicValue = planFu.planMechanicValues?.find(
        (pmv) => pmv.mechanic?.code === mechanicCode
      );
      return mechanicValue?.enteredValue ?? null;
    }

    // Promo Spend - Aggregated from SKUs
    case 'CPP_ON_SPEND':
    case 'TPR_ON_SPEND':
    case 'WS_TPR_ON_SPEND':
    case 'CPP_OFF_SPEND':
    case 'WS_TPR_OFF_SPEND':
    case 'PRICE_SUPPORT_SPEND':
    case 'VISIBILITY_MTPH_SPEND':
    case 'VISIBILITY_GT_SPEND':
    case 'TPR_LUMPSUM_SPEND': {
      const mechanicCode = colCode.replace('_SPEND', '');
      return skus.reduce((sum, sku) => {
        const breakdown = sku.spendBreakdowns?.find(
          (b) => b.mechanic?.code === mechanicCode
        );
        return sum + (breakdown?.calculatedAmount ?? 0);
      }, 0);
    }

    // Total Spend - Aggregated
    case 'TOTAL_PROMO_ON':
      return skus.reduce((sum, sku) => sum + (sku.promoOnInvoiceSpend ?? 0), 0);
    case 'TOTAL_PROMO_OFF':
      return skus.reduce(
        (sum, sku) => sum + (sku.promoOffInvoiceSpend ?? 0),
        0
      );
    case 'TOTAL_LTA_ON':
      return skus.reduce(
        (sum, sku) => sum + (sku.plannedLtaOnInvoiceSpend ?? 0),
        0
      );
    case 'TOTAL_LTA_OFF':
      return skus.reduce(
        (sum, sku) => sum + (sku.plannedLtaOffInvoiceSpend ?? 0),
        0
      );
    case 'TOTAL_PLANNED_ON':
      return skus.reduce((sum, sku) => {
        return (
          sum +
          (sku.plannedLtaOnInvoiceSpend ?? 0) +
          (sku.promoOnInvoiceSpend ?? 0)
        );
      }, 0);
    case 'TOTAL_PLANNED_OFF':
      return skus.reduce((sum, sku) => {
        return (
          sum +
          (sku.plannedLtaOffInvoiceSpend ?? 0) +
          (sku.promoOffInvoiceSpend ?? 0)
        );
      }, 0);
    case 'TOTAL_PLANNED_SPEND':
      return toNumberOrNull(planFu.totalSpend);
    case 'INCREMENTAL_SPEND': {
      const baseTotal = skus.reduce((sum, sku) => {
        return (
          sum +
          (sku.baseLtaOnInvoiceSpend ?? 0) +
          (sku.baseLtaOffInvoiceSpend ?? 0)
        );
      }, 0);
      const plannedTotal = toNumberOrZero(planFu.totalSpend);
      return plannedTotal - baseTotal;
    }

    // NIV & Turnover - Aggregated
    case 'BASE_NIV':
      return computeBaseChainAgg(skus).niv;
    case 'PLAN_NIV':
      return skus.reduce((sum, sku) => {
        const planGsv = (sku.plannedVolume ?? 0) * (sku.sku?.unitPrice ?? 0);
        const totalOnInv =
          (sku.plannedLtaOnInvoiceSpend ?? 0) + (sku.promoOnInvoiceSpend ?? 0);
        return sum + planGsv - totalOnInv;
      }, 0);
    case 'INCR_NIV': {
      const baseNiv = computeBaseChainAgg(skus).niv;
      if (baseNiv === null) return null;
      const planNiv = skus.reduce((sum, sku) => {
        const planGsv = (sku.plannedVolume ?? 0) * (sku.sku?.unitPrice ?? 0);
        const totalOnInv =
          (sku.plannedLtaOnInvoiceSpend ?? 0) + (sku.promoOnInvoiceSpend ?? 0);
        return sum + planGsv - totalOnInv;
      }, 0);
      return planNiv - baseNiv;
    }
    case 'BASE_TO':
      return computeBaseChainAgg(skus).to;
    case 'PLAN_TO':
      return skus.reduce((sum, sku) => {
        const planGsv = (sku.plannedVolume ?? 0) * (sku.sku?.unitPrice ?? 0);
        const totalOnInv =
          (sku.plannedLtaOnInvoiceSpend ?? 0) + (sku.promoOnInvoiceSpend ?? 0);
        const planNiv = planGsv - totalOnInv;
        const totalOffInv =
          (sku.plannedLtaOffInvoiceSpend ?? 0) +
          (sku.promoOffInvoiceSpend ?? 0);
        return sum + planNiv - totalOffInv;
      }, 0);
    case 'INCR_TO': {
      const baseTo = computeBaseChainAgg(skus).to;
      if (baseTo === null) return null;
      const planTo = skus.reduce((sum, sku) => {
        const planGsv = (sku.plannedVolume ?? 0) * (sku.sku?.unitPrice ?? 0);
        const totalOnInv =
          (sku.plannedLtaOnInvoiceSpend ?? 0) + (sku.promoOnInvoiceSpend ?? 0);
        const planNiv = planGsv - totalOnInv;
        const totalOffInv =
          (sku.plannedLtaOffInvoiceSpend ?? 0) +
          (sku.promoOffInvoiceSpend ?? 0);
        return sum + planNiv - totalOffInv;
      }, 0);
      return planTo - baseTo;
    }
    case 'TO_UPLIFT_PCT': {
      const baseTo = computeBaseChainAgg(skus).to;
      if (!baseTo) return null;
      const planTo = skus.reduce((sum, sku) => {
        const planGsv = (sku.plannedVolume ?? 0) * (sku.sku?.unitPrice ?? 0);
        const totalOnInv =
          (sku.plannedLtaOnInvoiceSpend ?? 0) + (sku.promoOnInvoiceSpend ?? 0);
        const planNiv = planGsv - totalOnInv;
        const totalOffInv =
          (sku.plannedLtaOffInvoiceSpend ?? 0) +
          (sku.promoOffInvoiceSpend ?? 0);
        return sum + planNiv - totalOffInv;
      }, 0);
      return ((planTo - baseTo) / baseTo) * 100;
    }

    // Profit - Aggregated
    case 'BASE_COGS':
      return computeBaseChainAgg(skus).cogs;
    case 'PLAN_COGS':
      return skus.reduce(
        (sum, sku) => sum + (sku.plannedVolume ?? 0) * (sku.sku?.cogs ?? 0),
        0
      );
    case 'BASE_GP':
      return computeBaseChainAgg(skus).gp;
    case 'PLAN_GP':
      return planFu.totalGp ?? null;
    case 'INCR_GP': {
      const baseGp = computeBaseChainAgg(skus).gp;
      if (baseGp === null) return null;
      const planGp = planFu.totalGp ?? 0;
      return planGp - baseGp;
    }

    // Margin - Weighted Average
    case 'BASE_GM_PCT': {
      const chain = computeBaseChainAgg(skus);
      if (!chain.to || chain.gp === null) return null;
      return (chain.gp / chain.to) * 100;
    }
    case 'PLAN_GM_PCT': {
      const planTo = skus.reduce((sum, sku) => {
        const planGsv = (sku.plannedVolume ?? 0) * (sku.sku?.unitPrice ?? 0);
        const totalOnInv =
          (sku.plannedLtaOnInvoiceSpend ?? 0) + (sku.promoOnInvoiceSpend ?? 0);
        const planNiv = planGsv - totalOnInv;
        const totalOffInv =
          (sku.plannedLtaOffInvoiceSpend ?? 0) +
          (sku.promoOffInvoiceSpend ?? 0);
        return sum + planNiv - totalOffInv;
      }, 0);
      if (!planTo) return null;
      const planGp = planFu.totalGp ?? 0;
      return (planGp / planTo) * 100;
    }
    case 'INCR_GM_PCT': {
      const baseChain = computeBaseChainAgg(skus);
      const planTo = skus.reduce((sum, sku) => {
        const planGsv = (sku.plannedVolume ?? 0) * (sku.sku?.unitPrice ?? 0);
        const totalOnInv =
          (sku.plannedLtaOnInvoiceSpend ?? 0) + (sku.promoOnInvoiceSpend ?? 0);
        const planNiv = planGsv - totalOnInv;
        const totalOffInv =
          (sku.plannedLtaOffInvoiceSpend ?? 0) +
          (sku.promoOffInvoiceSpend ?? 0);
        return sum + planNiv - totalOffInv;
      }, 0);
      if (baseChain.to === null) return null;
      const incrTo = planTo - baseChain.to;
      if (!incrTo) return null;
      if (baseChain.gp === null) return null;
      const planGp = planFu.totalGp ?? 0;
      const incrGp = planGp - baseChain.gp;
      return (incrGp / incrTo) * 100;
    }

    // ROI
    case 'GP_ROI_PCT':
      // `money-float` (T-111/ADR 0007 Karar 3b/8.2, `Z83` taşıması) bu
      // dosyayı YENİ Domain A dosyası sayar ve raw `Number(...)`'ü sıfır-
      // tolerans engelliyor. Taşınmadan önceki davranış AYNEN korundu —
      // yalnız `Number` yerine SKU kardeşinin (`getSkuCellValue`
      // `GP_ROI_PCT`) zaten kullandığı `toNumber` çağrılıyor: falsy
      // `gpRoi` (0/''/null/undefined) hâlâ `null` döner, değişen tek şey
      // GEÇERSİZ (kanonik olmayan) bir string'in artık sessiz `NaN`
      // yerine `null` vermesi — `§2.5`'in istediği yön, davranışı
      // GENİŞLETMEDİ.
      return planFu.gpRoi ? toNumber(planFu.gpRoi) : null;
    case 'TO_ROI_PCT': {
      // `T-334`/`Q6` — SKU kopyasıyla AYNI payda (bkz. `getSkuCellValue`).
      const incrSpend = skus.reduce(
        (sum, sku) =>
          sum +
          (sku.promoOnInvoiceSpend ?? 0) +
          (sku.promoOffInvoiceSpend ?? 0),
        0
      );
      if (!incrSpend || incrSpend <= 0) return null;
      const baseTo = computeBaseChainAgg(skus).to;
      if (baseTo === null) return null;
      const planTo = skus.reduce((sum, sku) => {
        const planGsv = (sku.plannedVolume ?? 0) * (sku.sku?.unitPrice ?? 0);
        const totalOnInv =
          (sku.plannedLtaOnInvoiceSpend ?? 0) + (sku.promoOnInvoiceSpend ?? 0);
        const planNiv = planGsv - totalOnInv;
        const totalOffInv =
          (sku.plannedLtaOffInvoiceSpend ?? 0) +
          (sku.promoOffInvoiceSpend ?? 0);
        return sum + planNiv - totalOffInv;
      }, 0);
      const incrTo = planTo - baseTo;
      return (incrTo / incrSpend) * 100;
    }

    default:
      return null;
  }
}
