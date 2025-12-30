import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthLayout } from '@/components/features/auth/AuthLayout';

describe('AuthLayout', () => {
  it('renders login form by default', () => {
    render(
      <BrowserRouter>
        <AuthLayout />
      </BrowserRouter>
    );
    expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument();
  });

  it('renders CollMind logo', () => {
    render(
      <BrowserRouter>
        <AuthLayout />
      </BrowserRouter>
    );
    // Logo should be rendered (checking for text or specific element)
    const logo = document.querySelector('svg') || document.querySelector('[class*="logo"]');
    expect(logo || screen.getByText(/CollMind/i)).toBeTruthy();
  });
});

