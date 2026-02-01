import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardPage } from '@/components/features/dashboard/DashboardPage';

describe('DashboardPage', () => {
  it('renders dashboard title', () => {
    render(<DashboardPage />);
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
  });

  it('renders metric cards', () => {
    render(<DashboardPage />);
    expect(screen.getByText(/Gross Sales/i)).toBeInTheDocument();
    // Total Spending appears multiple times, use getAllByText
    expect(screen.getAllByText(/Total Spending/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Discount Rate/i)).toBeInTheDocument();
    expect(screen.getByText(/Pending Approval/i)).toBeInTheDocument();
  });

  it('renders profitability chart', () => {
    render(<DashboardPage />);
    expect(screen.getByText(/CPL-Based Profitability/i)).toBeInTheDocument();
  });

  it('renders recent transactions', () => {
    render(<DashboardPage />);
    expect(screen.getByText(/Recent Transactions/i)).toBeInTheDocument();
  });
});

