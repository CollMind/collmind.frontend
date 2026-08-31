import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../utils/test-utils';
import { Sidebar } from '@/components/layout/Sidebar';
import { UserRole } from '@/types/user.types';

/**
 * `Q18` — SIDEBAR'IN İLK DOM PİNİ.
 *
 * ⚠️ Bugüne kadar `Sidebar.tsx`'in **hiçbir birim testi yoktu**; tek kapı
 * `tests/e2e/01-login-rbac.spec.ts` ve o yalnız `ADMIN`/`PLANNER`/
 * `CATEGORY_MANAGER`'ı, yalnız birkaç kalemi görüyor. `READONLY` menüsü
 * (`Z43`'ün üçüncü ayağı) ve ölen vaatler hiçbir yerde pinli değildi.
 *
 * Bu dosya üç şeyi pinler:
 * ```
 * 1  ölü linkler GERİ GELMEZ   (/reports · /analytics · /calendar · /products)
 * 2  "Raporlar" vaadi GERİ GELMEZ (altı tıklanamaz kalem + üst başlık)
 * 3  READONLY MENÜSÜ VAR       (ve /on-invoice BİLİNÇLİ olarak yok)
 * ```
 */
const mockUseMe = vi.fn();
vi.mock('@/services/users.service', () => ({
  useMe: () => mockUseMe(),
}));

function renderAs(role: UserRole) {
  mockUseMe.mockReturnValue({ data: { id: 'u1', email: 'a@b.c', role } });
  return render(<Sidebar />);
}

describe('Sidebar — Q18/Z43 pinleri', () => {
  beforeEach(() => mockUseMe.mockReset());

  it('⛔ 404 üreten dört link GERİ GELMEZ', () => {
    renderAs(UserRole.READONLY);
    for (const dead of ['/reports', '/analytics', '/calendar', '/products']) {
      expect(
        document.querySelector(`a[href="${dead}"]`),
        `${dead} bir rota tanımına sahip DEĞİL — menüde olmamalı`
      ).toBeNull();
    }
    // poz. kontrol: gerçek linkler DURUYOR ⇒ sorgu körlemesine null dönmüyor
    expect(document.querySelector('a[href="/dashboard"]')).toBeTruthy();
  });

  it('⛔ "Raporlar" grubu ve altı tıklanamaz kalemi GERİ GELMEZ', () => {
    for (const role of [
      UserRole.ADMIN,
      UserRole.PLANNER,
      UserRole.CATEGORY_MANAGER,
      UserRole.FINANCE,
    ]) {
      const { unmount } = renderAs(role);
      expect(screen.queryByText('Raporlar')).toBeNull();
      for (const promised of [
        'Plan Performans',
        'ROI Dağılım Analizi',
        'Trade Spend Özeti',
        'Bütçe Kullanım Raporu',
        'Anlaşma Durum Raporu',
        'Planner Performans',
      ]) {
        expect(screen.queryByText(promised), `${promised} (${role})`).toBeNull();
      }
      unmount();
    }
  });

  it('⛔ HİÇBİR kalem tıklanamaz-gri DEĞİL (`cursor-not-allowed` dalı öldü)', () => {
    const { container } = renderAs(UserRole.ADMIN);
    expect(container.querySelector('.cursor-not-allowed')).toBeNull();
  });

  it('`Z43` üçüncü ayak: READONLY menüsü var ve yetkili rotalara çıkıyor', () => {
    renderAs(UserRole.READONLY);
    for (const href of [
      '/dashboard',
      '/agreement-approvals',
      '/off-invoice',
      '/finance',
      '/customers',
    ]) {
      expect(document.querySelector(`a[href="${href}"]`), href).toBeTruthy();
    }
  });

  it('⛔ READONLY menüsünde `/on-invoice` YOK (rota bir YÜKLEME yüzeyi)', () => {
    renderAs(UserRole.READONLY);
    expect(document.querySelector('a[href="/on-invoice"]')).toBeNull();
    // ...ama FINANCE'te VAR (bir sonraki vaka) — yani bu yokluk taramanın
    // körlüğünden değil, BİR KARARDAN geliyor.
  });

  it('FINANCE menüsünde `/on-invoice` ve `/finance` VAR (poz. kontrol)', () => {
    renderAs(UserRole.FINANCE);
    expect(document.querySelector('a[href="/on-invoice"]')).toBeTruthy();
    expect(document.querySelector('a[href="/finance"]')).toBeTruthy();
  });

  it('⛔ uydurma "1" onay rozeti GERİ GELMEZ', () => {
    renderAs(UserRole.ADMIN);
    const badge = screen
      .queryAllByText('1')
      .filter((el) => el.className.includes('rounded-full'));
    expect(badge).toHaveLength(0);
  });
});
