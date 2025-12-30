import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EnumBadge } from '@/components/common/EnumBadge';

describe('EnumBadge', () => {
  it('returns null when value is not provided', () => {
    const { container } = render(<EnumBadge value="" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders status badge with correct color for ACTIVE', () => {
    render(<EnumBadge value="ACTIVE" type="status" />);
    const badge = screen.getByText('Active');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-green-100');
  });

  it('renders status badge with correct color for INACTIVE', () => {
    render(<EnumBadge value="INACTIVE" type="status" />);
    const badge = screen.getByText('Inactive');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-gray-100');
  });

  it('renders role badge with correct color for ADMIN', () => {
    render(<EnumBadge value="ADMIN" type="role" />);
    const badge = screen.getByText('Admin');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-purple-100');
  });

  it('renders channel badge with correct color for NKA', () => {
    render(<EnumBadge value="NKA" type="channel" />);
    const badge = screen.getByText('Nka');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-indigo-100');
  });

  it('auto-detects status type', () => {
    render(<EnumBadge value="PENDING" type="auto" />);
    const badge = screen.getByText('Pending');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-yellow-100');
  });

  it('auto-detects role type', () => {
    render(<EnumBadge value="PLANNER" type="auto" />);
    const badge = screen.getByText('Planner');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-blue-100');
  });

  it('formats underscore-separated values correctly', () => {
    render(<EnumBadge value="TRADITIONAL_TRADE" type="channel" />);
    expect(screen.getByText('Traditional Trade')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<EnumBadge value="ACTIVE" className="custom-class" />);
    const badge = screen.getByText('Active');
    expect(badge.className).toContain('custom-class');
  });
});

