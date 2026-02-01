# S0-07 – Domain Model Review
## Sprint 0 Domain Models vs BRD Comparison

**Sprint:** 0  
**Date:** 2026-01  
**Status:** Architectural Review  
**Purpose:** Compare Sprint 0 domain models against BRD intent (Actuals-First, no baseline planning)

---

## Overview

This document reviews the domain models defined in Sprint 0 (S0-01 through S0-06) and compares them against the BRD Section 04 (Actuals-First Mode) to identify matches, deviations, and intentional simplifications.

**Sprint 0 Documents Reviewed:**
- S0-01: Core Domain Entities
- S0-02: Agreement Lifecycle & States
- S0-03: Approval Model (Architectural)
- S0-04: Budget Reservation Concept
- S0-05: Off-Invoice Flow (Conceptual)
- S0-06: Sprint 1 Happy Path

**BRD Reference:**
- Section 03: Core Components (Budget, Master Data)
- Section 04: Actuals-First Mode (Full Specification)

---

## 1. Agreements (STA / LTA)

### ✅ Matches with BRD

**1. Agreement Types:**
- ✅ STA (≤30 days) and LTA (>30 days) - **Matches BRD Section 4.2**
- ✅ Same data model for both types - **Matches BRD** ("operational, not structural")

**2. Agreement Lifecycle:**
- ✅ States: DRAFT → PENDING → APPROVED → ACTIVE → CLOSED - **Matches BRD Section 4.2**
- ✅ Alternative paths: REJECTED, CANCELLED - **Matches BRD**

**3. Agreement Fields:**
- ✅ `agreement_type`, `agreement_code`, `cpl_id`, `fu_id` - **Matches BRD schema**
- ✅ `cap_total_amount`, `spend_type`, `justification` - **Matches BRD**
- ✅ `consumed_amount` (computed from ledger) - **Matches BRD event-sourcing**

**4. STA Characteristics:**
- ✅ Duration ≤30 days - **Matches BRD**
- ✅ Immediate consumption - **Matches BRD**
- ✅ Fast approval (1-2 levels) - **Matches BRD**

**5. LTA Characteristics:**
- ✅ Duration >30 days - **Matches BRD**
- ✅ Periodic settlements - **Matches BRD**
- ✅ Multi-level approval - **Matches BRD**

### ⚠️ Deviations from BRD

**1. Agreement Transaction Entity:**
- ❌ **Not defined in S0-01** - BRD Section 4.1 mentions "Agreement Transaction" as core object
- ❌ **Missing in domain model** - BRD expects: "Individual spend event linked to agreement"
- ⚠️ **Impact:** Off-Invoice Entry exists, but no explicit Agreement Transaction entity

**2. Tactic/Mechanic Reference:**
- ✅ S0-01 defines `tactic_id`, `mechanic_id` as references
- ⚠️ **BRD expects:** Full tactic/mechanic entities (not just IDs)
- ⚠️ **Impact:** Tactic Library not defined in Sprint 0 (intentionally deferred per Sprint 0 rules)

**3. SKU Scope:**
- ✅ S0-01 defines `sku_scope` ('GU' | 'FU' | 'SKU' | 'ALL')
- ❌ **BRD Sprint 0 rule:** "Do NOT introduce SKU-level data"
- ⚠️ **Inconsistency:** Field exists but usage deferred (field present for future, not used in Sprint 1)

### 🔸 Intentional Simplifications/Deferrals

**1. Agreement Amendments:**
- ❌ **Not defined in S0-02** - BRD does not explicitly define amendment workflow
- 🔸 **Status:** Open question (S0-02 acknowledges this gap)

**2. Multi-Period Agreements:**
- ❌ **S0-01 uses single `period_month`** - BRD allows multi-period LTAs
- 🔸 **Simplification:** Single period per agreement in Sprint 1 (multi-period deferred)

