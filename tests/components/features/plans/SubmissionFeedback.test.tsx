import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SubmissionFeedback } from '@/components/features/plans/SubmissionFeedback';
import type { SubmissionResult } from '@/api/endpoints/plans.endpoints';

/**
 * ⛔ `T-344` / `Z73 §3` **ŞART 2 — SÖZLEŞME PİNİ.**
 *
 * > ### **"UYARI KULLANICIYA ULAŞIR."**
 *
 * Bu dalganın var-oluş cümlesi budur, ve pin **tam onu** ölçer. `Q13` uyarı
 * katmanı `2026-08-02`'den beri backend'de hesaplanıyordu ve **hiç kimse
 * görmedi**, çünkü onu üreten rota frontend'in çağırmadığı uçtu. Bu pin
 * olmasaydı uyarılar rotaya taşınır **ama ekranda yine ölü doğardı** — yani
 * bu dalganın **düzeltmek için var olduğu** kusurun tekrarı.
 *
 * ⚠️ `T-332` kuralı: fixture farkı **gerekli ama yetersizdir** — aşağıdaki
 * her assertion farkı **OKUYOR** (metnin kendisini arıyor), varlığını
 * değil.
 */

function result(overrides: Partial<SubmissionResult>): SubmissionResult {
  return {
    success: true,
    planId: 'plan-1',
    status: 'PENDING_APPROVAL',
    approvalRequestId: 'req-1',
    budgetCheck: {
      onInvoice: { available: 100, requested: 10, sufficient: true },
      offInvoice: { available: 100, requested: 10, sufficient: true },
      overallSufficient: true,
    },
    ...overrides,
  };
}

describe('SubmissionFeedback — Q13 uyarıları CANLI YÜZEYE ulaşır (Z73 şart 2)', () => {
  it('⭐ backend uyarı METNİNİ ekrana yazar — bu dalganın var-oluş cümlesi', () => {
    render(
      <SubmissionFeedback
        result={result({
          budgetCheck: {
            onInvoice: { available: 100, requested: 10, sufficient: true },
            offInvoice: { available: 100, requested: 10, sufficient: true },
            overallSufficient: true,
            warnings: [
              'Hedefin altında: GP ROI %10.5, hedef %20.0. Plan kâr üretiyor (RAG yeşil) ama hedeflenen getirinin altında.',
            ],
          },
        })}
      />
    );

    // ⛔ Kutunun VARLIĞI değil, İÇERİĞİ ölçülüyor.
    expect(screen.getByText(/Hedefin altında: GP ROI %10\.5/)).toBeTruthy();
    expect(screen.getByTestId('submission-warnings')).toBeTruthy();
  });

  it('⛔ uyarı kutusu "ENGELLEMEZ" der — uyarı bir RED DEĞİLDİR (K-2.2.7c)', () => {
    render(
      <SubmissionFeedback
        result={result({
          budgetCheck: {
            onInvoice: { available: 100, requested: 10, sufficient: true },
            offInvoice: { available: 100, requested: 10, sufficient: true },
            overallSufficient: true,
            warnings: ['Kârsız büyüme: satış artıyor ama incremental kâr negatif'],
          },
        })}
      />
    );
    expect(screen.getByText(/engellemez/i)).toBeTruthy();
    expect(screen.getByText(/plan onaya gönderildi/i)).toBeTruthy();
    // ⛔ AYIRT EDİCİ: bloklayan kutu YOK.
    expect(screen.queryByTestId('submission-validation-errors')).toBeNull();
  });

  it('validationErrors AYRI ve BLOKLAYAN kutuda görünür', () => {
    render(
      <SubmissionFeedback
        result={result({
          success: false,
          status: 'DRAFT',
          approvalRequestId: '',
          validationErrors: ['FU FU-ALPHA has no mechanic values or tactics defined'],
        })}
      />
    );
    expect(screen.getByTestId('submission-validation-errors')).toBeTruthy();
    expect(screen.getByText(/FU-ALPHA/)).toBeTruthy();
    expect(screen.getByText(/gönderilemedi/i)).toBeTruthy();
    // ⛔ AYIRT EDİCİ: uyarı kutusu YOK — iki katman karışmıyor.
    expect(screen.queryByTestId('submission-warnings')).toBeNull();
  });

  it('İKİSİ BİRDEN: bloklanan bir plan uyarılarını da görür (tek turluk düzeltme)', () => {
    render(
      <SubmissionFeedback
        result={result({
          success: false,
          status: 'DRAFT',
          approvalRequestId: '',
          validationErrors: ['Insufficient budget. On-Invoice: 0 available, 60000 requested.'],
          budgetCheck: {
            onInvoice: { available: 0, requested: 60000, sufficient: false },
            offInvoice: { available: 0, requested: 0, sufficient: true },
            overallSufficient: false,
            warnings: ['Ciro kaybı: plan incremental ciro üretmiyor (RAG kırmızı).'],
          },
        })}
      />
    );
    expect(screen.getByText(/Insufficient budget/)).toBeTruthy();
    expect(screen.getByText(/Ciro kaybı/)).toBeTruthy();
    // Başarısız gönderimde "plan onaya gönderildi" YAZILMAZ.
    expect(screen.queryByText(/plan onaya gönderildi/i)).toBeNull();
  });

  it('ne uyarı ne hata varsa HİÇBİR ŞEY render edilmez (gürültü yok)', () => {
    const { container } = render(<SubmissionFeedback result={result({})} />);
    expect(container.firstChild).toBeNull();
  });
});
