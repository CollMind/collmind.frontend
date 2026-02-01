# S0-01 – Core Domain Entities
## Actuals-First TPM System Domain Model

**Sprint:** 0  
**Date:** 2026-01  
**Status:** Architectural Definition  
**Purpose:** Define core domain entities, relationships, and lifecycle states

---

## Entity Overview

| Entity | Purpose | Key Identity |
|--------|---------|--------------|
| **Agreement** | Commercial promotion contract (STA/LTA) | `agreement_code` (unique per tenant) |
| **Approval** | Multi-level authorization workflow | `approval_request_id` |
| **Budget Envelope** | Budget allocation container | `dimensions_key` + `period_code` (unique) |
| **Budget Transaction** | Immutable budget change log (event-sourced) | `idempotency_key` (unique) |
| **Off-Invoice Entry** | Batch-imported spend transaction | `invoice_no` + `invoice_date` (within agreement) |
| **CPL** | Customer/Planning Level (top-level customer) | `customer_code` |
| **FU** | Forecasting Unit (product aggregation level) | `fu_code` |

---

## 1. Agreement (STA / LTA)

### Purpose

Agreement captures commercial terms of a promotional deal in Actuals-First mode. Serves as the source-of-truth for:
- Promotion scope (CPL, FU, Tactic)
- Financial terms (mechanic value, budget cap)
- Approval workflow tracking
- Budget reservation trigger
- Spend attribution

### Key Fields

**Identification:**
- `agreement_code` (e.g., "STA-2026-025", "LTA-2026-GS-001")
- `agreement_name`
- `agreement_type` ('STA' | 'LTA')

**Scope:**
- `cpl_id` (Customer/Planning Level)
- `channel` ('TRADITIONAL' | 'NKA' | 'MODERN_TRADE' | 'WHOLESALE')
- `region_id` (optional)
- `fu_id` (Forecasting Unit - required)
- `gu_id` (Generic Unit - optional)
- `sku_scope` ('GU' | 'FU' | 'SKU' | 'ALL')

**Commercial Terms:**
- `tactic_id`
- `mechanic_id`
- `mechanic_value` (numeric: percentage or amount per unit)
- `mechanic_type` ('PERCENT' | 'AMOUNT' | 'AMOUNT_PER_UNIT')
- `currency` ('TRY')
- `cap_total_amount` (budget ceiling)
- `spend_type` ('ON_INVOICE' | 'OFF_INVOICE' | 'BOTH')

**Period:**
- `start_date`
- `end_date`
- `period_month` (YYYY-MM format)

**Governance:**
- `justification` (TEXT - mandatory business rationale)

**Budget Tracking:**
- `consumed_amount` (computed: sum of ledger entries)

### Relationships

- **→ CPL** (many-to-one): Each agreement belongs to one CPL
- **→ FU** (many-to-one): Each agreement targets one FU (primary product scope)
- **→ GU** (many-to-one, optional): Can optionally reference Generic Unit
- **→ Approval** (one-to-one): Linked via `approval_request_id`
- **→ Budget Envelope** (indirect): Through budget reservation (`POST /budget/reserve`)
- **→ Budget Transaction** (one-to-many): One RESERVE transaction per agreement
- **→ Off-Invoice Entry** (one-to-many): Multiple transactions can reference one agreement

### Lifecycle States

```
DRAFT
  │ (Submit for approval)
  ↓
PENDING
  │ (All approval levels approved)
  ↓
APPROVED
  │ (Execution begins / Budget reserved)
  ↓
ACTIVE
  │ (End date reached OR manually closed)
  ↓
CLOSED

ALTERNATIVE PATHS:
PENDING → REJECTED (if any approval level denies)
ACTIVE → CANCELLED (if agreement terminated early)
```

**State Descriptions:**

