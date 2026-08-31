import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PlanDetailPage } from '@/components/features/plans/PlanDetailPage';

/**
 * ⛔ `T-344` / `Z73 §3` **ŞART 2 — VE BU KEZ CÜMLENİN KENDİSİ.**
 *
 * > ### **"UYARI KULLANICIYA ULAŞIR."**
 *
 * İlk pin (`SubmissionFeedback.test.tsx`) **bileşeni** ölçüyordu: `result`
 * prop'unu elle veriyor ve DOM'u okuyordu. Bileşen doğruydu — **kablolama
 * pin'sizdi**, ve `ŞART 2`'nin metni açıkça *"`PlanDetailPage:107`'nin yeni
 * dönüş şeklini **OKUDUĞU**"* diyor.
 *
 * ⛔ **Ölçülmüş kırılma biçimi — SESSİZ ve AĞIR:**
 * ```ts
 * .then((res) => res.data)      // ← BU SATIR DÜŞERSE
 * if (!result.success)          // result = AxiosResponse ⇒ success undefined ⇒ FALSY
 *   toast.error('Plan gönderilemedi …')
 * ```
 * ⇒ **BAŞARILI HER SUBMIT *"gönderilemedi"* der** — ve eski pin'lerin
 * hiçbiri kırmızıya dönmez. `§2.7 #6`: *kapsam var, AYIRT ETME GÜCÜ yok.*
 *
 * ── NEDEN GERÇEK `PlanDetailPage`, NEDEN HARNESS DEĞİL ─────────────────
 * Bu dosyada bir "harness" **tam olarak kaçırılan şeyi** kaçırırdı: ölçülen
 * şey `planEndpoints.submit` → `.then(res => res.data)` → `onSuccess`
 * dallanması → `SubmissionFeedback` **zincirinin tamamı**. Zinciri yeniden
 * yazan bir kopya `§2.7 #8`'dir (*"bir kontrolü sınayan test, o kontrolün
 * kendisini yeniden uygulamamalı"*).
 *
 * `@/api/client` mock'lanıyor çünkü axios+msw bu ortamda kırık (`T-040`,
 * `plans.submit.test.tsx` dosya-başı notu). Ağır ÇOCUKLAR (grid/analiz)
 * mock'lu — ölçülen sözleşmeye dokunmuyorlar.
 */

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock('@/api/client', () => ({
  default: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
  },
}));

vi.mock('@/components/features/plans/PlanningGridEnhanced', () => ({
  PlanningGridEnhanced: () => <div data-testid="grid-stub" />,
}));
vi.mock('@/components/features/plans/PlanAnalysis', () => ({
  PlanAnalysis: () => <div data-testid="analysis-stub" />,
}));
vi.mock('@/components/features/plans/GrandTotals', () => ({
  GrandTotals: () => <div data-testid="grandtotals-stub" />,
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ success: toastSuccess, error: toastError, info: vi.fn(), warning: vi.fn() }),
}));

