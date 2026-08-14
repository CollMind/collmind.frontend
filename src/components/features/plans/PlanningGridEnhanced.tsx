import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Plan,
  PlanFu,
  PlanSku,
  PlanMechanicValue,
} from '@/api/endpoints/plans.endpoints';
import { mechanicEndpoints } from '@/api/endpoints/master-data.endpoints';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Maximize2,
  RefreshCw,
  Trash2,
  Settings2,
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useVersionConflict } from '@/hooks/useVersionConflict';
import { VersionConflictDialog } from '@/components/common/VersionConflictDialog';
import { AddFuDialog } from './AddFuDialog';
import { planEndpoints } from '@/api/endpoints/plans.endpoints';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BASE_COLUMNS,
  filterColumns,
  groupColumns,
  ColumnGroup,
  COLUMN_GROUPS,
  ColumnDefinition,
} from './column-definitions';
import {
  EditableCell,
  CalculatedCell,
  InheritedCell,
  RAGCell,
} from './grid-cells';
import { toNumber, toNumberOrNull, toNumberOrZero } from '@/utils/numberUtils';
import {
  startCellEditMeasurement,
  recordCellEditMeasurement,
  extractRecalcHeaders,
  afterPaint,
} from '@/utils/performanceMonitor';

interface PlanningGridProps {
  plan: Plan;
  canEdit: boolean;
}

/**
 * Get cell value for SKU based on column code
 */
