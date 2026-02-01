import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../utils/test-utils';
import { LoginForm } from '@/components/features/auth/LoginForm';
import { useLogin } from '@/services/auth.service';
import * as router from 'react-router-dom';

vi.mock('@/services/auth.service');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe('LoginForm', () => {
  const mockMutate = vi.fn();
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.mocked(useLogin).mockReturnValue({
      mutate: mockMutate,
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
      error: null,
      isError: false,
      isSuccess: false,
    } as any);

    vi.spyOn(router, 'useNavigate').mockReturnValue(mockNavigate);
  });

  it('renders login form fields', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('validates email format', async () => {
    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });
  });

  it('validates password length', async () => {
    render(<LoginForm />);

    const passwordInput = screen.getByLabelText(/password/i);
    fireEvent.change(passwordInput, { target: { value: 'short' } });
    fireEvent.blur(passwordInput);

    await waitFor(() => {
      expect(
        screen.getByText(/password must be at least 8 characters/i)
      ).toBeInTheDocument();
    });
  });
});