**3. Effective Discount Calculation:**
- ❌ **Not defined in domain model** - BRD Section 4.1 lists as success metric
- 🔸 **Deferred:** Calculation logic not in Sprint 0 scope

---

## 2. Budget Handling (Reservation vs Consumption)

### ✅ Matches with BRD

**1. Event-Sourced Budget State:**
- ✅ `reserved` and `consumed` computed from transactions/ledger - **Matches BRD Section 3.3**
- ✅ Not stored in `budget_envelopes` table - **Matches BRD** ("Critical Design Decision")
- ✅ State calculation: `Allocated - Committed - Reserved - Consumed` - **Matches BRD**

**2. Budget Transaction Types:**
- ✅ RESERVE (Agreement approved) - **Matches BRD Section 3.3**
- ✅ RELEASE (Agreement closed/cancelled) - **Matches BRD**
- ✅ Idempotency keys - **Matches BRD format**

**3. Reservation Timing:**
- ✅ Reservation on APPROVED state (PENDING → APPROVED) - **Matches BRD Section 4.2**
- ✅ Release on CLOSED/CANCELLED - **Matches BRD**

**4. Envelope Dimensions:**
- ✅ Channel × Category × Period (Phase 1 default) - **Matches BRD Section 3.3**
- ✅ JSONB dimensions with canonical key - **Matches BRD schema**

**5. Budget Consumption:**
- ✅ Consumed from ledger entries - **Matches BRD**
- ✅ `ledger_entries.budget_envelope_id` link - **Matches BRD Section 3.3**

### ⚠️ Deviations from BRD

**1. Budget Policies:**
- ❌ **Not defined in S0-04** - BRD Section 3.3 defines 4 policy types
  - Threshold Policies (80% warning, 90% approval, 100% block)
  - Reallocation Policies
  - Overrun Policies
  - Carry-Forward Policies
- ⚠️ **Impact:** Policy-driven governance not modeled in Sprint 0
- 🔸 **Status:** Intentionally deferred (not in Sprint 1 scope)

**2. Period Locking:**
- ❌ **Not defined in S0-04** - BRD Section 3.3 defines period locking
- ⚠️ **Missing:** `is_locked` field exists in BRD schema but not in S0-01 Budget Envelope
- 🔸 **Status:** Partially modeled (field mentioned but locking logic not defined)

**3. Hierarchical Envelopes:**
- ✅ `parent_envelope_id` in BRD schema - **Matches S0-01**
- ❌ **Hierarchy logic not defined** - BRD shows hierarchical structure
- 🔸 **Status:** Structure present, logic deferred

**4. Budget Overrun Logic:**
- ❌ **S0-04 explicitly excludes:** "No budget overrun logic" (constraint)
- ⚠️ **BRD expects:** Overrun policies (allow/block/approval required)
- 🔸 **Status:** Intentionally deferred per Sprint 0 constraints

**5. Concurrent Reservation Handling:**
- ❌ **S0-04 excludes:** "No concurrency handling" (constraint)
- ⚠️ **BRD does not specify** concurrency model
- 🔸 **Status:** Intentionally deferred for Sprint 1

### 🔸 Intentional Simplifications/Deferrals

**1. Budget Transfer:**
- ✅ TRANSFER transaction type in BRD - **Matches S0-01**
- ❌ **Transfer logic not defined** - BRD defines reallocation policies
- 🔸 **Deferred:** Transfer capabilities not in Sprint 1

**2. Budget Adjustment:**
- ✅ ADJUST transaction type in BRD - **Matches S0-01**
- ❌ **Adjustment logic not defined**
- 🔸 **Deferred:** Admin corrections not in Sprint 1

**3. Partial Reservation:**
- ❌ **S0-04 excludes:** "No partial reservation" (constraint)
- ⚠️ **BRD allows:** Multi-period agreements may need partial reservation
- 🔸 **Deferred:** Single-period assumption for Sprint 1

