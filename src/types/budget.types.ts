/**
 * Budget Types
 *
 * Budget envelope ve reservation ile ilgili type tanımlamaları
 */

/**
 * Budget Kategori
 */
export enum BudgetCategory {
  HAIR_CARE = 'HAIR_CARE',
  COLOR = 'COLOR',
  SKIN_CARE = 'SKIN_CARE',
  BODY_CARE = 'BODY_CARE',
  SUN_CARE = 'SUN_CARE',
  MEN = 'MEN',
  BABY = 'BABY',
}

/**
 * Budget Envelope Durumları
 */
export enum BudgetEnvelopeStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Budget Envelope
 */
export interface BudgetEnvelope {
  id: string;
  code: string;
  name: string;
  fiscalYear: string;
  period: string; // Örn: "2026-01", "2026-02", vb. (YYYY-MM formatı)
  allocatedAmount: number;
  consumedAmount: number;
  availableAmount: number;
  reservedAmount?: number; // Rezerve edilmiş tutar
  onInvoiceConsumed?: number; // On-Invoice tüketilen
  offInvoiceConsumed?: number; // Off-Invoice tüketilen
  currency: 'TRY' | 'USD' | 'EUR';
  status: BudgetEnvelopeStatus;
  channel?: string; // Kanal (NKA, ECOM, DT, TT, vb.)
  category?: string; // Kategori (HAIR_CARE, COLOR, vb.)
  budgetOwnerId?: string;
  budgetOwnerEmail?: string;
  budgetOwnerName?: string;
  tenantId?: string;
  description?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Budget Envelope Oluşturma DTO
 */
export interface CreateBudgetEnvelopeDto {
  code?: string; // Otomatik oluşturulacak: {channel}/{category}/{period}
  name?: string; // Otomatik oluşturulacak
  fiscalYear: string; // Yıl (örn: "2026")
  period: string; // Ay (örn: "01", "02", vb.) veya tam period (örn: "2026-01")
  month?: string; // Ay (örn: "01", "02", vb.)
  allocatedAmount: number;
  channel: string; // Kanal (NKA, ECOM, DT, TT, vb.)
  category: string; // Kategori (HAIR_CARE, COLOR, vb.)
  status?: BudgetEnvelopeStatus;
  budgetOwnerId?: string;
  budgetOwnerEmail?: string;
  budgetOwnerName?: string;
  currency?: 'TRY' | 'USD' | 'EUR'; // Default: 'TRY'
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Budget Reservation Durumları
 */
export enum BudgetReservationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

/**
 * Budget Reservation
 */
export interface BudgetReservation {
  id: string;
  envelopeId: string;
  amount: number;
  agreementName?: string;
  notes?: string;
  status: BudgetReservationStatus;
  requestedBy?: string;
  approvedBy?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Budget Rezerve Etme DTO
 */
export interface ReserveBudgetDto {
  envelopeId: string;
  agreementId: string; // Zorunlu
  amount: number;
  currency?: string; // Default: 'TRY'
}

/**
 * Budget Transaction Tipleri
 */
export enum BudgetTransactionType {
  RESERVE = 'RESERVE',
  CONSUME = 'CONSUME',
  RELEASE = 'RELEASE',
  ADJUST = 'ADJUST',
}

/**
 * Budget Transaction Durumları
 */
export enum BudgetTransactionStatus {
  POSTED = 'POSTED',
  PENDING = 'PENDING',
  CANCELLED = 'CANCELLED',
}

/**
 * Budget Transaction Source Tipleri
 */
export enum BudgetTransactionSourceType {
  AGREEMENT = 'AGREEMENT',
  MANUAL = 'MANUAL',
  SYSTEM = 'SYSTEM',
}

/**
 * Budget Transaction
 */
export interface BudgetTransaction {
  id: string;
  envelopeId: string;
  txType: BudgetTransactionType;
  txStatus: BudgetTransactionStatus;
  sourceType: BudgetTransactionSourceType;
  sourceId: string; // agreementId veya diğer kaynak ID'si
  amount: number;
  currency: string;
  idempotencyKey?: string;
  description?: string;
  createdAt: string;
}

/**
 * Rezerve Edilmiş Tutar Response
 */
export interface ReservedAmountResponse {
  envelopeId: string;
  reservedAmount: number;
}
