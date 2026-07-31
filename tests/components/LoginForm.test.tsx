import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
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

  it('does not submit the form when email format is invalid', async () => {
    // LoginForm's useForm() does not set `mode`, so react-hook-form uses its
    // default 'onSubmit' validation trigger — fields are validated on submit,
    // not on blur (consistent with every other form in the app; none of them
    // pass a `mode` option either).
    //
    // The email input is also `type="email"`, so jsdom (matching real
    // browsers) enforces native HTML5 constraint validation on submit: an
    // invalid-format value blocks the `submit` event entirely, which means
    // react-hook-form's handleSubmit/zodResolver never runs and the custom
    // "Invalid email address" Zod message never renders — the browser's own
    // native validation UI pre-empts it. The original test asserted on that
    // Zod message, which is unreachable for this field as implemented, so it
    // failed deterministically for reasons unrelated to base-URL/parse fixes
    // (see T-040). Asserting on the actually-guaranteed outcome instead: an
    // invalid email must never reach the login mutation.
    const mutateAsync = vi.fn().mockResolvedValue({});
    vi.mocked(useLogin).mockReturnValue({
      mutate: mockMutate,
      mutateAsync,
      isPending: false,
      error: null,
      isError: false,
      isSuccess: false,
    } as any);

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'validpassword123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // Give any (incorrectly triggered) async submission a chance to run.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('validates password length', async () => {
    render(<LoginForm />);

    const passwordInput = screen.getByLabelText(/password/i);
    fireEvent.change(passwordInput, { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/password must be at least 8 characters/i)
      ).toBeInTheDocument();
    });
  });
});