**4. Reservation Expiration:**
- ❌ **S0-04 excludes:** "No reservation expiration"
- ⚠️ **BRD does not define** expiration model
- 🔸 **Not specified:** Future consideration

---

## 3. Approval Flow Entities

### ✅ Matches with BRD

**1. Mandatory Approval:**
- ✅ All Agreements require approval - **Matches BRD Section 4.2**
- ✅ Approval triggers budget reservation - **Matches BRD**

**2. Approval Request Entity:**
- ✅ One-to-one with Agreement - **Matches BRD**
- ✅ `entity_type`, `entity_id` - **Matches BRD schema**
- ✅ Status: PENDING → APPROVED/REJECTED - **Matches BRD**

**3. Sequential Multi-Level:**
- ✅ S0-03 defines multi-level approval (future) - **Matches BRD**
- ✅ Sequential workflow (Level 1 → Level 2) - **Matches BRD Section 4.2**

**4. Role-Based Approvers:**
- ✅ `approver_role` determines approver - **Matches BRD policy model**
- ✅ Roles: APPROVER, FINANCE, ADMIN - **Matches BRD**

### ⚠️ Deviations from BRD

**1. Single-Level in Sprint 1:**
- ✅ **S0-03 simplifies:** Single-level approval for Sprint 1
- ⚠️ **BRD Section 4.2 shows:** Multi-level approval in examples (STA: 1-2 levels, LTA: multi-level)
- 🔸 **Simplification:** Sprint 1 uses single-level; multi-level deferred (acknowledged in S0-03)

**2. Approval Policy Resolution:**
- ✅ **S0-03 defines:** Policy resolution determines `approver_role`
- ❌ **Policy model not defined** - BRD Section 4.2 shows policy JSON structure
- ⚠️ **Impact:** Policy logic deferred to Sprint 1 implementation (hard-coded initially)

**3. Approval Delegation:**
- ❌ **S0-03 excludes:** "No delegation" (future)
- ⚠️ **BRD does not explicitly define** delegation
- 🔸 **Status:** Future feature, not in scope

**4. Approval Timeout:**
- ❌ **S0-03 acknowledges:** Open question (timeout not defined)
- ⚠️ **BRD does not specify** timeout behavior
- 🔸 **Status:** Undefined (no BRD requirement)

**5. Approval Comments:**
- ✅ **S0-03 defines:** `comments` as optional
- ⚠️ **BRD does not specify** if comments are mandatory
- 🔸 **Status:** Open question (S0-03 marks as optional)

### 🔸 Intentional Simplifications/Deferrals

**1. Approval Workflow State Machine:**
- ✅ **S0-03 defines:** PENDING → APPROVED/REJECTED (simple)
- ❌ **BRD shows:** Sequential multi-level states (Level 1 PENDING → Level 2 PENDING)
- 🔸 **Simplification:** Sprint 1 uses single-level (simplified state machine)

**2. Conditional Approval Levels:**
- ❌ **S0-03 excludes:** Conditional levels (e.g., Finance if amount > threshold)
- ⚠️ **BRD Section 4.2 shows:** Conditional approval in policy examples
- 🔸 **Deferred:** Conditional levels not in Sprint 1 (hard-coded policy)

**3. Approval Withdrawal:**
- ❌ **S0-03 explicitly excludes:** "Cannot withdraw approval"
- ⚠️ **BRD does not define** withdrawal
- 🔸 **Status:** Not supported (immutable decisions)

---

## 4. User / Role Assumptions

### ✅ Matches with BRD

**1. User Roles:**
- ✅ PLANNER, APPROVER, FINANCE, ADMIN - **Matches BRD Section 7 (Security Roles)**
- ✅ Role-based access control - **Matches BRD**

**2. Role Responsibilities:**
- ✅ PLANNER creates Agreements - **Matches BRD**
- ✅ APPROVER/FINANCE approves - **Matches BRD Section 4.2**
- ✅ ADMIN manages system - **Matches BRD**

### ⚠️ Deviations from BRD