const DRAFT_PLAN = {
  id: 'plan-1',
  version: 3,
  planCode: 'PLN-2026-001',
  planName: 'Test Plan',
  status: 'DRAFT',
  cplId: 'cpl-1',
  channelId: 'ch-1',
  categoryId: 'cat-1',
  startDate: '2026-01-01',
  endDate: '2026-03-31',
  periodMonth: '2026-01',
  totalPlannedVolume: 1000,
  totalSpend: 50000,
  totalGp: 10000,
  overallRoi: 10.5,
  ragStatus: 'GREEN',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/plans/plan-1']}>
        <Routes>
          <Route path="/plans/:id" element={<PlanDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

/** Onaya Gönder → ConfirmDialog → onayla. */
async function submitViaUi(user: ReturnType<typeof userEvent.setup>) {
  const trigger = await screen.findByRole('button', { name: 'Onaya Gönder' });
  await user.click(trigger);
  const buttons = await screen.findAllByRole('button', { name: 'Onaya Gönder' });
  // Sonuncusu dialog'un onay düğmesi (tetikleyici sayfada kalır).
  await user.click(buttons[buttons.length - 1]);
}

describe('PlanDetailPage — submit KABLOLAMASI (Z73 şart 2)', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    getMock.mockImplementation((url: string) => {
      if (url === '/plans/plan-1') return Promise.resolve({ data: DRAFT_PLAN });
      return Promise.resolve({ data: [] });
    });
  });

  it('⭐ success:true + warnings ⇒ BACKEND METNİ DOM\'da, ve "engellemez" görünür', async () => {
    const user = userEvent.setup();
    postMock.mockResolvedValue({
      data: {
        success: true,
        planId: 'plan-1',
        status: 'PENDING_APPROVAL',
        approvalRequestId: 'req-1',
        budgetCheck: {
          onInvoice: { available: 100, requested: 10, sufficient: true },
          offInvoice: { available: 100, requested: 10, sufficient: true },
          overallSufficient: true,
          warnings: [
            'Hedefin altında: GP ROI %10.5, hedef %20.0. Plan kâr üretiyor (RAG yeşil) ama hedeflenen getirinin altında.',
          ],
        },
      },
    });

    renderPage();
    await submitViaUi(user);

    // ⛔ Backend'in ÜRETTİĞİ cümle, kullanıcının ekranında.
    expect(
      await screen.findByText(/Hedefin altında: GP ROI %10\.5/)
    ).toBeInTheDocument();
    // ⛔ Ve bir RED olarak okunmuyor (`K-2.2.7c`).
    expect(screen.getByText(/engellemez/i)).toBeInTheDocument();
    expect(screen.queryByTestId('submission-validation-errors')).toBeNull();
    // ⛔ AYIRT EDİCİ — `.then(res => res.data)` düşerse `success` `undefined`
    // olur ve bu iki satır TERS DÖNER.
    expect(toastSuccess).toHaveBeenCalledWith('Plan onaya gönderildi');
    expect(toastError).not.toHaveBeenCalled();
  });

  it('⭐ success:false ⇒ "gönderildi" YOK, bloklayan kutu VAR', async () => {
    const user = userEvent.setup();
    postMock.mockResolvedValue({
      data: {
        success: false,
        planId: 'plan-1',
        status: 'DRAFT',
        approvalRequestId: '',
        validationErrors: ['Plan must have at least one FU'],
        budgetCheck: {
          onInvoice: { available: 0, requested: 0, sufficient: true },
          offInvoice: { available: 0, requested: 0, sufficient: true },
          overallSufficient: true,
        },
      },
    });

    renderPage();
    await submitViaUi(user);

    expect(
      await screen.findByTestId('submission-validation-errors')
    ).toBeInTheDocument();
    expect(screen.getByText('Plan must have at least one FU')).toBeInTheDocument();
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalled();
  });

  it('gönderim notu GERÇEKTEN gövdeye giriyor (ConfirmDialog onu topluyordu, atılıyordu)', async () => {
    const user = userEvent.setup();
    postMock.mockResolvedValue({
      data: {
        success: true,
        planId: 'plan-1',
        status: 'PENDING_APPROVAL',
        approvalRequestId: 'req-1',
        budgetCheck: {
          onInvoice: { available: 100, requested: 10, sufficient: true },
          offInvoice: { available: 100, requested: 10, sufficient: true },
          overallSufficient: true,
        },
      },
    });

    renderPage();
    const trigger = await screen.findByRole('button', { name: 'Onaya Gönder' });
    await user.click(trigger);
    await user.type(await screen.findByLabelText(/Onaylayan İçin Not/i), 'FM için not');
    const buttons = await screen.findAllByRole('button', { name: 'Onaya Gönder' });
    await user.click(buttons[buttons.length - 1]);

    await waitFor(() => expect(postMock).toHaveBeenCalledTimes(1));
    expect(postMock).toHaveBeenCalledWith('/plans/plan-1/submit', {
      version: 3,
      submissionNotes: 'FM için not',
    });
  });

  it('🟡-6: BOŞ not `\'\'` olarak GÖNDERİLMEZ — "not yok" ile "boş not" ayrı', async () => {
    const user = userEvent.setup();
    postMock.mockResolvedValue({
      data: {
        success: true,
        planId: 'plan-1',
        status: 'PENDING_APPROVAL',
        approvalRequestId: 'req-1',
        budgetCheck: {
          onInvoice: { available: 100, requested: 10, sufficient: true },
          offInvoice: { available: 100, requested: 10, sufficient: true },
          overallSufficient: true,
        },
      },
    });

    renderPage();
    await submitViaUi(user);

    await waitFor(() => expect(postMock).toHaveBeenCalledTimes(1));
    expect(postMock).toHaveBeenCalledWith('/plans/plan-1/submit', {
      version: 3,
      submissionNotes: undefined,
    });
  });
});
