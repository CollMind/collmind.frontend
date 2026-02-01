# S0-05 – Off-Invoice Flow (Conceptual)
## Conceptual Design for Off-Invoice Entry Flow

**Sprint:** 0  
**Date:** 2026-01  
**Status:** Architectural Definition  
**Purpose:** Define Off-Invoice entry flow, required data, validation rules, and relationships

---

## Overview

Off-Invoice entries represent promotional allowances paid **after** the invoice is issued, typically through:
- Price difference invoices (fiyat farkı faturası)
- Rebate settlements
- Display fees
- Listing fees
- Turnover bonuses

**Key Principle:** Off-Invoice entries link actual spend to Agreements, consuming budget and updating ledger.

---

## Constraints (Sprint 0)

### Current Scope
- **Only for approved Agreements** (Agreement status must be APPROVED or ACTIVE)
- **CPL-based** (entry must match Agreement CPL)
- **FU derived from Agreement** (not specified in entry)
- **Single entry only** (no batch import in Sprint 0)

### Out of Scope (Future)
- Batch import (multiple entries in one operation)
- Batch approval workflow
- File upload (Excel/CSV)
- Multi-period settlement (single entry per period)

---

## What Is Off-Invoice Entry

### Purpose

Off-Invoice Entry represents a single spend transaction that:
- Occurred after invoice was issued (not deducted at point of sale)
- Is linked to an approved Agreement
- Consumes budget from the Agreement's envelope
- Posts to ledger for financial tracking

### Business Context

**When Used:**
- LTA settlements (quarterly/annual rebates)
- Display fee payments
- Listing fee payments
- Volume bonus payments
- Price difference invoices

**Typical Flow:**
1. Agreement approved and active
2. Promotion period completes (or periodic settlement)
3. Finance receives invoice from customer
4. Finance creates Off-Invoice entry
5. Entry validated and posted to ledger
6. Budget consumed, Agreement `consumed_amount` updated

---

## Required Data

### Entry Identification

**Required Fields:**

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `invoice_no` | VARCHAR(100) | Vendor invoice number (required, unique within Agreement) | "FF-Q1-001" |
| `invoice_date` | DATE | Invoice date (required) | "2026-04-05" |
| `amount` | NUMERIC(18,2) | Transaction amount (required, > 0) | 7,250.00 |
| `currency` | CHAR(3) | Currency code (required, default: 'TRY') | 'TRY' |

**Optional Fields:**

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `quantity` | NUMERIC(18,3) | Quantity if applicable (optional) | 100.00 |
| `uom` | VARCHAR(10) | Unit of measure (optional) | 'EA' \| 'CS' |
| `notes` | TEXT | Optional notes/description | "Q1 Settlement" |

### Agreement Link

**Required Fields:**

| Field | Type | Description | Source |
|-------|------|-------------|--------|
| `agreement_id` | UUID | Reference to Agreement (required) | User input (Agreement selection) |
| `agreement_code` | VARCHAR(50) | Agreement code (denormalized, display only) | Derived from Agreement |

**Derived from Agreement:**

| Field | Source | Description |
|-------|--------|-------------|
| `cpl_id` | `Agreement.cpl_id` | Customer/Planning Level (CPL) |
| `cpl_code` | `CPL.customer_code` | CPL code (denormalized) |
| `channel` | `Agreement.channel` | Channel (TRADITIONAL, NKA, etc.) |
| `fu_id` | `Agreement.fu_id` | Forecasting Unit (FU) |
| `period_month` | `Agreement.period_month` | Period (YYYY-MM) |

### Idempotency

**Idempotency Key:**
- Format: `{agreement_id}|{invoice_no}|{invoice_date}`
- Example: `lta-2026-gs-001|FF-Q1-001|2026-04-05`
- Purpose: Prevent duplicate entries (same invoice number + date)

**Constraint:** Unique per tenant

---

## Validation Rules (Conceptual)

