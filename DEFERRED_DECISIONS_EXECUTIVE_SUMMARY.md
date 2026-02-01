# Deferred Decisions Log - Executive Summary

**Tarih:** Ocak 2026  
**Hedef Kitle:** Backend Team Lead, Product Owner, Tech Lead

---

## 🎯 Bu Rapordan Ne Anlamalısınız?

Sprint 0'da frontend kodu yazılırken, backend API'lerinin nasıl çalışması gerektiği hakkında **açıkça belirtilmemiş ama kod yapısından çıkarılabilen kararlar** tespit edildi. Bu kararların **backend tarafında netleştirilmesi ve dokümante edilmesi** gerekiyor.

### ⚠️ Kritik Durum

Frontend kodu, backend API'lerinin belirli şekillerde çalışacağını **varsayıyor**. Eğer backend bu varsayımları karşılamazsa:
- ❌ Frontend çalışmayabilir
- ❌ Breaking changes oluşabilir
- ❌ Kullanıcı deneyimi bozulabilir
- ❌ Güvenlik açıkları olabilir

---

## 🔴 Acil Karar Verilmesi Gereken 7 Kritik Konu

### 1. API Response Format Standardizasyonu

**Sorun:** Frontend, tüm API'lerden `response.data` formatında veri bekliyor. Pagination, meta data, error format'ı standardize değil.

**Karar Gereken:**
```
✅ Backend tüm endpoint'lerde aynı response format'ını kullanacak mı?
   Örnek: { data: T, meta?: { pagination?, timestamp? } }

✅ Error response format'ı nasıl olacak?
   Örnek: { error: { code: string, message: string, details?: any } }
```

**Etki:** Yüksek - Tüm frontend kodunu etkiler

**Aksiyon:** Backend team response format standardını belirlemeli ve dokümante etmeli

---

### 2. Budget Status Workflow

**Sorun:** Frontend, budget envelope ve reservation'ların status değişimlerinin nasıl olacağını bilmiyor.

**Karar Gereken:**
```
✅ Budget Envelope status geçişleri nasıl olacak?
   DRAFT → ACTIVE → CLOSED → ARCHIVED
   - Hangi status'ten hangi status'e geçilebilir?
   - Geri dönüş var mı?
   - Status değişikliği için ayrı endpoint mi, update endpoint'inde mi?

✅ Reservation status geçişleri nasıl olacak?
   PENDING → APPROVED/REJECTED → COMMITTED
   - COMMITTED status'e nasıl geçiliyor? Otomatik mi, manuel mi?
   - Cancel işlemi var mı?
```

**Etki:** Yüksek - Budget modülü çalışmaz

**Aksiyon:** Backend team status transition kurallarını dokümante etmeli

---

### 3. Approval Workflow

**Sorun:** Frontend, approval işleminin nasıl çalışacağını bilmiyor.

**Karar Gereken:**
```
✅ Approval workflow tek seviyeli mi, multi-level mi?
   Örnek: Manager → Director → CFO

✅ Auto-approval var mı?
   - Hangi tutarların altında otomatik onaylanır?
   - Threshold'lar neler?

✅ Hangi roller approve edebilir?
   - APPROVER rolü mü?
   - FINANCE rolü mü?
   - ADMIN kendi request'lerini approve edemez mi?

✅ Approval history tutuluyor mu?
   - Hangi kullanıcı ne zaman onayladı?
   - API endpoint'i var mı?
```

**Etki:** Yüksek - Approval sistemi çalışmaz

**Aksiyon:** Backend team approval workflow'unu dokümante etmeli

---

### 4. Role-Based Access Control (RBAC)

**Sorun:** Frontend, hangi rollerin hangi işlemleri yapabileceğini bilmiyor.

