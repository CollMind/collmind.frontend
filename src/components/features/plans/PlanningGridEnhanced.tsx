import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plan, PlanFu, PlanSku, PlanMechanicValue } from '@/api/endpoints/plans.endpoints';
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
import { ChevronDown, ChevronRight, Plus, Maximize2, RefreshCw, Trash2, Settings2 } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { AddFuDialog } from './AddFuDialog';
import { planEndpoints } from '@/api/endpoints/plans.endpoints';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BASE_COLUMNS, filterColumns, groupColumns, ColumnGroup, COLUMN_GROUPS, ColumnDefinition } from './column-definitions';
import { EditableCell, CalculatedCell, InheritedCell, RAGCell } from './grid-cells';
import { toNumber, toNumberOrNull } from '@/utils/numberUtils';

interface PlanningGridProps {
  plan: Plan;
  canEdit: boolean;
}

/**
 * Get cell value for SKU based on column code
 */
function getSkuCellValue(planSku: PlanSku, colCode: string, planFu?: PlanFu): number | null {
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
      return ((planSku.plannedVolume ?? 0) - base) / base * 100;
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
          b => b.mechanic?.code === mechanicCode
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
      return (planSku.plannedLtaOnInvoiceSpend ?? 0) + (planSku.promoOnInvoiceSpend ?? 0);
    case 'TOTAL_PLANNED_OFF':
      return (planSku.plannedLtaOffInvoiceSpend ?? 0) + (planSku.promoOffInvoiceSpend ?? 0);
    case 'TOTAL_PLANNED_SPEND':
      return (planSku.plannedLtaOnInvoiceSpend ?? 0) + (planSku.plannedLtaOffInvoiceSpend ?? 0) +
             (planSku.promoOnInvoiceSpend ?? 0) + (planSku.promoOffInvoiceSpend ?? 0);
    case 'INCREMENTAL_SPEND': {
      const baseTotal = (planSku.baseLtaOnInvoiceSpend ?? 0) + (planSku.baseLtaOffInvoiceSpend ?? 0);
      const plannedTotal = (planSku.plannedLtaOnInvoiceSpend ?? 0) + (planSku.plannedLtaOffInvoiceSpend ?? 0) +
                          (planSku.promoOnInvoiceSpend ?? 0) + (planSku.promoOffInvoiceSpend ?? 0);
      return plannedTotal - baseTotal;
    }
    
    // NIV & Turnover
    case 'BASE_NIV': {
      const baseGsv = (planSku.baseVolume ?? 0) * (sku?.unitPrice ?? 0);
      return baseGsv - (planSku.baseLtaOnInvoiceSpend ?? 0);
    }
    case 'PLAN_NIV': {
      const planGsv = (planSku.plannedVolume ?? 0) * (sku?.unitPrice ?? 0);
      const totalOnInv = (planSku.plannedLtaOnInvoiceSpend ?? 0) + (planSku.promoOnInvoiceSpend ?? 0);
      return planGsv - totalOnInv;
    }
    case 'INCR_NIV': {
      const baseNiv = (planSku.baseVolume ?? 0) * (sku?.unitPrice ?? 0) - (planSku.baseLtaOnInvoiceSpend ?? 0);
      const planGsv = (planSku.plannedVolume ?? 0) * (sku?.unitPrice ?? 0);
      const totalOnInv = (planSku.plannedLtaOnInvoiceSpend ?? 0) + (planSku.promoOnInvoiceSpend ?? 0);
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
      const totalOnInv = (planSku.plannedLtaOnInvoiceSpend ?? 0) + (planSku.promoOnInvoiceSpend ?? 0);
      const planNiv = planGsv - totalOnInv;
      const totalOffInv = (planSku.plannedLtaOffInvoiceSpend ?? 0) + (planSku.promoOffInvoiceSpend ?? 0);
      return planNiv - totalOffInv;
    }
    case 'INCR_TO': {
      const baseGsv = (planSku.baseVolume ?? 0) * (sku?.unitPrice ?? 0);
      const baseNiv = baseGsv - (planSku.baseLtaOnInvoiceSpend ?? 0);
      const baseTo = baseNiv - (planSku.baseLtaOffInvoiceSpend ?? 0);
      const planGsv = (planSku.plannedVolume ?? 0) * (sku?.unitPrice ?? 0);
      const totalOnInv = (planSku.plannedLtaOnInvoiceSpend ?? 0) + (planSku.promoOnInvoiceSpend ?? 0);
      const planNiv = planGsv - totalOnInv;
      const totalOffInv = (planSku.plannedLtaOffInvoiceSpend ?? 0) + (planSku.promoOffInvoiceSpend ?? 0);
      const planTo = planNiv - totalOffInv;
      return planTo - baseTo;
    }
    case 'TO_UPLIFT_PCT': {
      const baseGsv = (planSku.baseVolume ?? 0) * (sku?.unitPrice ?? 0);
      const baseNiv = baseGsv - (planSku.baseLtaOnInvoiceSpend ?? 0);
      const baseTo = baseNiv - (planSku.baseLtaOffInvoiceSpend ?? 0);
      if (!baseTo) return null;
      const planGsv = (planSku.plannedVolume ?? 0) * (sku?.unitPrice ?? 0);
      const totalOnInv = (planSku.plannedLtaOnInvoiceSpend ?? 0) + (planSku.promoOnInvoiceSpend ?? 0);
      const planNiv = planGsv - totalOnInv;
      const totalOffInv = (planSku.plannedLtaOffInvoiceSpend ?? 0) + (planSku.promoOffInvoiceSpend ?? 0);
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
      const totalOnInv = (planSku.plannedLtaOnInvoiceSpend ?? 0) + (planSku.promoOnInvoiceSpend ?? 0);
      const planNiv = planGsv - totalOnInv;
      const totalOffInv = (planSku.plannedLtaOffInvoiceSpend ?? 0) + (planSku.promoOffInvoiceSpend ?? 0);
      const planTo = planNiv - totalOffInv;
      if (!planTo) return null;
      const planGp = planSku.plannedGp ?? 0;
      return (planGp / planTo) * 100;
    }
    case 'INCR_GM_PCT': {
      const planGsv = (planSku.plannedVolume ?? 0) * (sku?.unitPrice ?? 0);
      const totalOnInv = (planSku.plannedLtaOnInvoiceSpend ?? 0) + (planSku.promoOnInvoiceSpend ?? 0);
      const planNiv = planGsv - totalOnInv;
      const totalOffInv = (planSku.plannedLtaOffInvoiceSpend ?? 0) + (planSku.promoOffInvoiceSpend ?? 0);
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
      return planSku.gpRoi ?? null;
    case 'TO_ROI_PCT': {
      const incrSpend = (() => {
        const baseTotal = (planSku.baseLtaOnInvoiceSpend ?? 0) + (planSku.baseLtaOffInvoiceSpend ?? 0);
        const plannedTotal = (planSku.plannedLtaOnInvoiceSpend ?? 0) + (planSku.plannedLtaOffInvoiceSpend ?? 0) +
                            (planSku.promoOnInvoiceSpend ?? 0) + (planSku.promoOffInvoiceSpend ?? 0);
        return plannedTotal - baseTotal;
      })();
      if (!incrSpend || incrSpend <= 0) return null;
      const baseGsv = (planSku.baseVolume ?? 0) * (sku?.unitPrice ?? 0);
      const baseNiv = baseGsv - (planSku.baseLtaOnInvoiceSpend ?? 0);
      const baseTo = baseNiv - (planSku.baseLtaOffInvoiceSpend ?? 0);
      const planGsv = (planSku.plannedVolume ?? 0) * (sku?.unitPrice ?? 0);
      const totalOnInv = (planSku.plannedLtaOnInvoiceSpend ?? 0) + (planSku.promoOnInvoiceSpend ?? 0);
      const planNiv = planGsv - totalOnInv;
      const totalOffInv = (planSku.plannedLtaOffInvoiceSpend ?? 0) + (planSku.promoOffInvoiceSpend ?? 0);
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
      const plannedVol = toNumber(planFu.totalPlannedVolume);
      return plannedVol - baseVol;
    }
    case 'VOL_UPLIFT_PCT': {
      const baseVol = skus.reduce((sum, sku) => sum + (sku.baseVolume ?? 0), 0);
      if (!baseVol) return null;
      const plannedVol = toNumber(planFu.totalPlannedVolume);
      return (plannedVol - baseVol) / baseVol * 100;
    }
    
    // GSV - Aggregated
    case 'BASE_GSV':
      return skus.reduce((sum, sku) => {
        const baseVol = sku.baseVolume ?? 0;
        const listPrice = sku.sku?.unitPrice ?? 0;
        return sum + (baseVol * listPrice);
      }, 0);
    case 'PLAN_GSV':
      return skus.reduce((sum, sku) => {
        const planVol = sku.plannedVolume ?? 0;
        const listPrice = sku.sku?.unitPrice ?? 0;
        return sum + (planVol * listPrice);
      }, 0);
    case 'INCR_GSV': {
      const baseGsv = skus.reduce((sum, sku) => {
        const baseVol = sku.baseVolume ?? 0;
        const listPrice = sku.sku?.unitPrice ?? 0;
        return sum + (baseVol * listPrice);
      }, 0);
      const planGsv = skus.reduce((sum, sku) => {
        const planVol = sku.plannedVolume ?? 0;
        const listPrice = sku.sku?.unitPrice ?? 0;
        return sum + (planVol * listPrice);
      }, 0);
      return planGsv - baseGsv;
    }
    
    // LTA - Aggregated
    case 'BASE_LTA_ON':
      return skus.reduce((sum, sku) => sum + (sku.baseLtaOnInvoiceSpend ?? 0), 0);
    case 'BASE_LTA_OFF':
      return skus.reduce((sum, sku) => sum + (sku.baseLtaOffInvoiceSpend ?? 0), 0);
    case 'PLAN_LTA_ON':
      return skus.reduce((sum, sku) => sum + (sku.plannedLtaOnInvoiceSpend ?? 0), 0);
    case 'PLAN_LTA_OFF':
      return skus.reduce((sum, sku) => sum + (sku.plannedLtaOffInvoiceSpend ?? 0), 0);
    
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
        pmv => pmv.mechanic?.code === mechanicCode
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
          b => b.mechanic?.code === mechanicCode
        );
        return sum + (breakdown?.calculatedAmount ?? 0);
      }, 0);
    }
    
    // Total Spend - Aggregated
    case 'TOTAL_PROMO_ON':
      return skus.reduce((sum, sku) => sum + (sku.promoOnInvoiceSpend ?? 0), 0);
    case 'TOTAL_PROMO_OFF':
      return skus.reduce((sum, sku) => sum + (sku.promoOffInvoiceSpend ?? 0), 0);
    case 'TOTAL_LTA_ON':
      return skus.reduce((sum, sku) => sum + (sku.plannedLtaOnInvoiceSpend ?? 0), 0);
    case 'TOTAL_LTA_OFF':
      return skus.reduce((sum, sku) => sum + (sku.plannedLtaOffInvoiceSpend ?? 0), 0);
    case 'TOTAL_PLANNED_ON':
      return skus.reduce((sum, sku) => {
        return sum + (sku.plannedLtaOnInvoiceSpend ?? 0) + (sku.promoOnInvoiceSpend ?? 0);
      }, 0);
    case 'TOTAL_PLANNED_OFF':
      return skus.reduce((sum, sku) => {
        return sum + (sku.plannedLtaOffInvoiceSpend ?? 0) + (sku.promoOffInvoiceSpend ?? 0);
      }, 0);
    case 'TOTAL_PLANNED_SPEND':
      return toNumberOrNull(planFu.totalSpend);
    case 'INCREMENTAL_SPEND': {
      const baseTotal = skus.reduce((sum, sku) => {
        return sum + (sku.baseLtaOnInvoiceSpend ?? 0) + (sku.baseLtaOffInvoiceSpend ?? 0);
      }, 0);
      const plannedTotal = toNumber(planFu.totalSpend);
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
        const totalOnInv = (sku.plannedLtaOnInvoiceSpend ?? 0) + (sku.promoOnInvoiceSpend ?? 0);
        return sum + planGsv - totalOnInv;
      }, 0);
    case 'INCR_NIV': {
      const baseNiv = skus.reduce((sum, sku) => {
        const baseGsv = (sku.baseVolume ?? 0) * (sku.sku?.unitPrice ?? 0);
        return sum + baseGsv - (sku.baseLtaOnInvoiceSpend ?? 0);
      }, 0);
      const planNiv = skus.reduce((sum, sku) => {
        const planGsv = (sku.plannedVolume ?? 0) * (sku.sku?.unitPrice ?? 0);
        const totalOnInv = (sku.plannedLtaOnInvoiceSpend ?? 0) + (sku.promoOnInvoiceSpend ?? 0);
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
        const totalOnInv = (sku.plannedLtaOnInvoiceSpend ?? 0) + (sku.promoOnInvoiceSpend ?? 0);
        const planNiv = planGsv - totalOnInv;
        const totalOffInv = (sku.plannedLtaOffInvoiceSpend ?? 0) + (sku.promoOffInvoiceSpend ?? 0);
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
        const totalOnInv = (sku.plannedLtaOnInvoiceSpend ?? 0) + (sku.promoOnInvoiceSpend ?? 0);
        const planNiv = planGsv - totalOnInv;
        const totalOffInv = (sku.plannedLtaOffInvoiceSpend ?? 0) + (sku.promoOffInvoiceSpend ?? 0);
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
        const totalOnInv = (sku.plannedLtaOnInvoiceSpend ?? 0) + (sku.promoOnInvoiceSpend ?? 0);
        const planNiv = planGsv - totalOnInv;
        const totalOffInv = (sku.plannedLtaOffInvoiceSpend ?? 0) + (sku.promoOffInvoiceSpend ?? 0);
        return sum + planNiv - totalOffInv;
      }, 0);
      return ((planTo - baseTo) / baseTo) * 100;
    }
    
    // Profit - Aggregated
    case 'BASE_COGS':
      return skus.reduce((sum, sku) => sum + ((sku.baseVolume ?? 0) * (sku.sku?.cogs ?? 0)), 0);
    case 'PLAN_COGS':
      return skus.reduce((sum, sku) => sum + ((sku.plannedVolume ?? 0) * (sku.sku?.cogs ?? 0)), 0);
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
        const totalOnInv = (sku.plannedLtaOnInvoiceSpend ?? 0) + (sku.promoOnInvoiceSpend ?? 0);
        const planNiv = planGsv - totalOnInv;
        const totalOffInv = (sku.plannedLtaOffInvoiceSpend ?? 0) + (sku.promoOffInvoiceSpend ?? 0);
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
        const totalOnInv = (sku.plannedLtaOnInvoiceSpend ?? 0) + (sku.promoOnInvoiceSpend ?? 0);
        const planNiv = planGsv - totalOnInv;
        const totalOffInv = (sku.plannedLtaOffInvoiceSpend ?? 0) + (sku.promoOffInvoiceSpend ?? 0);
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
        return sum + (sku.baseLtaOnInvoiceSpend ?? 0) + (sku.baseLtaOffInvoiceSpend ?? 0);
      }, 0);
      const plannedTotal = toNumber(planFu.totalSpend);
      const incrSpend = plannedTotal - baseTotal;
      if (!incrSpend || incrSpend <= 0) return null;
      const baseTo = skus.reduce((sum, sku) => {
        const baseGsv = (sku.baseVolume ?? 0) * (sku.sku?.unitPrice ?? 0);
        const baseNiv = baseGsv - (sku.baseLtaOnInvoiceSpend ?? 0);
        return sum + baseNiv - (sku.baseLtaOffInvoiceSpend ?? 0);
      }, 0);
      const planTo = skus.reduce((sum, sku) => {
        const planGsv = (sku.plannedVolume ?? 0) * (sku.sku?.unitPrice ?? 0);
        const totalOnInv = (sku.plannedLtaOnInvoiceSpend ?? 0) + (sku.promoOnInvoiceSpend ?? 0);
        const planNiv = planGsv - totalOnInv;
        const totalOffInv = (sku.plannedLtaOffInvoiceSpend ?? 0) + (sku.promoOffInvoiceSpend ?? 0);
        return sum + planNiv - totalOffInv;
      }, 0);
      const incrTo = planTo - baseTo;
      return (incrTo / incrSpend) * 100;
    }
    
    default:
      return null;
  }
}

