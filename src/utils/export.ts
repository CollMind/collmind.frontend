import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { RiskPlan } from '@/api/endpoints/finance-reporting.endpoints';

export interface ExportOptions {
  filename?: string;
  sheetName?: string;
  format?: 'xlsx' | 'csv';
}

/**
 * Export data to Excel or CSV
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  options: ExportOptions = {}
): void {
  const {
    filename = `export-${format(new Date(), 'yyyy-MM-dd-HHmmss')}`,
    sheetName = 'Sheet1',
    format: fileFormat = 'xlsx',
  } = options;

  // Convert data to worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Auto-size columns
  const columnWidths = Object.keys(data[0] || {}).map((key) => {
    const maxLength = Math.max(
      key.length,
      ...data.map((row) => String(row[key] || '').length)
    );
    return { wch: Math.min(maxLength + 2, 50) };
  });
  worksheet['!cols'] = columnWidths;

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Export
  if (fileFormat === 'csv') {
    XLSX.writeFile(workbook, `${filename}.csv`, { bookType: 'csv' });
  } else {
    XLSX.writeFile(workbook, `${filename}.xlsx`, { bookType: 'xlsx' });
  }
}

/**
 * Export multiple sheets to Excel
 */
export function exportMultipleSheets(
  sheets: Array<{ name: string; data: Record<string, any>[] }>,
  filename: string = `export-${format(new Date(), 'yyyy-MM-dd-HHmmss')}`
): void {
  const workbook = XLSX.utils.book_new();

  sheets.forEach((sheet) => {
    const worksheet = XLSX.utils.json_to_sheet(sheet.data);

    // Auto-size columns
    if (sheet.data.length > 0) {
      const columnWidths = Object.keys(sheet.data[0]).map((key) => {
        const maxLength = Math.max(
          key.length,
          ...sheet.data.map((row) => String(row[key] || '').length)
        );
        return { wch: Math.min(maxLength + 2, 50) };
      });
      worksheet['!cols'] = columnWidths;
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  });

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * `K-2.4.22a`/`INV-N-004`: the raw `ragStatus` enum used to be written
 * straight into the cell. A screen's stale/withdrawn colour self-heals on
 * the next refresh; an exported file does not — it is handed around and
 * outlives the session, making this the longest-lived surface for the same
 * confidence-claim falsification `INV-N-004` records.
 *
 * ⚠️ `PlanPerformanceRow` (the finance-reporting DTO this sheet is built
 * from) does not carry `coverageRatio` — measured 2026-08-14, 0 occurrences
 * in `finance-reporting.service.ts`/`finance-reporting.endpoints.ts`. Only
 * `plans`/`plan_fus`/`plan_skus` do (T-218), and this sheet is not built
 * from any of those. So the label below can say coverage is not full, but
 * — honestly — not the ratio itself; inventing a number here would be
 * exactly the kind of fabrication `§2.5` forbids, just relocated to a
 * label instead of a computation. Carrying the ratio into this DTO is a
 * backend change, flagged as a follow-up rather than worked around.
 */
export function formatRagStatusForExport(
  ragStatus: 'RED' | 'AMBER' | 'GREEN' | string | null | undefined,
  /**
   * `T-342` / `Z68 §2` — TANIMLI-YOKLUK. Bu argüman olmadan dışa aktarım
   * *"değerlendirme dışı"*yı *"kapsama tam değil"* diye raporlardı: veri
   * tamken veriyi suçlamak.
   */
  ragExclusionReason?: string | null
): string {
  if (ragStatus === 'RED') return 'KRİTİK';
  if (ragStatus === 'AMBER') return 'RİSKLİ';
  if (ragStatus === 'GREEN') return 'İYİ';
  if (ragExclusionReason === 'LTA_ONLY') return 'Değerlendirme dışı — LTA';
  return 'GRİ — kapsama tam değil (oran bu raporda taşınmıyor)';
}

/**
 * Export finance dashboard report
 */
export function exportFinanceReport(
  reports: {
    budgetUtilization?: any;
    spendTrend?: any;
    spendComposition?: any;
    planPerformance?: any;
    budgetAtRisk?: any;
    mechanicEffectiveness?: any;
    varianceAnalysis?: any;
    cashFlowProjection?: any;
  },
  filters: { startDate?: string; endDate?: string; [key: string]: any }
): void {
  const sheets: Array<{ name: string; data: Record<string, any>[] }> = [];

  // Budget Utilization
  if (reports.budgetUtilization) {
    sheets.push({
      name: 'Budget Utilization',
      data: [
        {
          Period: `${reports.budgetUtilization.periodStart} - ${reports.budgetUtilization.periodEnd}`,
          'On-Invoice Allocated': reports.budgetUtilization.onInvoice.allocated,
          'On-Invoice Utilized': reports.budgetUtilization.onInvoice.utilized,
          'On-Invoice Reserved': reports.budgetUtilization.onInvoice.reserved,
          'On-Invoice Available': reports.budgetUtilization.onInvoice.available,
          'On-Invoice Utilization %': `${reports.budgetUtilization.onInvoice.utilizationPercent.toFixed(1)}%`,
          'Off-Invoice Allocated':
            reports.budgetUtilization.offInvoice.allocated,
          'Off-Invoice Utilized': reports.budgetUtilization.offInvoice.utilized,
          'Off-Invoice Reserved': reports.budgetUtilization.offInvoice.reserved,
          'Off-Invoice Available':
            reports.budgetUtilization.offInvoice.available,
          'Off-Invoice Utilization %': `${reports.budgetUtilization.offInvoice.utilizationPercent.toFixed(1)}%`,
        },
      ],
    });
  }

  // Spend Trend
  if (reports.spendTrend) {
    sheets.push({
      name: 'Spend Trend',
      data: reports.spendTrend.dataPoints.map((dp: any) => ({
        Date: dp.date,
        'On-Invoice': dp.onInvoice,
        'Off-Invoice': dp.offInvoice,
        Total: dp.total,
        'LTA On-Invoice': dp.ltaOnInvoice || 0,
        'LTA Off-Invoice': dp.ltaOffInvoice || 0,
        'Promo On-Invoice': dp.promoOnInvoice || 0,
        'Promo Off-Invoice': dp.promoOffInvoice || 0,
      })),
    });
  }

  // Spend Composition
  if (reports.spendComposition) {
    sheets.push({
      name: 'On-Invoice Composition',
      data: reports.spendComposition.onInvoice.map((slice: any) => ({
        Mechanic: slice.mechanicName,
        Amount: slice.amount,
        Percentage: `${slice.percentage.toFixed(1)}%`,
        'Plan Count': slice.planCount,
        'Avg ROI': slice.avgRoi ? `${slice.avgRoi.toFixed(1)}%` : 'N/A',
      })),
    });

    sheets.push({
      name: 'Off-Invoice Composition',
      data: reports.spendComposition.offInvoice.map((slice: any) => ({
        Mechanic: slice.mechanicName,
        Amount: slice.amount,
        Percentage: `${slice.percentage.toFixed(1)}%`,
        'Plan Count': slice.planCount,
        'Avg ROI': slice.avgRoi ? `${slice.avgRoi.toFixed(1)}%` : 'N/A',
      })),
    });
  }

  // Plan Performance
  if (reports.planPerformance) {
    sheets.push({
      name: 'Plan Performance',
      data: reports.planPerformance.rows.map((row: any) => ({
        'Plan Name': row.planName,
        'Plan Code': row.planCode,
        CPL: row.cplName,
        Channel: row.channel,
        Category: row.category,
        'Total Spend': row.totalSpend,
        'On-Invoice Spend': row.onInvoiceSpend,
        'Off-Invoice Spend': row.offInvoiceSpend,
        'On-Invoice %': `${row.onInvoicePercent.toFixed(1)}%`,
        'Off-Invoice %': `${row.offInvoicePercent.toFixed(1)}%`,
        // ⛔ `T-343` review `S3` — BU SATIR ARTIK ULAŞILABİLİR BİR ÇÖKMEYDİ.
        // `gpRoi` `null` olabilir (`T-172`) ve `.toFixed` `null`'da patlar.
        // Önceki turda komşu `redPlans`/`amberPlans` siteleri görülüp
        // *"pre-existing, kapsam dışı"* denmişti — **ama bu site atlandı**,
        // oysa `LTA_ONLY` planlar tam olarak `ragStatus=null ∧ gpRoi=null`
        // üretir ve **bu rapora GİRER** (risk raporunun tersine, burada
        // RAG filtresi yok). ⇒ Bu turun doğurduğu sınıf, satırı YENİ
        // ULAŞILABİLİR kıldı; `row: any` olduğu için tip kapısı görmüyordu.
        // ⛔ `?? 0` YAZILMADI: `null` = "hesaplanamadı", `%0` bir İŞ YARGISI.
        'GP ROI %':
          row.gpRoi === null || row.gpRoi === undefined
            ? '—'
            : `${Number(row.gpRoi).toFixed(1)}%`,
        'RAG Status': formatRagStatusForExport(
          row.ragStatus,
          row.ragExclusionReason
        ),
        Status: row.status,
        'Start Date': row.startDate,
        'End Date': row.endDate,
      })),
    });
  }

  // Budget at Risk
  if (reports.budgetAtRisk) {
    sheets.push({
      name: 'Budget at Risk',
      data: [
        {
          'RED Plans Spend': reports.budgetAtRisk.redPlansSpend,
          'AMBER Plans Spend': reports.budgetAtRisk.amberPlansSpend,
          // `Z71 §1a`: kadran inişinin sessizleştireceği iki dilim.
          'Below Target ROI Spend':
            reports.budgetAtRisk.belowTargetRoiPlansSpend,
          'Total at Risk': reports.budgetAtRisk.totalAtRisk,
          'Risk Percentage': `${reports.budgetAtRisk.riskPercentage.toFixed(1)}%`,
        },
        ...reports.budgetAtRisk.redPlans.map((plan: any) => ({
          Type: 'RED',
          'Plan Name': plan.planName,
          'Total Spend': plan.totalSpend,
          'GP ROI': `${plan.gpRoi.toFixed(1)}%`,
          'Risk Level': plan.riskLevel,
        })),
        ...reports.budgetAtRisk.amberPlans.map((plan: any) => ({
          Type: 'AMBER',
          'Plan Name': plan.planName,
          'Total Spend': plan.totalSpend,
          'GP ROI': `${plan.gpRoi.toFixed(1)}%`,
          'Risk Level': plan.riskLevel,
        })),
        // ⚠️ Komşu `redPlans`/`amberPlans` eşlemeleri `(plan: any)` taşıyor
        // (pre-existing). Yeni kod o sayıyı ARTIRMAZ: burada `RiskPlan`
        // tipi kullanılıyor — `ADR 0007` refleksinin lint tarafındaki hâli,
        // "yeni kod tam doğar".
        ...(reports.budgetAtRisk.belowTargetRoiPlans ?? []).map(
          (plan: RiskPlan) => ({
            Type: 'BELOW_TARGET',
            'Plan Name': plan.planName,
            'Total Spend': plan.totalSpend,
            // ⛔ `?? 0` YAZILMADI (§2.5): `null` = "hesaplanamadı", `%0` ise
            // bir İŞ YARGISI. `T-172`nin aynı hatası, dışa aktarım tarafında.
            // ⚠️ Komşu `redPlans`/`amberPlans` eşlemeleri `plan.gpRoi.toFixed`
            // çağırıyor ve `null`'da PATLAR — pre-existing, bu turun kapsamı
            // dışı, Team Lead'e bildirildi.
            'GP ROI':
              plan.gpRoi === null || plan.gpRoi === undefined
                ? '—'
                : `${plan.gpRoi.toFixed(1)}%`,
            'Risk Level': plan.riskLevel,
          })
        ),
      ],
    });
  }

  // Mechanic Effectiveness
  if (reports.mechanicEffectiveness) {
    sheets.push({
      name: 'Mechanic Effectiveness',
      data: reports.mechanicEffectiveness.mechanics.map((m: any) => ({
        Mechanic: m.mechanicName,
        'Total Spend': m.totalSpend,
        'Plan Count': m.planCount,
        'Avg GP ROI %': `${m.avgGpRoi.toFixed(1)}%`,
        'Avg TO ROI %': `${m.avgToRoi.toFixed(1)}%`,
        'Total Incremental GP': m.totalIncrementalGp,
        'Efficiency Score': m.efficiencyScore.toFixed(2),
      })),
    });
  }

  // Variance Analysis
  if (reports.varianceAnalysis) {
    sheets.push({
      name: 'Variance Analysis',
      data: reports.varianceAnalysis.variances.map((v: any) => ({
        Category: v.category,
        Planned: v.planned,
        Actual: v.actual,
        Variance: v.variance,
        'Variance %': `${v.variancePercent.toFixed(1)}%`,
        Explanation: v.explanation || '',
      })),
    });
  }

  // Cash Flow Projection
  if (reports.cashFlowProjection) {
    sheets.push({
      name: 'Cash Flow Projection',
      data: reports.cashFlowProjection.projections.map((p: any) => ({
        Month: p.month,
        'On-Invoice Outflow': p.onInvoiceOutflow,
        'Off-Invoice Outflow': p.offInvoiceOutflow,
        'Total Outflow': p.totalOutflow,
      })),
    });
  }

  const filename = `finance-report-${filters.startDate || 'all'}-${filters.endDate || 'all'}-${format(new Date(), 'yyyyMMdd-HHmmss')}`;
  exportMultipleSheets(sheets, filename);
}