| State | Description | Allowed Actions |
|-------|-------------|-----------------|
| **DRAFT** | Created, validation in progress | Edit, Delete, Submit |
| **PENDING** | Awaiting approval(s) | View only (approvers can Approve/Reject) |
| **APPROVED** | All approvals granted, budget reserved | Execute (moves to ACTIVE) |
| **ACTIVE** | Promotion running, transactions posting | View transactions, Close |
| **CLOSED** | Final state, no further transactions | View only (read-only) |
| **REJECTED** | Approval denied | View only, can create new agreement |
| **CANCELLED** | Terminated early | View only, budget released |

**State Transitions:**
- DRAFT → PENDING: User submits for approval
- PENDING → APPROVED: All approval levels approve
- PENDING → REJECTED: Any approval level rejects
- APPROVED → ACTIVE: Execution begins (automatic on start_date or manual)
- ACTIVE → CLOSED: End date reached (automatic) or manual close
- ACTIVE → CANCELLED: User terminates early (releases reserved budget)

---

## 2. Approval

### Purpose

Approval represents multi-level sequential authorization workflow for spend-affecting actions. Ensures governance compliance before:
- Agreement execution (Actuals-First)
- Budget overruns
- Large transfers

### Key Fields

**Identification:**
- `approval_request_id` (UUID)

**Context:**
- `entity_type` ('AGREEMENT' | 'BUDGET_TRANSFER' | 'IMPORT_BATCH')
- `entity_id` (reference to entity)
- `requested_by` (user ID)
- `requested_at` (timestamp)

**Approval Levels:**
- `approval_levels` (JSON array of level configurations)
  - `order` (1, 2, 3...)
  - `role` ('PLANNER' | 'APPROVER' | 'FINANCE' | 'ADMIN')
  - `status` ('PENDING' | 'APPROVED' | 'REJECTED')
  - `approved_by` (user ID, nullable)
  - `approved_at` (timestamp, nullable)
  - `comments` (optional)

**Outcome:**
- `overall_status` ('PENDING' | 'APPROVED' | 'REJECTED')
- `approved_at` (timestamp when all levels complete)
- `approved_by` (final approver user ID)

### Relationships

- **→ Agreement** (one-to-one): Each agreement can have one approval request
- **→ User** (many-to-many, indirect): Approvers assigned via roles
- **→ Approval Policy** (many-to-one): Policy determines required approval levels

### Lifecycle States

```
PENDING
  │ (Level 1 approves)
  ↓
PENDING (Level 2)
  │ (Level 2 approves)
  ↓
... (continue for all levels)
  │ (All levels approved)
  ↓
APPROVED

ALTERNATIVE PATH:
PENDING (any level) → REJECTED (if any level rejects)
```

**State Descriptions:**

| State | Description | Next Action |
|-------|-------------|-------------|
| **PENDING** | Awaiting approval at one or more levels | Current level approver: Approve/Reject |
| **APPROVED** | All levels approved | Entity can proceed (agreement → ACTIVE) |
| **REJECTED** | At least one level rejected | Entity blocked (agreement → REJECTED) |

**Approval Flow:**
- Sequential: Level 1 must approve before Level 2 is notified
- All levels must approve for overall APPROVED
- Any rejection → overall REJECTED (cascades to entity)

---

## 3. Budget Envelope

### Purpose

Budget Envelope represents a budget allocation container for a specific dimension combination (Channel × Category × Period). Provides:
- Budget ceiling (allocated amount)
- Real-time availability calculation
- Policy-driven governance

### Key Fields

**Identification:**
- `envelope_code` (optional, human-readable)
- `dimensions_key` (canonical key: "CHANNEL=TRADITIONAL|CATEGORY=HAIR_CARE")
- `period_code` ('2026-01' | '2026-Q1' | '2026')
- `period_type` ('MONTH' | 'QUARTER' | 'YEAR')

**Dimensions (JSONB):**
- `channel` (required)
- `category` (required)
- `brand` (optional)
- `region` (optional)

**Budget Amount:**
- `total_allocated` (budget ceiling)
- `currency` ('TRY')

