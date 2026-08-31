import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  UsersRound,
  Settings,
  ChevronLeft,
  ChevronDown,
  FileText,
  BarChart3,
  Package,
  UserCog,
  Wallet,
  Upload,
  TrendingUp,
  Factory,
  Boxes,
  ClipboardList,
  Target,
  History,
  FileCheck,
  DollarSign,
  Receipt,
  CheckCircle2,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setSidebarOpen } from '@/store/slices/ui.slice';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useMe } from '@/services/users.service';
import { hasAnyRole } from '@/utils/roleUtils';
import { UserRole } from '@/types/user.types';

/**
 * ⛔ `Q18` (2026-08-31) — `NavItem` ARTIK BİR BİRLEŞİM: bir kalem ya
 * TIKLANABİLİR BİR LİNKTİR (`href` ZORUNLU) ya da BİR GRUPTUR
 * (`children` zorunlu). Üçüncü bir hâl — `href`'siz YAPRAK — YOKTU değil,
 * VARDI: "Raporlar"ın altı kalemi tam olarak oydu ve `renderNavItem`'in
 * `if (!item.href)` dalı onları gri/tıklanamaz basıyordu.
 *
 * O dal ile birlikte TİP DE KAPANIYOR (`CLAUDE.md §7`: "ikinci bir yol
 * bırakma"). Dalı silip `href?: string` bırakmak, yarın eklenecek bir
 * `href`'siz kalemi `<Link to={undefined}>` ile ÇALIŞMA ZAMANINA taşırdı —
 * yani belge yerine bir kaza. Şimdi aynı kalem DERLENMİYOR.
 */
