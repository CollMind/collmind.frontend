import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomerList } from '@/components/customers/CustomerList';
import {
  useCustomers,
  useDeleteCustomer,
  useActivateCustomer,
  useDeactivateCustomer,
} from '@/services/customers.service';
import {
  Customer,
  CustomerChannel,
  CustomerStatus,
  CustomerType,
} from '@/types/customer.types';
import { render as customRender } from '@/tests/utils/test-utils';

vi.mock('@/services/customers.service');
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  }),
}));
vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: string) => value,
}));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

const mockCustomers: Customer[] = [
  {
    id: '1',
    code: 'CUST001',
    name: 'Customer One',
    channel: CustomerChannel.RETAIL,
    type: CustomerType.DIRECT,
    status: CustomerStatus.ACTIVE,
    city: 'İstanbul',
    isVip: false,
    numberOfBranches: 5,
    tenantId: 'tenant-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    code: 'CUST002',
    name: 'Customer Two',
    channel: CustomerChannel.WHOLESALE,
    type: CustomerType.DISTRIBUTOR,
    status: CustomerStatus.INACTIVE,
    city: 'Ankara',
    isVip: true,
    numberOfBranches: 10,
    tenantId: 'tenant-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe('CustomerList', () => {
  const mockOnEdit = vi.fn();
  const mockOnCreate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useCustomers as any).mockReturnValue({
      data: mockCustomers,
      isLoading: false,
      error: null,
    });
    (useDeleteCustomer as any).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    });
    (useActivateCustomer as any).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(mockCustomers[0]),
      isPending: false,
    });
    (useDeactivateCustomer as any).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(mockCustomers[0]),
      isPending: false,
    });
  });

  it('should render customer list', () => {
    render(
      <CustomerList onEdit={mockOnEdit} onCreate={mockOnCreate} />,
      { wrapper: customRender }
    );

    expect(screen.getByText('Customer One')).toBeInTheDocument();
    expect(screen.getByText('Customer Two')).toBeInTheDocument();
    expect(screen.getByText('CUST001')).toBeInTheDocument();
    expect(screen.getByText('CUST002')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    (useCustomers as any).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(
      <CustomerList onEdit={mockOnEdit} onCreate={mockOnCreate} />,
      { wrapper: customRender }
    );

    // Loading spinner should be shown
    expect(screen.queryByText('Customer One')).not.toBeInTheDocument();
  });

  it('should show error state', () => {
    (useCustomers as any).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch'),
    });

    render(
      <CustomerList onEdit={mockOnEdit} onCreate={mockOnCreate} />,
      { wrapper: customRender }
    );

    expect(
      screen.getByText(/Müşteriler yüklenirken bir hata oluştu/i)
    ).toBeInTheDocument();
  });

  it('should show empty state when no customers', () => {
    (useCustomers as any).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(
      <CustomerList onEdit={mockOnEdit} onCreate={mockOnCreate} />,
      { wrapper: customRender }
    );

    expect(screen.getByText(/Müşteri bulunamadı/i)).toBeInTheDocument();
  });

  it('should call onCreate when create button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <CustomerList onEdit={mockOnEdit} onCreate={mockOnCreate} />,
      { wrapper: customRender }
    );

    const createButton = screen.getByText('Yeni Müşteri');
    await user.click(createButton);

    expect(mockOnCreate).toHaveBeenCalled();
  });

  it('should call onEdit when edit is clicked', async () => {
    const user = userEvent.setup();
    render(
      <CustomerList onEdit={mockOnEdit} onCreate={mockOnCreate} />,
      { wrapper: customRender }
    );

    // Find and click the actions menu
    const actionButtons = screen.getAllByRole('button');
    const moreButton = actionButtons.find((btn) =>
      btn.querySelector('svg')
    );
    
    if (moreButton) {
      await user.click(moreButton);
      
      // Wait for dropdown menu to appear
      await waitFor(() => {
        expect(screen.getByText('Düzenle')).toBeInTheDocument();
      });

      const editButton = screen.getByText('Düzenle');
      await user.click(editButton);

      expect(mockOnEdit).toHaveBeenCalled();
    }
  });

  it('should display customer information correctly', () => {
    render(
      <CustomerList onEdit={mockOnEdit} onCreate={mockOnCreate} />,
      { wrapper: customRender }
    );

    expect(screen.getByText('CUST001')).toBeInTheDocument();
    expect(screen.getByText('Customer One')).toBeInTheDocument();
    expect(screen.getByText('İstanbul')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should display VIP badge for VIP customers', () => {
    render(
      <CustomerList onEdit={mockOnEdit} onCreate={mockOnCreate} />,
      { wrapper: customRender }
    );

    expect(screen.getByText('VIP')).toBeInTheDocument();
  });
});
