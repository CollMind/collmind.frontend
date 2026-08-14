import { useState, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plan, PlanFu, PlanSku } from '@/api/endpoints/plans.endpoints';
import { kpiEndpoints } from '@/api/endpoints/kpi.endpoints';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { AddFuDialog } from './AddFuDialog';
import { planEndpoints } from '@/api/endpoints/plans.endpoints';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  formatCoverageLabel,
  RAG_NOT_CALCULATED_LABEL,
  resolveRagPresentation,
} from '@/utils/ragCoverage';
import { toNumber } from '@/utils/numberUtils';

interface PlanningGridProps {
  plan: Plan;
  canEdit: boolean;
}

const formatNumber = (num: number | null | undefined, decimals = 0) => {
  if (num === null || num === undefined) return '-';
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

const formatCurrency = (amount: number | null | undefined) => {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatPercentage = (val: number | null | undefined, decimals = 1) => {
  if (val === null || val === undefined) return '-';
  return `${val.toFixed(decimals)}%`;
};

// ⚠️ This component has no production callers today (dead code — measured
// 2026-08-14, see PlanDetailPage.tsx which renders `PlanningGridEnhanced`
// under this same alias instead). Fixed for correctness anyway
// (§7.1/CLAUDE.md: an unreachable path is still a documented defect, not a
// reason to leave it broken) and flagged to Team Lead for a removal/wiring
// decision — a stale duplicate is exactly the class of risk `İlke 4`
// tracks (two grid implementations, one dark).
const getRagBadge = (
  status: 'RED' | 'AMBER' | 'GREEN' | null | undefined,
  coverageRatio: number | string | null | undefined
) => {
  const presentation = resolveRagPresentation(status, coverageRatio);
  const map: Record<string, { dotColor: string; label: string }> = {
    RED: { dotColor: 'bg-red-500', label: 'KRİTİK' },
    AMBER: { dotColor: 'bg-amber-500', label: 'RİSKLİ' },
    GREEN: { dotColor: 'bg-green-500', label: 'İYİ' },
  };
  const info = presentation.ragStatus ? map[presentation.ragStatus] : null;
  if (info) {
    return (
      <div className="flex items-center justify-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${info.dotColor}`} />
        <span className="text-xs font-medium text-gray-700">
          {info.label}
        </span>
      </div>
    );
  }

  // GRİ (K-2.4.22a) — never a bare "-": that erased both the colour and
  // the explanation (INV-N-004).
  const coverageLabel = formatCoverageLabel(presentation.coverageRatio);
  return (
    <div className="flex items-center justify-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-gray-400" />
      <span className="text-xs font-medium text-gray-500">
        {presentation.isNeverCalculated
          ? RAG_NOT_CALCULATED_LABEL
          : `GRİ${coverageLabel ? ` · ${coverageLabel}` : ''}`}
      </span>
    </div>
  );
};

const formatKpiValue = (
  value: number | null | undefined,
  displayFormat: string,
  decimalPlaces: number
) => {
  if (value === null || value === undefined) return '-';
  switch (displayFormat) {
    case 'currency':
      return formatCurrency(value);
    case 'percentage':
      return formatPercentage(value, decimalPlaces);
    default:
      return formatNumber(value, decimalPlaces);
  }
};

// Map KPI codes to known SKU fields
const getSkuValueForKpi = (
  planSku: PlanSku,
  kpiCode: string
): number | null => {
  // ÖNCE: calculated_kpis'ten kontrol et
  if (planSku.calculatedKpis?.[kpiCode]) {
    return planSku.calculatedKpis[kpiCode].value;
  }

  // FALLBACK: Mevcut hardcoded mapping (geriye dönük uyumluluk)
  switch (kpiCode) {
    case 'BASE_VOL':
      return planSku.baseVolume ?? null;
    case 'PLAN_VOL':
      return planSku.plannedVolume ?? null;
    case 'INCR_VOL':
      return planSku.incrementalVolume ?? null;
    case 'UPLIFT_PCT':
      if (!planSku.baseVolume) return null;
      return (
        (((planSku.plannedVolume || 0) - (planSku.baseVolume || 0)) /
          planSku.baseVolume) *
        100
      );
    case 'PLAN_TURNOVER':
      return planSku.plannedTurnover ?? null;
    case 'TACTIC_SPEND':
      return planSku.tacticSpend ?? null;
    case 'GP':
      return planSku.plannedGp ?? null;
    case 'GP_ROI_PCT':
      return toNumber(planSku.gpRoi ?? null);
    case 'GP_MARGIN_PCT':
      if (!planSku.plannedTurnover) return null;
      return (planSku.plannedGp / planSku.plannedTurnover) * 100;
    default:
      return null;
  }
};

// Map KPI codes to known FU fields
const getFuValueForKpi = (planFu: PlanFu, kpiCode: string): number | null => {
  // ÖNCE: calculated_kpis'ten kontrol et
  if (planFu.calculatedKpis?.[kpiCode]) {
    return planFu.calculatedKpis[kpiCode].value;
  }

  // FALLBACK: Mevcut hesaplama (geriye dönük uyumluluk)
  switch (kpiCode) {
    case 'BASE_VOL':
      return (
        planFu.planSkus?.reduce(
          (s, sku) => s + (Number(sku.baseVolume) || 0),
          0
        ) ?? null
      );
    case 'PLAN_VOL':
      return Number(planFu.totalPlannedVolume) || null;
    case 'INCR_VOL': {
      const base =
        planFu.planSkus?.reduce(
          (s, sku) => s + (Number(sku.baseVolume) || 0),
          0
        ) || 0;
      return (Number(planFu.totalPlannedVolume) || 0) - base;
    }
    case 'UPLIFT_PCT': {
      const baseVol =
        planFu.planSkus?.reduce(
          (s, sku) => s + (Number(sku.baseVolume) || 0),
          0
        ) || 0;
      if (!baseVol) return null;
      return (
        (((Number(planFu.totalPlannedVolume) || 0) - baseVol) / baseVol) * 100
      );
    }
    case 'PLAN_TURNOVER':
      return (
        planFu.planSkus?.reduce(
          (s, sku) => s + (Number(sku.plannedTurnover) || 0),
          0
        ) ?? null
      );
    case 'TACTIC_SPEND':
      return Number(planFu.totalSpend) || null;
    case 'GP':
      return Number(planFu.totalGp) || null;
    case 'GP_ROI_PCT':
      return planFu.gpRoi ? Number(planFu.gpRoi) : null;
    default:
      return null;
  }
};

export function PlanningGrid({ plan, canEdit }: PlanningGridProps) {
  const [expandedFus, setExpandedFus] = useState<Set<string>>(new Set());
  const [isAddFuDialogOpen, setIsAddFuDialogOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<{
    skuId: string;
    field: string;
  } | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const queryClient = useQueryClient();

  // Fetch dynamic KPI definitions for grid (plan context-aware)
  const { data: gridKpis = [] } = useQuery({
    queryKey: ['kpis', 'grid', plan.id],
    queryFn: async () => {
      try {
        // Yeni endpoint: plan bağlamına göre KPI'lar
        const res = await kpiEndpoints.getGridKpisForPlan(plan.id);
        return res.data;
      } catch {
        // Fallback: genel grid KPI'ları
        try {
          const res = await kpiEndpoints.getGridKpis();
          return res.data;
        } catch {
          return [];
        }
      }
    },
    staleTime: 60000,
  });

  // Static columns if no KPIs defined
  const hasKpiDefinitions = gridKpis.length > 0;

  // Separate KPIs by calculation level (SKU vs FU)
  const skuLevelKpis = gridKpis.filter((kpi) => kpi.calculationLevel === 'sku');
  const fuLevelKpis = gridKpis.filter((kpi) => kpi.calculationLevel === 'fu');

  // Base columns (always shown)
  const baseColumns = [
    {
      code: 'COGS',
      name: 'COGS',
      format: 'currency',
      decimals: 0,
      editable: false,
      isKpi: false,
      calculationLevel: null,
    },
    {
      code: 'BPTT',
      name: 'Liste Fiyatı',
      format: 'currency',
      decimals: 0,
      editable: false,
      isKpi: false,
      calculationLevel: null,
    },
  ];

  // Static columns fallback
  const staticColumns = [
    ...baseColumns,
    {
      code: 'BASE_VOL',
      name: 'Base Volume',
      format: 'number',
      decimals: 0,
      editable: true,
      isKpi: false,
      calculationLevel: 'sku',
    },
    {
      code: 'PLAN_VOL',
      name: 'Planned Volume',
      format: 'number',
      decimals: 0,
      editable: true,
      isKpi: false,
      calculationLevel: 'sku',
    },
    {
      code: 'INCR_VOL',
      name: 'Incremental',
      format: 'number',
      decimals: 0,
      isKpi: false,
      calculationLevel: 'sku',
    },
    {
      code: 'PLAN_TURNOVER',
      name: 'Planned Turnover',
      format: 'currency',
      decimals: 0,
      isKpi: false,
      calculationLevel: 'sku',
    },
    {
      code: 'TACTIC_SPEND',
      name: 'Tactic Spend',
      format: 'currency',
      decimals: 0,
      isKpi: false,
      calculationLevel: 'fu',
    },
    {
      code: 'GP',
      name: 'Planned GP',
      format: 'currency',
      decimals: 0,
      isKpi: false,
      calculationLevel: 'sku',
    },
    {
      code: 'GP_ROI_PCT',
      name: 'GP ROI',
      format: 'percentage',
      decimals: 1,
      isKpi: false,
      calculationLevel: 'sku',
    },
  ];

  // Build dynamic columns from KPI definitions
  // SKU level KPIs are shown in both SKU and FU rows (aggregated in FU)
  // FU level KPIs are only shown in FU rows
  const allKpisForColumns = hasKpiDefinitions
    ? [...skuLevelKpis, ...fuLevelKpis]
    : [];

  const dynamicColumns = hasKpiDefinitions
    ? [
        ...baseColumns,
        ...allKpisForColumns
          .sort((a, b) => (a.columnOrder || 999) - (b.columnOrder || 999))
          .map((kpi) => ({
            code: kpi.kpiCode,
            name: kpi.kpiName,
            format: kpi.displayFormat,
            decimals: kpi.decimalPlaces,
            editable: kpi.formulaType === 'user_input' && canEdit,
            isKpi: true,
            calculationLevel: kpi.calculationLevel,
          })),
      ]
    : staticColumns.map((c) => ({ ...c, isKpi: false }));

  const addFuMutation = useMutation({
    mutationFn: async (fuIds: string[]) => {
      // T-034f: addFu requires planVersion; bumps +1 per call (backend CAS)
      // — see PlanningGridEnhanced.tsx's addFuMutation for the full
      // rationale (this component is currently unused/dead code, kept
      // type-consistent so it doesn't silently bit-rot).
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
    }: {
      planId: string;
      fuId: string;
      skuId: string;
      field: string;
      value: number;
    }) => {
      const data: any = {};
      if (field === 'BASE_VOL') data.baseVolume = value;
      if (field === 'PLAN_VOL') data.plannedVolume = value;
      await planEndpoints.updateSkuVolume(planId, fuId, skuId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan', plan.id] });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Değer güncellenirken hata oluştu'
      );
    },
  });

  const removeFuMutation = useMutation({
    mutationFn: async (fuId: string) => {
      await planEndpoints.removeFu(plan.id, fuId, { planVersion: plan.version });
    },
    onSuccess: () => {
      toast.success('FU başarıyla kaldırıldı');
      queryClient.invalidateQueries({ queryKey: ['plan', plan.id] });
    },
    onError: (error: any) => {
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
          `"${fuName}" FU'sunu plandan kaldırmak istediğinize emin misiniz? İlişkili tüm SKU verileri silinecektir.`
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

  const handleCellEdit = useCallback(
    (skuId: string, field: string) => {
      if (!canEdit) return;
      setEditingCell({ skuId, field });
      setTimeout(() => editInputRef.current?.focus(), 50);
    },
    [canEdit]
  );

  const handleCellSave = useCallback(
    (planFu: PlanFu, planSku: PlanSku, field: string, value: string) => {
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < 0) {
        setEditingCell(null);
        return;
      }
      updateVolumeMutation.mutate({
        planId: plan.id,
        fuId: planFu.fuId,
        skuId: planSku.skuId,
        field,
        value: numValue,
      });
      setEditingCell(null);
    },
    [plan.id, updateVolumeMutation]
  );

  const getSkuCellValue = (planSku: PlanSku, colCode: string): string => {
    switch (colCode) {
      case 'COGS':
        return formatCurrency(planSku.sku?.cogs || 0);
      case 'BPTT':
        return formatCurrency(planSku.sku?.unitPrice || 0);
      default: {
        // Only show SKU-level KPIs in SKU rows
        const col = dynamicColumns.find((c) => c.code === colCode);
        if (col?.calculationLevel === 'fu') {
          return '-'; // FU-level KPIs are not shown in SKU rows
        }
        const val = getSkuValueForKpi(planSku, colCode);
        return formatKpiValue(val, col?.format || 'number', col?.decimals || 0);
      }
    }
  };

  const getFuCellValue = (planFu: PlanFu, colCode: string): string => {
    switch (colCode) {
      case 'COGS':
      case 'BPTT':
        return '-';
      default: {
        // Show both SKU-level (aggregated) and FU-level KPIs in FU rows
        const val = getFuValueForKpi(planFu, colCode);
        const col = dynamicColumns.find((c) => c.code === colCode);
        return formatKpiValue(val, col?.format || 'number', col?.decimals || 0);
      }
    }
  };

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

        {/* Dynamic KPI indicator */}
        {hasKpiDefinitions && (
          <div className="px-3 py-1.5 bg-blue-50 border-b text-xs text-blue-600 flex items-center gap-1.5">
            <span className="w-2 h-2 bg-blue-500 rounded-full" />
            {gridKpis.length} dinamik KPI kolonu aktif
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px] sticky left-0 bg-white z-20 border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
                  ÜRÜN / FU
                </TableHead>
                {dynamicColumns.map((col) => (
                  <TableHead
                    key={col.code}
                    className="text-right whitespace-nowrap text-xs min-w-[100px]"
                  >
                    {col.name}
                  </TableHead>
                ))}
                <TableHead className="text-center text-xs sticky right-0 bg-white z-20 border-l border-gray-200 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)] min-w-[80px]">
                  RAG
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plan.planFus && plan.planFus.length > 0 ? (
                plan.planFus.map((planFu) => {
                  const isExpanded = expandedFus.has(planFu.id);

                  return (
                    <FuRow
                      key={planFu.id}
                      planFu={planFu}
                      isExpanded={isExpanded}
                      columns={dynamicColumns}
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
                      gridKpis={gridKpis}
                    />
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={dynamicColumns.length + 2}
                    className="text-center py-8 text-gray-500"
                  >
                    Henüz FU eklenmemiş. {canEdit && '"FU Ekle"'} butonuna
                    tıklayarak FU ekleyebilirsiniz.
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

// Separate FU row component for performance
function FuRow({
  planFu,
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
  gridKpis,
}: {
  planFu: PlanFu;
  isExpanded: boolean;
  columns: Array<{
    code: string;
    name: string;
    format: string;
    decimals: number;
    editable?: boolean;
    calculationLevel?: string | null;
    isKpi?: boolean;
  }>;
  canEdit: boolean;
  editingCell: { skuId: string; field: string } | null;
  editInputRef: React.RefObject<HTMLInputElement>;
  onToggle: () => void;
  onCellEdit: (skuId: string, field: string) => void;
  onCellSave: (
    planFu: PlanFu,
    planSku: PlanSku,
    field: string,
    value: string
  ) => void;
  getSkuCellValue: (planSku: PlanSku, colCode: string) => string;
  getFuCellValue: (planFu: PlanFu, colCode: string) => string;
  onRemoveFu: (fuId: string, fuName: string) => void;
  isRemovingFu: boolean;
  gridKpis: Array<{
    kpiCode: string;
    formulaType?: string;
    calculationLevel?: string;
  }>;
}) {
  return (
    <>
      {/* FU Summary Row */}
      <TableRow className="bg-gray-50 hover:bg-gray-100">
        <TableCell className="sticky left-0 bg-gray-50 z-20 border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
          <div className="flex items-center gap-2">
            <button
              onClick={onToggle}
              className="p-0.5 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            <span className="font-semibold text-sm">
              {planFu.fu?.name || 'N/A'}
            </span>
            <span className="text-xs text-gray-400">
              ({planFu.planSkus?.length || 0} SKU)
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
        {columns.map((col) => (
          <TableCell key={col.code} className="text-right text-sm font-medium">
            {getFuCellValue(planFu, col.code)}
          </TableCell>
        ))}
        <TableCell className="text-center sticky right-0 bg-gray-50 z-20 border-l border-gray-200 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)]">
          {getRagBadge(
            planFu.ragStatus,
            planFu.calculatedKpis?.['GP_ROI_PCT']?.coverageRatio
          )}
        </TableCell>
      </TableRow>

      {/* SKU Rows */}
      {isExpanded &&
        planFu.planSkus?.map((planSku) => (
          <TableRow key={planSku.id} className="hover:bg-blue-50/50">
            <TableCell className="pl-10 sticky left-0 bg-white z-20 border-r border-gray-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
              <span className="text-sm text-gray-700">
                {planSku.sku?.name || 'N/A'}
              </span>
              <span className="text-xs text-gray-400 ml-1">
                ({planSku.sku?.code})
              </span>
            </TableCell>
            {columns.map((col) => {
              // Skip FU-level KPIs in SKU rows
              if (col.calculationLevel === 'fu') {
                return (
                  <TableCell
                    key={col.code}
                    className="text-right text-sm text-gray-300"
                  >
                    -
                  </TableCell>
                );
              }

              const isEditing =
                editingCell?.skuId === planSku.id &&
                editingCell?.field === col.code;
              const kpi = gridKpis.find((k) => k.kpiCode === col.code);
              const isEditable =
                col.editable &&
                canEdit &&
                (col.code === 'BASE_VOL' ||
                  col.code === 'PLAN_VOL' ||
                  kpi?.formulaType === 'user_input');

              if (isEditing) {
                const currentValue =
                  col.code === 'BASE_VOL'
                    ? (planSku.baseVolume ?? 0)
                    : col.code === 'PLAN_VOL'
                      ? (planSku.plannedVolume ?? 0)
                      : (getSkuValueForKpi(planSku, col.code) ?? 0);

                return (
                  <TableCell key={col.code} className="text-right p-1">
                    <Input
                      ref={editInputRef as any}
                      type="number"
                      defaultValue={currentValue}
                      className="h-7 text-right text-sm w-24 ml-auto"
                      onBlur={(e) =>
                        onCellSave(planFu, planSku, col.code, e.target.value)
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          onCellSave(
                            planFu,
                            planSku,
                            col.code,
                            (e.target as HTMLInputElement).value
                          );
                        }
                        if (e.key === 'Escape') {
                          onCellSave(
                            planFu,
                            planSku,
                            col.code,
                            String(currentValue)
                          );
                        }
                      }}
                    />
                  </TableCell>
                );
              }

              return (
                <TableCell
                  key={col.code}
                  className={`text-right text-sm ${isEditable ? 'cursor-pointer hover:bg-blue-100 transition-colors' : ''}`}
                  onClick={
                    isEditable
                      ? () => onCellEdit(planSku.id, col.code)
                      : undefined
                  }
                >
                  {getSkuCellValue(planSku, col.code)}
                </TableCell>
              );
            })}
            <TableCell className="text-center sticky right-0 bg-white z-20 border-l border-gray-200 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)]">
              {getRagBadge(
                planSku.ragStatus,
                planSku.calculatedKpis?.['GP_ROI_PCT']?.coverageRatio
              )}
            </TableCell>
          </TableRow>
        ))}
    </>
  );
}