### Rule 1: Agreement Must Exist

**Rule:** `agreement_id` must reference a valid Agreement.

**Validation:**
```
IF agreement_id NOT IN (SELECT id FROM agreements WHERE tenant_id = ?)
  THEN ERROR: "Agreement not found"
```

**Impact:** Entry cannot be created if Agreement doesn't exist.

---

### Rule 2: Agreement Must Be Approved or Active

**Rule:** Agreement status must be 'APPROVED' or 'ACTIVE'.

**Validation:**
```
IF agreement.status NOT IN ('APPROVED', 'ACTIVE')
  THEN ERROR: "Agreement status must be APPROVED or ACTIVE (current: {status})"
```

**Impact:** Entry cannot be created for DRAFT, PENDING, or REJECTED agreements.

**Business Rationale:**
- Only approved/active agreements can have spend
- Budget is reserved only for approved agreements
- Rejected agreements never execute, so no spend occurs

---

### Rule 3: Invoice Date Must Be Within Agreement Period

**Rule:** `invoice_date` must be within Agreement's start_date and end_date.

**Validation:**
```
IF invoice_date < agreement.start_date OR invoice_date > agreement.end_date
  THEN WARNING: "Invoice date outside agreement period ({start_date} to {end_date})"
```

**Impact:** Warning (not error) - allows flexibility for settlement timing.

**Business Rationale:**
- Settlements may occur slightly outside period (e.g., Q1 settlement in April)
- Warning alerts user to potential mismatch
- Still allows posting for reconciliation flexibility

---

### Rule 4: CPL Must Match Agreement CPL

**Rule:** Entry CPL (if specified) must match Agreement CPL.

**Validation:**
```
IF entry.cpl_code IS NOT NULL AND entry.cpl_code != agreement.cpl_code
  THEN ERROR: "CPL mismatch (entry: {entry.cpl_code}, agreement: {agreement.cpl_code})"
```

**Impact:** Entry cannot be created if CPL mismatch.

**Note:** In Sprint 0, CPL is **derived from Agreement** (not specified in entry). This validation is **future-proof** for when CPL can be specified in entry.

**Business Rationale:**
- Agreement is CPL-specific (one Agreement = one CPL)
- Off-Invoice spend must match Agreement's CPL
- Prevents misattribution of spend

---

### Rule 5: Amount Must Be Positive

**Rule:** `amount` must be greater than zero.

**Validation:**
```
IF amount <= 0
  THEN ERROR: "Amount must be greater than zero"
```

**Impact:** Entry cannot be created with zero or negative amount.

---

### Rule 6: Amount Cannot Exceed Agreement Cap

**Rule:** Entry amount + Agreement `consumed_amount` must not exceed `cap_total_amount`.

**Validation:**
```
IF (agreement.consumed_amount + entry.amount) > agreement.cap_total_amount
  THEN WARNING: "Amount exceeds agreement cap by {diff} TL (cap: {cap_total_amount}, current: {consumed_amount}, entry: {amount})"
```

**Impact:** Warning (not error) - allows slight overruns for reconciliation.

**Business Rationale:**
- Agreements may have slight overruns due to calculation differences
- Warning alerts user to potential overrun
- Still allows posting for accurate tracking

---

### Rule 7: Idempotency - No Duplicate Invoices

**Rule:** Same `invoice_no` + `invoice_date` + `agreement_id` cannot exist twice.

**Validation:**
```
IF idempotency_key EXISTS IN (SELECT idempotency_key FROM off_invoice_entries WHERE tenant_id = ?)
  THEN ERROR: "Duplicate invoice (invoice_no: {invoice_no}, date: {invoice_date})"
```

**Impact:** Entry cannot be created if duplicate invoice exists.

**Business Rationale:**
- Prevents double-counting of same invoice
- Ensures accurate budget consumption
- Maintains ledger integrity

---

### Rule 8: Budget Envelope Must Exist

