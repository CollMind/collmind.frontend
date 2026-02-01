import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChangePasswordForm } from '@/components/users/ChangePasswordForm';
import { useChangeMyPassword, useChangeUserPassword } from '@/services/users.service';
import { render as customRender } from '@/tests/utils/test-utils';

vi.mock('@/services/users.service');
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('ChangePasswordForm', () => {
  const mockChangeMyPassword = {
    mutateAsync: vi.fn(),
    isPending: false,
  };

  const mockChangeUserPassword = {
    mutateAsync: vi.fn(),
    isPending: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useChangeMyPassword as any).mockReturnValue(mockChangeMyPassword);
    (useChangeUserPassword as any).mockReturnValue(mockChangeUserPassword);
  });

  it('should render form fields', () => {
    customRender(<ChangePasswordForm />);

    expect(screen.getByLabelText(/mevcut şifre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/yeni şifre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/yeni şifre tekrar/i)).toBeInTheDocument();
  });

  it('should submit form with valid data', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    mockChangeMyPassword.mutateAsync.mockResolvedValue(undefined);

    customRender(<ChangePasswordForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText(/mevcut şifre/i), 'old-password');
    await user.type(screen.getByLabelText(/yeni şifre/i), 'new-password123');
    await user.type(screen.getByLabelText(/yeni şifre tekrar/i), 'new-password123');

    await user.click(screen.getByRole('button', { name: /şifreyi güncelle/i }));

    await waitFor(() => {
      expect(mockChangeMyPassword.mutateAsync).toHaveBeenCalledWith({
        currentPassword: 'old-password',
        newPassword: 'new-password123',
      });
    });

    expect(onSuccess).toHaveBeenCalled();
  });

  it('should show validation error for mismatched passwords', async () => {
    const user = userEvent.setup();

    customRender(<ChangePasswordForm />);

    await user.type(screen.getByLabelText(/mevcut şifre/i), 'old-password');
    await user.type(screen.getByLabelText(/yeni şifre/i), 'new-password123');
    await user.type(screen.getByLabelText(/yeni şifre tekrar/i), 'different-password');

    await user.click(screen.getByRole('button', { name: /şifreyi güncelle/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
    });

    expect(mockChangeMyPassword.mutateAsync).not.toHaveBeenCalled();
  });

  it('should use changeUserPassword when userId is provided', async () => {
    const user = userEvent.setup();
    mockChangeUserPassword.mutateAsync.mockResolvedValue(undefined);

    customRender(<ChangePasswordForm userId="123" />);

    // Admin form should not show currentPassword field
    expect(screen.queryByLabelText(/mevcut şifre/i)).not.toBeInTheDocument();
    
    await user.type(screen.getByLabelText(/yeni şifre/i), 'new-password123');
    await user.type(screen.getByLabelText(/yeni şifre tekrar/i), 'new-password123');

    await user.click(screen.getByRole('button', { name: /şifreyi güncelle/i }));

    await waitFor(() => {
      expect(mockChangeUserPassword.mutateAsync).toHaveBeenCalledWith({
        id: '123',
        data: {
          // Admin doesn't need to provide currentPassword
          newPassword: 'new-password123',
        },
      });
    });
  });

  it('should show loading state', () => {
    (useChangeMyPassword as any).mockReturnValue({
      ...mockChangeMyPassword,
      isPending: true,
    });

    customRender(<ChangePasswordForm />);

    expect(screen.getByText(/güncelleniyor/i)).toBeInTheDocument();
  });
});
