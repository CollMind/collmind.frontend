# CollMind TPM Frontend - Unit Test Dokümantasyonu

Bu dokümantasyon, CollMind TPM Frontend projesi için unit test yapısını, test stratejilerini ve test yazma standartlarını açıklar.

## 📋 İçindekiler

- [Genel Bakış](#genel-bakış)
- [Test Yapısı](#test-yapısı)
- [Test Çalıştırma](#test-çalıştırma)
- [Test Kapsamı](#test-kapsamı)
- [Test Yazma Standartları](#test-yazma-standartları)
- [Mock ve Stub Kullanımı](#mock-ve-stub-kullanımı)
- [Test Örnekleri](#test-örnekleri)
- [Best Practices](#best-practices)
- [Coverage Hedefleri](#coverage-hedefleri)

## 🎯 Genel Bakış

CollMind TPM Frontend projesi, React 18 ve TypeScript kullanılarak geliştirilmiştir ve Vitest test framework'ü ile unit testler yazılmaktadır. Testler, component'lerin, hook'ların, servislerin ve utility fonksiyonlarının doğru çalıştığını doğrulamak için yazılmıştır.

### Test Framework

- **Vitest**: Test framework ve assertion library
- **React Testing Library**: Component testleri için
- **MSW (Mock Service Worker)**: API mock'ları için
- **@testing-library/jest-dom**: DOM matcher'ları için

## 📁 Test Yapısı

Test dosyaları, kaynak dosyalarının yanında veya `tests/` klasöründe `.test.tsx` veya `.test.ts` uzantısı ile yer alır:

```
tests/
├── components/          # Component testleri
│   ├── common/         # Ortak component testleri
│   ├── features/       # Feature-specific component testleri
│   ├── layout/         # Layout component testleri
│   └── ...
├── hooks/              # Custom hook testleri
├── services/           # Service (TanStack Query) testleri
├── store/              # Redux store testleri
├── utils/              # Utility fonksiyon testleri
├── schemas/            # Zod schema testleri
├── context/            # Context testleri
├── api/                # API client testleri
├── mocks/              # MSW mock handlers
│   └── handlers.ts
└── setup.ts            # Test setup dosyası
```

### Test Dosya Adlandırma

- Component testleri: `{ComponentName}.test.tsx`
- Hook testleri: `{hookName}.test.ts` veya `{hookName}.test.tsx`
- Service testleri: `{serviceName}.service.test.ts`
- Utility testleri: `{utilityName}.test.ts`
- Schema testleri: `{schemaName}.schema.test.ts`

## 🚀 Test Çalıştırma

### Tüm Testleri Çalıştırma

```bash
npm run test
```

### Watch Mode (Geliştirme Sırasında)

```bash
npm run test -- --watch
```

### UI Mode (Görsel Test Arayüzü)

```bash
npm run test:ui
```

### Coverage Raporu

```bash
npm run test:coverage
```

Coverage raporu `coverage/` klasöründe oluşturulur.

### Belirli Bir Test Dosyasını Çalıştırma

```bash
npm run test -- LoadingSpinner.test.tsx
```

### Belirli Bir Test'i Çalıştırma

```bash
npm run test -- -t "should render loading spinner"
```

## 📊 Test Kapsamı

### Mevcut Test Dosyaları

#### ✅ Tamamlanmış Testler

1. **Common Components**
   - `LoadingSpinner.test.tsx` - Loading spinner component testleri
   - `EmptyState.test.tsx` - Boş durum component testleri
   - `EnumBadge.test.tsx` - Enum badge component testleri
   - `ErrorBoundary.test.tsx` - Hata yakalama component testleri

2. **Layout Components**
   - `ProtectedRoute.test.tsx` - Korumalı route component testleri

3. **Dashboard Components**
   - `DashboardPage.test.tsx` - Dashboard sayfa testleri
   - `MetricCard.test.tsx` - Metrik kart component testleri
   - `RecentTransactions.test.tsx` - Son işlemler component testleri
   - `ProfitabilityChart.test.tsx` - Karlılık grafiği component testleri

4. **Auth Components**
   - `LoginPage.test.tsx` - Giriş sayfası testleri
   - `AuthLayout.test.tsx` - Auth layout testleri
   - `LoginForm.test.tsx` - Giriş formu testleri

5. **User Components**
   - `UserList.test.tsx` - Kullanıcı listesi testleri
   - `UserDetail.test.tsx` - Kullanıcı detay testleri
   - `ChangePasswordForm.test.tsx` - Şifre değiştirme formu testleri

6. **Customer Components**
   - `CustomerList.test.tsx` - Müşteri listesi testleri
   - `CustomerDetail.test.tsx` - Müşteri detay testleri
   - `CustomerFilters.test.tsx` - Müşteri filtre testleri

7. **Cookie Components**
   - `CookieBanner.test.tsx` - Cookie banner testleri
   - `CookiePreferencesModal.test.tsx` - Cookie tercihleri modal testleri

8. **Services**
   - `auth.service.test.ts` - Auth servis testleri
   - `users.service.test.ts` - Kullanıcı servis testleri
   - `customers.service.test.ts` - Müşteri servis testleri

9. **Hooks**
   - `useAuth.test.ts` - Auth hook testleri
   - `useCookieConsent.test.tsx` - Cookie consent hook testleri

10. **Store/Redux**
    - `auth.slice.test.ts` - Auth slice testleri
    - `ui.slice.test.ts` - UI slice testleri

11. **Utils**
    - `utils.test.ts` - Utility fonksiyon testleri
    - `errorHandler.test.ts` - Hata yönetimi testleri
    - `tokenStorage.test.ts` - Token storage testleri
    - `cookieStorage.test.ts` - Cookie storage testleri
    - `retry.test.ts` - Retry utility testleri
    - `ipAddress.test.ts` - IP adres utility testleri
    - `roleUtils.test.ts` - Rol utility testleri

12. **Schemas**
    - `auth.schema.test.ts` - Auth schema testleri
    - `user.schema.test.ts` - Kullanıcı schema testleri
    - `customer.schema.test.ts` - Müşteri schema testleri
    - `tenant.schema.test.ts` - Tenant schema testleri

13. **Context**
    - `CookieContext.test.tsx` - Cookie context testleri

14. **API**
    - `client.test.ts` - API client testleri

#### ✅ Yeni Eklenen Testler

1. **Service Testleri**
   - ✅ `agreements.service.test.ts` - Anlaşma servis testleri
   - ✅ `budget.service.test.ts` - Bütçe servis testleri
   - ✅ `ledger.service.test.ts` - Defter servis testleri
   - ✅ `notifications.service.test.ts` - Bildirim servis testleri
   - ✅ `tenants.service.test.ts` - Tenant servis testleri

2. **Hook Testleri**
   - ✅ `useDebounce.test.ts` - Debounce hook testleri
   - ✅ `useMasterData.test.ts` - Master data hook testleri
   - ✅ `useToast.test.ts` - Toast hook testleri

3. **MSW Mock Handlers**
   - ✅ Agreements endpoint mock'ları
   - ✅ Budget endpoint mock'ları
   - ✅ Ledger endpoint mock'ları
   - ✅ Notifications endpoint mock'ları
   - ✅ Tenants endpoint mock'ları
   - ✅ Master data endpoint mock'ları

#### 🔄 İsteğe Bağlı Component Testleri

Aşağıdaki component testleri ihtiyaç duyulduğunda eklenebilir:

- [ ] Agreement component testleri (AgreementList, AgreementDetail, AgreementForm)
- [ ] Budget component testleri (BudgetEnvelopeList, BudgetDashboard)
- [ ] Finance component testleri (FinanceDashboard)
- [ ] Notification component testleri (NotificationList, NotificationItem)
- [ ] Tenant component testleri (TenantList, TenantDetail, TenantForm)
- [ ] Plan component testleri (PlanList, PlanDetail, PlanForm)
- [ ] Admin component testleri (AdminOverviewPage, MasterDataManagementPage)
- [ ] Off-invoice component testleri (OffInvoiceUploadPage)
- [ ] On-invoice component testleri (OnInvoiceUploadPage)

## ✍️ Test Yazma Standartları

### Test Yapısı

Her test dosyası aşağıdaki yapıyı takip etmelidir:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ComponentName } from '@/components/ComponentName';

describe('ComponentName', () => {
  beforeEach(() => {
    // Test setup
  });

  it('should render correctly', () => {
    // Arrange
    // Act
    // Assert
  });
});
```

### Test İsimlendirme

- **Describe blokları**: Test edilen component, hook veya fonksiyon adını kullanın
- **It blokları**: "should" ile başlayın ve ne yapması gerektiğini açıklayın
- **Test isimleri**: Açıklayıcı ve spesifik olmalı

**İyi örnekler:**
```typescript
it('should render loading spinner', () => {});
it('should display error message when API call fails', async () => {});
it('should call onSubmit when form is submitted', () => {});
```

**Kötü örnekler:**
```typescript
it('test render', () => {});
it('works', () => {});
it('should work', () => {});
```

### AAA Pattern (Arrange-Act-Assert)

Her test üç bölümden oluşmalıdır:

```typescript
it('should create a new customer successfully', async () => {
  // Arrange: Test verilerini hazırla
  const mockCustomer = {
    code: 'CUST001',
    name: 'Test Customer',
    channel: 'RETAIL',
  };
  
  server.use(
    http.post('http://localhost:3000/customers', () => {
      return HttpResponse.json(mockCustomer, { status: 201 });
    })
  );

  // Act: Test edilen metodu çağır
  const { result } = renderHook(() => useCreateCustomer(), { wrapper });
  await result.current.mutateAsync(mockCustomer);

  // Assert: Sonuçları doğrula
  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true);
  });
});
```

## 🎭 Mock ve Stub Kullanımı

### MSW (Mock Service Worker) Kullanımı

MSW, API çağrılarını mock'lamak için kullanılır:

```typescript
import { http, HttpResponse } from 'msw';
import { server } from '../setup';

it('should handle API error', async () => {
  server.use(
    http.get('http://localhost:3000/customers', () => {
      return HttpResponse.json(
        { message: 'Server error' },
        { status: 500 }
      );
    })
  );

  // Test implementation
});
```

### Component Mocking

```typescript
import { vi } from 'vitest';

vi.mock('@/components/SomeComponent', () => ({
  SomeComponent: () => <div>Mocked Component</div>,
}));
```

### Hook Mocking

```typescript
import { vi } from 'vitest';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'test@example.com' },
    isAuthenticated: true,
  }),
}));
```

### localStorage/sessionStorage Mocking

`setup.ts` dosyasında otomatik olarak mock'lanmıştır:

```typescript
// Test içinde direkt kullanılabilir
localStorage.setItem('key', 'value');
const value = localStorage.getItem('key');
```

## 📝 Test Örnekleri

### Component Testi

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('should render loading spinner', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('status', { hidden: true });
    expect(spinner).toBeInTheDocument();
  });

  it('should render with custom size', () => {
    const { container } = render(<LoadingSpinner size="lg" />);
    const spinner = container.querySelector('.h-12.w-12');
    expect(spinner).toBeInTheDocument();
  });
});
```

