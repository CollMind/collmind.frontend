# Deferred Decisions Log - Sprint 0 (Backend Focus)

**Tarih:** Ocak 2026  
**Sprint:** Sprint 0  
**Durum:** 🔴 KRİTİK - Backend Review Gerekli

**Not:** Frontend geliştirmeleri ayrı bir projede yapılacaktır. Bu dokümantasyon sadece backend API'leri ve data model'leri ile ilgili kritik kararları içermektedir.

---

## 📋 Deferred Decisions Table (Backend Critical)

| Area | Decision Implicitly Made in Code | Impact | Priority | Backend Action Required |
|------|----------------------------------|--------|----------|------------------------|
| **Architecture** | | | | |
| Architecture | API Response Structure: Tüm endpoint'lerde `response.data` direkt kullanılıyor, wrapper yok | High | 🔴 | API response'ları standardize edilmeli. Pagination, meta data, error format için wrapper structure belirlenmeli. |
| Architecture | Error Response Format: Error mesajları `error.response?.data?.message` formatında bekleniyor | High | 🔴 | Backend error response format'ı standardize edilmeli. Error code, error type, user-friendly message yapısı belirlenmeli. |
| Architecture | Query Parameter Structure: Notification limit query param olarak gönderiliyor | Medium | 🟡 | Query parameter naming convention belirlenmeli. Limit, offset, page, sort gibi parametreler standardize edilmeli. |
| **Data Model** | | | | |
| Data Model | Budget Envelope Status Workflow: DRAFT → ACTIVE → CLOSED → ARCHIVED transition logic belirsiz | High | 🔴 | Backend'de status transition kuralları dokümante edilmeli. Hangi status'ten hangi status'e geçiş yapılabilir? |
| Data Model | Budget Reservation Status Workflow: PENDING → APPROVED/REJECTED → COMMITTED transition logic belirsiz | High | 🔴 | Reservation status transition kuralları dokümante edilmeli. COMMITTED status'e nasıl geçiliyor? Otomatik mi, manuel mi? |
| Data Model | Budget Currency: TRY, USD, EUR hardcoded seçenekler, backend'den currency listesi çekilmiyor | Medium | 🟡 | Currency listesi için endpoint gerekli mi? Veya enum olarak dokümante edilmeli. |
| Data Model | Budget Period: Q1, Q2, Q3, Q4, YEAR hardcoded, backend'den period listesi çekilmiyor | Medium | 🟡 | Period format'ı standardize edilmeli. Farklı period tipleri (aylık, haftalık) desteklenecek mi? |
| Data Model | Budget Consumption Calculation: `consumedAmount` ve `availableAmount` backend'den geliyor, hesaplama backend'de | Low | 🟢 | ✅ Doğru yaklaşım. Backend'de hesaplanıyor. |
| Data Model | Budget Limit Thresholds: 80% ve 100% threshold'ları frontend'de hardcoded | Medium | 🟡 | Budget alert threshold'ları backend'de configurable olmalı mı? Veya API response'unda belirtilmeli mi? |
| Data Model | Notification Limit: Default 30, backend'de limit kontrolü yapılıyor mu? | Low | 🟢 | Backend'de limit validation ve max limit kontrolü olmalı. |
| Data Model | Date Format: Backend'den gelen date format'ı belirtilmemiş | Medium | 🟡 | Date format standardize edilmeli (ISO 8601 önerilir). Timezone handling belirtilmeli. |
| **Approval** | | | | |
| Approval | Approval Workflow: Tek seviyeli approval varsayılıyor, multi-level approval destekleniyor mu? | High | 🔴 | Backend'de approval workflow dokümante edilmeli. Multi-level approval var mı? Auto-approval threshold'u var mı? |
| Approval | Approval Permissions: Hangi rollerin approve edebileceği backend'de kontrol ediliyor mu? | High | 🔴 | Backend'de role-based approval permission kontrolü yapılıyor mu? Dokümante edilmeli. |
| Approval | Rejection Reason: Zorunlu mu, opsiyonel mu? Minimum/maksimum karakter limiti var mı? | Medium | 🟡 | Backend'de rejection reason validation kuralları belirtilmeli. |
| Approval | Approval History: Approval geçmişi backend'de tutuluyor mu? API endpoint'i var mı? | High | 🔴 | Approval history için endpoint gerekli. Hangi kullanıcı ne zaman onayladı/reddetti bilgisi API'de olmalı. |
| Approval | Auto-approval: Belirli tutarların altı için auto-approval mekanizması var mı? | Medium | 🟡 | Auto-approval logic backend'de var mı? Varsa threshold'lar neler? |
| Approval | Approval Notification: Approval işlemi sonrası notification gönderiliyor mu? | Medium | 🟡 | Backend'de approval notification trigger'ı var mı? |
| **Budget** | | | | |
| Budget | Budget Envelope Creation: Hangi rollerin budget envelope oluşturabileceği belirtilmemiş | High | 🔴 | Backend'de budget envelope creation permission kontrolü yapılıyor mu? Dokümante edilmeli. |
| Budget | Budget Envelope Update: Update endpoint'i yok, backend'de update işlemi destekleniyor mu? | High | 🔴 | Budget envelope update endpoint'i gerekli. Hangi alanlar update edilebilir? Status update ayrı bir endpoint mi? |
| Budget | Budget Envelope Delete: Delete endpoint'i yok, backend'de delete işlemi destekleniyor mu? | Medium | 🟡 | Budget envelope delete endpoint'i gerekli mi? Veya sadece archive yeterli mi? |
| Budget | Budget Envelope Status Update: Status değişikliği için ayrı endpoint var mı? | Medium | 🟡 | Status update için ayrı endpoint gerekli mi? Veya update endpoint'inde status değiştirilebilir mi? |
| Budget | Budget Reservation: Hangi rollerin budget rezerve edebileceği belirtilmemiş | High | 🔴 | Backend'de budget reservation permission kontrolü yapılıyor mu? |
| Budget | Budget Reservation Amount Validation: Maksimum rezervasyon limiti backend'de kontrol ediliyor mu? | High | 🔴 | Backend'de available amount kontrolü yapılıyor mu? Concurrency control var mı? |
| Budget | Budget Reservation Cancellation: Cancel endpoint'i yok | Medium | 🟡 | Reservation cancel endpoint'i gerekli mi? Sadece PENDING status'teki reservation'lar cancel edilebilir mi? |
| Budget | Budget Transfer: Envelope'lar arası transfer mekanizması var mı? | Low | 🟢 | Budget transfer feature'ı gelecekte eklenebilir. |
| Budget | Budget History: Budget değişiklik geçmişi backend'de tutuluyor mu? | Medium | 🟡 | Budget envelope ve reservation için audit log endpoint'leri gerekli. |
| Budget | Fiscal Year Validation: Geçmiş yıllar için budget envelope oluşturulabilir mi? | Medium | 🟡 | Backend'de fiscal year validation var mı? Gelecek yıllar için envelope oluşturulabilir mi? |
| Budget | Budget Reporting: Budget raporları için endpoint'ler var mı? | Low | 🟢 | Budget reporting endpoint'leri gelecekte eklenebilir. |
| **Security** | | | | |
| Security | Role-Based Access Control: Backend'de tüm kritik endpoint'lerde role kontrolü yapılıyor mu? | High | 🔴 | Backend'de role-based access control middleware'i var mı? Tüm endpoint'lerde kontrol yapılıyor mu? |
| Security | Input Validation: Backend'de tüm input'lar validate ediliyor mu? | High | 🔴 | Backend'de input validation (Zod, class-validator vb.) kullanılıyor mu? Tüm endpoint'lerde validation var mı? |
| Security | XSS Protection: User input'ları backend'de sanitize ediliyor mu? | Medium | 🟡 | Backend'de XSS protection var mı? HTML/script tag'leri sanitize ediliyor mu? |
| Security | SQL Injection: Parameterized query kullanılıyor mu? | High | 🔴 | Backend'de SQL injection protection var mı? ORM kullanılıyor mu? |
| Security | CSRF Protection: CSRF token kontrolü yapılıyor mu? | Medium | 🟡 | Backend'de CSRF protection var mı? Token-based authentication kullanılıyorsa gerekli olmayabilir. |
| Security | Rate Limiting: API endpoint'lerinde rate limiting var mı? | Medium | 🟡 | Backend'de rate limiting implementasyonu var mı? Özellikle import, budget reservation gibi kritik işlemlerde. |
| Security | Audit Logging: Kritik işlemler (budget creation, approval, etc.) loglanıyor mu? | High | 🔴 | Backend'de audit logging var mı? Hangi işlemler loglanıyor? |
| **Error Handling** | | | | |
| Error Handling | Error Code Standardization: Error code'lar standardize edilmiş mi? | High | 🔴 | Backend'de error code standardizasyonu var mı? (örn: BUDGET_001, APPROVAL_002) |
| Error Handling | Error Message Localization: Error mesajları hangi dilde? | Medium | 🟡 | Backend'de error message localization var mı? Veya sadece İngilizce mi? |
| Error Handling | Validation Error Format: Validation error'ları nasıl formatlanıyor? | High | 🔴 | Backend'de validation error format'ı standardize edilmeli. Field-level error'lar nasıl döndürülüyor? |
| Error Handling | Concurrency Error Handling: Budget reservation'da concurrency error nasıl handle ediliyor? | High | 🔴 | Backend'de optimistic locking veya transaction isolation kullanılıyor mu? Concurrency error mesajı nasıl? |
| **API Design** | | | | |
| API Design | Pagination: Pagination için endpoint'ler standardize edilmiş mi? | Medium | 🟡 | Pagination için offset/limit mi, cursor-based mi? Response format'ı nasıl? |
| API Design | Filtering: Filtering için query parameter standardizasyonu var mı? | Medium | 🟡 | Filtering için query parameter naming convention belirlenmeli. |
| API Design | Sorting: Sorting için query parameter standardizasyonu var mı? | Medium | 🟡 | Sorting için query parameter format'ı belirlenmeli. |
| API Design | Bulk Operations: Bulk create/update/delete endpoint'leri var mı? | Low | 🟢 | Bulk operations gelecekte eklenebilir. |
| API Design | API Versioning: API versioning stratejisi var mı? | Medium | 🟡 | API versioning (v1, v2) kullanılıyor mu? URL-based mi, header-based mi? |

