import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserForm } from '@/components/forms/UserForm';
import { useCreateUser, useUpdateUser } from '@/services/users.service';
import { UserRole, CreateUserDto } from '@/types/user.types';
import { render as customRender } from '@/tests/utils/test-utils';

// T-243 — `buildScopePayload` (`UserForm.tsx`) dışa aktarılmıyor (component
// closure'ı içinde), yani A3'ün istemci tarafı yansımasını pinlemenin tek
// yolu formu gerçekten render edip göndermek ve mutateAsync'e giden payload'ı
// yakalamaktır. `createUserSchema` seviyesindeki B1/R1/A3 dalları
// `tests/schemas/user.schema.test.ts`'de ayrıca pinlendi; burada yalnız
// `buildScopePayload`'un WILDCARD roller için `scope` anahtarını HİÇ
// üretmediği (boş dizi bile değil) sınanıyor.
vi.mock('@/services/users.service');

describe('UserForm — buildScopePayload WILDCARD davranışı (T-243 A3)', () => {
  const mockCreateUser = {
    mutateAsync: vi.fn(),
    isPending: false,
  };
  const mockUpdateUser = {
    mutateAsync: vi.fn(),
    isPending: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateUser.mutateAsync.mockResolvedValue({ id: 'new-user-id' });
    vi.mocked(useCreateUser).mockReturnValue(
      mockCreateUser as unknown as ReturnType<typeof useCreateUser>,
    );
    vi.mocked(useUpdateUser).mockReturnValue(
      mockUpdateUser as unknown as ReturnType<typeof useUpdateUser>,
    );
  });

  it('does not send a `scope` key at all when the submitted role is WILDCARD (ADMIN)', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    customRender(<UserForm />);

    await user.type(screen.getByLabelText(/^email/i), 'admin@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'password123');
    await user.type(screen.getByLabelText(/full name/i), 'Admin User');

    // Varsayılan rol PLANNER (SCOPE_REQUIRED) — WILDCARD davranışını
    // sınamak için ADMIN'e geçiliyor. Rol seçicisi ilk combobox'tır (bkz.
    // UserForm.tsx render sırası: role -> [scopeRequired ? UserScopeFields] -> ... -> status).
    const roleTrigger = screen.getAllByRole('combobox')[0];
    await user.click(roleTrigger);
    await waitFor(() => {
      expect(
        screen.getByRole('option', { name: /^admin$/i }),
      ).toBeInTheDocument();
    });
    await user.click(screen.getByRole('option', { name: /^admin$/i }));

    await user.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() => {
      expect(mockCreateUser.mutateAsync).toHaveBeenCalled();
    });

    const payload = mockCreateUser.mutateAsync.mock
      .calls[0][0] as CreateUserDto;
    expect(payload.role).toBe(UserRole.ADMIN);
    // A3: `scope` anahtarı payload'da HİÇ bulunmamalı — `undefined` değeri
    // taşıyan bir anahtar bile değil (JSON.stringify'da fark eder, ve
    // backend `A3` kapısı "verilmişse" reddeder).
    expect(Object.prototype.hasOwnProperty.call(payload, 'scope')).toBe(
      false,
    );
  });
});
