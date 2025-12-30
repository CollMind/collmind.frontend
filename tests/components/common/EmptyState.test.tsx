import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '@/components/common/EmptyState';

describe('EmptyState', () => {
  it('renders with default message', () => {
    render(<EmptyState />);
    expect(screen.getByText('No data found')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<EmptyState message="Custom empty message" />);
    expect(screen.getByText('Custom empty message')).toBeInTheDocument();
  });

  it('renders with description', () => {
    render(
      <EmptyState
        message="No items"
        description="There are no items to display at this time."
      />
    );
    expect(screen.getByText('No items')).toBeInTheDocument();
    expect(
      screen.getByText('There are no items to display at this time.')
    ).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    const { container } = render(<EmptyState message="No items" />);
    const description = container.querySelector('p.text-sm.text-gray-500');
    expect(description).not.toBeInTheDocument();
  });
});

