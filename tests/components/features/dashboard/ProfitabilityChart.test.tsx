import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProfitabilityChart } from '@/components/features/dashboard/ProfitabilityChart';

describe('ProfitabilityChart', () => {
  it('renders chart title', () => {
    render(<ProfitabilityChart />);
    expect(screen.getByText(/CPL-Based Profitability/i)).toBeInTheDocument();
  });

  it('renders legend', () => {
    render(<ProfitabilityChart />);
    expect(screen.getByText(/Net Sales/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Spending/i)).toBeInTheDocument();
  });

  it('renders category labels', () => {
    render(<ProfitabilityChart />);
    expect(screen.getByText(/Migros/i)).toBeInTheDocument();
    expect(screen.getByText(/Yerel/i)).toBeInTheDocument();
    expect(screen.getByText(/Gratis/i)).toBeInTheDocument();
  });
});