interface NavItemBase {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

interface NavLink extends NavItemBase {
  href: string;
  badge?: string | number;
  children?: never;
}

interface NavGroup extends NavItemBase {
  href?: never;
  badge?: never;
  children: NavItem[];
}

type NavItem = NavLink | NavGroup;

/** Bir kalem grup mu? Birleşimin TEK daraltma noktası. */
function isGroup(item: NavItem): item is NavGroup {
  return Array.isArray((item as NavGroup).children);
}

// Admin navigation menu
const adminNavigation: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Planlama',
    icon: Target,
    children: [
      {
        title: 'Planlar',
        href: '/plans',
        icon: FileText,
      },
      {
        title: 'Plan Onayları',
        href: '/plan-approvals',
        icon: CheckCircle2,
      },
    ],
  },
  {
    title: 'Anlaşmalar',
    icon: FileCheck,
    children: [
      {
        title: 'STA (Short-Term)',
        href: '/agreements?type=STA',
        icon: FileText,
      },
      {
        title: 'LTA (Long-Term)',
        href: '/agreements?type=LTA',
        icon: FileText,
      },
    ],
  },
  {
    title: 'Off-Invoice',
    href: '/off-invoice',
    icon: DollarSign,
  },
  {
    title: 'On-Invoice',
    href: '/on-invoice',
    icon: Receipt,
  },
  {
    // `Z43` ÜÇÜNCÜ AYAK (2026-08-31): rota kapısı `{ADMIN,FINANCE,
    // CATEGORY_MANAGER,READONLY}` (`routes/index.tsx`, `path: '/finance'`)
    // ve backend `finance-reporting` uçları (beşi `SUMMARY_READ`, dördü
    // `@Roles(ADMIN,FINANCE,READONLY)`) AÇIKTI; menüde HİÇBİR LİNK YOKTU —
    // sekiz widget'lık panel hiçbir yerden tıklanamıyordu.
    // CM için üç widget (`budget-at-risk`/`variance-analysis`/
    // `cash-flow-projection`) zaten `FinanceDashboard.tsx`'te koşullu render
    // ediliyor (`T-287 K3`), yani bu link CM'e `403` ÜRETMEZ.
    title: 'Finans Paneli',
    href: '/finance',
    icon: TrendingUp,
  },
  {
    title: 'Bütçe',
    icon: Wallet,
    children: [
      {
        title: 'Dashboard',
        href: '/budget',
        icon: LayoutDashboard,
      },
      {
        title: 'Envelope Listesi',
        href: '/budget?view=list',
        icon: FileText,
      },
      {
        title: 'Ledger (Read Only)',
        href: '/budget/ledger',
        icon: BarChart3,
      },
    ],
  },
  // ⛔ "Raporlar" GRUBU (ALTI KALEM + ÜST BAŞLIK) KALDIRILDI — `Q18`,
  // 2026-08-31. Dört persona menüsünün DÖRDÜNDE de vardı ve kalemlerin
  // (`Plan Performans` · `ROI Dağılım Analizi` · `Trade Spend Özeti` ·
  // `Bütçe Kullanım Raporu` · `Anlaşma Durum Raporu` · `Planner Performans`)
  // HİÇBİRİNDE `href` YOKTU; menüde gri ve tıklanamaz duruyorlardı.
  // `404`'ten DÜRÜST, ama VAATTEN MASUM DEĞİL: adlarıyla bir rapor
  // kataloğu vaat ediyorlardı ve o adlar `R` katmanı TASARLANMADAN
  // verilmişti. `D1` emsali: VAAT KALDIRILIR — `R` katmanı geldiğinde menü
  // GERÇEK rapor adlarıyla ve ÇALIŞAN linklerle doğar.
  // ⛔ Üst başlık da birlikte gitti: boş bir "Raporlar" başlığı aynı vaadi
  // bir seviye yukarıda tekrarlardı.
  {
    title: 'Anlaşma Onayları',
    href: '/agreement-approvals',
    icon: CheckCircle2,
  },
  {
    title: 'Admin',
    icon: Settings,
    roles: ['ADMIN'],
    children: [
      {
        title: 'Genel Bakış',
        href: '/admin/overview',
        icon: LayoutDashboard,
      },
      {
        title: 'Kullanıcılar',
        href: '/admin/users',
        icon: Users,
      },
      {
        title: 'KPI Yönetimi',
        href: '/admin/kpi-management',
        icon: TrendingUp,
      },
      {
        title: 'FU Yönetimi',
        href: '/admin/forecasting-unit-management',
        icon: Factory,
      },
      {
        title: 'SKU Listesi',
        href: '/admin/sku-management',
        icon: Boxes,
      },
      {
        title: 'Müşteri Listesi',
        href: '/admin/customers',
        icon: UsersRound,
      },
      {
        title: 'CPL Yönetimi',
        href: '/admin/cpl-management',
        icon: ClipboardList,
      },
      {
        title: 'Taktik Yönetimi',
        href: '/admin/tactic-management',
        icon: Target,
      },
      {
        title: 'Mekanik Yönetimi',
        href: '/admin/mechanic-management',
        icon: Wrench,
      },
      // `Z43` ÜÇÜNCÜ AYAK (2026-08-31): beş `{ADMIN}` rotası
      // (`routes/index.tsx`: brand/category/channel/generic-unit/region)
      // menüde YOKTU — `EK_E E.8` bunları `✅` sayıyordu, ölçüm
      // "hiçbir menüden ve hiçbir butondan gidilemiyor" dedi. Rol kapısı
      // bu grubun kendi `roles: ['ADMIN']` alanıyla zaten aynı.
      {
        title: 'Marka Yönetimi',
        href: '/admin/brand-management',
        icon: Boxes,
      },
      {
        title: 'Kategori Yönetimi',
        href: '/admin/category-management',
        icon: ClipboardList,
      },
      {
        title: 'Kanal Yönetimi',
        href: '/admin/channel-management',
        icon: Factory,
      },
      {
        title: 'Generic Unit Yönetimi',
        href: '/admin/generic-unit-management',
        icon: Package,
      },
      {
        title: 'Bölge Yönetimi',
        href: '/admin/region-management',
        icon: UsersRound,
      },
      {
        title: 'Audit Log',
        href: '/admin/audit-log',
        icon: History,
      },
    ],
  },
];