**Computed Fields (derived, not stored):**
- `committed` (sum of COMMIT transactions)
- `reserved` (sum of RESERVE - RELEASE transactions)
- `consumed` (sum of ledger_entries for this envelope)
- `available` (calculated: allocated - committed - reserved - consumed)
- `utilization_pct` (calculated percentage)

**Governance:**
- `is_locked` (period locked by Finance)

**Hierarchy:**
- `parent_envelope_id` (optional, for hierarchical allocation)

### Relationships

- **→ Budget Transaction** (one-to-many): All transactions reference one envelope
- **→ Ledger Entry** (one-to-many): `ledger_entries.budget_envelope_id` links to envelope
- **→ Period** (many-to-one): Each envelope belongs to one period
- **→ Budget Envelope** (self-referential): Parent-child hierarchy

### Lifecycle States

Budget Envelopes do not have traditional lifecycle states. Instead, they have **lock states**:

```
UNLOCKED
  │ (Finance locks period)
  ↓
LOCKED
  │ (Finance reopens - audit logged)
  ↓
UNLOCKED
```

**Lock State Descriptions:**

| State | Description | Impact |
|-------|-------------|--------|
| **UNLOCKED** | Active, can accept reservations/commitments | New agreements can reserve budget |
| **LOCKED** | Period closed, read-only | No new reservations/commitments allowed |

**Budget State Calculation (Event-Sourced):**

States are **computed** from transactions and ledger, not stored:

```
Allocated (from budget_envelopes.total_allocated)
  │
  ├─ Committed (from budget_transactions WHERE tx_type='COMMIT')
  ├─ Reserved (from budget_transactions WHERE tx_type='RESERVE' - tx_type='RELEASE')
  ├─ Consumed (from ledger_entries WHERE budget_envelope_id=?)
  │
  └─ Available = Allocated - Committed - Reserved - Consumed
```

---

## 4. Budget Transaction

### Purpose

Budget Transaction is an **immutable event log** for all budget changes. Implements event-sourced pattern to ensure:
- Audit trail completeness
- Idempotency (no duplicate reservations)
- State calculation accuracy (derived from events)

### Key Fields

**Identification:**
- `id` (UUID)
- `idempotency_key` (unique: "RESERVE|AGREEMENT|uuid-123|uuid-456")

**Transaction Details:**
- `tx_type` ('ALLOCATE' | 'COMMIT' | 'RESERVE' | 'RELEASE' | 'TRANSFER' | 'ADJUST')
- `tx_status` ('PENDING' | 'POSTED')
- `envelope_id` (target envelope)
- `amount` (numeric)

**Source Attribution:**
- `source_type` ('AGREEMENT' | 'PLAN' | 'MANUAL')
- `source_id` (reference to agreement/plan)
- `description` (human-readable)

**Metadata:**
- `created_at` (timestamp)
- `created_by` (user ID)

### Relationships

- **→ Budget Envelope** (many-to-one): Each transaction references one envelope
- **→ Agreement** (many-to-one, conditional): If `source_type='AGREEMENT'`, links via `source_id`
- **→ Plan** (many-to-one, conditional): If `source_type='PLAN'`, links via `source_id`

### Lifecycle States

```
PENDING
  │ (Transaction validated and posted)
  ↓
POSTED

ALTERNATIVE PATH:
PENDING → FAILED (if validation fails)
```

**State Descriptions:**

| State | Description | Impact |
|-------|-------------|--------|
| **PENDING** | Transaction created, not yet applied | Not included in envelope state calculation |
| **POSTED** | Transaction applied, envelope state updated | Included in envelope state calculation |
| **FAILED** | Validation failed, transaction rejected | Never included in state calculation |

**Transaction Types:**

| Type | Purpose | Source | When |
|------|---------|--------|------|
| **ALLOCATE** | Initial envelope creation | MANUAL | Finance creates envelope |
| **COMMIT** | Reserve budget for plan (Planning-First) | PLAN | Plan approved |
| **RESERVE** | Reserve budget for agreement (Actuals-First) | AGREEMENT | Agreement approved |
| **RELEASE** | Free reserved budget | AGREEMENT/PLAN | Agreement/Plan cancelled |
| **TRANSFER** | Move budget between envelopes | MANUAL | Finance reallocates |
| **ADJUST** | Manual correction (admin only) | MANUAL | Finance corrects error |