**Rule:** Budget envelope for Agreement dimensions must exist.

**Validation:**
```
IF envelope NOT FOUND (channel, category, period)
  THEN WARNING: "Budget envelope not found (channel: {channel}, category: {category}, period: {period})"
```

**Impact:** Warning (not error) - entry can still be posted.

**Business Rationale:**
- Envelope may not exist for some dimension combinations
- Entry can still be posted for ledger tracking
- Budget consumption may not apply (future: auto-create envelope)

---

## Relationship to Agreement

### Relationship Type

**Many-to-One:** Multiple Off-Invoice entries can belong to one Agreement.

### Cardinality

- Agreement (1) ←→ (N) Off-Invoice Entries
  - Agreement can have zero or more Off-Invoice entries
  - Typical for LTA: Multiple settlement entries per period
  - Typical for STA: Usually single entry (if any)

### Link Mechanism

**Off-Invoice Entry → Agreement:**
- `off_invoice_entries.agreement_id` = `agreements.id`
- `off_invoice_entries.agreement_code` = `agreements.agreement_code` (denormalized)

**Agreement → Off-Invoice Entries:**
- `agreements.consumed_amount` = SUM(`off_invoice_entries.amount`) WHERE `status='POSTED'`
- Computed field (not stored directly)

### Relationship Lifecycle

```
Agreement Created (DRAFT)
  → No Off-Invoice entries (agreement not yet active)

Agreement Approved (APPROVED)
  → Off-Invoice entries can be created (agreement active)

Agreement Active (ACTIVE)
  → Off-Invoice entries created (spend tracking)

Agreement Closed (CLOSED)
  → Off-Invoice entries can still be created (final settlements)

Agreement Rejected (REJECTED)
  → No Off-Invoice entries (agreement never executed)
```

---

## Relationship to Budget

### Budget Envelope Link

**How Entry Links to Envelope:**
1. Entry derives dimensions from Agreement:
   - Channel: `Agreement.channel`
   - Category: `Agreement.fu_id` → FU → GU → Category
   - Period: `Agreement.period_month`
2. System finds Budget Envelope matching these dimensions
3. Ledger entry links to envelope via `budget_envelope_id`

### Budget Consumption

**When Entry Is Posted:**
1. Ledger entry created (links to envelope)
2. Envelope `consumed` computed from ledger entries
3. Envelope `available` decreases (reserved + consumed)
4. Agreement `consumed_amount` increases

**Budget Impact:**
```
Before Entry:
  Envelope.allocated: 100,000 TL
  Envelope.reserved: 35,000 TL
  Envelope.consumed: 30,000 TL
  Envelope.available: 35,000 TL
  
  Agreement.consumed_amount: 0 TL

Off-Invoice Entry Posted (amount: 7,250 TL):
  → Ledger entry created (budget_envelope_id: envelope.id)
  → Envelope.consumed: 37,250 TL (30,000 + 7,250)
  → Envelope.available: 27,750 TL (35,000 - 7,250)
  → Agreement.consumed_amount: 7,250 TL

After Entry:
  Envelope.allocated: 100,000 TL
  Envelope.reserved: 35,000 TL
  Envelope.consumed: 37,250 TL
  Envelope.available: 27,750 TL
  
  Agreement.consumed_amount: 7,250 TL
```

### Budget State Update

**Event-Sourced Pattern:**
- `consumed` is **computed** from ledger entries (not stored)
- `available` is **calculated**: Allocated - Reserved - Consumed
- Entry posting triggers envelope state recalculation

---

## Entry Lifecycle

### Lifecycle States

**Sprint 0 (Single Entry):**

```
CREATED
  │ (Validation passes)
  ↓
VALIDATED
  │ (Post to ledger)
  ↓
POSTED

ALTERNATIVE PATH:
CREATED → REJECTED (if validation fails)
```

**Future (Batch Import):**

