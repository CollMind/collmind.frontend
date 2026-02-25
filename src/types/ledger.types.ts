/**
 * Ledger Types
 * 
 * Defter kayıtları ile ilgili type tanımlamaları
 */

export enum LedgerEntryDirection {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

export enum LedgerSpendType {
  ON_INVOICE = 'ON_INVOICE',
  OFF_INVOICE = 'OFF_INVOICE',
  ADJUSTMENT = 'ADJUSTMENT',
  ACCRUAL = 'ACCRUAL',
}

export enum TransactionType {
  RESERVE = 'RESERVE',
  CONSUME = 'CONSUME',
}

export enum EntityType {
  INV = 'INV', // Invoice
  PLAN = 'PLAN',
  AGREEMENT = 'AGREEMENT',
}

export interface LedgerEntry {
  id: string;
  sourceType: string; // 'AGREEMENT', 'PLAN', 'MANUAL'
  sourceId: string;
  agreementId?: string;
  budgetEnvelopeId?: string;
  spendType: LedgerSpendType;
  entryDirection: LedgerEntryDirection;
  amount: number;
  currency: string;
  periodMonth: string; // YYYY-MM
  postingDate: string; // YYYY-MM-DD
  channel?: string;
  cplId?: string;
  fuId?: string;
  tacticId?: string;
  mechanicId?: string;
  idempotencyKey: string;
  description?: string;
  metadata?: Record<string, any>;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  // İlişkili veriler (opsiyonel)
  agreement?: {
    id: string;
    agreementCode: string;
    agreementName?: string;
  };
  budgetEnvelope?: {
    id: string;
    name: string;
  };
  customer?: {
    id: string;
    name: string;
    code: string;
  };
  createdByUser?: {
    id: string;
    fullName: string;
  };
}

export interface LedgerFilterDto {
  agreementId?: string;
  budgetEnvelopeId?: string;
  periodMonth?: string; // YYYY-MM
  spendType?: LedgerSpendType;
  search?: string; // Referans, Kullanıcı veya Kapsam ara
}

export interface ConsumedAmountResponse {
  agreementId?: string;
  envelopeId?: string;
  consumed: number;
}