**Karar Gereken:**
```
✅ Budget Envelope oluşturma: Hangi roller?
   - PLANNER mı?
   - ADMIN mi?
   - Herkes mi?

✅ Budget Reservation: Hangi roller rezerve edebilir?
   - Herkes mi?
   - Sadece belirli roller mi?

✅ Approval: Hangi roller approve/reject edebilir?
   - APPROVER rolü mü?
   - FINANCE rolü mü?
   - ADMIN kendi request'lerini approve edemez mi?

✅ Permission matrix dokümante edilmeli
```

**Etki:** Yüksek - Güvenlik açığı olabilir

**Aksiyon:** Backend team permission matrix'i oluşturmalı ve dokümante etmeli

---

### 5. Error Handling Standardizasyonu

**Sorun:** Frontend, backend'den gelen error format'ını bilmiyor.

**Karar Gereken:**
```
✅ Error code standardizasyonu var mı?
   Örnek: BUDGET_001, APPROVAL_002, VALIDATION_ERROR

✅ Error message format'ı nasıl?
   - User-friendly mesajlar mı?
   - Teknik mesajlar mı?
   - Localization var mı?

✅ Validation error'ları nasıl döndürülüyor?
   - Field-level error'lar var mı?
   - Format nasıl?
```

**Etki:** Yüksek - Kullanıcı hataları anlayamaz

**Aksiyon:** Backend team error format standardını belirlemeli

---

### 6. Budget Envelope Management

**Sorun:** Frontend'de sadece create ve list var. Update ve delete yok.

**Karar Gereken:**
```
✅ Budget Envelope update endpoint'i eklenmeli mi?
   - Hangi alanlar update edilebilir?
   - Status update ayrı endpoint mi?

✅ Budget Envelope delete endpoint'i eklenmeli mi?
   - Hard delete mi?
   - Soft delete (archive) mi?
   - Sadece archive yeterli mi?
```

**Etki:** Yüksek - Budget envelope'lar düzenlenemez

**Aksiyon:** Backend team update/delete endpoint'lerini eklemeli veya karar vermeli

---

### 7. Concurrency Control

**Sorun:** Budget reservation'da aynı anda iki kullanıcı rezerve ederse ne olur?

**Karar Gereken:**
```
✅ Concurrency control mekanizması var mı?
   - Optimistic locking mi?
   - Pessimistic locking mi?
   - Transaction isolation level nedir?

✅ Concurrency error nasıl handle ediliyor?
   - Error mesajı nasıl?
   - Retry mechanism var mı?
```

**Etki:** Yüksek - Budget limit aşılabilir

**Aksiyon:** Backend team concurrency control mekanizmasını dokümante etmeli

---

## 📋 Karar Vermeniz Gereken Konular - Özet Tablo

| # | Konu | Karar Gereken | Etki | Aciliyet |
|---|------|---------------|------|----------|
| 1 | API Response Format | Standardize edilecek mi? Format nasıl? | Yüksek | 🔴 Acil |
| 2 | Budget Status Workflow | Status geçiş kuralları neler? | Yüksek | 🔴 Acil |
| 3 | Approval Workflow | Tek seviyeli mi? Multi-level mi? Auto-approval var mı? | Yüksek | 🔴 Acil |
| 4 | RBAC | Hangi roller ne yapabilir? | Yüksek | 🔴 Acil |
| 5 | Error Handling | Error format standardı nedir? | Yüksek | 🔴 Acil |
| 6 | Budget Update/Delete | Endpoint'ler eklenmeli mi? | Yüksek | 🔴 Acil |
| 7 | Concurrency Control | Nasıl handle ediliyor? | Yüksek | 🔴 Acil |
| 8 | Input Validation | Tüm endpoint'lerde var mı? | Orta | 🟡 Önemli |
| 9 | Audit Logging | Kritik işlemler loglanıyor mu? | Orta | 🟡 Önemli |
| 10 | API Versioning | Versioning stratejisi nedir? | Orta | 🟡 Önemli |

---

## ✅ Ne Yapmalısınız? (Action Plan)

