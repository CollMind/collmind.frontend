/**
 * Budget Types
 * 
 * Budget envelope ve reservation ile ilgili type tanımlamaları
 */

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
  period: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'YEAR';
  allocatedAmount: number;
  consumedAmount: number;
  availableAmount: number;
  currency: 'TRY' | 'USD' | 'EUR';
  status: BudgetEnvelopeStatus;
  budgetOwnerName?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Budget Envelope Oluşturma DTO
 */
export interface CreateBudgetEnvelopeDto {
  code: string;
  name: string;
  fiscalYear: string;
  period: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'YEAR';
  allocatedAmount: number;
  status: BudgetEnvelopeStatus;
  currency: 'TRY' | 'USD' | 'EUR';
  description?: string;
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
  amount: number;
  agreementName?: string;
  notes?: string;
}
