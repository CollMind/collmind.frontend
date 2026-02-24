/**
 * Column Group Definitions for Planning Grid
 */

export enum ColumnGroup {
  ITEM_INFO = 'ITEM_INFO',
  MASTER_DATA = 'MASTER_DATA',
  VOLUME_METRICS = 'VOLUME_METRICS',
  GSV = 'GSV',
  LTA = 'LTA',
  ON_INVOICE_PROMO = 'ON_INVOICE_PROMO',
  OFF_INVOICE_PROMO = 'OFF_INVOICE_PROMO',
  LUMPSUM = 'LUMPSUM',
  TOTAL_SPEND = 'TOTAL_SPEND',
  NIV_TURNOVER = 'NIV_TURNOVER',
  PROFIT = 'PROFIT',
  MARGIN = 'MARGIN',
  ROI_RAG = 'ROI_RAG',
}

export interface ColumnDefinition {
  code: string;
  name: string;
  group: ColumnGroup;
  format: 'currency' | 'percentage' | 'number';
  decimals?: number;
  width: number;
  sticky?: 'left' | 'right';
  editable?: boolean;
  editableAt?: 'FU' | 'SKU';
  calculated?: boolean;
  inherited?: boolean;
  backgroundColor?: string;
  groupHeader?: string;
  conditional?: {
    channel?: string[];
    category?: string[];
    hideIfEmpty?: boolean;
  };
  formula?: string;
  min?: number;
  max?: number;
  suffix?: string;
  prefix?: string;
}

export const COLUMN_GROUPS: Record<ColumnGroup, { name: string; backgroundColor?: string }> = {
  [ColumnGroup.ITEM_INFO]: { name: 'Item Info', backgroundColor: '#FFFFFF' },
  [ColumnGroup.MASTER_DATA]: { name: 'Master Data', backgroundColor: '#FFFFFF' },
  [ColumnGroup.VOLUME_METRICS]: { name: 'Volume Metrics', backgroundColor: '#FFFFFF' },
  [ColumnGroup.GSV]: { name: 'GSV (Gross Sales Value)', backgroundColor: '#FFFFFF' },
  [ColumnGroup.LTA]: { name: 'LTA (Long-Term Agreement)', backgroundColor: '#F3E8FF' },
  [ColumnGroup.ON_INVOICE_PROMO]: { name: 'ON-INVOICE DISCOUNTS', backgroundColor: '#DBEAFE' },
  [ColumnGroup.OFF_INVOICE_PROMO]: { name: 'OFF-INVOICE DISCOUNTS', backgroundColor: '#FFEDD5' },
  [ColumnGroup.LUMPSUM]: { name: 'Lumpsum Spends', backgroundColor: '#FCE7F3' },
  [ColumnGroup.TOTAL_SPEND]: { name: 'Total Spend Breakdown', backgroundColor: '#F3F4F6' },
  [ColumnGroup.NIV_TURNOVER]: { name: 'NIV & Turnover', backgroundColor: '#FFFFFF' },
  [ColumnGroup.PROFIT]: { name: 'Profit Metrics', backgroundColor: '#FFFFFF' },
  [ColumnGroup.MARGIN]: { name: 'Margin Metrics', backgroundColor: '#FFFFFF' },
  [ColumnGroup.ROI_RAG]: { name: 'ROI & RAG', backgroundColor: '#FFFFFF' },
};

