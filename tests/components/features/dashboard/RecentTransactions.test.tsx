import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RecentTransactions } from '@/components/features/dashboard/RecentTransactions';

describe('RecentTransactions', () => {
  it('renders title', () => {
    render(<RecentTransactions />);
    expect(screen.getByText(/Recent Transactions/i)).toBeInTheDocument();
  });

  it('renders transaction items', () => {
    render(<RecentTransactions />);
    expect(screen.getByText(/INV-2026-003/i)).toBeInTheDocument();
    expect(screen.getByText(/INV-2026-002/i)).toBeInTheDocument();
    expect(screen.getByText(/INV-2026-001/i)).toBeInTheDocument();
  });

  it('renders transaction types', () => {
    render(<RecentTransactions />);
    // Invoice Approval appears multiple times, use getAllByText
    expect(screen.getAllByText(/Invoice Approval/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Invoice Rejection/i)).toBeInTheDocument();
    expect(screen.getByText(/Bulk Invoice Entry/i)).toBeInTheDocument();
  });

  it('renders transaction times', () => {
    render(<RecentTransactions />);
    expect(screen.getByText(/14:22/i)).toBeInTheDocument();
    expect(screen.getByText(/14:20/i)).toBeInTheDocument();
  });
});