### Backend Team Lead için:

1. **Bu Hafta İçinde:**
   - [ ] 7 kritik konuyu backend team ile review edin
   - [ ] Her konu için karar verin
   - [ ] Kararları dokümante edin

2. **Öncelik Sırası:**
   ```
   1. API Response Format (Tüm endpoint'leri etkiler)
   2. Error Handling Format (Tüm error'ları etkiler)
   3. RBAC Permission Matrix (Güvenlik kritik)
   4. Budget Status Workflow (Budget modülü için)
   5. Approval Workflow (Approval sistemi için)
   6. Budget Update/Delete (Feature completeness)
   7. Concurrency Control (Data integrity)
   ```

3. **Dokümantasyon:**
   - [ ] Swagger/OpenAPI dokümantasyonunu güncelleyin
   - [ ] Her endpoint için request/response örnekleri ekleyin
   - [ ] Error response örnekleri ekleyin
   - [ ] Business logic dokümantasyonu oluşturun

### Product Owner için:

1. **Business Rules Onayı:**
   - [ ] Approval workflow'u onaylayın (tek seviyeli mi, multi-level mi?)
   - [ ] Auto-approval threshold'larını belirleyin
   - [ ] Budget envelope update/delete policy'sini belirleyin
   - [ ] Role permission'larını onaylayın

2. **Prioritization:**
   - [ ] Hangi endpoint'ler öncelikli?
   - [ ] Hangi feature'lar şimdi, hangileri sonra?

### Tech Lead için:

1. **Technical Decisions:**
   - [ ] API response structure standardını belirleyin
   - [ ] Error handling standardını belirleyin
   - [ ] Concurrency control mekanizmasını seçin
   - [ ] API versioning stratejisini belirleyin

2. **Code Review:**
   - [ ] Backend kodunda bu kararların implementasyonunu kontrol edin
   - [ ] Eksik endpoint'leri tespit edin
   - [ ] Security review yapın

---

## 🚨 Risk Analizi

### Yüksek Risk (Hemen Karar Verilmeli)

1. **API Response Format:** Eğer standardize edilmezse, frontend tüm endpoint'leri yeniden yazmak zorunda kalabilir.

2. **Error Handling:** Eğer standardize edilmezse, kullanıcılar hataları anlayamaz, support yükü artar.

3. **RBAC:** Eğer net değilse, güvenlik açıkları olabilir, yanlış kullanıcılar yanlış işlemler yapabilir.

### Orta Risk (Yakında Karar Verilmeli)

1. **Budget Status Workflow:** Eğer belirsizse, budget modülü yanlış çalışabilir.

2. **Approval Workflow:** Eğer belirsizse, approval sistemi çalışmayabilir.

---

## 📞 Sonraki Adımlar

1. **Backend Team Meeting:** Bu raporu backend team ile review edin
2. **Karar Toplantısı:** Her kritik konu için karar verin
3. **Dokümantasyon:** Kararları dokümante edin
4. **Frontend Team'e İletim:** Kararları frontend team'e iletin
5. **Implementation:** Backend'de eksik endpoint'leri ve standardizasyonları implement edin

---

## ❓ Sık Sorulan Sorular

**S: Bu kararlar verilmezse ne olur?**
C: Frontend kod çalışmayabilir, breaking changes oluşabilir, güvenlik açıkları olabilir.

**S: Hangi kararlar en kritik?**
C: API Response Format, Error Handling, RBAC - bunlar tüm sistem'i etkiler.

**S: Ne kadar sürede karar verilmeli?**
C: En kritik 7 konu için bu hafta içinde karar verilmeli.

**S: Frontend team ne yapmalı?**
C: Backend kararlarını beklemeli, kararlar verildikten sonra frontend kodunu güncellemeli.

---

**Hazırlayan:** AI Assistant  
**Review Tarihi:** Beklemede  
**Son Güncelleme:** Ocak 2026


