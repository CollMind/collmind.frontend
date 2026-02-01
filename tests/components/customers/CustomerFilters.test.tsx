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
    render(
      <CustomerFilters
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onClear={mockOnClear}
      />,
      { wrapper: customRender }
    );

    expect(screen.getByText('Filtreler')).toBeInTheDocument();
  });

  it('should show active filters badge when filters are active', () => {
    const filtersWithActive: CustomerFilterDto = {
      ...mockFilters,
      channel: CustomerChannel.RETAIL,
    };

    render(
      <CustomerFilters
        filters={filtersWithActive}
        onFiltersChange={mockOnFiltersChange}
        onClear={mockOnClear}
      />,
      { wrapper: customRender }
    );

    expect(screen.getByText('Aktif')).toBeInTheDocument();
  });

  it('should show clear button when filters are active', () => {
    const filtersWithActive: CustomerFilterDto = {
      ...mockFilters,
      status: CustomerStatus.ACTIVE,
    };

    render(
      <CustomerFilters
        filters={filtersWithActive}
        onFiltersChange={mockOnFiltersChange}
        onClear={mockOnClear}
      />,
      { wrapper: customRender }
    );

    expect(screen.getByText('Temizle')).toBeInTheDocument();
  });

  it('should toggle filters visibility', async () => {
    const user = userEvent.setup();
    render(
      <CustomerFilters
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onClear={mockOnClear}
      />,
      { wrapper: customRender }
    );

    const toggleButton = screen.getByText('Göster');
    await user.click(toggleButton);

    expect(screen.getByText('Gizle')).toBeInTheDocument();
    expect(screen.getByLabelText(/Arama/i)).toBeInTheDocument();
  });

  it('should call onFiltersChange when search input changes', async () => {
    const user = userEvent.setup();
    render(
      <CustomerFilters
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onClear={mockOnClear}
      />,
      { wrapper: customRender }
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
    const user = userEvent.setup();
    const filtersWithActive: CustomerFilterDto = {
      ...mockFilters,
      channel: CustomerChannel.RETAIL,
    };

    render(
      <CustomerFilters
        filters={filtersWithActive}
        onFiltersChange={mockOnFiltersChange}
        onClear={mockOnClear}
      />,
      { wrapper: customRender }
    );

    const clearButton = screen.getByText('Temizle');
    await user.click(clearButton);

    expect(mockOnClear).toHaveBeenCalled();
  });

  it('should handle channel filter change', async () => {
    const user = userEvent.setup();
    render(
      <CustomerFilters
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onClear={mockOnClear}
      />,
      { wrapper: customRender }
    );

    // Show filters first
    await user.click(screen.getByText('Göster'));

    // Find select by placeholder
    const channelSelects = screen.getAllByText('Tümü');
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
    const user = userEvent.setup();
    render(
      <CustomerFilters
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onClear={mockOnClear}
      />,
      { wrapper: customRender }
    );

    // Show filters first
    await user.click(screen.getByText('Göster'));

    // Find select by placeholder
    const statusSelects = screen.getAllByText('Tümü');
    const statusSelect = statusSelects[1]; // Second one should be status
    await user.click(statusSelect);

    // Wait for select to open and find option
    await waitFor(() => {
      expect(screen.getByRole('option', { name: /ACTIVE/i })).toBeInTheDocument();
    });

    const activeOption = screen.getByRole('option', { name: /ACTIVE/i });
    await user.click(activeOption);

    expect(mockOnFiltersChange).toHaveBeenCalled();
  });

  it('should handle VIP filter change', async () => {
    const user = userEvent.setup();
    render(
      <CustomerFilters
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onClear={mockOnClear}
      />,
      { wrapper: customRender }
    );

    // Show filters first
    await user.click(screen.getByText('Göster'));

    // Find select by placeholder
    const vipSelects = screen.getAllByText('Tümü');
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