**Idempotency Pattern:**

Idempotency key format: `{tx_type}|{source_type}|{source_id}|{envelope_id}`

Example: `RESERVE|AGREEMENT|sta-2026-025|env-456`

If same key used twice → Second transaction rejected (prevents duplicate reservations on retry)

---

## 5. Off-Invoice Entry

### Purpose

Off-Invoice Entry represents batch-imported spend transactions that are not deducted at point of sale (on-invoice). Captures:
- Actual spend that occurred
- Invoice-level detail
- Links to agreement for attribution

### Key Fields

**Identification:**
- `id` (UUID)
- `invoice_no` (vendor invoice number)
- `invoice_date`
- `idempotency_key` (unique: "{agreement_id}|{invoice_no}|{invoice_date}")

**Agreement Link:**
- `agreement_id` (required: links to Agreement)
- `agreement_code` (denormalized for display)

**Financial:**
- `amount` (transaction amount)
- `currency` ('TRY')
- `uom` ('EA' | 'CS' | 'KG' | 'LT')
- `quantity` (optional)

**Batch Context:**
- `import_batch_id` (links to import batch)
- `batch_row_number` (row in source file)

**Status:**
- `status` ('STAGED' | 'APPROVED' | 'POSTED' | 'REJECTED')

**Metadata:**
- `created_at`
- `posted_at` (when ledger entry created)
- `posted_by` (user ID)

### Relationships

- **→ Agreement** (many-to-one): Each entry belongs to one agreement (typically LTA)
- **→ Import Batch** (many-to-one): Entries grouped by batch for approval
- **→ Ledger Entry** (one-to-one): Each posted entry creates one ledger entry

### Lifecycle States

```
STAGED
  │ (Batch approved)
  ↓
APPROVED
  │ (Ledger posting)
  ↓
POSTED

ALTERNATIVE PATH:
STAGED → REJECTED (if batch rejected)
```

**State Descriptions:**

| State | Description | Impact |
|-------|-------------|--------|
| **STAGED** | Imported, validation pending | Not posted to ledger, not consuming budget |
| **APPROVED** | Batch approved, ready for posting | Pending ledger creation |
| **POSTED** | Ledger entry created, budget consumed | Included in agreement consumed_amount |
| **REJECTED** | Validation failed or batch rejected | Never posted, deleted or corrected |

**Validation Rules:**
- Invoice date must be within agreement period
- Amount cannot exceed agreement cap
- CPL must match agreement CPL
- Idempotency: Same invoice_no + invoice_date → Reject duplicate

---

## 6. CPL (Customer/Planning Level)

### Purpose

CPL is the **top-level customer entity** for promotion planning and agreement creation. Represents the customer organization (not individual outlets). Used for:
- Agreement scope definition
- Budget reporting aggregation
- Approval workflow routing

### Key Fields

**Identification:**
- `customer_code` (unique per tenant, e.g., "CARREFOUR", "MIGROS")
- `customer_name`
- `customer_type` ('DIRECT' | 'DISTRIBUTOR' | 'WHOLESALER')

**Channel Classification:**
- `channel` ('TRADITIONAL' | 'NKA' | 'MODERN_TRADE' | 'WHOLESALE')
- **Critical:** Channel is an **attribute** of CPL (one CPL = one channel)
- `subchannel` (optional: "Premium", "Mass")

**Geography:**
- `region_id`
- `city`
- `country`

**Status:**
- `status` ('ACTIVE' | 'PENDING' | 'SUSPENDED')

**Contact:**
- `contact_person`
- `contact_email`
- `contact_phone`

**Business Attributes:**
- `customer_tier` ('A' | 'B' | 'C' | 'VIP')
- `is_vip` (boolean)
- `annual_revenue` (numeric)

### Relationships

