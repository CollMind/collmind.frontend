# CollMind TPM Frontend

Modern React.js frontend uygulaması. CollMind Trade Promotion Management (TPM) sistemi için kullanıcı arayüzü sağlar.

## 📋 İçindekiler

- [Teknoloji Stack](#teknoloji-stack)
- [Özellikler](#özellikler)
- [Kurulum](#kurulum)
- [Yapılandırma](#yapılandırma)
- [Çalıştırma](#çalıştırma)
- [Proje Yapısı](#proje-yapısı)
- [Scripts](#scripts)
- [Test](#test)
- [Build ve Deployment](#build-ve-deployment)
- [Geliştirme Rehberi](#geliştirme-rehberi)

## 🛠 Teknoloji Stack

### Core Framework
- **React**: 18.2.0
- **TypeScript**: 5.3.0
- **Vite**: 5.0.0 (Build Tool)

### State Management
- **Redux Toolkit**: 2.0.0 (Global State)
- **TanStack Query**: 5.17.0 (Server State)

### UI Framework
- **Tailwind CSS**: 3.4.0
- **shadcn/ui**: Radix UI tabanlı component library
- **Radix UI**: Headless UI components
- **Framer Motion**: 11.0.0 (Animasyonlar)
- **Lucide React**: 0.300.0 (İkonlar)

### Form Management
- **React Hook Form**: 7.49.0
- **Zod**: 3.22.0 (Schema validation)
- **@hookform/resolvers**: 3.3.0

### Routing & HTTP
- **React Router**: 6.20.0
- **Axios**: 1.6.0

### Utilities
- **date-fns**: 4.1.0 (Tarih işlemleri)
- **xlsx**: 0.18.5 (Excel işlemleri)
- **recharts**: 2.10.3 (Grafikler)
- **react-window**: 1.8.10 (Virtual scrolling)

### Testing
- **Vitest**: 1.0.0
- **React Testing Library**: 14.1.0
- **MSW**: 2.0.0 (Mock Service Worker)
- **@testing-library/jest-dom**: 6.1.0

## ✨ Özellikler

### Authentication & Authorization
- JWT token tabanlı kimlik doğrulama
- Rol bazlı erişim kontrolü (RBAC)
- Protected routes
- Otomatik token yenileme
- Session yönetimi

### Dashboard
- Genel bakış ve özet metrikler
- KPI göstergeleri
- Grafik ve görselleştirmeler
- Hızlı erişim linkleri

### Budget Management
- Bütçe zarfı yönetimi
- Bütçe tahsisatları
- Bütçe ledger görüntüleme
- Bütçe rezervasyon ve serbest bırakma işlemleri
- Bütçe kullanım raporları

### Agreement Management (Actuals-First Mode)
- Anlaşma oluşturma ve düzenleme
- Anlaşma detay görüntüleme
- Anlaşma onay süreçleri
- Anlaşma durum takibi
- Toplu anlaşma işlemleri

### Plan Management (Planning-First Mode)
- Plan oluşturma ve düzenleme
- Plan detay görüntüleme
- Plan onay süreçleri
- Plan performans takibi
- Plan-FU ve Plan-SKU ilişkileri

### Customer Management
- Müşteri listesi ve arama
- Müşteri detay görüntüleme
- Müşteri oluşturma ve düzenleme
- Toplu müşteri içe aktarma (Excel/CSV)
- Müşteri filtreleme ve sıralama

### User Management
- Kullanıcı listesi
- Kullanıcı oluşturma ve düzenleme
- Kullanıcı profil yönetimi
- Rol ve yetki atama

### Tenant Management
- Tenant listesi
- Tenant oluşturma ve düzenleme
- Tenant detay görüntüleme
- Multi-tenancy yönetimi

### Master Data Management
- **Brand**: Marka yönetimi
- **Category**: Kategori yönetimi
- **Channel**: Kanal yönetimi
- **CPL**: Customer Product Line yönetimi
- **Forecasting Unit**: FU yönetimi
- **Generic Unit**: GU yönetimi
- **KPI**: KPI tanımları ve yönetimi
- **Mechanic**: Mekanik yönetimi
- **Region**: Bölge yönetimi
- **SKU**: SKU yönetimi
- **Tactic**: Taktik yönetimi

### Reporting & Analytics
- Plan performans raporları
- ROI dağılım analizi
- Planner performans raporları
- Trade spend özeti
- Bütçe kullanım raporları
- Anlaşma durum raporları
- Finansal dashboard

### Admin Features
- Audit log görüntüleme
- Sistem yapılandırması
- Baseline import
- KPI yönetimi
- Off-invoice upload

### UI/UX Features
- Responsive tasarım (mobil, tablet, desktop)
- Modern ve kullanıcı dostu arayüz
- Dark mode desteği (hazırlık aşamasında)
- Toast bildirimleri
- Loading states
- Error handling ve error boundaries
- Cookie banner
- Virtual scrolling (büyük listeler için)
- Excel export/import

## 🚀 Kurulum

### Gereksinimler

- Node.js 18+ (20.x önerilir)
- npm, yarn veya pnpm

### Adımlar

1. **Bağımlılıkları yükleyin:**
```bash
npm install
```

2. **Ortam değişkenlerini yapılandırın:**
```bash
cp env.example .env
```

3. **`.env` dosyasını düzenleyin:**
```env
VITE_API_BASE_URL=http://localhost:3000
VITE_APP_NAME=CollMind TPM
VITE_APP_VERSION=1.0.0
```

4. **Development server'ı başlatın:**
```bash
npm run dev
```

Uygulama `http://localhost:5173` adresinde çalışacaktır.

## ⚙️ Yapılandırma

### Ortam Değişkenleri

| Değişken | Açıklama | Varsayılan |
|----------|----------|------------|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:3000` |
| `VITE_APP_NAME` | Uygulama adı | `CollMind TPM` |
| `VITE_APP_VERSION` | Uygulama versiyonu | `1.0.0` |

**Not**: Vite'da ortam değişkenleri `VITE_` prefix'i ile başlamalıdır.

### Production Deployment (Cloud Run)

Bitbucket repository variable'ında `VITE_API_BASE_URL` backend URL'inize ayarlanmalıdır.

- Mevcut backend endpoint: `https://backend-315318338776.europe-west1.run.app`
- Pipeline, `VITE_API_BASE_URL` eksikse hızlıca başarısız olur (invalid API host ile deploy'u önlemek için)

## 🏃 Çalıştırma

### Development
```bash
npm run dev
```

### Production Preview
```bash
npm run build
npm run preview
```

### Type Checking
```bash
npm run type-check
```

## 📁 Proje Yapısı

```
src/
├── api/                    # API client ve endpoint tanımları
│   ├── client.ts          # Axios instance ve interceptors
│   └── endpoints/         # API endpoint tanımları
├── components/             # React component'leri
│   ├── ui/                # shadcn/ui base component'leri
│   ├── layout/            # Layout component'leri
│   │   ├── AppLayout.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── ProtectedRoute.tsx
│   ├── features/          # Feature-specific component'ler
│   │   ├── auth/          # Authentication
│   │   ├── dashboard/     # Dashboard
│   │   ├── budget/        # Budget management
│   │   ├── agreements/    # Agreement management
│   │   ├── plans/         # Plan management
│   │   ├── customers/     # Customer management
│   │   ├── users/         # User management
│   │   ├── tenants/       # Tenant management
│   │   └── admin/         # Admin features
│   ├── common/            # Ortak utility component'leri
│   │   ├── ErrorBoundary.tsx
│   │   ├── ToastContainer.tsx
│   │   └── ...
│   └── CookieBanner/      # Cookie banner component
├── store/                 # Redux store ve slice'lar
│   ├── index.ts          # Store configuration
│   └── slices/           # Redux slice'ları
├── services/              # TanStack Query servisleri
│   └── queries/           # Query tanımları
├── hooks/                 # Custom React hook'ları
├── utils/                 # Utility fonksiyonları
├── lib/                   # Third-party kütüphane yapılandırmaları
│   ├── react-query.ts    # TanStack Query config
│   └── utils.ts          # Utility functions
├── types/                 # TypeScript type tanımları
├── schemas/               # Zod validation şemaları
├── routes/                # Route yapılandırması
│   └── index.tsx         # React Router config
├── context/               # React Context'ler
│   └── CookieContext.tsx
├── App.tsx                # Root component
├── main.tsx               # Application entry point
└── index.css              # Global styles
```

## 📜 Scripts

### Development
- `npm run dev` - Development server'ı başlat
- `npm run type-check` - TypeScript type kontrolü yap

### Build
- `npm run build` - Production build oluştur
- `npm run preview` - Production build'i önizle

### Code Quality
- `npm run lint` - ESLint ile kod kontrolü
- `npm run format` - Prettier ile kod formatla

### Testing
- `npm run test` - Testleri çalıştır
- `npm run test:ui` - Testleri UI ile çalıştır
- `npm run test:coverage` - Test coverage raporu oluştur

## 🧪 Test

### Test Çalıştırma
```bash
# Tüm testleri çalıştır
npm run test

# Watch mode'da çalıştır
npm run test -- --watch

# UI ile çalıştır
npm run test:ui

# Coverage raporu
npm run test:coverage
```

### Test Yapısı
- **Unit Tests**: Component ve utility fonksiyon testleri
- **Integration Tests**: Component etkileşim testleri
- **MSW**: API mock'ları için Mock Service Worker kullanılır

Test dosyaları `*.test.tsx` veya `*.spec.tsx` formatında olmalıdır.

## 🏗️ Build ve Deployment

### Production Build
```bash
npm run build
```

Build çıktısı `dist/` klasörüne oluşturulur.

### Docker Deployment
```bash
# Docker image oluştur
docker build -t collmind-tpm-frontend .

# Container çalıştır
docker run -p 80:80 collmind-tpm-frontend
```

### Cloud Run Deployment

Proje Bitbucket Pipelines ile Cloud Run'a deploy edilir. `bitbucket-pipelines.yml` dosyası deployment sürecini yönetir.

**Önemli**: `VITE_API_BASE_URL` environment variable'ı pipeline'da ayarlanmalıdır.

## 💻 Geliştirme Rehberi

### Component Geliştirme

1. **Yeni Component Oluşturma:**
   - Feature-specific component'ler `src/components/features/` altında
   - Ortak component'ler `src/components/common/` altında
   - UI component'ler `src/components/ui/` altında (shadcn/ui)

2. **Component Best Practices:**
   - TypeScript kullan
   - Props için interface tanımla
   - React Hook Form + Zod ile form validation
   - TanStack Query ile server state yönetimi
   - Redux Toolkit ile global state yönetimi

### State Management

- **Global State**: Redux Toolkit (`src/store/`)
- **Server State**: TanStack Query (`src/services/`)
- **Local State**: React useState/useReducer
- **Form State**: React Hook Form

### API İletişimi

- Axios instance `src/api/client.ts` içinde yapılandırılmıştır
- Endpoint tanımları `src/api/endpoints/` altında
- TanStack Query ile data fetching
- Automatic token injection ve refresh

### Styling

- **Tailwind CSS** kullanılır
- **shadcn/ui** component'leri base olarak kullanılır
- Responsive design için Tailwind breakpoint'leri
- Custom CSS `src/index.css` içinde

### Routing

- React Router 6.x kullanılır
- Route tanımları `src/routes/index.tsx` içinde
- Protected routes `ProtectedRoute` component'i ile
- Role-based route protection

### Form Management

```typescript
// Örnek form kullanımı
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
});

const MyForm = () => {
  const form = useForm({
    resolver: zodResolver(schema),
  });

  // ...
};
```

### Testing

- Vitest test framework
- React Testing Library component testleri
- MSW ile API mock'ları
- Test dosyaları component'lerin yanında veya `tests/` klasöründe

## 📝 Notlar

- Vite HMR (Hot Module Replacement) development'ta aktif
- Production build'de code splitting otomatik
- Environment variable'lar build time'da inject edilir
- Cookie banner GDPR uyumluluğu için
- Error boundaries ile hata yönetimi

## 🔗 İlgili Dokümantasyon

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [React Router](https://reactrouter.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Zod](https://zod.dev/)
- [React Hook Form](https://react-hook-form.com/)

## 📄 Lisans

Copyright © 2024 CollMind. All rights reserved.

---

## 🤖 AI-Assisted Development — SAFE PROMPT

Bu projede tüm kod değişiklikleri **SAFE PROMPT** metodolojisiyle yönetilir.

Standart ve tüm SAFE PROMPT dosyaları **collmind-backend** repo'sunda yaşar:
- `docs/safe-prompt-standard-v2.md` — Tam standart tanımı
- `docs/safe-prompts/` — Sprint bazında implementation prompt'ları

**Bu repo için kritik kurallar:**
- `staging` branch'ine direkt push yok — her zaman PR
- Frontend enum'ları (`src/types/user.types.ts`) backend enum'larıyla senkron tutulur
- İki repo kapsayan feature'larda **backend PR her zaman önce** merge edilir
- Migration bu repo'yu ilgilendirmez — collmind-backend'de yönetilir