---

## 🔴 Kritik Backend Kararlar (Acil Review Gerekli)

### 1. API Response Structure Standardization
**Problem:** Tüm endpoint'lerde `response.data` direkt kullanılıyor. Pagination, meta data, error format için wrapper yok.

**Backend Action Required:**
- [ ] API response wrapper structure belirlenmeli
- [ ] Success response format: `{ data: T, meta?: { pagination?, timestamp? } }`
- [ ] Error response format: `{ error: { code: string, message: string, details?: any } }`
- [ ] Tüm endpoint'lerde standardize edilmeli

**Örnek:**
```typescript
// Success Response
{
  data: BudgetEnvelope[],
  meta: {
    total: number,
    page: number,
    limit: number,
    timestamp: string
  }
}

// Error Response
{
  error: {
    code: "BUDGET_001",
    message: "Budget envelope not found",
    details: { envelopeId: "123" }
  }
}
```

### 2. Budget Status Workflow
**Problem:** Budget envelope ve reservation status transition'ları belirsiz.

**Backend Action Required:**
- [ ] Budget envelope status transition kuralları dokümante edilmeli
- [ ] Reservation status transition kuralları dokümante edilmeli
- [ ] Status change için validation logic belirtilmeli
- [ ] Invalid transition'lar için error mesajları standardize edilmeli