// Planner navigation menu
const plannerNavigation: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Planlama',
    icon: Target,
    children: [
      {
        title: 'Planlar',
        href: '/plans',
        icon: FileText,
      },
    ],
  },
  {
    title: 'Anlaşmalar',
    icon: FileCheck,
    children: [
      {
        title: 'STA (Short-Term)',
        href: '/agreements?type=STA',
        icon: FileText,
      },
      {
        title: 'LTA (Long-Term)',
        href: '/agreements?type=LTA',
        icon: FileText,
      },
    ],
  },
  {
    title: 'Off-Invoice',
    href: '/off-invoice',
    icon: DollarSign,
  },
  {
    title: 'On-Invoice',
    href: '/on-invoice',
    icon: Receipt,
  },
  {
    title: 'Bütçe',
    icon: Wallet,
    children: [
      {
        title: 'Dashboard',
        href: '/budget',
        icon: LayoutDashboard,
      },
    ],
  },
];

// Category Manager navigation menu
const categoryManagerNavigation: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Planlama',
    icon: Target,
    children: [
      {
        title: 'Planlar',
        href: '/plans',
        icon: FileText,
      },
      {
        title: 'Plan Onayları',
        href: '/plan-approvals',
        icon: CheckCircle2,
      },
    ],
  },
  {
    title: 'Anlaşmalar',
    icon: FileCheck,
    children: [
      {
        title: 'STA (Short-Term)',
        href: '/agreements?type=STA',
        icon: FileText,
      },
      {
        title: 'LTA (Long-Term)',
        href: '/agreements?type=LTA',
        icon: FileText,
      },
    ],
  },
  {
    // `Z43` ÜÇÜNCÜ AYAK (2026-08-31) — bkz. `adminNavigation`'daki aynı kalem.
    // Rota kapısı bu rolü sayıyor (`routes/index.tsx` `/finance`:
    // `{ADMIN,FINANCE,CATEGORY_MANAGER,READONLY}`).
    title: 'Finans Paneli',
    href: '/finance',
    icon: TrendingUp,
  },
  {
    title: 'Bütçe',
    icon: Wallet,
    children: [
      {
        title: 'Dashboard',
        href: '/budget',
        icon: LayoutDashboard,
      },
      {
        title: 'Envelope Listesi',
        href: '/budget?view=list',
        icon: FileText,
      },
      {
        title: 'Ledger (Read Only)',
        href: '/budget/ledger',
        icon: BarChart3,
      },
    ],
  },
];

// Finance Manager navigation menu
const financeManagerNavigation: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Planlama',
    icon: Target,
    children: [
      {
        title: 'Planlar',
        href: '/plans',
        icon: FileText,
      },
      {
        title: 'Plan Onayları',
        href: '/plan-approvals',
        icon: CheckCircle2,
      },
    ],
  },
  {
    title: 'Anlaşmalar',
    icon: FileCheck,
    children: [
      {
        title: 'STA (Short-Term)',
        href: '/agreements?type=STA',
        icon: FileText,
      },
      {
        title: 'LTA (Long-Term)',
        href: '/agreements?type=LTA',
        icon: FileText,
      },
    ],
  },
  {
    // `Z43` ÜÇÜNCÜ AYAK (2026-08-31): `/off-invoice` ve `/on-invoice` rota
    // kapıları `{ADMIN,FINANCE,PLANNER,READONLY}`, ve YÜKLEME yetkisi
    // (`MODES_ACTUALS_WRITE`) yalnız `{ADMIN,FINANCE}` — yani bu iki ekranın
    // ASIL sahibi FINANCE'ti ve menüsünde ikisi de yoktu (ADMIN/PLANNER
    // menüsünde vardı).
    title: 'Off-Invoice',
    href: '/off-invoice',
    icon: DollarSign,
  },
  {
    title: 'On-Invoice',
    href: '/on-invoice',
    icon: Receipt,
  },
  {
    // `Z43` ÜÇÜNCÜ AYAK (2026-08-31) — bkz. `adminNavigation`'daki aynı kalem.
    // Rota kapısı bu rolü sayıyor (`routes/index.tsx` `/finance`:
    // `{ADMIN,FINANCE,CATEGORY_MANAGER,READONLY}`).
    title: 'Finans Paneli',
    href: '/finance',
    icon: TrendingUp,
  },
  {
    title: 'Bütçe',
    icon: Wallet,
    children: [
      {
        title: 'Dashboard',
        href: '/budget',
        icon: LayoutDashboard,
      },
      {
        title: 'Envelope Listesi',
        href: '/budget?view=list',
        icon: FileText,
      },
      {
        title: 'Ledger (Read Only)',
        href: '/budget/ledger',
        icon: BarChart3,
      },
    ],
  },
];

