import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import { BudgetLedgerPage } from '@/components/budget/BudgetLedgerPage';
import { useLedgerEntries } from '@/services/ledger.service';
import {
  LedgerEntry,
  LedgerEntryDirection,
  LedgerSpendType,
} from '@/types/ledger.types';
import { render } from '@/tests/utils/test-utils';

vi.mock('@/services/ledger.service');

// T-117 bulgusu: mockLedgerEntry anotasyonsuzken `entryDirection` hiç
// içermiyordu, bu yüzden `getTransactionType`'ın DEBIT/CREDIT ayrımını
// sınayan hiçbir test yoktu. Bu dosya o boşluğu kapatır.
const baseEntry: Omit<LedgerEntry, 'id' | 'entryDirection'> = {
  sourceType: 'AGREEMENT',
  sourceId: 'agreement-1',
  agreementId: 'agreement-1',
  budgetEnvelopeId: 'envelope-1',
  spendType: LedgerSpendType.OFF_INVOICE,
  amount: 10000,
  currency: 'TRY',
  periodMonth: '2024-01',
  postingDate: '2024-01-15',
  idempotencyKey: 'idem-1',
  tenantId: 'tenant-1',
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
};

function makeEntry(
  id: string,
  entryDirection: LedgerEntryDirection | undefined
): LedgerEntry {
  return {
    ...baseEntry,
    id,
    // `entryDirection` is required on `LedgerEntry`, but the production
    // consumer (`BudgetLedgerPage.tsx:72`) treats it as if it can be
    // missing (`if (... === 'DEBIT') ... else RESERVE`) — cast to
    // reproduce that runtime shape instead of silently making the fixture
    // impossible to construct.
    entryDirection: entryDirection as LedgerEntryDirection,
  };
}

function mockEntries(entries: LedgerEntry[]) {
  vi.mocked(useLedgerEntries).mockReturnValue({
    data: entries,
    isLoading: false,
    error: null,
  } as ReturnType<typeof useLedgerEntries>);
}

function getRowByEntryId(entryId: string): HTMLElement {
  const cell = screen.getByText(new RegExp(entryId.substring(0, 20)));
  const row = cell.closest('tr');
  if (!row) throw new Error(`row not found for entry ${entryId}`);
  return row as HTMLElement;
}

describe('BudgetLedgerPage — entryDirection → TransactionType mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps DEBIT to CONSUME', () => {
    mockEntries([makeEntry('debit-entry-1', LedgerEntryDirection.DEBIT)]);
    render(<BudgetLedgerPage />);

    const row = getRowByEntryId('debit-entry-1');
    expect(within(row).getByText('CONSUME')).toBeInTheDocument();
    expect(within(row).queryByText('RESERVE')).not.toBeInTheDocument();
  });

  it('maps CREDIT to RESERVE', () => {
    mockEntries([makeEntry('credit-entry-1', LedgerEntryDirection.CREDIT)]);
    render(<BudgetLedgerPage />);

    const row = getRowByEntryId('credit-entry-1');
    expect(within(row).getByText('RESERVE')).toBeInTheDocument();
  });

  // ⚠️ Bulgu (fix değil, mevcut davranışın kaydı): `getTransactionType`
  // `if (entryDirection === 'DEBIT') CONSUME; else RESERVE;` — `else`'siz
  // bir `if` değil ama CREDIT'i de undefined'ı da aynı sessiz dala
  // düşürüyor. Bu test CREDIT ile ayırt edilemez olan üçüncü durumu
  // (entryDirection eksik) belgeliyor; RAPOR: B2 sonunda.
  it('documents that a missing entryDirection silently falls through to RESERVE (same as CREDIT)', () => {
    mockEntries([makeEntry('undefined-direction-entry-1', undefined)]);
    render(<BudgetLedgerPage />);

    const row = getRowByEntryId('undefined-direction-entry-1');
    expect(within(row).getByText('RESERVE')).toBeInTheDocument();
  });
});