- **→ Agreement** (one-to-many): Multiple agreements per CPL
- **→ Channel** (many-to-one, implicit): Via `channel` attribute
- **→ Region** (many-to-one): Via `region_id`
- **→ Customer** (one-to-many, optional): CPL can have sub-customers (outlets)

### Lifecycle States

```
PENDING
  │ (Activated)
  ↓
ACTIVE
  │ (Suspended)
  ↓
SUSPENDED
  │ (Re-activated)
  ↓
ACTIVE

ALTERNATIVE PATH:
ACTIVE → DELETED (soft delete, only if no agreements exist)
```

**State Descriptions:**

| State | Description | Impact on Agreements |
|-------|-------------|---------------------|
| **PENDING** | Created, not yet active | Cannot create agreements |
| **ACTIVE** | Operational | Can create agreements |
| **SUSPENDED** | Temporarily disabled | Cannot create new agreements, existing agreements continue |
| **DELETED** | Soft deleted | Read-only, cannot create agreements |

**Channel Constraint:**
- One CPL = one channel (immutable after creation)
- Cannot change channel (would break budget dimensions)

---

## 7. FU (Forecasting Unit)

### Purpose

FU is a **planning-level product aggregation** that groups SKUs with same form factor and price point but different variants. Primary targeting level for:
- Agreements (Actuals-First)
- Volume planning (Planning-First, future)
- Budget allocation (Channel × Category × FU)

### Key Fields

**Identification:**
- `fu_code` (unique per tenant)
- `fu_name` (e.g., "500ml X Series Shampoo")

**Product Hierarchy:**
- `gu_id` (Generic Unit parent)
- `brand_id` (indirect via GU)
- `category_id` (indirect via GU)

**FU Attributes:**
- `size` ("500ml")
- `segment` ("Premium" | "Mass")
- `form_factor` (optional)

**Planning Attributes (Phase 2+):**
- `is_plannable` (boolean, default true)
- `default_base_volume` (historical baseline, optional)

**Status:**
- `is_active` (boolean)

### Relationships

- **→ GU** (many-to-one): Each FU belongs to one Generic Unit
- **→ SKU** (one-to-many): Multiple SKUs can map to one FU
- **→ Agreement** (one-to-many): Multiple agreements target one FU
- **→ Brand/Category** (indirect): Via GU relationship

### Lifecycle States

```
INACTIVE
  │ (Activated)
  ↓
ACTIVE
  │ (Deactivated)
  ↓
INACTIVE

ALTERNATIVE PATH:
ACTIVE → DELETED (soft delete, only if no agreements reference it)
```

**State Descriptions:**

| State | Description | Impact |
|-------|-------------|--------|
| **INACTIVE** | Discontinued, not available for new agreements | Cannot select in agreement creation |
| **ACTIVE** | Operational | Can be selected in agreements |
| **DELETED** | Soft deleted | Read-only, existing agreements retain reference |

**FU Concept Example:**

```
FU: "500ml X Series Shampoo"
├─ SKU: Pantene 500ml Parlak Renkler (Bright Colors)
├─ SKU: Pantene 500ml Bukleler (Curls)
└─ SKU: Pantene 500ml Besleyici (Nourishing)

Same size (500ml) → Same form factor
Same price point → Consistent ROI calculation
Different variants → Consumer preference, not promotional structure
```

---

## Entity Relationship Summary

### Core Relationships

```
CPL (1) ──< (N) Agreement (1) ──> (1) FU
                              │
                              ├─> (1) Approval
                              │
                              └─< (N) Off-Invoice Entry
                                   │
                                   └─> (1) Ledger Entry
                                        │
                                        └─> (1) Budget Envelope
                                             │
                                             └─< (N) Budget Transaction
```

### Relationship Details

**Agreement ↔ CPL:**
- Many-to-one: Multiple agreements per CPL
- Required: Every agreement must have CPL

**Agreement ↔ FU:**
- Many-to-one: Multiple agreements per FU
- Required: Every agreement must target one FU

**Agreement ↔ Approval:**
- One-to-one: Each agreement has one approval request
- Optional: Approval not required for very small amounts (policy-driven)