```
STAGED
  │ (Batch approved)
  ↓
APPROVED
  │ (Post to ledger)
  ↓
POSTED
```

### State Descriptions

| State | Description | Impact on Budget |
|-------|-------------|------------------|
| **CREATED** | Entry created, validation pending | ❌ No budget impact |
| **VALIDATED** | Validation passed, ready for posting | ❌ No budget impact yet |
| **POSTED** | Ledger entry created, budget consumed | ✅ Budget consumed |
| **REJECTED** | Validation failed | ❌ No budget impact |

**Note:** In Sprint 0, entry transitions directly from CREATED to POSTED (no separate VALIDATED state).

---

## Entry Creation Flow

### Flow Steps (Conceptual)

**1. User Selects Agreement**

```
User Action: Select Agreement
  → System loads Agreement details
  → System validates Agreement.status IN ('APPROVED', 'ACTIVE')
  → IF NOT APPROVED/ACTIVE: Show error, stop
```

**2. User Enters Entry Data**

```
User Input:
  - invoice_no: "FF-Q1-001"
  - invoice_date: "2026-04-05"
  - amount: 7,250.00
  - currency: "TRY" (default)
  - notes: "Q1 Settlement" (optional)
```

**3. System Validates Entry**

```
Validation Checks:
  1. Agreement exists? ✅
  2. Agreement approved/active? ✅
  3. Invoice date within period? ✅ (or warning)
  4. Amount > 0? ✅
  5. Amount + consumed_amount <= cap_total_amount? ⚠️ (warning if exceeds)
  6. Idempotency: Duplicate invoice? ❌ (error if duplicate)
  7. Budget envelope exists? ⚠️ (warning if missing)
```

**4. System Creates Entry**

```
Entry Created:
  - agreement_id: <from selection>
  - cpl_id: <derived from Agreement>
  - channel: <derived from Agreement>
  - fu_id: <derived from Agreement>
  - invoice_no: <user input>
  - invoice_date: <user input>
  - amount: <user input>
  - currency: <user input>
  - idempotency_key: <generated>
  - status: 'POSTED' (in Sprint 0, immediate posting)
```

**5. System Posts to Ledger**

```
Ledger Entry Created:
  - source_type: 'AGREEMENT'
  - source_id: <agreement_id>
  - spend_type: 'OFF_INVOICE'
  - amount: <entry.amount>
  - budget_envelope_id: <determined by channel/category/period>
  - channel: <from Agreement>
  - cpl_id: <from Agreement>
  - fu_id: <from Agreement>
  - period_month: <from Agreement>
```

**6. System Updates Agreement**

```
Agreement Updated (computed):
  - consumed_amount: SUM(ledger_entries WHERE source_id = agreement_id)
  - (not stored, computed from ledger)
```

**7. System Updates Envelope State**

```
Envelope State Recalculated:
  - consumed: SUM(ledger_entries WHERE budget_envelope_id = envelope.id)
  - available: allocated - reserved - consumed
  - (computed, not stored)
```

---

## CPL-Based Validation

### CPL Derivation

**From Agreement:**
- `entry.cpl_id` = `Agreement.cpl_id` (automatically set)
- `entry.cpl_code` = `CPL.customer_code` (denormalized, display only)

**User Cannot Override:**
- CPL is **fixed** by Agreement
- Entry inherits Agreement's CPL
- No user input for CPL in Sprint 0

### CPL Validation (Future)

**If CPL Can Be Specified:**
- Entry CPL must match Agreement CPL
- Validation: `entry.cpl_id == agreement.cpl_id`
- Error if mismatch

---

## FU Derivation from Agreement

### FU Link

**From Agreement:**
- `entry.fu_id` = `Agreement.fu_id` (automatically set)
- `entry.fu_code` = `FU.code` (denormalized, display only)

**User Cannot Override:**
- FU is **fixed** by Agreement
- Entry inherits Agreement's FU
- No user input for FU in Sprint 0