**Örnek:**
```
Budget Envelope: DRAFT → ACTIVE → CLOSED → ARCHIVED
- DRAFT'tan sadece ACTIVE'e geçilebilir
- ACTIVE'den CLOSED veya ARCHIVED'e geçilebilir
- CLOSED'tan ARCHIVED'e geçilebilir
- Geri dönüş yok
```

### 3. Approval Workflow
**Problem:** Approval workflow tek seviyeli mi, multi-level mi? Auto-approval var mı?

**Backend Action Required:**
- [ ] Approval workflow dokümante edilmeli
- [ ] Multi-level approval destekleniyor mu?
- [ ] Auto-approval threshold'ları neler?
- [ ] Approval permission matrix belirlenmeli
- [ ] Approval history endpoint'i gerekli

**Örnek:**
```
Approval Levels:
- Level 1: < 10,000 TRY → Auto-approve
- Level 2: 10,000 - 50,000 TRY → Manager approval
- Level 3: > 50,000 TRY → Director + CFO approval
```

### 4. Role-Based Access Control
**Problem:** Hangi rollerin hangi işlemleri yapabileceği backend'de kontrol ediliyor mu?

**Backend Action Required:**
- [ ] Permission matrix dokümante edilmeli
- [ ] Tüm kritik endpoint'lerde role kontrolü yapılıyor mu?
- [ ] Middleware veya decorator kullanılıyor mu?
- [ ] Permission denied error format'ı standardize edilmeli

**Örnek:**
```
Budget Envelope:
- CREATE: PLANNER, ADMIN
- UPDATE: PLANNER, ADMIN (owner only)
- DELETE: ADMIN only
- VIEW: All authenticated users

Budget Reservation:
- CREATE: All authenticated users
- APPROVE: APPROVER, FINANCE, ADMIN (not own requests)
- REJECT: APPROVER, FINANCE, ADMIN (not own requests)
```

### 5. Error Handling Standardization
**Problem:** Error code'lar, error message format'ı, validation error'ları standardize edilmemiş.

**Backend Action Required:**
- [ ] Error code standardizasyonu (örn: MODULE_CODE format)
- [ ] Error message format'ı belirlenmeli
- [ ] Validation error format'ı belirlenmeli
- [ ] Field-level error'lar nasıl döndürülüyor?

**Örnek:**
```typescript
// Validation Error
{
  error: {
    code: "VALIDATION_ERROR",
    message: "Validation failed",
    details: {
      fields: {
        amount: ["Amount must be positive"],
        fiscalYear: ["Fiscal year is required"]
      }
    }
  }
}
```