**Agreement ↔ Budget Transaction:**
- One-to-one: Each agreement creates one RESERVE transaction (on approval)

**Agreement ↔ Off-Invoice Entry:**
- One-to-many: Multiple transactions per agreement (typically LTA)

**Off-Invoice Entry ↔ Ledger Entry:**
- One-to-one: Each posted entry creates one ledger entry

**Ledger Entry ↔ Budget Envelope:**
- Many-to-one: Multiple ledger entries per envelope
- Link via `budget_envelope_id` (determined at posting time by channel/category/period)

**Budget Envelope ↔ Budget Transaction:**
- One-to-many: Multiple transactions per envelope
- Transactions compute envelope state (committed, reserved, consumed)

---

## Data Model Principles

### 1. Event Sourcing (Budget)
- Budget state (committed, reserved, consumed) is **computed** from transactions/ledger
- Not stored in `budget_envelopes` table
- Eliminates dual-write issues
- Complete audit trail by design

### 2. Idempotency
- All critical operations use idempotency keys
- Prevents duplicate processing on retry
- Examples: Budget transactions, Off-invoice entries

### 3. Immutability
- Budget transactions are immutable (append-only)
- Ledger entries are immutable (append-only)
- History preserved for audit

### 4. Dimension Flexibility
- Budget envelopes use JSONB for dimensions
- Allows different dimension combinations (Channel × Category, Channel × Brand × Region, etc.)
- Canonical key ensures uniqueness

### 5. Lifecycle Governance
- All spend-affecting actions require approval
- State machines enforce valid transitions
- Audit trail for all state changes

---

## Validation Rules (Summary)

### Agreement
- End date ≥ Start date
- STA: Duration ≤ 30 days
- LTA: Duration > 30 days
- `cap_total_amount` > 0
- `mechanic_value` > 0
- `justification` required (not empty)
- Budget availability must be sufficient

### Off-Invoice Entry
- Invoice date within agreement period
- Amount ≤ agreement cap
- CPL matches agreement CPL
- Idempotency: No duplicate invoice_no + invoice_date

### Budget Transaction
- Idempotency: No duplicate `idempotency_key`
- Amount > 0
- Envelope must exist
- RESERVE: Available budget must be sufficient

### CPL
- Channel is immutable after creation
- Cannot delete if agreements exist
- `customer_code` unique per tenant

### FU
- `gu_id` required
- Cannot delete if agreements reference it
- `fu_code` unique per tenant

---

## Open Questions (Sprint 0)

1. **SKU-level targeting:** Should agreements support SKU-level targeting (or only FU/GU)?
   - Current BRD: Primary targeting at FU level, SKU optional detail
   - Decision needed: Is SKU-level agreement creation allowed in Phase 1?

2. **Customer hierarchy:** Should CPL support sub-customers (outlets)?
   - Current BRD: CPL is top-level, sub-customers optional
   - Decision needed: Do we need outlet-level tracking in Phase 1?

3. **Budget dimension combinations:** What combinations are required for Phase 1?
   - BRD mentions: Channel × Category × Period (default)
   - Decision needed: Are other combinations required (Brand, Region)?

4. **Approval delegation:** Can approvers delegate approval authority?
   - Current model: Role-based, no delegation
   - Decision needed: Is delegation required?

5. **Agreement amendments:** Can agreements be modified after approval?
   - Current model: No modification after APPROVED
   - Decision needed: Do we need amendment workflow?

---

## Next Steps

1. **State Machine Diagrams:** Create detailed state transition diagrams for each entity
2. **Sequence Diagrams:** Document critical flows (Agreement creation → Approval → Budget reservation)
3. **Data Schema Draft:** Convert key fields to preliminary database schema
4. **Validation Rules Detail:** Expand validation rules with business logic
5. **Policy Configuration:** Define approval policy matching logic

---

**Document Status:** ✅ Complete  
**Review Status:** Pending  
**Implementation:** Sprint 1+ (after architectural validation)

