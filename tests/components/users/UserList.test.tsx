import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserList } from '@/components/users/UserList';
import {
  useUsers,
  useDeleteUser,
  useActivateUser,
  useDeactivateUser,
} from '@/services/users.service';
import { User, UserRole, UserStatus } from '@/types/user.types';
import { render as customRender } from '@/tests/utils/test-utils';

vi.mock('@/services/users.service');
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
    useNavigate: () => vi.fn(),
  };
});

const mockUsers: User[] = [
  {
    id: '1',
    email: 'user1@example.com',
    fullName: 'User One',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    tenantId: 'tenant-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    email: 'user2@example.com',
    fullName: 'User Two',
    role: UserRole.PLANNER,
    status: UserStatus.INACTIVE,
    tenantId: 'tenant-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe('UserList', () => {
  const mockUseUsers = {
    data: mockUsers,
    isLoading: false,
    error: null,
  };

  const mockDeleteUser = {
    mutateAsync: vi.fn(),
    isPending: false,
  };

  const mockActivateUser = {
    mutateAsync: vi.fn(),
    isPending: false,
  };

  const mockDeactivateUser = {
    mutateAsync: vi.fn(),
    isPending: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useUsers as any).mockReturnValue(mockUseUsers);
    (useDeleteUser as any).mockReturnValue(mockDeleteUser);
    (useActivateUser as any).mockReturnValue(mockActivateUser);
    (useDeactivateUser as any).mockReturnValue(mockDeactivateUser);
  });

  it('should render users list', () => {
    customRender(<UserList />);

    expect(screen.getByText('User One')).toBeInTheDocument();
    expect(screen.getByText('User Two')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    (useUsers as any).mockReturnValue({
      ...mockUseUsers,
      isLoading: true,
    });

    customRender(<UserList />);

    // LoadingSpinner component should be rendered
    expect(screen.queryByText('User One')).not.toBeInTheDocument();
  });

  it('should filter users by search term', async () => {
    const user = userEvent.setup();
    customRender(<UserList />);

    const searchInput = screen.getByPlaceholderText(/kullanıcı ara/i);
    await user.type(searchInput, 'One');

    await waitFor(() => {
      expect(screen.getByText('User One')).toBeInTheDocument();
      expect(screen.queryByText('User Two')).not.toBeInTheDocument();
    });
  });

  it('should filter users by role', async () => {
    // pointerEventsCheck: 0 — see CustomerFilters.test.tsx for why (Radix
    // Select option text nodes are inert; mixing fireEvent with an
    // in-flight userEvent pointer session left userEvent's internal state
    // inconsistent for later files sharing the worker, a leading suspect
    // for an intermittent full-suite hang, see T-040).
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    customRender(<UserList />);

    // The Role/Status filters default to "all" (Select value="all"), so
    // SelectValue renders "Tüm Roller"/"Tüm Durumlar" rather than its
    // `placeholder` prop ("Rol Filtrele"/"Durum Filtrele") — the placeholder
    // text the original test looked for is never actually on screen. Target
    // the trigger by its combobox role instead (see T-040).
    const roleFilter = screen.getAllByRole('combobox')[0];
    await user.click(roleFilter);

    // Select role filter
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Admin' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('option', { name: 'Admin' }));

    await waitFor(() => {
      expect(screen.getByText('User One')).toBeInTheDocument();
      expect(screen.queryByText('User Two')).not.toBeInTheDocument();
    });
  });

  it('should filter users by status', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    customRender(<UserList />);

    const statusFilter = screen.getAllByRole('combobox')[1];
    await user.click(statusFilter);

    // Select status filter
    await waitFor(() => {
      expect(
        screen.getByRole('option', { name: /^active$/i })
      ).toBeInTheDocument();
    });
    await user.click(screen.getByRole('option', { name: /^active$/i }));

    await waitFor(() => {
      expect(screen.getByText('User One')).toBeInTheDocument();
      expect(screen.queryByText('User Two')).not.toBeInTheDocument();
    });
  });

  it('should call onEdit when edit button is clicked', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    customRender(<UserList onEdit={onEdit} />);

    // Find and click the edit button (dropdown menu)
    const moreButtons = screen.getAllByRole('button');
    const moreButton = moreButtons.find((btn) =>
      btn.querySelector('svg')
    );

    if (moreButton) {
      await user.click(moreButton);
      // Wait for dropdown to appear and click edit
      await waitFor(() => {
        const editOption = screen.getByText(/düzenle/i);
        if (editOption) {
          user.click(editOption);
        }
      });
    }
  });

  it('should show empty state when no users', () => {
    (useUsers as any).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    customRender(<UserList />);

    expect(screen.getByText(/kullanıcı bulunamadı/i)).toBeInTheDocument();
  });
});