### Hook Testi (TanStack Query)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { useLogin } from '@/services/auth.service';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  </Provider>
);

describe('useLogin', () => {
  beforeEach(() => {
    localStorage.clear();
    queryClient.clear();
  });

  it('should login successfully', async () => {
    const { result } = renderHook(() => useLogin(), { wrapper });

    await result.current.mutateAsync({
      email: 'test@example.com',
      password: 'password123',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});
```

### Redux Slice Testi

```typescript
import { describe, it, expect } from 'vitest';
import authReducer, { setCredentials, logout } from '@/store/slices/auth.slice';

describe('authSlice', () => {
  it('should set credentials', () => {
    const initialState = {
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    };

    const action = setCredentials({
      user: { id: '1', email: 'test@example.com' },
      accessToken: 'token',
      refreshToken: 'refresh',
    });

    const state = authReducer(initialState, action);

    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe('token');
  });
});
```

### Schema Testi (Zod)

```typescript
import { describe, it, expect } from 'vitest';
import { loginSchema } from '@/schemas/auth.schema';

describe('loginSchema', () => {
  it('should validate correct login data', () => {
    const validData = {
      email: 'test@example.com',
      password: 'password123',
    };

    const result = loginSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const invalidData = {
      email: 'invalid-email',
      password: 'password123',
    };

    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
```

## 🎯 Best Practices

### 1. Test İzolasyonu

- Her test bağımsız olmalı
- `beforeEach` ve `afterEach` kullanarak test verilerini temizleyin
- `server.resetHandlers()` ile MSW handler'ları sıfırlayın

### 2. Test Verileri

- Mock verileri `beforeEach` içinde tanımlayın
- Gerçekçi test verileri kullanın
- Test verilerini yeniden kullanılabilir hale getirin

### 3. Assertion'lar

- Her test en az bir assertion içermeli
- Spesifik assertion'lar kullanın
- `toHaveBeenCalledWith` ile fonksiyon çağrılarını doğrulayın

### 4. Test Kapsamı

- Her public metod için test yazın
- Edge case'leri test edin
- Error handling'i test edin
- Validation'ları test edin

### 5. Test Organizasyonu

- İlgili testleri `describe` blokları içinde gruplayın
- Testleri mantıksal sıraya göre düzenleyin
- Her metod için ayrı `describe` bloğu kullanın

### 6. Async Testler

- `async/await` kullanın
- `waitFor` ile async işlemleri bekleyin
- Promise rejection'ları test edin

### 7. Component Testing

- Kullanıcı perspektifinden test edin
- `screen.getByRole` gibi erişilebilirlik query'lerini tercih edin
- `getByText`, `getByTestId` gibi query'leri son çare olarak kullanın

### 8. Mock Kullanımı

- Sadece gerekli dependency'leri mock'layın
- Mock'ları gerçekçi yapın
- Mock return value'ları açıklayıcı isimlerle tanımlayın

## 📈 Coverage Hedefleri

### Minimum Coverage

- **Statements**: %80
- **Branches**: %75
- **Functions**: %80
- **Lines**: %80

### İdeal Coverage

- **Statements**: %90+
- **Branches**: %85+
- **Functions**: %90+
- **Lines**: %90+

### Coverage Raporu Görüntüleme

```bash
npm run test:coverage
```

Rapor `coverage/lcov-report/index.html` dosyasında görüntülenebilir.

## 🔍 Test Debugging

### Vitest UI Mode

```bash
npm run test:ui
```

### Console Log Kullanımı

```typescript
it('should debug test', async () => {
  console.log('Mock value:', mockValue);
  console.log('Result:', result);
});
```

### Test Filtreleme

```bash
# Sadece belirli test dosyasını çalıştır
npm run test -- LoadingSpinner.test.tsx

# Sadece belirli test'i çalıştır
npm run test -- -t "should render loading spinner"
```

## 🛠️ Test Utilities

### Test Wrapper'ları

Component testleri için gerekli provider'ları sağlayan wrapper'lar:

```typescript
// tests/utils/test-utils.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '@/store';

export const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{ui}</BrowserRouter>
      </QueryClientProvider>
    </Provider>
  );
};
```

## 📚 Ek Kaynaklar

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [MSW Documentation](https://mswjs.io/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

## 🐛 Yaygın Sorunlar ve Çözümleri

### MSW Handler'lar Çalışmıyor

**Sorun**: MSW handler'lar beklenen değerleri döndürmüyor.

**Çözüm**: `server.use()` ile handler'ları test içinde override edin.

### Async Test Hataları

**Sorun**: Test async işlemleri beklemeden bitiyor.

**Çözüm**: `waitFor()` kullanın veya `async/await` ile bekleyin.

### Component Render Hataları

**Sorun**: Component render edilirken hata oluşuyor.

**Çözüm**: Gerekli provider'ları (Redux, QueryClient, Router) sağlayın.

### localStorage/sessionStorage Hataları

**Sorun**: Storage işlemleri çalışmıyor.

**Çözüm**: `setup.ts` dosyasında otomatik mock'lanmıştır, test içinde direkt kullanabilirsiniz.

## 📝 Test Checklist

Yeni bir test dosyası yazarken:

- [ ] Test dosyası doğru konumda mı? (`*.test.tsx` veya `*.test.ts`)
- [ ] Tüm public metodlar test edildi mi?
- [ ] Edge case'ler test edildi mi?
- [ ] Error handling test edildi mi?
- [ ] Mock'lar doğru tanımlandı mı?
- [ ] Test isimleri açıklayıcı mı?
- [ ] AAA pattern kullanıldı mı?
- [ ] `beforeEach`/`afterEach` ile temizlik yapıldı mı?
- [ ] Coverage hedefleri karşılandı mı?

## 🎓 Öğrenme Kaynakları

1. Mevcut test dosyalarını inceleyin
2. Vitest dokümantasyonunu okuyun
3. React Testing Library dokümantasyonunu takip edin
4. Code review sırasında testleri de gözden geçirin

---

**Son Güncelleme**: 2024
**Versiyon**: 1.0.0
