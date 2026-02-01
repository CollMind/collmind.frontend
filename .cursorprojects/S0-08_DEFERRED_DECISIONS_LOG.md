# S0-08 – Deferred Decisions Log
## Implicit Decisions Made in Sprint 0 Code

**Sprint:** 0  
**Date:** 2026-01  
**Status:** Review Required  
**Purpose:** Document implicit architectural/data model decisions that could affect future phases

---

## Overview

This log documents **implicit decisions** made in Sprint 0 code (frontend implementation) that:
- Are **not explicitly locked** in the BRD
- Could **affect future phases** or customers
- Should be **reviewed and locked** before proceeding

**Note:** Decisions that are explicitly stated in BRD or Sprint 0 documentation (S0-01 through S0-06) are **not** included here.

---

## Deferred Decisions Table

| Area | Decision Implicitly Made in Code | Why This Decision Was Chosen | Alternative Options | Should This Be Locked Now or Deferred? | Suggested Revisit Timing |
|------|----------------------------------|------------------------------|---------------------|----------------------------------------|--------------------------|
| **Architecture** | | | | | |
| Architecture | **API Response Format:** All endpoints use `response.data` directly (no wrapper structure like `{ data: T, meta: {} }`) | Simplicity, direct data access, assumes Axios response structure | Wrap all responses in `{ data: T, meta?: { pagination?, timestamp? } }` structure | **Defer** - May need standardization for pagination/metadata later | **Sprint 1** - When pagination needed |
| Architecture | **Error Response Format:** Assumes `error.response?.data?.message` exists (no error code structure) | Axios default error structure, flexibility for different formats | Standardize error format: `{ error: { code: string, message: string, details?: any } }` | **Lock Now** - Error handling consistency critical | **Sprint 1** - Before production |
| Architecture | **API Client Base URL:** Environment variable `VITE_API_BASE_URL` with fallback to `localhost:3000` | Development convenience, environment-specific config | No fallback, fail fast if env var missing; or config service | **Defer** - Works for Sprint 1 | **Phase 2** - Multi-environment deployment |
| Architecture | **Token Refresh Strategy:** Automatic refresh on 401, single retry, logout on refresh failure | User experience, seamless re-auth | Manual refresh, multiple retry attempts, refresh queue | **Lock Now** - Security and UX critical | **Sprint 1** - Review after testing |
| **Data Model** | | | | | |
| Data Model | **Budget Envelope Status:** DRAFT, ACTIVE, CLOSED, ARCHIVED (hardcoded enum in component) | Matches component rendering needs | Status managed server-side only, or dynamic from API | **Lock Now** - Matches S0-02 lifecycle (needs ARCHIVED addition) | **Sprint 1** - Confirm with backend |
| Data Model | **Budget Period Format:** Q1, Q2, Q3, Q4, YEAR (hardcoded dropdown) | Simple period selection for MVP | Monthly periods (2026-01), dynamic period list from API, fiscal year support | **Defer** - Monthly periods needed for actuals tracking | **Sprint 1** - Add monthly periods |
| Data Model | **Budget Currency:** TRY, USD, EUR (hardcoded dropdown) | Common currencies for MVP | Currency list from API, full ISO 4217 support, currency conversion | **Defer** - Multi-currency not in Sprint 1 | **Phase 2** - Multi-currency feature |
| Data Model | **Budget Threshold Values:** 80% (warning), 100% (critical) hardcoded in component | Visual indicators, simple alert logic | Thresholds from API, configurable per tenant, policy-driven | **Defer** - BRD Section 3.3 expects policy-driven thresholds | **Sprint 1** - Move to policy configuration |
| Data Model | **Budget Envelope Fields:** `fiscalYear`, `period`, `code`, `name`, `allocatedAmount` - assumes these exist | UI requirements, form structure | Minimal fields (dimensions + amount), or richer metadata | **Lock Now** - Matches BRD envelope structure (verify fiscalYear/period format) | **Sprint 1** - Verify against backend |
| Data Model | **Budget Reservation Fields:** `agreementName`, `notes` optional in reservation dialog | User context, audit trail | Minimal (only envelopeId + amount), or structured metadata | **Defer** - Agreement name may be redundant if linked to Agreement entity | **Sprint 1** - When Agreement entity linked |
| **Approval** | | | | | |
| Approval | **Approval Endpoint Structure:** `/budget/reservations/:id/approve` and `/reject` (separate endpoints) | RESTful design, clear action separation | Single endpoint with action parameter, or state update endpoint | **Lock Now** - Clear API design | **Sprint 1** - Confirm with backend |
| Approval | **Approval Response Format:** Returns `BudgetReservation` object (assumes reservation exists) | Update pattern, returns updated state | Returns approval transaction, or success-only response | **Defer** - May need approval history entity | **Sprint 1** - When multi-level approval added |
| Approval | **Rejection Reason:** Optional `reason` field in reject endpoint | Flexibility, not all rejections need explanation | Mandatory reason, or minimum character length | **Defer** - Business rule not specified in BRD | **Sprint 1** - Get business requirement |
| Approval | **Approval Permissions:** Assumes backend enforces role checks (no frontend enforcement) | Security-first, trust backend | Frontend role guards + backend validation (defense in depth) | **Lock Now** - Correct pattern (backend must validate) | **Sprint 1** - Verify backend validation |
| **Budget** | | | | | |
| Budget | **Budget Reservation Workflow:** Create reservation → Approve/Reject (two-step process) | Approval workflow separation, reservation state management | Single-step (reserve with approval), or auto-approval below threshold | **Defer** - Matches S0-04 model, but workflow may simplify in Sprint 1 | **Sprint 1** - Confirm workflow matches Agreement approval |
| Budget | **Budget Reservation Amount Validation:** Client-side check `amount > availableAmount` (informational) | UX feedback, prevent invalid submissions | Server-side only (no client check), or client validation blocks submission | **Defer** - Server must validate anyway (race condition risk) | **Sprint 1** - Server validation critical |
| Budget | **Budget Consumption Display:** `consumedAmount` shown separately from `reservedAmount` | Transparency, user visibility | Combined view (reserved + consumed), or percentage-based only | **Defer** - Matches BRD event-sourced model (reserved ≠ consumed) | **Sprint 1** - Verify computed fields from backend |
| Budget | **Budget Envelope Status Transitions:** User can select status in create form (DRAFT/ACTIVE/CLOSED) | Flexibility, user choice | Server-controlled transitions only, or status derived from period | **Defer** - Should match S0-02 Agreement lifecycle (status transitions) | **Sprint 1** - Align with Agreement state machine |
| Budget | **Budget Envelope Update/Delete:** No endpoints implemented (create only) | MVP scope, envelope management deferred | Full CRUD endpoints, or soft delete (archive) | **Defer** - Not in Sprint 1 scope per Sprint 0 rules | **Phase 2** - Envelope lifecycle management |
| **UX** | | | | | |
| UX | **Notification Polling Interval:** 30 seconds hardcoded in `useUnreadNotifications` | Real-time feel, reasonable server load | Configurable per tenant, adaptive polling (increase/decrease), WebSocket instead | **Defer** - 30 seconds acceptable for MVP | **Sprint 1** - Consider WebSocket for Phase 2 |
| UX | **Notification Limit:** Default 30, passed as query param | Pagination prep, performance | Unlimited fetch, or server-enforced limit | **Defer** - Works for Sprint 1 | **Sprint 1** - When pagination needed |
| UX | **Error Message Language:** Mixed Turkish/English (e.g., "Budget envelope oluşturulamadı" vs "Rezervasyon onaylanamadı") | User-facing messages in Turkish, technical errors in English | Fully localized, or English-only, or language from user preference | **Defer** - Localization not in Sprint 1 | **Phase 2** - Full i18n support |
| UX | **Date Format:** Uses JavaScript `toLocaleString('tr-TR')` for display | Turkish locale formatting | ISO 8601, or configurable per tenant, or user preference | **Defer** - Works for Sprint 1 | **Sprint 1** - Standardize date handling |
| UX | **Currency Display:** `currency` shown as text (TRY, USD, EUR) | Simple, readable | Currency symbol (₺, $, €), or formatted with locale | **Defer** - Functional for MVP | **Sprint 1** - Enhance for production |
| **Security** | | | | | |
| Security | **Tenant ID Header:** `x-tenant-id` header sent from auth state (user.tenantId) | Multi-tenancy support, tenant isolation | Tenant from token claims, or subdomain routing, or path-based | **Defer** - Works if backend validates, but security risk if not validated | **Sprint 1** - Verify backend validates tenant isolation |
| Security | **Token Storage:** Access token in Redux store (in-memory) | State management consistency | localStorage (persistent), sessionStorage, httpOnly cookie | **Defer** - In-memory acceptable if refresh token secure | **Sprint 1** - Security review required |
| Security | **Refresh Token Usage:** Refresh token stored in Redux (same as access token) | Simplicity, same storage mechanism | Separate secure storage, or refresh token in httpOnly cookie | **Defer** - Works for MVP but security review needed | **Sprint 1** - Security audit required |