// Non-admin navigation menu
const defaultNavigation: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'User Management',
    icon: UserCog,
    children: [
      {
        title: 'Customers',
        href: '/customers',
        icon: UsersRound,
        badge: 'New',
      },
      {
        title: 'Users',
        href: '/users',
        icon: Users,
        roles: ['ADMIN'],
      },
      // ⛔ `T-307-m2` / `Z46 §1` (2026-08-27) — 'Tenants' menü linki
      // KALICI OLARAK KALDIRILDI: kiracı yaşam-döngüsü (yarat/sil/listele)
      // PLATFORM-SEVİYESİ bir iş, operatör-yolu (script + seed) dışında
      // bu üründe hiçbir arayüzü YOK.
    ],
  },
  {
    title: 'Budget',
    href: '/budget',
    icon: Wallet,
  },
  // ⛔ `/reports` · `/analytics` · `/calendar` · `/products` KALDIRILDI
  // (`Z75 §5` `K5-3`, `D1` emsali, 2026-08-31). Dördünün de
  // `routes/index.tsx`'te KARŞILIĞI YOKTU (ölçüldü: `path` girdisi 0) —
  // tıklayan kullanıcı `path: '*'` üzerinden 404 sayfasına düşüyordu.
  // Bir menü linki bir VAATTİR; karşılığı yoksa kaldırılır, "yakında" diye
  // bırakılmaz. Rapor/analitik gerçeği geldiğinde LİNKİYLE DOĞAR.
];

/**
 * `READONLY` menüsü — `Z43`'ün ÜÇÜNCÜ AYAĞI (2026-08-31).
 *
 * Backend `+READONLY` indi (`Z43 §2/§4`), `routes/index.tsx` kapıları
 * `+READONLY` açıldı — ve MENÜ hiç açılmadı: `READONLY` bugüne kadar
 * `defaultNavigation`'a düşüyordu ve `/plans` · `/plan-approvals` ·
 * `/agreements` · `/agreement-approvals` · `/budget/ledger` ·
 * `/off-invoice` · `/finance` ekranlarının HİÇBİRİNİ menüde göremiyordu.
 *
 * ⛔ Bu bir GÖRÜNÜRLÜK kararıdır, bir YETKİ kararı değil. Aşağıdaki her
 * kalem için yetki İKİ YERDEN doğrulandı (2026-08-31 ölçümü):
 *
 * ```
 * link                 rota kapısı (routes/index.tsx)      backend yeteneği (ROLE_CAPABILITIES[READONLY])
 * /dashboard           requiredRole YOK (tüm roller)        dashboard/summary → MODES_READ            ✅
 * /plans               {A,P,CM,F,RO}                        GET /plans → MODES_READ                   ✅
 * /plan-approvals      {A,CM,RO}                            GET /plans/pending-approvals @Roles(A,CM,RO) ✅
 * /agreements          {A,P,CM,F,RO}                        GET /agreements → MODES_READ              ✅
 * /agreement-approvals {A,CM,F,RO}                          GET /agreements/pending-approvals → APPROVAL_QUEUE_READ ✅
 * /off-invoice         {A,F,P,RO}                           agreement-transactions GET → MODES_LEDGER_READ ✅
 * /budget              requiredRole YOK                     GET /budget/envelopes → SHARED_READ       ✅
 * /budget/ledger       {A,F,P,RO}                           GET /ledger → MODES_LEDGER_READ           ✅
 * /finance             {A,F,CM,RO}                          SUMMARY_READ (5 uç) + @Roles(A,F,RO) (4 uç) ✅
 * /customers           requiredRole YOK                     GET /customers → CUSTOMER_READ            ✅
 * ```
 *
 * ⛔ `/on-invoice` BİLİNÇLİ OLARAK YOK: rota kapısı `READONLY`'yi sayıyor
 * ama o rota `OnInvoiceUploadPage`'i render ediyor — yani bir YÜKLEME
 * yüzeyi, ve yükleme `MODES_ACTUALS_WRITE` ({ADMIN,FINANCE}) istiyor.
 * Menüye koymak `READONLY`'ye çalışmayan bir yükleme formu göstermek olurdu
 * (`T-278`/`T-281` "ölü buton" sınıfı). Ekranın okuma yüzeyi doğduğunda
 * bu satır açılır.
 */
