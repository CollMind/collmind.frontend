import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserDetail } from '@/components/users/UserDetail';
import { useUser } from '@/services/users.service';
import { User, UserRole, UserStatus } from '@/types/user.types';
import { render as customRender } from '@/tests/utils/test-utils';

vi.mock('@/services/users.service');
vi.mock('date-fns', () => ({
  format: (date: Date, formatStr: string) => {
    return date.toISOString();
  },
}));
vi.mock('date-fns/locale', () => ({
  tr: {},
}));

const mockUser: User = {
  id: '1',
  email: 'user@example.com',
  fullName: 'Test User',
  role: UserRole.ADMIN,
  status: UserStatus.ACTIVE,
  tenantId: 'tenant-1',
  phoneNumber: '+90 555 123 4567',
  department: 'IT',
  jobTitle: 'Developer',
  firstName: 'Test',
  lastName: 'User',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
};

describe('UserDetail', () => {
  const mockUseUser = {
    data: mockUser,
    isLoading: false,
    error: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useUser as any).mockReturnValue(mockUseUser);
  });

  it('should render user details', () => {
    customRender(<UserDetail userId="1" />);

    // The email is legitimately rendered twice: once as the page header
    // subtitle, and again inside the detail card. getByText requires a
    // single match, so assert there are exactly the two expected instances
    // instead (see T-040).
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getAllByText('user@example.com')).toHaveLength(2);
    expect(screen.getByText('IT')).toBeInTheDocument();
    expect(screen.getByText('Developer')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    (useUser as any).mockReturnValue({
      ...mockUseUser,
      isLoading: true,
    });

    customRender(<UserDetail userId="1" />);

    // LoadingSpinner should be rendered
    expect(screen.queryByText('Test User')).not.toBeInTheDocument();
  });

  it('should show error state', () => {
    (useUser as any).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to load user'),
    });

    customRender(<UserDetail userId="1" />);

    expect(screen.getByText(/hata oluştu/i)).toBeInTheDocument();
  });

  it('should show empty state when user not found', () => {
    (useUser as any).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });

    customRender(<UserDetail userId="1" />);

    expect(screen.getByText(/kullanıcı bulunamadı/i)).toBeInTheDocument();
  });

  it('should call onEdit when edit button is clicked', async () => {
    const onEdit = vi.fn();
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();

    customRender(<UserDetail userId="1" onEdit={onEdit} />);

    const editButton = screen.getByRole('button', { name: /düzenle/i });
    await user.click(editButton);

    expect(onEdit).toHaveBeenCalled();
  });

  it('should not show edit button when onEdit is not provided', () => {
    customRender(<UserDetail userId="1" />);

    expect(screen.queryByRole('button', { name: /düzenle/i })).not.toBeInTheDocument();
  });
});
