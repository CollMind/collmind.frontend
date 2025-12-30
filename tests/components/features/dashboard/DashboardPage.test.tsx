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
    expect(screen.getByText(/Total Spending/i)).toBeInTheDocument();
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