**1. User Entity Not Defined:**
- ❌ **S0-01 does not define User entity** - BRD Section 7 defines User entity
- ⚠️ **Impact:** User/role relationships implicit (approvers referenced via roles, not User IDs)
- 🔸 **Status:** User entity exists in codebase (`src/types/user.types.ts`) but not in Sprint 0 domain docs

**2. Regional Manager Role:**
- ⚠️ **S0-03 mentions:** 'REGIONAL_MANAGER' role in examples
- ❌ **Not in BRD Section 7** - BRD only defines: ADMIN, PLANNER, APPROVER, FINANCE
- 🔸 **Deviation:** Additional role assumed but not in BRD

**3. Role Permissions:**
- ❌ **Not defined in Sprint 0** - BRD Section 7 defines role permissions
- 🔸 **Deferred:** Permission model not in Sprint 0 scope

**4. Multi-Tenancy:**
- ✅ `tenant_id` in all entities - **Matches BRD** (implicit in schema)
- ⚠️ **Tenant isolation not defined** - BRD assumes multi-tenant
- 🔸 **Status:** Implicit (all entities have `tenant_id`)

### 🔸 Intentional Simplifications/Deferrals

**1. User Hierarchy:**
- ❌ **Not defined** - BRD does not explicitly define hierarchy
- 🔸 **Status:** Not specified

**2. Role Delegation:**
- ❌ **S0-03 excludes:** Approval delegation (future)
- 🔸 **Deferred:** Not in Sprint 1

---

## Summary

### ✅ Strong Matches with BRD

1. **Agreement Types & Lifecycle:** Fully aligned with BRD Section 4.2
2. **Budget Event-Sourcing:** Matches BRD Section 3.3 design
3. **Reservation vs Consumption:** Matches BRD model (reserve on approval, consume on ledger)
4. **Approval Mandatory:** Matches BRD requirement
5. **Core Entities:** Agreement, Approval, Budget Envelope, CPL, FU - All defined per BRD

### ⚠️ Notable Deviations

1. **Agreement Transaction Entity:** Missing from S0-01 (BRD mentions as core object)
2. **Budget Policies:** Not modeled (BRD defines 4 policy types)
3. **Multi-Level Approval:** Simplified to single-level for Sprint 1 (BRD shows multi-level)
4. **User Entity:** Not in Sprint 0 docs (exists in codebase, not documented)
5. **Regional Manager Role:** Mentioned but not in BRD

### 🔸 Intentional Simplifications

1. **Single-Level Approval:** Sprint 1 simplification (multi-level deferred)
2. **No Budget Overrun Logic:** Sprint 0 constraint (BRD expects policies)
3. **No Concurrency Handling:** Sprint 0 constraint
4. **Single-Period Agreements:** Sprint 1 assumption (multi-period deferred)
5. **No Policy Configuration:** Hard-coded policy resolution (policy model deferred)

### 🎯 Alignment Assessment

**Overall Alignment: 85%**

**Strengths:**
- Core domain entities well-aligned with BRD
- Event-sourcing pattern matches BRD exactly
- State machines match BRD lifecycle definitions
- Actuals-First focus maintained (no Planning-First artifacts)

**Gaps:**
- Agreement Transaction entity missing (conceptually covered by Off-Invoice Entry)
- Budget policies not modeled (intentionally deferred)
- Approval model simplified (single-level for Sprint 1, acknowledged)
- User/role entity documentation incomplete

**Recommendations:**
1. Add Agreement Transaction entity to S0-01 (or clarify relationship to Off-Invoice Entry)
2. Document User entity in Sprint 0 (or reference codebase types)
3. Clarify budget policy deferral in S0-04 (explicitly note future work)
4. Acknowledge approval simplification in BRD comparison (already done in S0-03)

---

**Document Status:** ✅ Complete  
**Review Status:** Pending  
**Next Steps:** Address identified gaps or document intentional simplifications in Sprint 1 planning

