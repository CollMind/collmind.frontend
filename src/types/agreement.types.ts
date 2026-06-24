/**
 * Agreement Types
 *
 * Anlaşma yönetimi ile ilgili type tanımlamaları
 */

/**
 * Agreement Tipi
 */
export enum AgreementType {
  STA = 'STA', // Short-Term Agreement (≤30 gün)
  LTA = 'LTA', // Long-Term Agreement (>30 gün)
}

/**
 * Agreement Durumları
 */
export enum AgreementStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  ACTIVE = 'ACTIVE',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

/**
 * Mekanik Tipi
 */
export enum MechanicType {
  PERCENT = 'PERCENT',
  AMOUNT = 'AMOUNT',
  AMOUNT_PER_UNIT = 'AMOUNT_PER_UNIT',
}

/**
 * Spend Tipi
 */
export enum SpendingType {
  ON_INVOICE = 'on_invoice',
  OFF_INVOICE = 'off_invoice',
  BOTH = 'both',
}

/**
 * Mutabakat Periyodu
 */
export enum ReconciliationPeriod {
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

/**
 * Spend Tipi
 */
export enum SpendType {
  OFF_INVOICE = 'OFF_INVOICE',
  ON_INVOICE = 'ON_INVOICE',
  BOTH = 'BOTH',
}

/**
 * SKU Scope
 */
export enum SkuScope {
  GU = 'GU',
  FU = 'FU',
  SKU = 'SKU',
  ALL = 'ALL',
}

/**
 * Agreement
 */
export interface Agreement {
  id: string;
  agreementCode?: string; // Backend'den gelen kod (örn: STA-2026-025)
  agreementNumber: string; // Otomatik oluşturulan numara (örn: STA-2026-025) - legacy support
  agreementName?: string;
  description?: string; // Anlaşma kapsamı ve detayları
  agreementType: AgreementType;
  status: AgreementStatus;
  cplId: string; // Customer ID
  channelId: string;
  regionId?: string;
  categoryId?: string; // Category ID
  fuId: string; // Forecasting Unit ID (required per BRD)
  guId?: string; // Generic Unit ID
  skuScope?: SkuScope;
  tacticId: string;
  mechanicId: string;
  mechanicValue?: number;
  mechanicType?: MechanicType;
  capTotalAmount: number | string;
  spendType?: SpendType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reconciliationPeriod?: ReconciliationPeriod; // Mutabakat periyodu
  justification: string;
  notes?: string; // Onaylayıcı için ek notlar
  currency?: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  // İlişkili veriler (opsiyonel)
  customerName?: string;
  channelName?: string;
  tacticName?: string;
  mechanicName?: string;
  category?: string; // Kategori (Hair Care, Color, vb.)
  categoryName?: string; // Kategori adı
  consumedAmount?: number; // Kullanılan tutar
  cplName?: string; // CPL adı
  additionalParams?: Record<string, any>;
  kpiResults?: Record<string, any>;
}

/**
 * Agreement Oluşturma DTO
 */
export interface CreateAgreementDto {
  agreementName?: string;
  description?: string; // Anlaşma kapsamı ve detayları
  agreementType: AgreementType;
  cplId: string;
  channelId: string;
  regionId?: string;
  categoryId?: string; // Category ID
  fuId: string; // Forecasting Unit ID (required per BRD)
  guId?: string;
  skuScope?: SkuScope;
  tacticId: string;
  mechanicId: string;
  mechanicValue?: number;
  mechanicType?: MechanicType;
  capTotalAmount: number | string;
  spendType?: SpendType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reconciliationPeriod?: ReconciliationPeriod; // Mutabakat periyodu
  justification: string;
  notes?: string; // Onaylayıcı için ek notlar
  currency?: string;
  additionalParams?: Record<string, any>;
}

/**
 * Agreement Güncelleme DTO
 */
export interface UpdateAgreementDto extends Partial<CreateAgreementDto> {}

/**
 * Agreement Filtreleme DTO
 */
export interface AgreementFilterDto {
  status?: AgreementStatus;
  cplId?: string;
  channel?: string;
  agreementType?: AgreementType;
  startDate?: string;
  endDate?: string;
  category?: string;
  onlyMine?: boolean; // Sadece benim anlaşmalarım
}

/**
 * Agreement Onaylama DTO
 */
export interface ApproveAgreementDto {
  comments?: string;
}

/**
 * Agreement Reddetme DTO
 */
export interface RejectAgreementDto {
  reason: string; // Zorunlu
}

/**
 * Agreement İptal DTO
 */
export interface CancelAgreementDto {
  reason: string; // Zorunlu
}
