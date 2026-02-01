import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithCookieProvider } from '../utils/cookie-test-utils';
import { CookiePreferencesModal } from '@/components/CookiePreferencesModal';
import { useCookieContext } from '@/context/CookieContext';
import { clearCookieConsent } from '@/utils/cookieStorage';

// Test component to trigger modal
function TestComponent() {
  const { openPreferences } = useCookieContext();
  
  return (
    <div>
      <button onClick={openPreferences}>Open Modal</button>
      <CookiePreferencesModal />
    </div>
  );
}

describe('CookiePreferencesModal', () => {
  beforeEach(() => {
    clearCookieConsent();
  });

  it('renders modal when opened', async () => {
    const user = userEvent.setup();
    renderWithCookieProvider(<TestComponent />);

    const openButton = screen.getByRole('button', { name: /Open Modal/i });
    await user.click(openButton);

    await waitFor(() => {
      expect(screen.getByText(/Cookie Preferences/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Necessary Cookies/i)).toBeInTheDocument();
    expect(screen.getByText(/Functional Cookies/i)).toBeInTheDocument();
    expect(screen.getByText(/Analytics Cookies/i)).toBeInTheDocument();
    expect(screen.getByText(/Marketing Cookies/i)).toBeInTheDocument();
  });

  it('displays all cookie categories', async () => {
    const user = userEvent.setup();
    renderWithCookieProvider(<TestComponent />);

    const openButton = screen.getByRole('button', { name: /Open Modal/i });
    await user.click(openButton);

    await waitFor(() => {
      expect(screen.getByText(/Necessary Cookies/i)).toBeInTheDocument();
    });

    // Check all categories are present
    expect(screen.getByLabelText(/Necessary Cookies/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Functional Cookies/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Analytics Cookies/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Marketing Cookies/i)).toBeInTheDocument();
  });

  it('has necessary cookies disabled', async () => {
    const user = userEvent.setup();
    renderWithCookieProvider(<TestComponent />);

    const openButton = screen.getByRole('button', { name: /Open Modal/i });
    await user.click(openButton);

    await waitFor(() => {
      const necessaryCheckbox = screen.getByLabelText(/Necessary Cookies/i);
      expect(necessaryCheckbox).toBeDisabled();
    });
  });

  it('saves preferences when Save and Close is clicked', async () => {
    const user = userEvent.setup();
    renderWithCookieProvider(<TestComponent />);

    const openButton = screen.getByRole('button', { name: /Open Modal/i });
    await user.click(openButton);

    await waitFor(() => {
      expect(screen.getByText(/Cookie Preferences/i)).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /Save and Close/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.queryByText(/Cookie Preferences/i)).not.toBeInTheDocument();
    });
  });

  it('accepts all cookies when Accept All is clicked', async () => {
    const user = userEvent.setup();
    renderWithCookieProvider(<TestComponent />);

    const openButton = screen.getByRole('button', { name: /Open Modal/i });
    await user.click(openButton);

    await waitFor(() => {
      expect(screen.getByText(/Cookie Preferences/i)).toBeInTheDocument();
    });

    const acceptAllButton = screen.getByRole('button', { name: /Accept All/i });
    await user.click(acceptAllButton);

    await waitFor(() => {
      expect(screen.queryByText(/Cookie Preferences/i)).not.toBeInTheDocument();
    });
  });

  it('closes modal when Cancel is clicked', async () => {
    const user = userEvent.setup();
    renderWithCookieProvider(<TestComponent />);

    const openButton = screen.getByRole('button', { name: /Open Modal/i });
    await user.click(openButton);

    await waitFor(() => {
      expect(screen.getByText(/Cookie Preferences/i)).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText(/Cookie Preferences/i)).not.toBeInTheDocument();
    });
  });
});