export const BASE_COLUMNS: ColumnDefinition[] = [
  // GRUP 1: Item Info (Sticky Left)
  {
    code: 'ITEM_NAME',
    name: 'Item Name',
    group: ColumnGroup.ITEM_INFO,
    format: 'number',
    width: 250,
    sticky: 'left',
    editable: false,
  },
  {
    code: 'ITEM_CODE',
    name: 'Item Code',
    group: ColumnGroup.ITEM_INFO,
    format: 'number',
    width: 120,
    sticky: 'left',
    editable: false,
  },

  // GRUP 2: Master Data
  {
    code: 'BPTT',
    name: 'List Price per Piece',
    group: ColumnGroup.MASTER_DATA,
    format: 'currency',
    decimals: 0,
    width: 100,
    editable: false,
  },
  {
    code: 'COGS',
    name: 'COGS per Piece',
    group: ColumnGroup.MASTER_DATA,
    format: 'currency',
    decimals: 0,
    width: 100,
    editable: false,
  },

  // GRUP 3: Volume Metrics
  {
    code: 'BASE_VOL',
    name: 'Base Volume (pcs)',
    group: ColumnGroup.VOLUME_METRICS,
    format: 'number',
    decimals: 0,
    width: 110,
    editable: true,
    editableAt: 'SKU',
  },
  {
    code: 'PLAN_VOL',
    name: 'Planned Volume (pcs)',
    group: ColumnGroup.VOLUME_METRICS,
    format: 'number',
    decimals: 0,
    width: 130,
    editable: true,
    editableAt: 'SKU',
  },
  {
    code: 'INCR_VOL',
    name: 'Incremental Volume',
    group: ColumnGroup.VOLUME_METRICS,
    format: 'number',
    decimals: 0,
    width: 120,
    calculated: true,
  },
  {
    code: 'VOL_UPLIFT_PCT',
    name: 'Volume Uplift %',
    group: ColumnGroup.VOLUME_METRICS,
    format: 'percentage',
    decimals: 1,
    width: 120,
    calculated: true,
  },

  // GRUP 4: GSV
  {
    code: 'BASE_GSV',
    name: 'Base GSV ($)',
    group: ColumnGroup.GSV,
    format: 'currency',
    decimals: 0,
    width: 130,
    calculated: true,
  },
  {
    code: 'PLAN_GSV',
    name: 'Planned GSV ($)',
    group: ColumnGroup.GSV,
    format: 'currency',
    decimals: 0,
    width: 130,
    calculated: true,
  },
  {
    code: 'INCR_GSV',
    name: 'Incremental GSV',
    group: ColumnGroup.GSV,
    format: 'currency',
    decimals: 0,
    width: 130,
    calculated: true,
  },

  // GRUP 5: LTA
  {
    code: 'LTA_ON_PCT',
    name: 'LTA On-Invoice %',
    group: ColumnGroup.LTA,
    format: 'percentage',
    decimals: 2,
    width: 120,
    editable: false,
    backgroundColor: '#F3E8FF',
  },
  {
    code: 'LTA_OFF_PCT',
    name: 'LTA Off-Invoice %',
    group: ColumnGroup.LTA,
    format: 'percentage',
    decimals: 2,
    width: 120,
    editable: false,
    backgroundColor: '#F3E8FF',
  },
  {
    code: 'BASE_LTA_ON',
    name: 'Base LTA On-Invoice ($)',
    group: ColumnGroup.LTA,
    format: 'currency',
    decimals: 0,
    width: 150,
    calculated: true,
    backgroundColor: '#F3E8FF',
  },
  {
    code: 'BASE_LTA_OFF',
    name: 'Base LTA Off-Invoice ($)',
    group: ColumnGroup.LTA,
    format: 'currency',
    decimals: 0,
    width: 150,
    calculated: true,
    backgroundColor: '#F3E8FF',
  },
  {
    code: 'PLAN_LTA_ON',
    name: 'Planned LTA On-Invoice ($)',
    group: ColumnGroup.LTA,
    format: 'currency',
    decimals: 0,
    width: 150,
    calculated: true,
    backgroundColor: '#F3E8FF',
  },
  {
    code: 'PLAN_LTA_OFF',
    name: 'Planned LTA Off-Invoice ($)',
    group: ColumnGroup.LTA,
    format: 'currency',
    decimals: 0,
    width: 150,
    calculated: true,
    backgroundColor: '#F3E8FF',
  },

  // GRUP 6: On-Invoice Promo Mechanics (Dynamic)
  {
    code: 'CPP_ON_PCT',
    name: 'CPP On-Invoice %',
    group: ColumnGroup.ON_INVOICE_PROMO,
    format: 'percentage',
    decimals: 2,
    width: 140,
    editable: true,
    editableAt: 'FU',
    backgroundColor: '#DBEAFE',
    conditional: {
      channel: ['NKA', 'ALL'],
    },
  },
  {
    code: 'CPP_ON_SPEND',
    name: 'CPP On-Invoice Spend ($)',
    group: ColumnGroup.ON_INVOICE_PROMO,
    format: 'currency',
    decimals: 0,
    width: 160,
    calculated: true,
    backgroundColor: '#DBEAFE',
    conditional: {
      channel: ['NKA', 'ALL'],
    },
  },
  {
    code: 'TPR_ON_PCT',
    name: 'TPR/Drive On-Invoice %',
    group: ColumnGroup.ON_INVOICE_PROMO,
    format: 'percentage',
    decimals: 2,
    width: 150,
    editable: true,
    editableAt: 'FU',
    backgroundColor: '#DBEAFE',
    conditional: {
      channel: ['NKA', 'ALL'],
    },
  },
  {
    code: 'TPR_ON_SPEND',
    name: 'TPR On-Invoice Spend ($)',
    group: ColumnGroup.ON_INVOICE_PROMO,
    format: 'currency',
    decimals: 0,
    width: 160,
    calculated: true,
    backgroundColor: '#DBEAFE',
    conditional: {
      channel: ['NKA', 'ALL'],
    },
  },
  {
    code: 'WS_TPR_ON_PCT',
    name: 'WS TPR On-Invoice %',
    group: ColumnGroup.ON_INVOICE_PROMO,
    format: 'percentage',
    decimals: 2,
    width: 150,
    editable: true,
    editableAt: 'FU',
    backgroundColor: '#DBEAFE',
    conditional: {
      channel: ['Wholesale', 'ALL'],
    },
  },
  {
    code: 'WS_TPR_ON_SPEND',
    name: 'WS TPR On-Invoice Spend ($)',
    group: ColumnGroup.ON_INVOICE_PROMO,
    format: 'currency',
    decimals: 0,
    width: 160,
    calculated: true,
    backgroundColor: '#DBEAFE',
    conditional: {
      channel: ['Wholesale', 'ALL'],
    },
  },

  // GRUP 7: Off-Invoice Promo Mechanics (Dynamic)
  {
    code: 'CPP_OFF_PCT',
    name: 'CPP Off-Invoice %',
    group: ColumnGroup.OFF_INVOICE_PROMO,
    format: 'percentage',
    decimals: 2,
    width: 140,
    editable: true,
    editableAt: 'FU',
    backgroundColor: '#FFEDD5',
    conditional: {
      channel: ['NKA', 'ALL'],
    },
  },
  {
    code: 'CPP_OFF_SPEND',
    name: 'CPP Off-Invoice Spend ($)',
    group: ColumnGroup.OFF_INVOICE_PROMO,
    format: 'currency',
    decimals: 0,
    width: 160,
    calculated: true,
    backgroundColor: '#FFEDD5',
    conditional: {
      channel: ['NKA', 'ALL'],
    },
  },
  {
    code: 'WS_TPR_OFF_PCT',
    name: 'WS TPR Off-Invoice %',
    group: ColumnGroup.OFF_INVOICE_PROMO,
    format: 'percentage',
    decimals: 2,
    width: 150,
    editable: true,
    editableAt: 'FU',
    backgroundColor: '#FFEDD5',
    conditional: {
      channel: ['Wholesale', 'ALL'],
    },
  },
  {
    code: 'WS_TPR_OFF_SPEND',
    name: 'WS TPR Off-Invoice Spend ($)',
    group: ColumnGroup.OFF_INVOICE_PROMO,
    format: 'currency',
    decimals: 0,
    width: 160,
    calculated: true,
    backgroundColor: '#FFEDD5',
    conditional: {
      channel: ['Wholesale', 'ALL'],
    },
  },
  {
    code: 'PRICE_SUPPORT',
    name: 'Price Support per Unit ($)',
    group: ColumnGroup.OFF_INVOICE_PROMO,
    format: 'currency',
    decimals: 2,
    width: 160,
    editable: true,
    editableAt: 'FU',
    backgroundColor: '#FFEDD5',
  },
  {
    code: 'PRICE_SUPPORT_SPEND',
    name: 'Price Support Spend ($)',
    group: ColumnGroup.OFF_INVOICE_PROMO,
    format: 'currency',
    decimals: 0,
    width: 160,
    calculated: true,
    backgroundColor: '#FFEDD5',
  },

  // GRUP 8: Lumpsum Spends (Dynamic)
  {
    code: 'VISIBILITY_MTPH',
    name: 'Visibility Lumpsum MT/PH ($)',
    group: ColumnGroup.LUMPSUM,
    format: 'currency',
    decimals: 0,
    width: 180,
    editable: true,
    editableAt: 'FU',
    backgroundColor: '#FCE7F3',
    conditional: {
      channel: ['NKA', 'ALL'],
    },
  },
  {
    code: 'VISIBILITY_GT',
    name: 'Visibility Lumpsum GT ($)',
    group: ColumnGroup.LUMPSUM,
    format: 'currency',
    decimals: 0,
    width: 180,
    editable: true,
    editableAt: 'FU',
    backgroundColor: '#FCE7F3',
    conditional: {
      channel: ['Traditional Trade', 'ALL'],
    },
  },
  {
    code: 'TPR_LUMPSUM',
    name: 'TPR/Drive Lumpsum ($)',
    group: ColumnGroup.LUMPSUM,
    format: 'currency',
    decimals: 0,
    width: 180,
    editable: true,
    editableAt: 'FU',
    backgroundColor: '#FCE7F3',
  },

  // GRUP 9: Total Spend Breakdown
  {
    code: 'TOTAL_PROMO_ON',
    name: 'Total Promo On-Invoice ($)',
    group: ColumnGroup.TOTAL_SPEND,
    format: 'currency',
    decimals: 0,
    width: 170,
    calculated: true,
    backgroundColor: '#F3F4F6',
  },
  {
    code: 'TOTAL_PROMO_OFF',
    name: 'Total Promo Off-Invoice ($)',
    group: ColumnGroup.TOTAL_SPEND,
    format: 'currency',
    decimals: 0,
    width: 170,
    calculated: true,
    backgroundColor: '#F3F4F6',
  },
  {
    code: 'TOTAL_LTA_ON',
    name: 'Total LTA On-Invoice ($)',
    group: ColumnGroup.TOTAL_SPEND,
    format: 'currency',
    decimals: 0,
    width: 150,
    calculated: true,
    backgroundColor: '#F3F4F6',
  },
  {
    code: 'TOTAL_LTA_OFF',
    name: 'Total LTA Off-Invoice ($)',
    group: ColumnGroup.TOTAL_SPEND,
    format: 'currency',
    decimals: 0,
    width: 150,
    calculated: true,
    backgroundColor: '#F3F4F6',
  },
  {
    code: 'TOTAL_PLANNED_ON',
    name: 'TOTAL PLANNED ON-INVOICE ($)',
    group: ColumnGroup.TOTAL_SPEND,
    format: 'currency',
    decimals: 0,
    width: 170,
    calculated: true,
    backgroundColor: '#F3F4F6',
  },
  {
    code: 'TOTAL_PLANNED_OFF',
    name: 'TOTAL PLANNED OFF-INVOICE ($)',
    group: ColumnGroup.TOTAL_SPEND,
    format: 'currency',
    decimals: 0,
    width: 170,
    calculated: true,
    backgroundColor: '#F3F4F6',
  },
  {
    code: 'TOTAL_PLANNED_SPEND',
    name: 'TOTAL PLANNED SPEND ($)',
    group: ColumnGroup.TOTAL_SPEND,
    format: 'currency',
    decimals: 0,
    width: 170,
    calculated: true,
    backgroundColor: '#F3F4F6',
  },
  {
    code: 'INCREMENTAL_SPEND',
    name: 'INCREMENTAL SPEND ($)',
    group: ColumnGroup.TOTAL_SPEND,
    format: 'currency',
    decimals: 0,
    width: 170,
    calculated: true,
    backgroundColor: '#F3F4F6',
  },

  // GRUP 10: NIV & Turnover
  {
    code: 'BASE_NIV',
    name: 'Base NIV ($)',
    group: ColumnGroup.NIV_TURNOVER,
    format: 'currency',
    decimals: 0,
    width: 130,
    calculated: true,
  },
  {
    code: 'PLAN_NIV',
    name: 'Planned NIV ($)',
    group: ColumnGroup.NIV_TURNOVER,
    format: 'currency',
    decimals: 0,
    width: 130,
    calculated: true,
  },
  {
    code: 'INCR_NIV',
    name: 'Incremental NIV ($)',
    group: ColumnGroup.NIV_TURNOVER,
    format: 'currency',
    decimals: 0,
    width: 130,
    calculated: true,
  },
  {
    code: 'BASE_TO',
    name: 'Base Turnover ($)',
    group: ColumnGroup.NIV_TURNOVER,
    format: 'currency',
    decimals: 0,
    width: 150,
    calculated: true,
  },
  {
    code: 'PLAN_TO',
    name: 'Planned Turnover ($)',
    group: ColumnGroup.NIV_TURNOVER,
    format: 'currency',
    decimals: 0,
    width: 150,
    calculated: true,
  },
  {
    code: 'INCR_TO',
    name: 'Incremental Turnover ($)',
    group: ColumnGroup.NIV_TURNOVER,
    format: 'currency',
    decimals: 0,
    width: 150,
    calculated: true,
  },
  {
    code: 'TO_UPLIFT_PCT',
    name: 'TO Uplift %',
    group: ColumnGroup.NIV_TURNOVER,
    format: 'percentage',
    decimals: 1,
    width: 120,
    calculated: true,
  },

  // GRUP 11: Profit Metrics
  {
    code: 'BASE_COGS',
    name: 'Base COGS ($)',
    group: ColumnGroup.PROFIT,
    format: 'currency',
    decimals: 0,
    width: 130,
    calculated: true,
  },
  {
    code: 'PLAN_COGS',
    name: 'Planned COGS ($)',
    group: ColumnGroup.PROFIT,
    format: 'currency',
    decimals: 0,
    width: 130,
    calculated: true,
  },
  {
    code: 'BASE_GP',
    name: 'Base GP ($)',
    group: ColumnGroup.PROFIT,
    format: 'currency',
    decimals: 0,
    width: 130,
    calculated: true,
  },
  {
    code: 'PLAN_GP',
    name: 'Planned GP ($)',
    group: ColumnGroup.PROFIT,
    format: 'currency',
    decimals: 0,
    width: 130,
    calculated: true,
  },
  {
    code: 'INCR_GP',
    name: 'Incremental GP ($)',
    group: ColumnGroup.PROFIT,
    format: 'currency',
    decimals: 0,
    width: 150,
    calculated: true,
  },

  // GRUP 12: Margin Metrics
  {
    code: 'BASE_GM_PCT',
    name: 'Base GM %',
    group: ColumnGroup.MARGIN,
    format: 'percentage',
    decimals: 1,
    width: 110,
    calculated: true,
  },
  {
    code: 'PLAN_GM_PCT',
    name: 'Planned GM %',
    group: ColumnGroup.MARGIN,
    format: 'percentage',
    decimals: 1,
    width: 110,
    calculated: true,
  },
  {
    code: 'INCR_GM_PCT',
    name: 'Incremental GM %',
    group: ColumnGroup.MARGIN,
    format: 'percentage',
    decimals: 1,
    width: 110,
    calculated: true,
  },

  // GRUP 13: ROI & RAG (Sticky Right)
  {
    code: 'GP_ROI_PCT',
    name: 'GP ROI %',
    group: ColumnGroup.ROI_RAG,
    format: 'percentage',
    decimals: 1,
    width: 120,
    calculated: true,
    sticky: 'right',
  },
  {
    code: 'TO_ROI_PCT',
    name: 'TO ROI %',
    group: ColumnGroup.ROI_RAG,
    format: 'percentage',
    decimals: 1,
    width: 120,
    calculated: true,
    sticky: 'right',
  },
  {
    code: 'RAG_STATUS',
    name: 'RAG Status',
    group: ColumnGroup.ROI_RAG,
    format: 'number',
    width: 130,
    sticky: 'right',
  },
];

/**
 * Filter columns based on plan context and user preferences
 */
export function filterColumns(
  columns: ColumnDefinition[],
  channelCode?: string,
  categoryCode?: string,
  userPreferences?: Record<string, boolean>,
): ColumnDefinition[] {
  return columns.filter((col) => {
    // Check conditional visibility
    if (col.conditional) {
      if (col.conditional.channel && channelCode) {
        if (!col.conditional.channel.includes(channelCode) && !col.conditional.channel.includes('ALL')) {
          return false;
        }
      }
      if (col.conditional.category && categoryCode) {
        if (!col.conditional.category.includes(categoryCode) && !col.conditional.category.includes('ALL')) {
          return false;
        }
      }
    }

    // Check user preferences
    if (userPreferences && userPreferences[col.code] === false) {
      return false;
    }

    return true;
  });
}

/**
 * Group columns by their group
 */
export function groupColumns(columns: ColumnDefinition[]): Map<ColumnGroup, ColumnDefinition[]> {
  const grouped = new Map<ColumnGroup, ColumnDefinition[]>();
  columns.forEach((col) => {
    if (!grouped.has(col.group)) {
      grouped.set(col.group, []);
    }
    grouped.get(col.group)!.push(col);
  });
  return grouped;
}