const readonlyNavigation: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Planlama',
    icon: Target,
    children: [
      {
        title: 'Planlar',
        href: '/plans',
        icon: FileText,
      },
      {
        title: 'Plan Onayları',
        href: '/plan-approvals',
        icon: CheckCircle2,
      },
    ],
  },
  {
    title: 'Anlaşmalar',
    icon: FileCheck,
    children: [
      {
        title: 'STA (Short-Term)',
        href: '/agreements?type=STA',
        icon: FileText,
      },
      {
        title: 'LTA (Long-Term)',
        href: '/agreements?type=LTA',
        icon: FileText,
      },
    ],
  },
  {
    title: 'Anlaşma Onayları',
    href: '/agreement-approvals',
    icon: CheckCircle2,
  },
  {
    title: 'Off-Invoice',
    href: '/off-invoice',
    icon: DollarSign,
  },
  {
    title: 'Bütçe',
    icon: Wallet,
    children: [
      {
        title: 'Dashboard',
        href: '/budget',
        icon: LayoutDashboard,
      },
      {
        title: 'Ledger (Read Only)',
        href: '/budget/ledger',
        icon: BarChart3,
      },
    ],
  },
  {
    title: 'Finans Paneli',
    href: '/finance',
    icon: TrendingUp,
  },
  {
    title: 'Müşteriler',
    href: '/customers',
    icon: UsersRound,
  },
];