### Category Derivation

**From FU:**
1. `FU.fu_id` → `ForecastingUnit`
2. `ForecastingUnit.gu_id` → `GenericUnit`
3. `GenericUnit.category_id` → `Category`
4. Category used for Budget Envelope lookup

**Purpose:**
- Determines which Budget Envelope entry consumes from
- Envelope dimensions: Channel × Category × Period

---

## Examples

### Example 1: LTA Settlement Entry

```
Agreement:
  Code: LTA-2026-GS-001
  Type: LTA
  Status: ACTIVE
  CPL: Güzellik Sarayı (GS)
  FU: Wella Professional Range
  Channel: TRADITIONAL
  Period: 2026-Q1
  cap_total_amount: 50,000 TL
  consumed_amount: 0 TL

Off-Invoice Entry:
  invoice_no: "FF-Q1-001"
  invoice_date: "2026-04-05"
  amount: 7,250.00 TL
  currency: "TRY"
  notes: "Q1 Settlement"

Validation:
  ✅ Agreement exists
  ✅ Agreement status: ACTIVE
  ✅ Invoice date: 2026-04-05 (within period? Warning if outside)
  ✅ Amount: 7,250.00 > 0
  ✅ Amount + consumed: 7,250 <= 50,000 (cap)
  ✅ Idempotency: No duplicate

Result:
  ✅ Entry created and posted
  ✅ Ledger entry created (budget_envelope_id: determined by TRADITIONAL|HAIR_CARE|2026-Q1)
  ✅ Agreement.consumed_amount: 7,250 TL
  ✅ Envelope.consumed: increased by 7,250 TL
```

### Example 2: Rejected Agreement (Cannot Create Entry)

```
Agreement:
  Code: STA-2026-025
  Status: REJECTED

Off-Invoice Entry Creation:
  ❌ Validation fails: "Agreement status must be APPROVED or ACTIVE (current: REJECTED)"
  ❌ Entry cannot be created
```

### Example 3: Duplicate Invoice (Idempotency)

```
Existing Entry:
  agreement_id: "lta-2026-gs-001"
  invoice_no: "FF-Q1-001"
  invoice_date: "2026-04-05"

New Entry Attempt:
  agreement_id: "lta-2026-gs-001"
  invoice_no: "FF-Q1-001"
  invoice_date: "2026-04-05"

Validation:
  ❌ Idempotency check fails: "Duplicate invoice (invoice_no: FF-Q1-001, date: 2026-04-05)"
  ❌ Entry cannot be created
```

---

## Open Questions (Sprint 0)

1. **Agreement Cap Exceeded:** Should entry creation fail if amount exceeds cap?
   - Current: Warning (allows posting)
   - Question: Should this be an error instead?

2. **Invoice Date Outside Period:** Should entry creation fail if invoice date outside period?
   - Current: Warning (allows posting)
   - Question: Should this be an error for strict period enforcement?

3. **Missing Envelope:** Should entry creation fail if budget envelope doesn't exist?
   - Current: Warning (allows posting)
   - Question: Should envelope be auto-created, or should entry fail?

4. **Entry Deletion:** Can posted entries be deleted?
   - Current: Not specified
   - Question: Should entries be immutable after posting?

5. **Entry Amendment:** Can posted entries be edited?
   - Current: Not specified
   - Question: Should entries be immutable after posting (ledger integrity)?

---

## Next Steps

1. **Entry Entity:** Define Off-Invoice Entry entity with all required fields
2. **Validation Service:** Implement validation rules as service methods
3. **Ledger Integration:** Define ledger entry creation on entry posting
4. **Budget Integration:** Define envelope state update on entry posting
5. **Idempotency:** Implement idempotency key generation and duplicate check

---

**Document Status:** ✅ Complete  
**Review Status:** Pending  
**Implementation:** Sprint 1+ (after architectural validation)

