// `BudgetEnvelopeCard` KALDIRILDI (`Z75 §5` `K5`, 2026-08-31) — ÜRETİM
// TÜKETİCİSİ SIFIRDI: tek referansı bu barrel satırıydı, ve barrel'ın tek
// tüketicisi (`BudgetPage.tsx`) `BudgetDashboard`/`BudgetEnvelopeList`/
// `BudgetEnvelopeForm` import ediyordu. Testi de yoktu. Kartın içindeki
// `>=80 / >=100` RAG merdiveni backend'in kanonik `>=80 / >=95`'inden
// SAPIYORDU (bkz. `utils/budgetUtilization.ts`) — ölü kod, yanlış eşiği
// canlı gibi taşıyordu. Emsal: yukarıdaki `ReserveBudgetDialog` kaydı.
// `ReserveBudgetDialog` KALDIRILDI (T-289, `Z38`, `B3` kaza-dalgası `K6(c)`,
// 2026-08-26) — backend `POST /budget/reserve` ile birlikte, T-277 deseni
// (iki-repo-tek-kapanış). PLANNER'a `500` gösteren canlı dialog buydu.
export { BudgetSummaryCard } from './BudgetSummaryCard';
export { BudgetTransactionsTable } from './BudgetTransactionsTable';
export { BudgetEnvelopeDetail } from './BudgetEnvelopeDetail';
export { BudgetEnvelopeList } from './BudgetEnvelopeList';
export { BudgetEnvelopeForm } from './BudgetEnvelopeForm';
export { BudgetDashboard } from './BudgetDashboard';
export { BudgetLedgerPage } from './BudgetLedgerPage';