### 6. Budget Envelope Management
**Problem:** Update ve delete endpoint'leri yok. Status update mekanizması belirsiz.

**Backend Action Required:**
- [ ] Budget envelope update endpoint'i eklenmeli
- [ ] Hangi alanlar update edilebilir?
- [ ] Status update ayrı endpoint mi?
- [ ] Delete endpoint'i gerekli mi? Veya sadece archive?
- [ ] Soft delete mi, hard delete mi?

### 7. Concurrency Control
**Problem:** Budget reservation'da concurrency error nasıl handle ediliyor?

**Backend Action Required:**
- [ ] Optimistic locking veya transaction isolation kullanılıyor mu?
- [ ] Concurrency error mesajı nasıl?
- [ ] Retry mechanism var mı?
- [ ] Available amount kontrolü transaction içinde mi?

---

## 🟡 Orta Öncelikli Backend Kararlar

### 8. Input Validation
- [ ] Tüm endpoint'lerde input validation var mı?
- [ ] Validation library (Zod, class-validator) kullanılıyor mu?
- [ ] Custom validation rule'ları dokümante edilmeli

### 9. Audit Logging
- [ ] Kritik işlemler loglanıyor mu?
- [ ] Log format'ı standardize edilmeli
- [ ] Log retention policy belirlenmeli

### 10. API Versioning
- [ ] API versioning stratejisi belirlenmeli
- [ ] Breaking change'ler nasıl handle edilecek?

---

## 📝 Backend API Endpoint Checklist

### Budget Endpoints
- [x] `POST /budget/envelopes` - Create envelope
- [x] `GET /budget/envelopes` - List envelopes
- [x] `GET /budget/envelopes/:id` - Get envelope
- [ ] `PATCH /budget/envelopes/:id` - Update envelope
- [ ] `DELETE /budget/envelopes/:id` - Delete envelope
- [ ] `PATCH /budget/envelopes/:id/status` - Update status
- [x] `POST /budget/reserve` - Reserve budget
- [x] `POST /budget/reservations/:id/approve` - Approve reservation
- [x] `POST /budget/reservations/:id/reject` - Reject reservation
- [ ] `POST /budget/reservations/:id/cancel` - Cancel reservation
- [x] `GET /budget/envelopes/:id/reservations` - Get reservations
- [ ] `GET /budget/envelopes/:id/history` - Get envelope history
- [ ] `GET /budget/reservations/:id/history` - Get reservation history

### Notification Endpoints
- [x] `GET /notifications` - List notifications
- [x] `GET /notifications/unread` - Get unread notifications
- [x] `POST /notifications/:id/read` - Mark as read
- [ ] `GET /notifications/:id` - Get notification detail
- [ ] `DELETE /notifications/:id` - Delete notification
- [ ] `POST /notifications/mark-all-read` - Mark all as read

### Customer Import
- [x] `POST /customers/import` - Import customers
- [ ] `GET /customers/import/template` - Get import template
- [ ] `GET /customers/import/:id/status` - Get import status

---

## ✅ Action Items (Backend Team)

### High Priority
1. [ ] API response structure standardize edilmeli
2. [ ] Error handling format standardize edilmeli
3. [ ] Budget status workflow dokümante edilmeli
4. [ ] Approval workflow dokümante edilmeli
5. [ ] Role-based access control dokümante edilmeli
6. [ ] Budget envelope update endpoint'i eklenmeli
7. [ ] Concurrency control mekanizması dokümante edilmeli

### Medium Priority
1. [ ] Input validation standardizasyonu
2. [ ] Audit logging implementasyonu
3. [ ] API versioning stratejisi
4. [ ] Pagination standardizasyonu
5. [ ] Filtering ve sorting standardizasyonu

### Low Priority
1. [ ] Budget transfer endpoint'leri
2. [ ] Budget reporting endpoint'leri
3. [ ] Bulk operations endpoint'leri

---

## 📚 Backend Documentation Requirements

1. **API Documentation:**
   - Swagger/OpenAPI dokümantasyonu güncellenmeli
   - Tüm endpoint'ler için request/response örnekleri
   - Error response örnekleri

2. **Business Logic Documentation:**
   - Budget workflow dokümantasyonu
   - Approval workflow dokümantasyonu
   - Status transition kuralları

3. **Security Documentation:**
   - Permission matrix
   - Role-based access control kuralları
   - Authentication/Authorization flow

4. **Error Handling Documentation:**
   - Error code listesi
   - Error message format'ı
   - Validation error format'ı

---

**Son Güncelleme:** Ocak 2026  
**Review Tarihi:** Beklemede  
**Onay:** Backend Team - Beklemede