export function Sidebar() {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);
  const { data: user } = useMe();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const filterNavigation = (items: NavItem[]): NavItem[] => {
    return items
      .filter((item) => {
        // If no role restriction, show to everyone
        if (!item.roles) return true;
        // Admin has access to everything
        if (!user?.role) return false;
        return hasAnyRole(user.role as UserRole, item.roles as UserRole[]);
      })
      .map<NavItem>((item) =>
        isGroup(item)
          ? { ...item, children: filterNavigation(item.children) }
          : item
      )
      .filter((item) => !isGroup(item) || item.children.length > 0);
  };

  // Select navigation based on user role
  // T-182: ham string karşılaştırması (`'CATEGORY_MANAGER'`) `UserRole` enum
  // değerine çevrildi ve deprecated `'FINANCE'` alias'ı çıkarıldı — migration
  // 1791 (`ConsolidateRolesToBrd`) FINANCE→FINANCE_MANAGER'ı zaten taşıdı,
  // `main.users`'ta FINANCE = 0 (2026-08-11 ölçümü, bkz. T-179/T-182).
  // T-165: yetenek tabanlı modele geçince bu kontrol kaldırılacak.
  const navigation = useMemo(() => {
    if (user?.role === UserRole.ADMIN) {
      return adminNavigation;
    }
    if (user?.role === UserRole.PLANNER) {
      return plannerNavigation;
    }
    if (user?.role === UserRole.CATEGORY_MANAGER) {
      return categoryManagerNavigation;
    }
    if (user?.role === UserRole.FINANCE) {
      return financeManagerNavigation;
    }
    if (user?.role === UserRole.READONLY) {
      return readonlyNavigation;
    }
    return defaultNavigation;
  }, [user?.role]);

  const filteredNavigation = useMemo(
    () => filterNavigation(navigation),
    [navigation, user?.role]
  );

  const isActive = (href?: string) => {
    if (!href) return false;
    return (
      location.pathname === href || location.pathname.startsWith(`${href}/`)
    );
  };

  const hasActiveChild = (item: NavItem): boolean => {
    if (!isGroup(item)) return false;
    return item.children.some(
      (child) => isActive(child.href) || hasActiveChild(child)
    );
  };

  // Auto-expand items with active children, and always expand Admin menu for ADMIN users
  useEffect(() => {
    if (!sidebarOpen) return;

    const newExpanded = new Set<string>();

    // Always expand Admin menu for ADMIN users
    if (user?.role === UserRole.ADMIN) {
      newExpanded.add('Admin');
    }

    const checkAndExpand = (items: NavItem[]) => {
      items.forEach((item) => {
        if (!isGroup(item)) return;
        if (hasActiveChild(item)) {
          newExpanded.add(item.title);
        }
        checkAndExpand(item.children);
      });
    };

    checkAndExpand(filteredNavigation);
    setExpandedItems(newExpanded);
  }, [location.pathname, sidebarOpen, filteredNavigation, user?.role]);

  const toggleExpand = (title: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  const renderNavItem = (item: NavItem, level = 0) => {
    const Icon = item.icon;
    const isExpanded = expandedItems.has(item.title);
    const active = isActive(item.href);
    const hasActive = hasActiveChild(item);
    const indentClass = level > 0 ? 'ml-6' : '';
    const isAdminHeader =
      item.title === 'Admin' && user?.role === UserRole.ADMIN;

    // ⛔ `isGroup` bir TİP KORUYUCUSU: bu `if`'ten sonra `item` NavGroup,
    // aşağısında NavLink'tir — yani `to={item.href}` artık `undefined`
    // ALAMAZ. Eski `hasChildren` bir `boolean`'dı ve hiçbir şey daraltmıyordu.
    if (isGroup(item)) {
      return (
        <div
          key={item.title}
          className={cn('space-y-1', isAdminHeader && 'mb-1')}
        >
          <button
            onClick={() => sidebarOpen && toggleExpand(item.title)}
            className={cn(
              'group flex items-center w-full px-3 py-2.5 text-sm font-medium transition-colors',
              isAdminHeader
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 rounded-none'
                : hasActive
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400 rounded-lg'
                  : 'text-gray-700 dark:text-gray-300 rounded-lg',
              isAdminHeader ? '' : 'hover:bg-gray-100 dark:hover:bg-gray-800',
              indentClass
            )}
          >
            <Icon
              className={cn(
                'mr-3 h-5 w-5 flex-shrink-0 transition-colors',
                isAdminHeader
                  ? 'text-blue-600 dark:text-blue-400'
                  : hasActive
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
              )}
            />
            <span className={cn('flex-1 text-left', !sidebarOpen && 'sr-only')}>
              {item.title}
            </span>
            {sidebarOpen && (
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform',
                  isExpanded ? 'rotate-180' : ''
                )}
              />
            )}
          </button>
          {isExpanded && sidebarOpen && (
            <div className="space-y-1">
              {item.children?.map((child) => renderNavItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    // ⛔ "href yoksa gri/tıklanamaz bas" DALI KALDIRILDI (`Q18`,
    // 2026-08-31). Tek tüketicisi "Raporlar"ın altı kalemiydi; onlar ölünce
    // dal da öldü, ve `NavItem` birleşimi (yukarı) bu hâlin YENİDEN
    // DOĞMASINI derleme zamanında engelliyor.

    return (
      <TooltipProvider key={item.href} delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to={item.href}
              className={cn(
                'group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                active
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-300',
                indentClass
              )}
            >
              <Icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0 transition-colors',
                  active
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                )}
              />
              <span className={cn('flex-1', !sidebarOpen && 'sr-only')}>
                {item.title}
              </span>
              {item.badge && sidebarOpen && (
                <span className="ml-2 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                  {item.badge}
                </span>
              )}
            </Link>
          </TooltipTrigger>
          {!sidebarOpen && (
            <TooltipContent side="right" className="ml-2">
              {item.title}
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  };

  const SidebarContent = () => {
    // For admin, settings is already in the Admin menu, so don't show it separately
    const showSettingsSeparately = user?.role !== UserRole.ADMIN;

    return (
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {filteredNavigation.map((item) => renderNavItem(item))}
        </nav>

        {showSettingsSeparately && (
          <>
            <Separator className="my-4" />

            {/* Settings Section */}
            <nav className="space-y-1">
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to="/settings"
                      className={cn(
                        'group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        'hover:bg-gray-100 dark:hover:bg-gray-800',
                        isActive('/settings')
                          ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                          : 'text-gray-700 dark:text-gray-300'
                      )}
                    >
                      <Settings
                        className={cn(
                          'mr-3 h-5 w-5 flex-shrink-0 transition-colors',
                          isActive('/settings')
                            ? 'text-primary-600 dark:text-primary-400'
                            : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                        )}
                      />
                      <span className={cn('flex-1', !sidebarOpen && 'sr-only')}>
                        Settings
                      </span>
                    </Link>
                  </TooltipTrigger>
                  {!sidebarOpen && (
                    <TooltipContent side="right" className="ml-2">
                      Settings
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </nav>
          </>
        )}
      </ScrollArea>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:top-16 lg:z-40',
          'bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800',
          'transition-all duration-300 ease-in-out',
          sidebarOpen ? 'lg:w-64' : 'lg:w-16'
        )}
      >
        {/* Sidebar Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {sidebarOpen ? (
            <>
              <SidebarContent />
              {/* Toggle Button at Bottom */}
              <div className="p-2 border-t border-gray-200 dark:border-gray-800">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => dispatch(setSidebarOpen(false))}
                  className="inline-flex w-full h-8 justify-center"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="px-2 py-4 flex-1">
                <nav className="space-y-1">
                  {filteredNavigation.map((item) => {
                    const Icon = item.icon;
                    const active = item.href
                      ? isActive(item.href)
                      : hasActiveChild(item);

                    return (
                      <TooltipProvider key={item.title} delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            {item.href ? (
                              <Link
                                to={item.href}
                                className={cn(
                                  'flex items-center justify-center rounded-lg p-2.5',
                                  'hover:bg-gray-100 dark:hover:bg-gray-800',
                                  active
                                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20'
                                    : 'text-gray-700 dark:text-gray-300'
                                )}
                              >
                                <Icon className="h-5 w-5" />
                              </Link>
                            ) : (
                              <button
                                className={cn(
                                  'flex items-center justify-center rounded-lg p-2.5',
                                  'hover:bg-gray-100 dark:hover:bg-gray-800',
                                  active
                                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20'
                                    : 'text-gray-700 dark:text-gray-300'
                                )}
                              >
                                <Icon className="h-5 w-5" />
                              </button>
                            )}
                          </TooltipTrigger>
                          <TooltipContent side="right" className="ml-2">
                            {item.title}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </nav>
              </div>
              {/* Expand Button at Bottom */}
              <div className="p-2 border-t border-gray-200 dark:border-gray-800">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => dispatch(setSidebarOpen(true))}
                  className="inline-flex w-full h-8 justify-center"
                >
                  <ChevronLeft className="h-4 w-4 rotate-180" />
                </Button>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => dispatch(setSidebarOpen(false))}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            />
            {/* Sidebar */}
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 lg:hidden"
            >
              <div className="flex flex-col h-full">
                <SidebarContent />
                {/* Toggle Button at Bottom */}
                <div className="p-2 border-t border-gray-200 dark:border-gray-800">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => dispatch(setSidebarOpen(false))}
                    className="inline-flex w-full h-8 justify-center"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
