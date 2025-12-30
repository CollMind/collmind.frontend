import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricCard } from '@/components/features/dashboard/MetricCard';

describe('MetricCard', () => {
  it('renders title and value', () => {
    render(<MetricCard title="Total Sales" value="$10,000" />);
    expect(screen.getByText('Total Sales')).toBeInTheDocument();
    expect(screen.getByText('$10,000')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(
      <MetricCard
        title="Total Sales"
        value="$10,000"
        subtitle="Compared to last month"
      />
    );
    expect(screen.getByText('Compared to last month')).toBeInTheDocument();
  });

  it('does not render subtitle when not provided', () => {
    const { container } = render(
      <MetricCard title="Total Sales" value="$10,000" />
    );
    const subtitle = container.querySelector('.text-xs.text-gray-500');
    expect(subtitle).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <MetricCard
        title="Total Sales"
        value="$10,000"
        className="custom-class"
      />
    );
    const card = container.querySelector('.custom-class');
    expect(card).toBeInTheDocument();
  });
});

