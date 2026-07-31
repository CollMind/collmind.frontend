import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomerDetail } from '@/components/customers/CustomerDetail';
import {
  useCustomer,
  useCustomerStats,
  useDeleteCustomer,
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
  }),
}));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: '1' }),
    useNavigate: () => vi.fn(),
  };
});

const mockCustomer: Customer = {
  id: '1',
  code: 'CUST001',
  name: 'Test Customer',
  channel: CustomerChannel.RETAIL,
  type: CustomerType.DIRECT,
  status: CustomerStatus.ACTIVE,
  city: 'İstanbul',
  district: 'Kadıköy',
  region: 'Marmara',
  country: 'Türkiye',
  contactPerson: 'John Doe',
  contactEmail: 'contact@example.com',
  contactPhone: '02121234567',
  isVip: false,
  numberOfBranches: 5,
  tenantId: 'tenant-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockStats = {
  totalOrders: 100,
  totalRevenue: 50000,
  lastOrderDate: new Date().toISOString(),
  averageOrderValue: 500,
};

describe('CustomerDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useCustomer as any).mockReturnValue({
      data: mockCustomer,
      isLoading: false,
      error: null,
    });
    (useCustomerStats as any).mockReturnValue({
      data: mockStats,
      isLoading: false,
      error: null,
    });
    (useDeleteCustomer as any).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    });
  });

  it('should render customer details', () => {
    customRender(<CustomerDetail />);

    // Customer name is legitimately rendered twice: as the page <h1> and
    // again as the "Ad" field in the "Genel Bilgiler" card. Assert on the
    // heading specifically instead of an ambiguous text match (see T-040).
    expect(
      screen.getByRole('heading', { name: 'Test Customer' })
    ).toBeInTheDocument();
    expect(screen.getByText('Kod: CUST001')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    (useCustomer as any).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    customRender(<CustomerDetail />);

    // Loading spinner should be shown
    expect(screen.queryByText('Test Customer')).not.toBeInTheDocument();
  });

  it('should show error state', () => {
    (useCustomer as any).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Customer not found'),
    });

    customRender(<CustomerDetail />);

    expect(
      screen.getByText(/Müşteri bulunamadı/i)
    ).toBeInTheDocument();
  });

  it('should display customer statistics', () => {
    customRender(<CustomerDetail />);

    expect(screen.getByText('100')).toBeInTheDocument(); // totalOrders
    expect(screen.getByText(/50.000/i)).toBeInTheDocument(); // totalRevenue
  });

  it('should display customer contact information', () => {
    customRender(<CustomerDetail />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('contact@example.com')).toBeInTheDocument();
    expect(screen.getByText('02121234567')).toBeInTheDocument();
  });

  it('should display customer address information', () => {
    customRender(<CustomerDetail />);

    expect(screen.getByText(/Kadıköy, İstanbul, Marmara/i)).toBeInTheDocument();
  });

  it('should display number of branches', () => {
    customRender(<CustomerDetail />);

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should show edit and delete buttons', () => {
    customRender(<CustomerDetail />);

    expect(screen.getByText('Düzenle')).toBeInTheDocument();
    expect(screen.getByText('Sil')).toBeInTheDocument();
  });

  it('should show delete confirmation dialog', async () => {
    const user = userEvent.setup();
    customRender(<CustomerDetail />);

    const deleteButton = screen.getByText('Sil');
    await user.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText(/silmek istediğinizden emin misiniz/i)).toBeInTheDocument();
    });
  });
});
