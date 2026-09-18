import { describe, it, expect, vi, beforeAll } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '../../utils/test-utils';
import { http, HttpResponse } from 'msw';
import { server } from '../../setup';
import { BudgetEnvelopeForm } from '@/components/budget/BudgetEnvelopeForm';
import type { CreateBudgetEnvelopeDto } from '@/types/budget.types';

/**
 * T-426 (`Z111 §55` K1 (i)) — zarf yaratma formu artık kategori/kanal KODU
 * DEĞİL, seçilen entity'nin ID'sini gönderir (`categoryId`/`channelId`);
 * `category`/`channel` string alanları payload'da HİÇ YOK.
 *
 * Fixture id'leri KASTEN kod değerlerinden farklı (UUID) tutulur — testin
 * "id gönderiliyor" ile "kod gönderiliyor"yu ayırt edebilmesi için
 * (DISIPLIN: "fixture, ayırt etmek istediği iki tarafta FARKLI değer taşımalı").
 */

// Radix `Select`, jsdom'da `hasPointerCapture`/`scrollIntoView` implementasyonu
// olmadan pointer etkileşimlerinde fırlar — bilinen jsdom+Radix boşluğu,
// yalnız bu dosyaya kapsamlı polyfill.
beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
});

const CATEGORY_ID = '22222222-2222-4222-8222-222222222222';
const CATEGORY_CODE = 'HAIR_CARE';
const CHANNEL_ID = '11111111-1111-4111-8111-111111111111';
const CHANNEL_CODE = 'NKA';

function mockMasterData() {
  server.use(
    http.get('http://localhost:3000/master-data/categories', () =>
      HttpResponse.json([
        { id: CATEGORY_ID, code: CATEGORY_CODE, name: 'Hair Care' },
      ])
    ),
    http.get('http://localhost:3000/master-data/channels', () =>
      HttpResponse.json([
        { id: CHANNEL_ID, code: CHANNEL_CODE, name: 'National Key Accounts' },
      ])
    ),
    http.get('http://localhost:3000/users', () => HttpResponse.json([]))
  );
}

async function selectOption(labelText: string, optionText: string) {
  const trigger = screen.getByRole('combobox', { name: labelText });
  await waitFor(() => {
    expect(trigger).not.toBeDisabled();
  });
  await userEvent.click(trigger);
  const listbox = await screen.findByRole('listbox');
  const option = within(listbox).getByText(optionText);
  await userEvent.click(option);
}

describe('BudgetEnvelopeForm — T-426 (id gönderimi)', () => {
  it('gönderilen gövdede categoryId/channelId var, category/channel string YOK', async () => {
    mockMasterData();
    const onSubmit = vi.fn<[CreateBudgetEnvelopeDto], Promise<void>>(
      () => Promise.resolve()
    );

    render(<BudgetEnvelopeForm onSubmit={onSubmit} />);

    await selectOption('Dönem * (Yıl)', new Date().getFullYear().toString());
    await selectOption('(Ay)', 'Ocak');
    await selectOption('Kanal *', 'National Key Accounts');
    await selectOption('Kategori *', 'Hair Care');

    const amountInput = screen.getByLabelText('Tahsis Tutarı *');
    await userEvent.clear(amountInput);
    await userEvent.type(amountInput, '1000');

    await userEvent.click(screen.getByRole('button', { name: /Oluştur/ }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    const body = onSubmit.mock.calls[0][0];
    expect(body.categoryId).toBe(CATEGORY_ID);
    expect(body.channelId).toBe(CHANNEL_ID);
    expect((body as unknown as Record<string, unknown>).category).toBeUndefined();
    expect((body as unknown as Record<string, unknown>).channel).toBeUndefined();
  });
});