function getSkuCellValue(
  planSku: PlanSku,
  colCode: string,
  planFu?: PlanFu
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
      const base = planSku.baseVolume ?? 0;
      if (!base) return null;
      return (((planSku.plannedVolume ?? 0) - base) / base) * 100;
    }

    // GSV
    case 'BASE_GSV': {
      const baseVol = planSku.baseVolume ?? 0;
      const listPrice = sku?.unitPrice ?? 0;
      return baseVol * listPrice;
    }
    case 'PLAN_GSV': {
      const planVol = planSku.plannedVolume ?? 0;
      const listPrice = sku?.unitPrice ?? 0;
      return planVol * listPrice;
    }
    case 'INCR_GSV': {
      const baseGsv = (planSku.baseVolume ?? 0) * (sku?.unitPrice ?? 0);
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
    case 'BASE_NIV': {
      const baseGsv = (planSku.baseVolume ?? 0) * (sku?.unitPrice ?? 0);
      return baseGsv - (planSku.baseLtaOnInvoiceSpend ?? 0);
    }
    case 'PLAN_NIV': {
      const planGsv = (planSku.plannedVolume ?? 0) * (sku?.unitPrice ?? 0);
      const totalOnInv =
        (planSku.plannedLtaOnInvoiceSpend ?? 0) +
        (planSku.promoOnInvoiceSpend ?? 0);
      return planGsv - totalOnInv;
    }
    case 'INCR_NIV': {
      const baseNiv =
        (planSku.baseVolume ?? 0) * (sku?.unitPrice ?? 0) -
        (planSku.baseLtaOnInvoiceSpend ?? 0);
      const planGsv = (planSku.plannedVolume ?? 0) * (sku?.unitPrice ?? 0);
      const totalOnInv =
        (planSku.plannedLtaOnInvoiceSpend ?? 0) +
        (planSku.promoOnInvoiceSpend ?? 0);
      const planNiv = planGsv - totalOnInv;
      return planNiv - baseNiv;
    }
    case 'BASE_TO': {
      const baseGsv = (planSku.baseVolume ?? 0) * (sku?.unitPrice ?? 0);
      const baseNiv = baseGsv - (planSku.baseLtaOnInvoiceSpend ?? 0);
      return baseNiv - (planSku.baseLtaOffInvoiceSpend ?? 0);
    }
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
      const baseGsv = (planSku.baseVolume ?? 0) * (sku?.unitPrice ?? 0);
      const baseNiv = baseGsv - (planSku.baseLtaOnInvoiceSpend ?? 0);
      const baseTo = baseNiv - (planSku.baseLtaOffInvoiceSpend ?? 0);
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
      const baseGsv = (planSku.baseVolume ?? 0) * (sku?.unitPrice ?? 0);
      const baseNiv = baseGsv - (planSku.baseLtaOnInvoiceSpend ?? 0);
      const baseTo = baseNiv - (planSku.baseLtaOffInvoiceSpend ?? 0);
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
      return (planSku.baseVolume ?? 0) * (sku?.cogs ?? 0);
    case 'PLAN_COGS':
      return (planSku.plannedVolume ?? 0) * (sku?.cogs ?? 0);
    case 'BASE_GP': {
      const baseGsv = (planSku.baseVolume ?? 0) * (sku?.unitPrice ?? 0);
      const baseNiv = baseGsv - (planSku.baseLtaOnInvoiceSpend ?? 0);
      const baseTo = baseNiv - (planSku.baseLtaOffInvoiceSpend ?? 0);
      const baseCogs = (planSku.baseVolume ?? 0) * (sku?.cogs ?? 0);
      return baseTo - baseCogs;
    }
    case 'PLAN_GP':
      return planSku.plannedGp ?? null;
    case 'INCR_GP': {
      const baseGsv = (planSku.baseVolume ?? 0) * (sku?.unitPrice ?? 0);
      const baseNiv = baseGsv - (planSku.baseLtaOnInvoiceSpend ?? 0);
      const baseTo = baseNiv - (planSku.baseLtaOffInvoiceSpend ?? 0);
      const baseCogs = (planSku.baseVolume ?? 0) * (sku?.cogs ?? 0);
      const baseGp = baseTo - baseCogs;
      const planGp = planSku.plannedGp ?? 0;
      return planGp - baseGp;
    }

    // Margin
    case 'BASE_GM_PCT': {
      const baseGsv = (planSku.baseVolume ?? 0) * (sku?.unitPrice ?? 0);
      const baseNiv = baseGsv - (planSku.baseLtaOnInvoiceSpend ?? 0);
      const baseTo = baseNiv - (planSku.baseLtaOffInvoiceSpend ?? 0);
      if (!baseTo) return null;
      const baseCogs = (planSku.baseVolume ?? 0) * (sku?.cogs ?? 0);
      const baseGp = baseTo - baseCogs;
      return (baseGp / baseTo) * 100;
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
      const baseGsv = (planSku.baseVolume ?? 0) * (sku?.unitPrice ?? 0);
      const baseNiv = baseGsv - (planSku.baseLtaOnInvoiceSpend ?? 0);
      const baseTo = baseNiv - (planSku.baseLtaOffInvoiceSpend ?? 0);
      const incrTo = planTo - baseTo;
      if (!incrTo) return null;
      const baseCogs = (planSku.baseVolume ?? 0) * (sku?.cogs ?? 0);
      const baseGp = baseTo - baseCogs;
      const planGp = planSku.plannedGp ?? 0;
      const incrGp = planGp - baseGp;
      return (incrGp / incrTo) * 100;
    }

    // ROI
    case 'GP_ROI_PCT':
      return toNumber(planSku.gpRoi ?? null);
    case 'TO_ROI_PCT': {
      const incrSpend = (() => {
        const baseTotal =
          (planSku.baseLtaOnInvoiceSpend ?? 0) +
          (planSku.baseLtaOffInvoiceSpend ?? 0);
        const plannedTotal =
          (planSku.plannedLtaOnInvoiceSpend ?? 0) +
          (planSku.plannedLtaOffInvoiceSpend ?? 0) +
          (planSku.promoOnInvoiceSpend ?? 0) +
          (planSku.promoOffInvoiceSpend ?? 0);
        return plannedTotal - baseTotal;
      })();
      if (!incrSpend || incrSpend <= 0) return null;
      const baseGsv = (planSku.baseVolume ?? 0) * (sku?.unitPrice ?? 0);
      const baseNiv = baseGsv - (planSku.baseLtaOnInvoiceSpend ?? 0);
      const baseTo = baseNiv - (planSku.baseLtaOffInvoiceSpend ?? 0);
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
function getFuCellValue(planFu: PlanFu, colCode: string): number | null {
  const skus = planFu.planSkus || [];

  switch (colCode) {
    // Master Data - N/A at FU level
    case 'BPTT':
    case 'COGS':
      return null;

    // Volume Metrics - Aggregated
    case 'BASE_VOL':
      return skus.reduce((sum, sku) => sum + (sku.baseVolume ?? 0), 0);
    case 'PLAN_VOL':
      return toNumberOrNull(planFu.totalPlannedVolume);
    case 'INCR_VOL': {
      const baseVol = skus.reduce((sum, sku) => sum + (sku.baseVolume ?? 0), 0);
      const plannedVol = toNumberOrZero(planFu.totalPlannedVolume);
      return plannedVol - baseVol;
    }
    case 'VOL_UPLIFT_PCT': {
      const baseVol = skus.reduce((sum, sku) => sum + (sku.baseVolume ?? 0), 0);
      if (!baseVol) return null;
      const plannedVol = toNumberOrZero(planFu.totalPlannedVolume);
      return ((plannedVol - baseVol) / baseVol) * 100;
    }

    // GSV - Aggregated
    case 'BASE_GSV':
      return skus.reduce((sum, sku) => {
        const baseVol = sku.baseVolume ?? 0;
        const listPrice = sku.sku?.unitPrice ?? 0;
        return sum + baseVol * listPrice;
      }, 0);
    case 'PLAN_GSV':
      return skus.reduce((sum, sku) => {
        const planVol = sku.plannedVolume ?? 0;
        const listPrice = sku.sku?.unitPrice ?? 0;
        return sum + planVol * listPrice;
      }, 0);
    case 'INCR_GSV': {
      const baseGsv = skus.reduce((sum, sku) => {
        const baseVol = sku.baseVolume ?? 0;
        const listPrice = sku.sku?.unitPrice ?? 0;
        return sum + baseVol * listPrice;
      }, 0);
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
      return skus.reduce((sum, sku) => {
        const baseGsv = (sku.baseVolume ?? 0) * (sku.sku?.unitPrice ?? 0);
        return sum + baseGsv - (sku.baseLtaOnInvoiceSpend ?? 0);
      }, 0);
    case 'PLAN_NIV':
      return skus.reduce((sum, sku) => {
        const planGsv = (sku.plannedVolume ?? 0) * (sku.sku?.unitPrice ?? 0);
        const totalOnInv =
          (sku.plannedLtaOnInvoiceSpend ?? 0) + (sku.promoOnInvoiceSpend ?? 0);
        return sum + planGsv - totalOnInv;
      }, 0);
    case 'INCR_NIV': {
      const baseNiv = skus.reduce((sum, sku) => {
        const baseGsv = (sku.baseVolume ?? 0) * (sku.sku?.unitPrice ?? 0);
        return sum + baseGsv - (sku.baseLtaOnInvoiceSpend ?? 0);
      }, 0);
      const planNiv = skus.reduce((sum, sku) => {
        const planGsv = (sku.plannedVolume ?? 0) * (sku.sku?.unitPrice ?? 0);
        const totalOnInv =
          (sku.plannedLtaOnInvoiceSpend ?? 0) + (sku.promoOnInvoiceSpend ?? 0);
        return sum + planGsv - totalOnInv;
      }, 0);
      return planNiv - baseNiv;
    }
    case 'BASE_TO':
      return skus.reduce((sum, sku) => {
        const baseGsv = (sku.baseVolume ?? 0) * (sku.sku?.unitPrice ?? 0);
        const baseNiv = baseGsv - (sku.baseLtaOnInvoiceSpend ?? 0);
        return sum + baseNiv - (sku.baseLtaOffInvoiceSpend ?? 0);
      }, 0);
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
      const baseTo = skus.reduce((sum, sku) => {
        const baseGsv = (sku.baseVolume ?? 0) * (sku.sku?.unitPrice ?? 0);
        const baseNiv = baseGsv - (sku.baseLtaOnInvoiceSpend ?? 0);
        return sum + baseNiv - (sku.baseLtaOffInvoiceSpend ?? 0);
      }, 0);
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
      const baseTo = skus.reduce((sum, sku) => {
        const baseGsv = (sku.baseVolume ?? 0) * (sku.sku?.unitPrice ?? 0);
        const baseNiv = baseGsv - (sku.baseLtaOnInvoiceSpend ?? 0);
        return sum + baseNiv - (sku.baseLtaOffInvoiceSpend ?? 0);
      }, 0);
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
      return skus.reduce(
        (sum, sku) => sum + (sku.baseVolume ?? 0) * (sku.sku?.cogs ?? 0),
        0
      );
    case 'PLAN_COGS':
      return skus.reduce(
        (sum, sku) => sum + (sku.plannedVolume ?? 0) * (sku.sku?.cogs ?? 0),
        0
      );
    case 'BASE_GP':
      return skus.reduce((sum, sku) => {
        const baseGsv = (sku.baseVolume ?? 0) * (sku.sku?.unitPrice ?? 0);
        const baseNiv = baseGsv - (sku.baseLtaOnInvoiceSpend ?? 0);
        const baseTo = baseNiv - (sku.baseLtaOffInvoiceSpend ?? 0);
        const baseCogs = (sku.baseVolume ?? 0) * (sku.sku?.cogs ?? 0);
        return sum + (baseTo - baseCogs);
      }, 0);
    case 'PLAN_GP':
      return planFu.totalGp ?? null;
    case 'INCR_GP': {
      const baseGp = skus.reduce((sum, sku) => {
        const baseGsv = (sku.baseVolume ?? 0) * (sku.sku?.unitPrice ?? 0);
        const baseNiv = baseGsv - (sku.baseLtaOnInvoiceSpend ?? 0);
        const baseTo = baseNiv - (sku.baseLtaOffInvoiceSpend ?? 0);
        const baseCogs = (sku.baseVolume ?? 0) * (sku.sku?.cogs ?? 0);
        return sum + (baseTo - baseCogs);
      }, 0);
      const planGp = planFu.totalGp ?? 0;
      return planGp - baseGp;
    }

    // Margin - Weighted Average
    case 'BASE_GM_PCT': {
      const baseTo = skus.reduce((sum, sku) => {
        const baseGsv = (sku.baseVolume ?? 0) * (sku.sku?.unitPrice ?? 0);
        const baseNiv = baseGsv - (sku.baseLtaOnInvoiceSpend ?? 0);
        return sum + baseNiv - (sku.baseLtaOffInvoiceSpend ?? 0);
      }, 0);
      if (!baseTo) return null;
      const baseGp = skus.reduce((sum, sku) => {
        const baseGsv = (sku.baseVolume ?? 0) * (sku.sku?.unitPrice ?? 0);
        const baseNiv = baseGsv - (sku.baseLtaOnInvoiceSpend ?? 0);
        const baseToSku = baseNiv - (sku.baseLtaOffInvoiceSpend ?? 0);
        const baseCogs = (sku.baseVolume ?? 0) * (sku.sku?.cogs ?? 0);
        return sum + (baseToSku - baseCogs);
      }, 0);
      return (baseGp / baseTo) * 100;
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
      const baseTo = skus.reduce((sum, sku) => {
        const baseGsv = (sku.baseVolume ?? 0) * (sku.sku?.unitPrice ?? 0);
        const baseNiv = baseGsv - (sku.baseLtaOnInvoiceSpend ?? 0);
        return sum + baseNiv - (sku.baseLtaOffInvoiceSpend ?? 0);
      }, 0);
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
      if (!incrTo) return null;
      const baseGp = skus.reduce((sum, sku) => {
        const baseGsv = (sku.baseVolume ?? 0) * (sku.sku?.unitPrice ?? 0);
        const baseNiv = baseGsv - (sku.baseLtaOnInvoiceSpend ?? 0);
        const baseToSku = baseNiv - (sku.baseLtaOffInvoiceSpend ?? 0);
        const baseCogs = (sku.baseVolume ?? 0) * (sku.sku?.cogs ?? 0);
        return sum + (baseToSku - baseCogs);
      }, 0);
      const planGp = planFu.totalGp ?? 0;
      const incrGp = planGp - baseGp;
      return (incrGp / incrTo) * 100;
    }

    // ROI
    case 'GP_ROI_PCT':
      return planFu.gpRoi ? Number(planFu.gpRoi) : null;
    case 'TO_ROI_PCT': {
      const baseTotal = skus.reduce((sum, sku) => {
        return (
          sum +
          (sku.baseLtaOnInvoiceSpend ?? 0) +
          (sku.baseLtaOffInvoiceSpend ?? 0)
        );
      }, 0);
      const plannedTotal = toNumberOrZero(planFu.totalSpend);
      const incrSpend = plannedTotal - baseTotal;
      if (!incrSpend || incrSpend <= 0) return null;
      const baseTo = skus.reduce((sum, sku) => {
        const baseGsv = (sku.baseVolume ?? 0) * (sku.sku?.unitPrice ?? 0);
        const baseNiv = baseGsv - (sku.baseLtaOnInvoiceSpend ?? 0);
        return sum + baseNiv - (sku.baseLtaOffInvoiceSpend ?? 0);
      }, 0);
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

/**
 * T-109 step 2b review S1: which cell is open, as a shape that CANNOT describe
 * two cells at once.
 *
 * It used to be `{ fuId?: string; skuId?: string; field: string }`. Every call
 * site left one of the two `undefined`, but nothing enforced that, and the FU
 * predicate never asked about `skuId` (nor the SKU one about `fuId`). Measured
 * with both fields set: TWO editors open, and the second one's focus blurred the
 * first into a REAL mutation of an unchanged value — a version bump, an audit
 * row and a 409 for anyone else holding that plan. That is exactly the defect
 * T-112 closed, re-entering through the coordinator's type.
 *
 * A convention that four call sites happen to follow is not an invariant. This
 * one is checked by the compiler.
 */
export type EditingCell =
  | { level: 'FU'; fuId: string; field: string }
  | { level: 'SKU'; skuId: string; field: string };

function sameCell(a: EditingCell | null, b: EditingCell): boolean {
  if (!a || a.level !== b.level || a.field !== b.field) return false;
  return a.level === 'FU'
    ? a.fuId === (b as { fuId: string }).fuId
    : a.skuId === (b as { skuId: string }).skuId;
}

export function PlanningGridEnhanced({ plan, canEdit }: PlanningGridProps) {
  const [expandedFus, setExpandedFus] = useState<Set<string>>(new Set());
  const [isAddFuDialogOpen, setIsAddFuDialogOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [columnPreferences, setColumnPreferences] = useState<
    Record<string, boolean>
  >({});
  const toast = useToast();
  const queryClient = useQueryClient();
  // T-034f: shared 409 STALE_VERSION/MISSING_VERSION UX for every
  // version-guarded mutation below. `reload` refetches ['plan', plan.id] —
  // it never resubmits the user's edit (see useVersionConflict.ts).
  const versionConflict = useVersionConflict([['plan', plan.id]]);

  // T-046d (ADR 0003 metriği, docs/analysis/0007 §4-T3): tek anda yalnızca
  // bir hücre düzenlenebilir (`editingCell` state'i zaten bunu garanti
  // ediyor — bkz. handleCellEdit), o yüzden tek bir "bekleyen ölçüm" yeterli.
  // Ölçüm, `handleCellSave`'de mutate() çağrılmadan HEMEN ÖNCE başlar
  // (kullanıcının değeri commit ettiği an) ve ilgili mutation'ın onSuccess'i
  // içinde, invalidateQueries + afterPaint() (çift-rAF) tamamlandıktan SONRA
  // biter — yani "ekranda göründü" anına kadar, "fetch tamamlandı" anına
  // değil (bkz. performanceMonitor.ts dosya başı notu).
  const pendingMeasurementRef = useRef<{
    label: string;
    startTimestamp: number;
  } | null>(null);

  // Fetch applicable mechanics for this plan context
  const { data: applicableMechanics = [] } = useQuery({
    queryKey: ['mechanics', 'applicable', plan.channelId, plan.categoryId],
    queryFn: async () => {
      try {
        const res = await mechanicEndpoints.getAll(true);
        // Filter by plan context (channel, category)
        return res.data.filter((m: any) => {
          // TODO: Implement applicability rules check
          return m.isActive;
        });
      } catch {
        return [];
      }
    },
    staleTime: 60000,
  });

  // Filter and build columns based on plan context
  const visibleColumns = useMemo(() => {
    const filtered = filterColumns(
      BASE_COLUMNS,
      plan.channel?.code,
      plan.category?.code,
      columnPreferences
    );

    // Add dynamic mechanic columns
    const mechanicColumns: ColumnDefinition[] = [];
    applicableMechanics.forEach((mechanic: any) => {
      // Skip if already in BASE_COLUMNS
      if (BASE_COLUMNS.find((c) => c.code === mechanic.code)) return;

      // Create column definition based on mechanic
      if (
        mechanic.spendingType === 'on_invoice' ||
        mechanic.category === 'on_invoice_discount'
      ) {
        mechanicColumns.push({
          code: `${mechanic.code}_PCT`,
          name: `${mechanic.name} %`,
          group: ColumnGroup.ON_INVOICE_PROMO,
          format: 'percentage',
          decimals: 2,
          width: 140,
          editable: true,
          editableAt: 'FU',
          backgroundColor: '#DBEAFE',
          conditional: {
            channel: mechanic.applicableChannels || ['ALL'],
          },
        });
        mechanicColumns.push({
          code: `${mechanic.code}_SPEND`,
          name: `${mechanic.name} Spend ($)`,
          group: ColumnGroup.ON_INVOICE_PROMO,
          format: 'currency',
          decimals: 0,
          width: 160,
          calculated: true,
          backgroundColor: '#DBEAFE',
          conditional: {
            channel: mechanic.applicableChannels || ['ALL'],
          },
        });
      } else if (
        mechanic.spendingType === 'off_invoice' ||
        mechanic.category === 'off_invoice_discount'
      ) {
        mechanicColumns.push({
          code: `${mechanic.code}_PCT`,
          name: `${mechanic.name} %`,
          group: ColumnGroup.OFF_INVOICE_PROMO,
          format: 'percentage',
          decimals: 2,
          width: 140,
          editable: true,
          editableAt: 'FU',
          backgroundColor: '#FFEDD5',
          conditional: {
            channel: mechanic.applicableChannels || ['ALL'],
          },
        });
        mechanicColumns.push({
          code: `${mechanic.code}_SPEND`,
          name: `${mechanic.name} Spend ($)`,
          group: ColumnGroup.OFF_INVOICE_PROMO,
          format: 'currency',
          decimals: 0,
          width: 160,
          calculated: true,
          backgroundColor: '#FFEDD5',
          conditional: {
            channel: mechanic.applicableChannels || ['ALL'],
          },
        });
      } else if (mechanic.category === 'per_unit_support') {
        mechanicColumns.push({
          code: mechanic.code,
          name: `${mechanic.name} per Unit ($)`,
          group: ColumnGroup.OFF_INVOICE_PROMO,
          format: 'currency',
          decimals: 2,
          width: 160,
          editable: true,
          editableAt: 'FU',
          backgroundColor: '#FFEDD5',
        });
        mechanicColumns.push({
          code: `${mechanic.code}_SPEND`,
          name: `${mechanic.name} Spend ($)`,
          group: ColumnGroup.OFF_INVOICE_PROMO,
          format: 'currency',
          decimals: 0,
          width: 160,
          calculated: true,
          backgroundColor: '#FFEDD5',
        });
      } else if (mechanic.category === 'lumpsum_spend') {
        mechanicColumns.push({
          code: mechanic.code,
          name: `${mechanic.name} ($)`,
          group: ColumnGroup.LUMPSUM,
          format: 'currency',
          decimals: 0,
          width: 180,
          editable: true,
          editableAt: 'FU',
          backgroundColor: '#FCE7F3',
          conditional: {
            channel: mechanic.applicableChannels || ['ALL'],
          },
        });
      }
    });

    return [...filtered, ...mechanicColumns];
  }, [
    plan.channel?.code,
    plan.category?.code,
    applicableMechanics,
    columnPreferences,
  ]);

  // Group columns for header rendering
  const groupedColumns = useMemo(
    () => groupColumns(visibleColumns),
    [visibleColumns]
  );

  // T-049: single source of truth for the columns rendered as data cells
  // (header row + FU row + SKU row). ITEM_NAME/ITEM_CODE are rendered
  // separately as sticky-left TableCells in every row, so they must be
  // excluded here exactly once — deriving this in more than one place is
  // what caused the header/body column misalignment (T-049).
  const gridColumns = useMemo(
    () =>
      visibleColumns.filter(
        (c) => c.code !== 'ITEM_NAME' && c.code !== 'ITEM_CODE'
      ),
    [visibleColumns]
  );

  const addFuMutation = useMutation({
    mutationFn: async (fuIds: string[]) => {
      // T-034f: addFu bumps plans.version by exactly +1 per call (backend
      // CAS: `version = version + 1`, see docs/analysis/0005 §2). Tracking
      // it locally lets a multi-FU batch stay in a single mutation without
      // an extra GET between each call — the response is a PlanFu, not the
      // Plan, so the server never hands the bumped plans.version back here.
      let planVersion = plan.version;
      for (const fuId of fuIds) {
        await planEndpoints.addFu(plan.id, { fuId, planVersion });
        planVersion += 1;
      }
    },
    onSuccess: () => {
      toast.success("FU'lar başarıyla eklendi");
      queryClient.invalidateQueries({ queryKey: ['plan', plan.id] });
    },
    onError: (error: any) => {
      if (versionConflict.handleError(error)) return;
      toast.error(
        error?.response?.data?.message || 'FU eklenirken hata oluştu'
      );
    },
  });

  const updateVolumeMutation = useMutation({
    mutationFn: async ({
      planId,
      fuId,
      skuId,
      field,
      value,
      version,
    }: {
      planId: string;
      fuId: string;
      skuId: string;
      field: string;
      value: number;
      version: number;
    }) => {
      const data: any = { version };
      if (field === 'BASE_VOL') data.baseVolume = value;
      if (field === 'PLAN_VOL') data.plannedVolume = value;
      // Ölçüm için yanıtın (ve dolayısıyla T-046b'nin X-Recalc-Ms/
      // X-Recalc-Sku-Count başlıklarının) tamamı gerekiyor — sadece body
      // değil.
      return planEndpoints.updateSkuVolume(planId, fuId, skuId, data);
    },
    onSuccess: async (response) => {
      const { backendMs, skuCount } = extractRecalcHeaders(response.headers);
      await queryClient.invalidateQueries({ queryKey: ['plan', plan.id] });
      const pending = pendingMeasurementRef.current;
      if (pending) {
        await afterPaint();
        recordCellEditMeasurement({
          label: pending.label,
          startTimestamp: pending.startTimestamp,
          backendMs,
          skuCount,
        });
        pendingMeasurementRef.current = null;
      }
    },
    onError: (error: any) => {
      pendingMeasurementRef.current = null;
      if (versionConflict.handleError(error)) return;
      toast.error(
        error?.response?.data?.message || 'Değer güncellenirken hata oluştu'
      );
    },
  });

  const updateTacticMutation = useMutation({
    mutationFn: async ({
      planId,
      fuId,
      mechanicCode,
      value,
      version,
    }: {
      planId: string;
      fuId: string;
      mechanicCode: string;
      value: number;
      version: number;
    }) => {
      return planEndpoints.updateFuTactic(planId, fuId, {
        tactics: { [mechanicCode]: value },
        version,
      });
    },
    onSuccess: async (response) => {
      const { backendMs, skuCount } = extractRecalcHeaders(response.headers);
      await queryClient.invalidateQueries({ queryKey: ['plan', plan.id] });
      toast.success('Tactic güncellendi');
      const pending = pendingMeasurementRef.current;
      if (pending) {
        await afterPaint();
        recordCellEditMeasurement({
          label: pending.label,
          startTimestamp: pending.startTimestamp,
          backendMs,
          skuCount,
        });
        pendingMeasurementRef.current = null;
      }
    },
    onError: (error: any) => {
      pendingMeasurementRef.current = null;
      if (versionConflict.handleError(error)) return;
      toast.error(
        error?.response?.data?.message || 'Tactic güncellenirken hata oluştu'
      );
    },
  });

  const removeFuMutation = useMutation({
    mutationFn: async (fuId: string) => {
      await planEndpoints.removeFu(plan.id, fuId, {
        planVersion: plan.version,
      });
    },
    onSuccess: () => {
      toast.success('FU başarıyla kaldırıldı');
      queryClient.invalidateQueries({ queryKey: ['plan', plan.id] });
    },
    onError: (error: any) => {
      if (versionConflict.handleError(error)) return;
      toast.error(
        error?.response?.data?.message || 'FU kaldırılırken hata oluştu'
      );
    },
  });

  const recalcMutation = useMutation({
    mutationFn: () => planEndpoints.recalculate(plan.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan', plan.id] });
      toast.success('Yeniden hesaplandı');
    },
  });

  const handleRemoveFu = useCallback(
    (fuId: string, fuName: string) => {
      if (
        confirm(
          `"${fuName}" FU'sunu plandan kaldırmak istediğinize emin misiniz?`
        )
      ) {
        removeFuMutation.mutate(fuId);
      }
    },
    [removeFuMutation]
  );

  const handleAddFu = async (fuIds: string[]) => {
    await addFuMutation.mutateAsync(fuIds);
  };

  const toggleFu = (fuId: string) => {
    setExpandedFus((prev) => {
      const next = new Set(prev);
      next.has(fuId) ? next.delete(fuId) : next.add(fuId);
      return next;
    });
  };

  const expandAll = () =>
    setExpandedFus(new Set(plan.planFus?.map((fu) => fu.id) || []));
  const collapseAll = () => setExpandedFus(new Set());

  // T-109 step 2b: this used to also arm a 50ms `setTimeout` that focused a
  // ref shared by the two (now deleted) inline `<input>` editors. Focus is
  // no longer this component's job — `EditableCell`'s own open-transition
  // effect (`grid-cells.tsx`) calls `.focus()`/`.select()` the moment its
  // `isOpen` prop flips true, which is exactly the edge this handler
  // produces via `setEditingCell`.
  const handleCellEdit = useCallback(
    (target: EditingCell) => {
      if (!canEdit) return;
      // Identity-stable: re-selecting the cell that is ALREADY open must not
      // produce a new object, or React cannot bail out and the row re-renders
      // for nothing. This matters because the TableCell's own `onClick` and
      // `EditableCell`'s `onOpen` both call this on the same click (T-109
      // step 2 review) — without the guard that would be two `setEditingCell`
      // calls, each producing a fresh object, for one click.
      setEditingCell((prev) => (sameCell(prev, target) ? prev : target));
    },
    [canEdit]
  );

  const onCellCancel = useCallback(() => setEditingCell(null), []);

  const handleCellSave = useCallback(
    (
      planFu: PlanFu,
      planSku: PlanSku | undefined,
      field: string,
      value: number
    ) => {
      if (planSku) {
        // SKU level edit (volume). T-046d: KPI_Details.docx benchmark'ı
        // "SKU volume update" ve "FU tactic update"i ayrı ayrı hedefliyor
        // (0007 §3.4) — etiketler bu ikisini kırılımda ayırt edilebilir tutar.
        pendingMeasurementRef.current = {
          label: 'sku-volume-update',
          startTimestamp: startCellEditMeasurement(),
        };
        updateVolumeMutation.mutate({
          planId: plan.id,
          fuId: planFu.fuId,
          skuId: planSku.skuId,
          field,
          value,
          version: planSku.version,
        });
      } else {
        // FU level edit (tactic)
        pendingMeasurementRef.current = {
          label: 'fu-tactic-update',
          startTimestamp: startCellEditMeasurement(),
        };
        updateTacticMutation.mutate({
          planId: plan.id,
          fuId: planFu.fuId,
          mechanicCode: field,
          value,
          version: planFu.version,
        });
      }
      setEditingCell(null);
    },
    [plan.id, updateVolumeMutation, updateTacticMutation]
  );

  // Calculate sticky column positions (ITEM_NAME and ITEM_CODE are always sticky left)
  const leftStickyColumns = visibleColumns.filter(
    (c) =>
      c.sticky === 'left' || c.code === 'ITEM_NAME' || c.code === 'ITEM_CODE'
  );
  const rightStickyColumns = visibleColumns.filter((c) => c.sticky === 'right');
  const leftStickyWidth = 370; // ITEM_NAME (250px) + ITEM_CODE (120px)
  const rightStickyWidth =
    rightStickyColumns.reduce((sum, c) => sum + c.width, 0) + 130; // + RAG column

  return (
    <Card>
      <CardContent className="p-0">
        {/* Toolbar */}
        <div className="p-3 border-b flex items-center justify-between">
          <div className="flex gap-2">
            {canEdit && (
              <Button
                size="sm"
                variant="default"
                onClick={() => setIsAddFuDialogOpen(true)}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                FU Ekle
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={expandAll}>
              Tümünü Aç
            </Button>
            <Button size="sm" variant="outline" onClick={collapseAll}>
              Tümünü Kapat
            </Button>
            <Button size="sm" variant="outline" onClick={() => {}}>
              <Settings2 className="h-4 w-4 mr-1" />
              Kolon Ayarları
            </Button>
          </div>
          <div className="flex gap-2">
            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => recalcMutation.mutate()}
                disabled={recalcMutation.isPending}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-1 ${recalcMutation.isPending ? 'animate-spin' : ''}`}
                />
                Yeniden Hesapla
              </Button>
            )}
            <Button size="sm" variant="ghost">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Table with grouped headers */}
        <div className="overflow-x-auto">
          <Table>
            {/* Group Headers */}
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead
                  colSpan={2}
                  className="sticky left-0 bg-gray-100 z-20 border-r-2"
                  style={{ width: '370px' }}
                >
                  {COLUMN_GROUPS[ColumnGroup.ITEM_INFO].name}
                </TableHead>
                {Array.from(groupedColumns.entries()).map(([group, cols]) => {
                  if (
                    cols.some(
                      (c) => c.sticky === 'left' || c.sticky === 'right'
                    )
                  )
                    return null;
                  const groupInfo = COLUMN_GROUPS[group];
                  return (
                    <TableHead
                      key={group}
                      colSpan={cols.length}
                      className="text-center"
                      style={{
                        backgroundColor: groupInfo.backgroundColor,
                        borderLeft: '1px solid #e5e7eb',
                        borderRight: '1px solid #e5e7eb',
                      }}
                    >
                      <div className="font-semibold text-xs">
                        {groupInfo.name}
                      </div>
                    </TableHead>
                  );
                })}
                <TableHead
                  colSpan={rightStickyColumns.length + 1}
                  className="sticky right-0 bg-gray-100 z-20 border-l-2"
                  style={{ width: `${rightStickyWidth}px` }}
                >
                  {COLUMN_GROUPS[ColumnGroup.ROI_RAG].name}
                </TableHead>
              </TableRow>

              {/* Column Headers */}
              <TableRow>
                <TableHead
                  className="sticky left-0 bg-white z-10 border-r text-left whitespace-nowrap text-xs font-medium"
                  style={{
                    width: '250px',
                    minWidth: '250px',
                    maxWidth: '250px',
                  }}
                >
                  Item Name
                </TableHead>
                <TableHead
                  className="sticky left-[250px] bg-white z-10 border-r-2 text-left whitespace-nowrap text-xs font-medium"
                  style={{
                    width: '120px',
                    minWidth: '120px',
                    maxWidth: '120px',
                  }}
                >
                  Item Code
                </TableHead>
                {gridColumns.map((col) => (
                  <TableHead
                    key={col.code}
                    className={`text-right whitespace-nowrap text-xs font-medium ${
                      col.sticky === 'left'
                        ? 'sticky left-0 bg-white z-10 border-r'
                        : ''
                    } ${
                      col.sticky === 'right'
                        ? 'sticky right-0 bg-white z-10 border-l'
                        : ''
                    }`}
                    style={{
                      width: `${col.width}px`,
                      backgroundColor: col.backgroundColor || '#FFFFFF',
                      minWidth: `${col.width}px`,
                      maxWidth: `${col.width}px`,
                    }}
                  >
                    {col.name}
                  </TableHead>
                ))}
                <TableHead
                  className="text-center text-xs sticky right-0 bg-white z-10"
                  style={{ width: '130px' }}
                >
                  RAG
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {plan.planFus && plan.planFus.length > 0 ? (
                plan.planFus.map((planFu) => {
                  const isExpanded = expandedFus.has(planFu.id);
                  return (
                    <FuRowEnhanced
                      key={planFu.id}
                      planFu={planFu}
                      plan={plan}
                      isExpanded={isExpanded}
                      columns={gridColumns}
                      canEdit={canEdit}
                      editingCell={editingCell}
                      onToggle={() => toggleFu(planFu.id)}
                      onCellEdit={handleCellEdit}
                      onCellSave={handleCellSave}
                      onCellCancel={onCellCancel}
                      getSkuCellValue={getSkuCellValue}
                      getFuCellValue={getFuCellValue}
                      onRemoveFu={handleRemoveFu}
                      isRemovingFu={removeFuMutation.isPending}
                      leftStickyWidth={leftStickyWidth}
                      rightStickyWidth={rightStickyWidth}
                    />
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={gridColumns.length + 3}
                    className="text-center py-8 text-gray-500"
                  >
                    Henüz FU eklenmemiş.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <AddFuDialog
        plan={plan}
        isOpen={isAddFuDialogOpen}
        onClose={() => setIsAddFuDialogOpen(false)}
        onAdd={handleAddFu}
      />

      <VersionConflictDialog
        conflict={versionConflict.conflict}
        onReload={versionConflict.reload}
        onDismiss={versionConflict.dismiss}
      />
    </Card>
  );
}

// Enhanced FU Row Component
// T-112: exported for test. The row is where Escape and blur are handled, and the
// property that matters — "a cancel does not write" — can only be asserted by
// driving the real handlers with a mock `onCellSave`. Testing the parent would
// need the whole query/router context; testing a copy of the logic would prove
// nothing (CLAUDE.md §2.7 #8).
export function FuRowEnhanced({
  planFu,
  plan,
  isExpanded,
  columns,
  canEdit,
  editingCell,
  onToggle,
  onCellEdit,
  onCellSave,
  onCellCancel,
  getSkuCellValue,
  getFuCellValue,
  onRemoveFu,
  isRemovingFu,
  leftStickyWidth,
  rightStickyWidth,
}: {
  planFu: PlanFu;
  plan: Plan;
  isExpanded: boolean;
  columns: ColumnDefinition[];
  canEdit: boolean;
  editingCell: EditingCell | null;
  onToggle: () => void;
  onCellEdit: (target: EditingCell) => void;
  onCellSave: (
    planFu: PlanFu,
    planSku: PlanSku | undefined,
    field: string,
    value: number
  ) => void;
  // T-109 step 2b: `onCellCommit` (parse-and-commit for the old inline
  // `<input>`s) is gone — `EditableCell` parses its own blur/Enter/Escape
  // via `parseUserNumber` (grid-cells.tsx) and reaches the mutation only
  // through `onSave`/`onCancel` below.
  onCellCancel: () => void;
  getSkuCellValue: (
    planSku: PlanSku,
    colCode: string,
    planFu?: PlanFu
  ) => number | null;
  getFuCellValue: (planFu: PlanFu, colCode: string) => number | null;
  onRemoveFu: (fuId: string, fuName: string) => void;
  isRemovingFu: boolean;
  leftStickyWidth: number;
  rightStickyWidth: number;
}) {
  return (
    <>
      {/* FU Summary Row */}
      <TableRow className="bg-blue-50 hover:bg-blue-100 font-semibold">
        {/* Item Name Column */}
        <TableCell
          className="sticky left-0 bg-blue-50 z-10 border-r"
          style={{ width: '250px', minWidth: '250px', maxWidth: '250px' }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={onToggle}
              className="p-0.5 hover:bg-blue-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            <span className="text-sm font-semibold">
              {planFu.fu?.name || 'N/A'}
            </span>
            {canEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveFu(planFu.fuId, planFu.fu?.name || 'N/A');
                }}
                disabled={isRemovingFu}
                className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors ml-1"
                title="FU'yu plandan kaldır"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </TableCell>
        {/* Item Code Column */}
        <TableCell
          className="sticky left-[250px] bg-blue-50 z-10 border-r-2 text-xs text-gray-600"
          style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}
        >
          {planFu.fu?.code || 'N/A'}
        </TableCell>
        {columns.map((col) => {
          const isEditing =
            editingCell?.level === 'FU' &&
            editingCell.fuId === planFu.id &&
            editingCell.field === col.code;
          const isEditable = col.editable && canEdit && col.editableAt === 'FU';
          const value = getFuCellValue(planFu, col.code);

          return (
            <TableCell
              key={col.code}
              className={`text-right text-sm ${
                col.sticky === 'left'
                  ? 'sticky left-0 bg-blue-50 z-10 border-r'
                  : ''
              } ${
                col.sticky === 'right'
                  ? 'sticky right-0 bg-blue-50 z-10 border-l'
                  : ''
              } ${
                isEditable
                  ? 'cursor-pointer hover:bg-blue-200 transition-colors'
                  : ''
              }`}
              style={{
                backgroundColor: col.backgroundColor || '#EFF6FF',
                width: `${col.width}px`,
                minWidth: `${col.width}px`,
                maxWidth: `${col.width}px`,
              }}
              // T-109 step 2 review: measured (real Chromium, a live editable
              // cell): the TD's own padding is NOT covered by `EditableCell`'s
              // inner div (the div sizes to its own `px-2 py-1`, not the TD's
              // `p-4`, and the TD vertically centers it — see
              // `ui/table.tsx`'s `TableCell`). Without this handler only the
              // inner div is clickable — measured 26.6% of the cell's area
              // openable, 73.4% dead. Duplicating the open call here is safe:
              // `onCellEdit`/`handleCellEdit` only calls `setEditingCell`
              // with an identity-stable guard, so a click that bubbles to
              // both this `onClick` and `EditableCell`'s own `onOpen` is a
              // no-op the second time.
              onClick={
                isEditable
                  ? () =>
                      onCellEdit({
                        level: 'FU',
                        fuId: planFu.id,
                        field: col.code,
                      })
                  : undefined
              }
            >
              {col.calculated ? (
                <CalculatedCell
                  value={value}
                  format={col.format}
                  decimals={col.decimals}
                  formula={col.formula}
                />
              ) : col.code === 'RAG_STATUS' ? (
                // K-2.4.22a/K-2.4.22b: RAG_STATUS carries the GP_ROI_PCT
                // rollup's status/value/coverage — `getFuCellValue` doesn't
                // have a case for this column code (it isn't a plain field),
                // so those three are read directly off the KPI result.
                <RAGCell
                  status={planFu.ragStatus}
                  value={toNumber(planFu.gpRoi ?? null)}
                  coverageRatio={
                    planFu.calculatedKpis?.['GP_ROI_PCT']?.coverageRatio
                  }
                />
              ) : (
                <EditableCell
                  value={value}
                  format={col.format}
                  decimals={col.decimals}
                  min={col.min}
                  max={col.max}
                  suffix={col.suffix}
                  prefix={col.prefix}
                  onSave={(val) => onCellSave(planFu, undefined, col.code, val)}
                  disabled={!isEditable}
                  // T-109 step 2b: `editingCell` (the coordinator) is now the
                  // ONLY thing deciding whether this cell is open — the old
                  // inline `<input>` branch that used to return before this
                  // was reached is gone.
                  isOpen={isEditing}
                  onOpen={() =>
                    onCellEdit({
                      level: 'FU',
                      fuId: planFu.id,
                      field: col.code,
                    })
                  }
                  onCancel={onCellCancel}
                />
              )}
            </TableCell>
          );
        })}
        <TableCell className="text-center sticky right-0 bg-blue-50 z-10">
          <RAGCell
            status={planFu.ragStatus}
            value={toNumber(planFu.gpRoi ?? null)}
            coverageRatio={
              planFu.calculatedKpis?.['GP_ROI_PCT']?.coverageRatio
            }
          />
        </TableCell>
      </TableRow>

      {/* SKU Rows */}
      {isExpanded &&
        planFu.planSkus?.map((planSku) => (
          <TableRow key={planSku.id} className="hover:bg-gray-50">
            {/* Item Name Column */}
            <TableCell
              className="pl-10 sticky left-0 bg-white z-10 border-r"
              style={{ width: '250px', minWidth: '250px', maxWidth: '250px' }}
            >
              <span className="text-sm text-gray-700">
                {planSku.sku?.name || 'N/A'}
              </span>
            </TableCell>
            {/* Item Code Column */}
            <TableCell
              className="sticky left-[250px] bg-white z-10 border-r-2 text-xs text-gray-500"
              style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}
            >
              {planSku.sku?.code || 'N/A'}
            </TableCell>
            {columns.map((col) => {
              const isEditing =
                editingCell?.level === 'SKU' &&
                editingCell.skuId === planSku.id &&
                editingCell.field === col.code;
              const isEditable =
                col.editable && canEdit && col.editableAt === 'SKU';
              const value = getSkuCellValue(planSku, col.code, planFu);
              const fuValue =
                col.editableAt === 'FU'
                  ? getFuCellValue(planFu, col.code)
                  : null;

              return (
                <TableCell
                  key={col.code}
                  className={`text-right text-sm ${
                    col.sticky === 'left'
                      ? 'sticky left-0 bg-white z-10 border-r'
                      : ''
                  } ${
                    col.sticky === 'right'
                      ? 'sticky right-0 bg-white z-10 border-l'
                      : ''
                  } ${
                    isEditable
                      ? 'cursor-pointer hover:bg-blue-100 transition-colors'
                      : ''
                  }`}
                  style={{
                    backgroundColor: col.backgroundColor || '#F9FAFB',
                    width: `${col.width}px`,
                    minWidth: `${col.width}px`,
                    maxWidth: `${col.width}px`,
                  }}
                  // T-109 step 2 review: see the FU cell above for the
                  // measurement — removing this handler dropped the click
                  // target to the inner div's own box (26.6% of the cell).
                  onClick={
                    isEditable
                      ? () =>
                          onCellEdit({
                            level: 'SKU',
                            skuId: planSku.id,
                            field: col.code,
                          })
                      : undefined
                  }
                >
                  {col.calculated ? (
                    <CalculatedCell
                      value={value}
                      format={col.format}
                      decimals={col.decimals}
                      formula={col.formula}
                    />
                  ) : col.inherited && fuValue !== null ? (
                    <InheritedCell
                      value={value}
                      format={col.format}
                      decimals={col.decimals}
                      parentValue={fuValue}
                      parentLabel={planFu.fu?.name}
                    />
                  ) : col.code === 'RAG_STATUS' ? (
                    <RAGCell
                      status={planSku.ragStatus}
                      value={toNumber(planSku.gpRoi ?? null)}
                      coverageRatio={
                        planSku.calculatedKpis?.['GP_ROI_PCT']?.coverageRatio
                      }
                    />
                  ) : (
                    <EditableCell
                      value={value}
                      format={col.format}
                      decimals={col.decimals}
                      min={col.min}
                      max={col.max}
                      suffix={col.suffix}
                      prefix={col.prefix}
                      onSave={(val) =>
                        onCellSave(planFu, planSku, col.code, val)
                      }
                      disabled={!isEditable}
                      // T-109 step 2b: see the FU cell above — one predicate,
                      // one place, and `editingCell` is now the only source
                      // of truth for whether this cell is open.
                      isOpen={isEditing}
                      onOpen={() =>
                        onCellEdit({
                          level: 'SKU',
                          skuId: planSku.id,
                          field: col.code,
                        })
                      }
                      onCancel={onCellCancel}
                    />
                  )}
                </TableCell>
              );
            })}
            <TableCell className="text-center sticky right-0 bg-white z-10">
              <RAGCell
                status={planSku.ragStatus}
                value={toNumber(planSku.gpRoi ?? null)}
                coverageRatio={
                  planSku.calculatedKpis?.['GP_ROI_PCT']?.coverageRatio
                }
              />
            </TableCell>
          </TableRow>
        ))}
    </>
  );
}
