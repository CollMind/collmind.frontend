import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomerFilters } from '@/components/customers/CustomerFilters';
import {
  CustomerChannel,
  CustomerStatus,
  CustomerFilterDto,
} from '@/types/customer.types';
import { render as customRender } from '@/tests/utils/test-utils';

// `userEvent.setup({ pointerEventsCheck: 0 })` disables userEvent's
// pointer-events precondition check. Radix Select's option items keep
// `pointer-events: none` on their inner text node while jsdom lacks real
// layout, which makes that check reject clicks a real browser would happily
// deliver. An earlier version of this file worked around it by mixing in
// raw `fireEvent.click` for just the option elements, but interleaving
// fireEvent with an in-flight userEvent pointer session left userEvent's
// internal per-document state inconsistent for later tests/files sharing
// the same worker process — the leading suspect for an intermittent full
// suite hang (see T-040). Disabling the check keeps every interaction on
// the same `user` API instead.
describe('CustomerFilters', () => {
  const mockFilters: CustomerFilterDto = {
    page: 1,
    limit: 10,
    sortBy: 'name',
    sortOrder: 'ASC',
  };

  const mockOnFiltersChange = vi.fn();
  const mockOnClear = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render filters component', () => {
    customRender(
      <CustomerFilters
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onClear={mockOnClear}
      />
    );

    expect(screen.getByText('Filtreler')).toBeInTheDocument();
  });

  it('should show active filters badge when filters are active', () => {
    const filtersWithActive: CustomerFilterDto = {
      ...mockFilters,
      channel: CustomerChannel.RETAIL,
    };

    customRender(
      <CustomerFilters
        filters={filtersWithActive}
        onFiltersChange={mockOnFiltersChange}
        onClear={mockOnClear}
      />
    );

    expect(screen.getByText('Aktif')).toBeInTheDocument();
  });

  it('should show clear button when filters are active', () => {
    const filtersWithActive: CustomerFilterDto = {
      ...mockFilters,
      status: CustomerStatus.ACTIVE,
    };

    customRender(
      <CustomerFilters
        filters={filtersWithActive}
        onFiltersChange={mockOnFiltersChange}
        onClear={mockOnClear}
      />
    );

    expect(screen.getByText('Temizle')).toBeInTheDocument();
  });

  it('should toggle filters visibility', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    customRender(
      <CustomerFilters
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onClear={mockOnClear}
      />
    );

    const toggleButton = screen.getByText('Göster');
    await user.click(toggleButton);

    expect(screen.getByText('Gizle')).toBeInTheDocument();
    expect(screen.getByLabelText(/Arama/i)).toBeInTheDocument();
  });

  it('should call onFiltersChange when search input changes', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    customRender(
      <CustomerFilters
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onClear={mockOnClear}
      />
    );

    // Show filters first
    await user.click(screen.getByText('Göster'));

    const searchInput = screen.getByPlaceholderText(/Ad, kod, email/i);
    await user.type(searchInput, 'test');

    // Wait for debounce
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(mockOnFiltersChange).toHaveBeenCalled();
  });

  it('should call onClear when clear button is clicked', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const filtersWithActive: CustomerFilterDto = {
      ...mockFilters,
      channel: CustomerChannel.RETAIL,
    };

    customRender(
      <CustomerFilters
        filters={filtersWithActive}
        onFiltersChange={mockOnFiltersChange}
        onClear={mockOnClear}
      />
    );

    const clearButton = screen.getByText('Temizle');
    await user.click(clearButton);

    expect(mockOnClear).toHaveBeenCalled();
  });

  it('should handle channel filter change', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    customRender(
      <CustomerFilters
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onClear={mockOnClear}
      />
    );

    // Show filters first
    await user.click(screen.getByText('Göster'));

    // Find select by placeholder
    // Radix's SelectValue renders the visible text in an inert <span
    // style="pointer-events: none">, deliberately, so clicks pass through
    // to the actual trigger <button>. Querying by that text and clicking it
    // directly (as the original test did) always fails userEvent's
    // pointer-events precondition; the combobox role is the trigger button
    // itself (see T-040).
    const channelSelects = screen.getAllByRole('combobox');
    const channelSelect = channelSelects[0]; // First one should be channel
    await user.click(channelSelect);

    // Wait for select to open and find option
    await waitFor(() => {
      expect(screen.getByRole('option', { name: /RETAIL/i })).toBeInTheDocument();
    });

    const retailOption = screen.getByRole('option', { name: /RETAIL/i });
    await user.click(retailOption);

    expect(mockOnFiltersChange).toHaveBeenCalled();
  });

  it('should handle status filter change', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    customRender(
      <CustomerFilters
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onClear={mockOnClear}
      />
    );

    // Show filters first
    await user.click(screen.getByText('Göster'));

    // Find select by placeholder
    const statusSelects = screen.getAllByRole('combobox');
    const statusSelect = statusSelects[1]; // Second one should be status
    await user.click(statusSelect);

    // Wait for select to open and find option.
    // Anchored regex: the unanchored /ACTIVE/i also matched the "Inactive"
    // option (a case-insensitive substring match), which made
    // getByRole('option', ...) fail with "found multiple elements" (see
    // T-040).
    await waitFor(() => {
      expect(screen.getByRole('option', { name: /^active$/i })).toBeInTheDocument();
    });

    const activeOption = screen.getByRole('option', { name: /^active$/i });
    await user.click(activeOption);

    expect(mockOnFiltersChange).toHaveBeenCalled();
  });

  it('should handle VIP filter change', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    customRender(
      <CustomerFilters
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onClear={mockOnClear}
      />
    );

    // Show filters first
    await user.click(screen.getByText('Göster'));

    // Find select by placeholder
    const vipSelects = screen.getAllByRole('combobox');
    const vipSelect = vipSelects[2]; // Third one should be VIP
    await user.click(vipSelect);

    // Wait for select to open and find option
    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Evet/i })).toBeInTheDocument();
    });

    const yesOption = screen.getByRole('option', { name: /Evet/i });
    await user.click(yesOption);

    expect(mockOnFiltersChange).toHaveBeenCalled();
  });
});