export function PlanningGridEnhanced({ plan, canEdit }: PlanningGridProps) {
  const [expandedFus, setExpandedFus] = useState<Set<string>>(new Set());
  const [isAddFuDialogOpen, setIsAddFuDialogOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<{ fuId?: string; skuId?: string; field: string } | null>(null);
  const [columnPreferences, setColumnPreferences] = useState<Record<string, boolean>>({});
  const editInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const queryClient = useQueryClient();

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
      columnPreferences,
    );
    
    // Add dynamic mechanic columns
    const mechanicColumns: ColumnDefinition[] = [];
    applicableMechanics.forEach((mechanic: any) => {
      // Skip if already in BASE_COLUMNS
      if (BASE_COLUMNS.find(c => c.code === mechanic.code)) return;
      
      // Create column definition based on mechanic
      if (mechanic.spendingType === 'on_invoice' || mechanic.category === 'on_invoice_discount') {
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
      } else if (mechanic.spendingType === 'off_invoice' || mechanic.category === 'off_invoice_discount') {
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
  }, [plan.channel?.code, plan.category?.code, applicableMechanics, columnPreferences]);

  // Group columns for header rendering
  const groupedColumns = useMemo(() => groupColumns(visibleColumns), [visibleColumns]);

  const addFuMutation = useMutation({
    mutationFn: async (fuIds: string[]) => {
      for (const fuId of fuIds) {
        await planEndpoints.addFu(plan.id, { fuId });
      }
    },
    onSuccess: () => {
      toast.success('FU\'lar başarıyla eklendi');
      queryClient.invalidateQueries({ queryKey: ['plan', plan.id] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'FU eklenirken hata oluştu');
    },
  });

  const updateVolumeMutation = useMutation({
    mutationFn: async ({
      planId, fuId, skuId, field, value,
    }: { planId: string; fuId: string; skuId: string; field: string; value: number }) => {
      const data: any = {};
      if (field === 'BASE_VOL') data.baseVolume = value;
      if (field === 'PLAN_VOL') data.plannedVolume = value;
      await planEndpoints.updateSkuVolume(planId, fuId, skuId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan', plan.id] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Değer güncellenirken hata oluştu');
    },
  });

  const updateTacticMutation = useMutation({
    mutationFn: async ({
      planId, fuId, mechanicCode, value,
    }: { planId: string; fuId: string; mechanicCode: string; value: number }) => {
      // TODO: Implement tactic update endpoint
      await planEndpoints.updateFuTactic(planId, fuId, {
        tactics: { [mechanicCode]: value },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan', plan.id] });
      toast.success('Tactic güncellendi');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Tactic güncellenirken hata oluştu');
    },
  });

  const removeFuMutation = useMutation({
    mutationFn: async (fuId: string) => {
      await planEndpoints.removeFu(plan.id, fuId);
    },
    onSuccess: () => {
      toast.success('FU başarıyla kaldırıldı');
      queryClient.invalidateQueries({ queryKey: ['plan', plan.id] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'FU kaldırılırken hata oluştu');
    },
  });

  const recalcMutation = useMutation({
    mutationFn: () => planEndpoints.recalculate(plan.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan', plan.id] });
      toast.success('Yeniden hesaplandı');
    },
  });

  const handleRemoveFu = useCallback((fuId: string, fuName: string) => {
    if (confirm(`"${fuName}" FU'sunu plandan kaldırmak istediğinize emin misiniz?`)) {
      removeFuMutation.mutate(fuId);
    }
  }, [removeFuMutation]);

  const handleAddFu = async (fuIds: string[]) => {
    await addFuMutation.mutateAsync(fuIds);
  };

  const toggleFu = (fuId: string) => {
    setExpandedFus(prev => {
      const next = new Set(prev);
      next.has(fuId) ? next.delete(fuId) : next.add(fuId);
      return next;
    });
  };

  const expandAll = () => setExpandedFus(new Set(plan.planFus?.map(fu => fu.id) || []));
  const collapseAll = () => setExpandedFus(new Set());

  const handleCellEdit = useCallback((fuId: string | undefined, skuId: string | undefined, field: string) => {
    if (!canEdit) return;
    setEditingCell({ fuId, skuId, field });
    setTimeout(() => editInputRef.current?.focus(), 50);
  }, [canEdit]);

  const handleCellSave = useCallback((
    planFu: PlanFu,
    planSku: PlanSku | undefined,
    field: string,
    value: number,
  ) => {
    if (planSku) {
      // SKU level edit (volume)
      updateVolumeMutation.mutate({
        planId: plan.id,
        fuId: planFu.fuId,
        skuId: planSku.skuId,
        field,
        value,
      });
    } else {
      // FU level edit (tactic)
      updateTacticMutation.mutate({
        planId: plan.id,
        fuId: planFu.fuId,
        mechanicCode: field,
        value,
      });
    }
    setEditingCell(null);
  }, [plan.id, updateVolumeMutation, updateTacticMutation]);

  // Calculate sticky column positions (ITEM_NAME and ITEM_CODE are always sticky left)
  const leftStickyColumns = visibleColumns.filter(c => c.sticky === 'left' || c.code === 'ITEM_NAME' || c.code === 'ITEM_CODE');
  const rightStickyColumns = visibleColumns.filter(c => c.sticky === 'right');
  const leftStickyWidth = 370; // ITEM_NAME (250px) + ITEM_CODE (120px)
  const rightStickyWidth = rightStickyColumns.reduce((sum, c) => sum + c.width, 0) + 130; // + RAG column

  return (
    <Card>
      <CardContent className="p-0">
        {/* Toolbar */}
        <div className="p-3 border-b flex items-center justify-between">
          <div className="flex gap-2">
            {canEdit && (
              <Button size="sm" variant="default" onClick={() => setIsAddFuDialogOpen(true)}>
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
                <RefreshCw className={`h-4 w-4 mr-1 ${recalcMutation.isPending ? 'animate-spin' : ''}`} />
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
                  if (cols.some(c => c.sticky === 'left' || c.sticky === 'right')) return null;
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
                      <div className="font-semibold text-xs">{groupInfo.name}</div>
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
                  style={{ width: '250px', minWidth: '250px', maxWidth: '250px' }}
                >
                  Item Name
                </TableHead>
                <TableHead
                  className="sticky left-[250px] bg-white z-10 border-r-2 text-left whitespace-nowrap text-xs font-medium"
                  style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}
                >
                  Item Code
                </TableHead>
                {visibleColumns.filter(c => c.code !== 'ITEM_NAME' && c.code !== 'ITEM_CODE').map((col) => (
                  <TableHead
                    key={col.code}
                    className={`text-right whitespace-nowrap text-xs font-medium ${
                      col.sticky === 'left' ? 'sticky left-0 bg-white z-10 border-r' : ''
                    } ${
                      col.sticky === 'right' ? 'sticky right-0 bg-white z-10 border-l' : ''
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
                <TableHead className="text-center text-xs sticky right-0 bg-white z-10" style={{ width: '130px' }}>
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
                      columns={visibleColumns}
                      canEdit={canEdit}
                      editingCell={editingCell}
                      editInputRef={editInputRef}
                      onToggle={() => toggleFu(planFu.id)}
                      onCellEdit={handleCellEdit}
                      onCellSave={handleCellSave}
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
                  <TableCell colSpan={visibleColumns.length + 3} className="text-center py-8 text-gray-500">
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
    </Card>
  );
}

// Enhanced FU Row Component
function FuRowEnhanced({
  planFu,
  plan,
  isExpanded,
  columns,
  canEdit,
  editingCell,
  editInputRef,
  onToggle,
  onCellEdit,
  onCellSave,
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
  editingCell: { fuId?: string; skuId?: string; field: string } | null;
  editInputRef: React.RefObject<HTMLInputElement>;
  onToggle: () => void;
  onCellEdit: (fuId: string | undefined, skuId: string | undefined, field: string) => void;
  onCellSave: (planFu: PlanFu, planSku: PlanSku | undefined, field: string, value: number) => void;
  getSkuCellValue: (planSku: PlanSku, colCode: string, planFu?: PlanFu) => number | null;
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
            <button onClick={onToggle} className="p-0.5 hover:bg-blue-200 rounded">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            <span className="text-sm font-semibold">{planFu.fu?.name || 'N/A'}</span>
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
          const isEditing = editingCell?.fuId === planFu.id && editingCell?.field === col.code;
          const isEditable = col.editable && canEdit && col.editableAt === 'FU';
          const value = getFuCellValue(planFu, col.code);

          if (isEditing) {
            const currentValue = value ?? 0;
            return (
              <TableCell
                key={col.code}
                className="text-right p-1"
                style={{
                  backgroundColor: col.backgroundColor || '#FFFFFF',
                  width: `${col.width}px`,
                }}
              >
                <input
                  ref={editInputRef as any}
                  type="number"
                  defaultValue={currentValue}
                  className="h-7 text-right text-sm w-full border rounded px-2"
                  onBlur={(e) => {
                    const numValue = parseFloat(e.target.value);
                    if (!isNaN(numValue)) {
                      onCellSave(planFu, undefined, col.code, numValue);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const numValue = parseFloat((e.target as HTMLInputElement).value);
                      if (!isNaN(numValue)) {
                        onCellSave(planFu, undefined, col.code, numValue);
                      }
                    }
                    if (e.key === 'Escape') {
                      onCellSave(planFu, undefined, col.code, currentValue);
                    }
                  }}
                />
              </TableCell>
            );
          }

          return (
            <TableCell
              key={col.code}
              className={`text-right text-sm ${
                col.sticky === 'left' ? 'sticky left-0 bg-blue-50 z-10 border-r' : ''
              } ${
                col.sticky === 'right' ? 'sticky right-0 bg-blue-50 z-10 border-l' : ''
              } ${
                isEditable ? 'cursor-pointer hover:bg-blue-200 transition-colors' : ''
              }`}
              style={{
                backgroundColor: col.backgroundColor || '#EFF6FF',
                width: `${col.width}px`,
                minWidth: `${col.width}px`,
                maxWidth: `${col.width}px`,
              }}
              onClick={isEditable ? () => onCellEdit(planFu.id, undefined, col.code) : undefined}
            >
              {col.calculated ? (
                <CalculatedCell
                  value={value}
                  format={col.format}
                  decimals={col.decimals}
                  formula={col.formula}
                />
              ) : col.code === 'RAG_STATUS' ? (
                <RAGCell status={planFu.ragStatus} />
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
                />
              )}
            </TableCell>
          );
        })}
        <TableCell className="text-center sticky right-0 bg-blue-50 z-10">
          <RAGCell status={planFu.ragStatus} />
        </TableCell>
      </TableRow>

      {/* SKU Rows */}
      {isExpanded && planFu.planSkus?.map((planSku) => (
        <TableRow key={planSku.id} className="hover:bg-gray-50">
          {/* Item Name Column */}
          <TableCell
            className="pl-10 sticky left-0 bg-white z-10 border-r"
            style={{ width: '250px', minWidth: '250px', maxWidth: '250px' }}
          >
            <span className="text-sm text-gray-700">{planSku.sku?.name || 'N/A'}</span>
          </TableCell>
          {/* Item Code Column */}
          <TableCell
            className="sticky left-[250px] bg-white z-10 border-r-2 text-xs text-gray-500"
            style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}
          >
            {planSku.sku?.code || 'N/A'}
          </TableCell>
          {columns.map((col) => {
            const isEditing = editingCell?.skuId === planSku.id && editingCell?.field === col.code;
            const isEditable = col.editable && canEdit && col.editableAt === 'SKU';
            const value = getSkuCellValue(planSku, col.code, planFu);
            const fuValue = col.editableAt === 'FU' ? getFuCellValue(planFu, col.code) : null;

            if (isEditing) {
              const currentValue = value ?? 0;
              return (
                <TableCell
                  key={col.code}
                  className="text-right p-1"
                  style={{
                    backgroundColor: col.backgroundColor || '#FFFFFF',
                    width: `${col.width}px`,
                  }}
                >
                  <input
                    ref={editInputRef as any}
                    type="number"
                    defaultValue={currentValue}
                    className="h-7 text-right text-sm w-full border rounded px-2"
                    onBlur={(e) => {
                      const numValue = parseFloat(e.target.value);
                      if (!isNaN(numValue)) {
                        onCellSave(planFu, planSku, col.code, numValue);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const numValue = parseFloat((e.target as HTMLInputElement).value);
                        if (!isNaN(numValue)) {
                          onCellSave(planFu, planSku, col.code, numValue);
                        }
                      }
                      if (e.key === 'Escape') {
                        onCellSave(planFu, planSku, col.code, currentValue);
                      }
                    }}
                  />
                </TableCell>
              );
            }

            return (
              <TableCell
                key={col.code}
                className={`text-right text-sm ${
                  col.sticky === 'left' ? 'sticky left-0 bg-white z-10 border-r' : ''
                } ${
                  col.sticky === 'right' ? 'sticky right-0 bg-white z-10 border-l' : ''
                } ${
                  isEditable ? 'cursor-pointer hover:bg-blue-100 transition-colors' : ''
                }`}
                style={{
                  backgroundColor: col.backgroundColor || '#F9FAFB',
                  width: `${col.width}px`,
                  minWidth: `${col.width}px`,
                  maxWidth: `${col.width}px`,
                }}
                onClick={isEditable ? () => onCellEdit(undefined, planSku.id, col.code) : undefined}
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
                  <RAGCell status={planSku.ragStatus} />
                ) : (
                  <EditableCell
                    value={value}
                    format={col.format}
                    decimals={col.decimals}
                    min={col.min}
                    max={col.max}
                    suffix={col.suffix}
                    prefix={col.prefix}
                    onSave={(val) => onCellSave(planFu, planSku, col.code, val)}
                    disabled={!isEditable}
                  />
                )}
              </TableCell>
            );
          })}
          <TableCell className="text-center sticky right-0 bg-white z-10">
            <RAGCell status={planSku.ragStatus} />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