---

## Summary by Priority

### 🔴 High Priority (Lock Before Sprint 1)

1. **Error Response Format** - Standardize error handling structure
2. **Budget Envelope Status** - Confirm ARCHIVED status (not in S0-02)
3. **Approval Endpoint Structure** - Lock RESTful design
4. **Approval Permissions** - Verify backend validation
5. **Token Refresh Strategy** - Security and UX critical

### 🟡 Medium Priority (Review in Sprint 1)

1. **API Response Format** - May need wrapper for pagination
2. **Budget Period Format** - Add monthly periods for actuals
3. **Budget Threshold Values** - Move to policy configuration
4. **Notification Polling** - Consider WebSocket for Phase 2
5. **Date/Currency Format** - Standardize for production

### 🟢 Low Priority (Defer to Phase 2)

1. **Budget Currency Options** - Multi-currency not in scope
2. **Budget Envelope Update/Delete** - Lifecycle management later
3. **Error Message Localization** - Full i18n Phase 2
4. **Tenant ID Header** - Verify backend validation

---

## Notes

1. **Budget Types Missing:** `budget.types.ts` referenced but not found - this is a **code debt** that should be addressed in Sprint 1
2. **BRD Alignment:** Many decisions (e.g., budget status) need verification against BRD Section 3.3
3. **Backend Dependency:** Several decisions assume backend behavior (error format, validation) - must verify before Sprint 1

---

**Document Status:** ✅ Complete  
**Review Status:** Pending  
**Next Action:** Review each decision with backend team and product owner before Sprint 1

