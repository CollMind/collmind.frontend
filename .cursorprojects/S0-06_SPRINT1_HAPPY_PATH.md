# S0-06 – Sprint 1 Happy Path (End-to-End)
## Textual Sequence for Complete STA Flow

**Sprint:** 1  
**Date:** 2026-01  
**Status:** Architectural Definition  
**Purpose:** Define end-to-end happy path sequence with entity changes and state transitions

---

## Overview

This document describes the complete end-to-end happy path for a Short-Term Agreement (STA) in Sprint 1, from creation through budget reservation to off-invoice entry and reporting.

**Flow:** Create → Submit → Approve → Reserve Budget → Enter Off-Invoice → Report

---

## Step 1: Planner Creates STA

### Actor
**Planner** (User with PLANNER role)

### Action
Planner creates a new Short-Term Agreement (STA) with required fields.

### Entities Affected

**1. Agreement Entity**
- **Created:** New Agreement entity is created in database
- **Initial State:** `status = 'DRAFT'`
- **Fields Set:**
  - `agreement_type = 'STA'`
  - `agreement_code` (auto-generated: e.g., "STA-2026-025")
  - `cpl_id` (selected Customer/Planning Level)
  - `channel` (derived from CPL: e.g., 'TRADITIONAL')
  - `fu_id` (selected Forecasting Unit)
  - `period_month` (derived from start_date: e.g., '2026-01')
  - `start_date`, `end_date` (duration ≤30 days for STA)
  - `cap_total_amount` (budget ceiling: e.g., 15,000 TL)
  - `justification` (mandatory business rationale)
  - `created_by` (Planner user ID)
  - `created_at` (timestamp)

### State Changes

**Agreement:**
- **State Transition:** None (initial state)
- **Final State:** `DRAFT`

### Relationships Created

**Agreement → CPL:**
- `agreements.cpl_id` = `customers.id` (many-to-one link)

**Agreement → FU:**
- `agreements.fu_id` = `forecasting_units.id` (many-to-one link)

### Budget Impact
❌ **No budget impact** - Agreement in DRAFT state does not reserve or consume budget

### Additional Notes
- Agreement exists in system but not visible to approvers
- All fields are editable
- Budget availability check is **informational only** (does not block creation)
- Agreement can be deleted without audit trail requirement

---

## Step 2: Planner Submits for Approval

### Actor
**Planner** (Creator of Agreement)

### Action
Planner submits the Agreement for approval workflow. System creates approval request and validates business rules.

### Entities Affected

**1. Agreement Entity**
- **Updated:** Agreement state changes
- **State Transition:** `DRAFT → PENDING`
- **Fields Updated:**
  - `status = 'PENDING'`
  - `updated_at` (timestamp)

**2. Approval Request Entity (New)**
- **Created:** New Approval Request entity is created
- **Initial State:** `status = 'PENDING'`
- **Fields Set:**
  - `entity_type = 'AGREEMENT'`
  - `entity_id` = Agreement ID
  - `requested_by` = Planner user ID
  - `requested_at` = Current timestamp
  - `approver_role` = Policy-resolved role (e.g., 'APPROVER' or 'FINANCE')
  - `status = 'PENDING'`

**3. Agreement → Approval Link**
- **Updated:** Agreement links to Approval Request
- **Field Set:**
  - `agreements.approval_request_id` = Approval Request ID

### State Changes

**Agreement:**
- **State Transition:** `DRAFT → PENDING`
- **Final State:** `PENDING`

**Approval Request:**
- **State Transition:** None (initial state)
- **Final State:** `PENDING`

### Relationships Created

**Agreement → Approval Request:**
- `agreements.approval_request_id` = `approval_requests.id` (one-to-one link)

### Budget Impact
❌ **No budget impact** - Budget is checked during submission validation but **not reserved** until approval

### Additional Notes
- Agreement becomes locked for editing (read-only for creator)
- Approval Request is visible to approvers in their approval queue
- Budget availability must be sufficient (validated at submission)
- All required fields must be valid
- Agreement cannot be deleted while PENDING (must reject to remove)

---

## Step 3: Approver Approves

### Actor
**Approver** (User with APPROVER or FINANCE role, as determined by approval policy)

### Action
Approver reviews Agreement and makes approval decision (APPROVE).

### Entities Affected

**1. Approval Request Entity**
- **Updated:** Approval Request state changes
- **State Transition:** `PENDING → APPROVED`
- **Fields Updated:**
  - `status = 'APPROVED'`
  - `approved_by` = Approver user ID
  - `approved_at` = Current timestamp
  - `comments` (optional, if provided by approver)
  - `updated_at` = Current timestamp

**2. Agreement Entity**
- **Updated:** Agreement state changes (triggered by approval)
- **State Transition:** `PENDING → APPROVED`
- **Fields Updated:**
  - `status = 'APPROVED'`
  - `approved_at` = Current timestamp (from Approval Request)
  - `approved_by` = Approver user ID (from Approval Request)
  - `updated_at` = Current timestamp

### State Changes

**Approval Request:**
- **State Transition:** `PENDING → APPROVED`
- **Final State:** `APPROVED`

**Agreement:**
- **State Transition:** `PENDING → APPROVED`
- **Final State:** `APPROVED`

### Relationships
- No new relationships created (existing links remain)

### Budget Impact
⚠️ **Budget reservation triggered** - Approval triggers budget reservation process, but reservation happens in next step (Step 4)

### Additional Notes
- Approval decision is **immutable** (cannot be reversed)
- Agreement is now ready for execution (can transition to ACTIVE)
- Budget reservation is triggered by approval (happens immediately after)

---

## Step 4: Budget Is Reserved

### Actor
**System** (Automatic process triggered by approval)

### Action
System creates budget reservation transaction upon Agreement approval.

### Entities Affected

**1. Budget Transaction Entity (New)**
- **Created:** New Budget Transaction entity is created
- **Initial State:** `tx_status = 'POSTED'` (immediate posting in Sprint 1)
- **Fields Set:**
  - `tx_type = 'RESERVE'`
  - `source_type = 'AGREEMENT'`
  - `source_id` = Agreement ID
  - `envelope_id` = Determined Budget Envelope ID (via channel/category/period mapping)
  - `amount` = Agreement `cap_total_amount` (e.g., 15,000 TL)
  - `currency` = Agreement currency (e.g., 'TRY')
  - `tx_status = 'POSTED'`
  - `idempotency_key` = Generated: `'RESERVE|AGREEMENT|{agreement_id}|{envelope_id}'`
  - `created_at` = Current timestamp

**2. Budget Envelope Entity**
- **Updated:** Budget Envelope state is recalculated (computed, not stored)
- **State Change:** `reserved` amount increases (computed from transactions)
- **Computed Fields:**
  - `reserved` = SUM(RESERVE transactions) - SUM(RELEASE transactions) (increased)
  - `available` = `allocated` - `committed` - `reserved` - `consumed` (decreased)

**3. Agreement Entity**
- **No direct update** - Agreement state remains APPROVED (already updated in Step 3)

### State Changes

**Budget Transaction:**
- **State Transition:** None (created with POSTED status)
- **Final State:** `tx_status = 'POSTED'`

**Budget Envelope:**
- **State Change:** `reserved` increases, `available` decreases (computed values, not stored state)
- **Example:**
  - Before: `reserved = 20,000 TL`, `available = 50,000 TL`
  - After: `reserved = 35,000 TL` (20,000 + 15,000), `available = 35,000 TL` (50,000 - 15,000)

**Agreement:**
- **State Transition:** None (remains APPROVED)
- **Final State:** `APPROVED`

### Relationships Created

**Agreement → Budget Transaction:**
- `budget_transactions.source_id` = `agreements.id` (many-to-one link)
- `budget_transactions.source_type = 'AGREEMENT'`

**Budget Transaction → Budget Envelope:**
- `budget_transactions.envelope_id` = `budget_envelopes.id` (many-to-one link)

**Envelope Determination:**
- Envelope found by dimensions: Channel (from Agreement) × Category (derived from FU) × Period (from Agreement)

### Budget Impact
✅ **Budget Reserved** - `cap_total_amount` (15,000 TL) is reserved in Budget Envelope

**Budget State:**
```
Before Reservation:
  Envelope.allocated: 100,000 TL
  Envelope.reserved: 20,000 TL (from other agreements)
  Envelope.consumed: 30,000 TL
  Envelope.available: 50,000 TL

After Reservation:
  Envelope.allocated: 100,000 TL
  Envelope.reserved: 35,000 TL (20,000 + 15,000)
  Envelope.consumed: 30,000 TL
  Envelope.available: 35,000 TL (50,000 - 15,000)
```

### Additional Notes
- Budget reservation is **idempotent** (duplicate reservation attempts return existing transaction)
- Reservation happens **immediately** upon approval (automatic, no manual trigger)
- Reserved budget remains until Agreement closes or is cancelled
- Agreement can now transition to ACTIVE (execution can begin)

---

## Step 5: Planner Enters Off-Invoice Entry

### Actor
**Planner** (or Finance user, can create entries for approved/active Agreements)

### Action
Planner creates Off-Invoice entry for the Agreement to record actual spend that occurred.

### Entities Affected

**1. Off-Invoice Entry Entity (New)**
- **Created:** New Off-Invoice Entry entity is created
- **Initial State:** `status = 'POSTED'` (in Sprint 1, immediate posting)
- **Fields Set:**
  - `agreement_id` = Agreement ID (selected by user)
  - `agreement_code` = Agreement code (denormalized: e.g., "STA-2026-025")
  - `invoice_no` = Vendor invoice number (e.g., "FF-Q1-001")
  - `invoice_date` = Invoice date (e.g., "2026-01-15")
  - `amount` = Transaction amount (e.g., 7,250.00 TL)
  - `currency` = 'TRY'
  - `status = 'POSTED'` (immediate in Sprint 1)
  - `idempotency_key` = Generated: `'{agreement_id}|{invoice_no}|{invoice_date}'`
  - `created_at` = Current timestamp

**2. Ledger Entry Entity (New)**
- **Created:** New Ledger Entry entity is created (upon entry posting)
- **Fields Set:**
  - `source_type = 'AGREEMENT'`
  - `source_id` = Agreement ID
  - `spend_type = 'OFF_INVOICE'`
  - `amount` = Entry amount (e.g., 7,250.00 TL)
  - `currency` = 'TRY'
  - `period_month` = From Agreement (e.g., '2026-01')
  - `channel` = From Agreement (e.g., 'TRADITIONAL')
  - `cpl_id` = From Agreement (CPL ID)
  - `fu_id` = From Agreement (FU ID)
  - `budget_envelope_id` = Determined Budget Envelope ID (same as reservation envelope)
  - `posting_date` = Current timestamp

**3. Agreement Entity**
- **Updated:** Agreement `consumed_amount` is recalculated (computed, not stored)
- **Computed Field:**
  - `consumed_amount` = SUM(ledger_entries WHERE `source_id` = Agreement ID) (increased)

**4. Budget Envelope Entity**
- **Updated:** Budget Envelope state is recalculated (computed, not stored)
- **Computed Fields:**
  - `consumed` = SUM(ledger_entries WHERE `budget_envelope_id` = Envelope ID) (increased)
  - `available` = `allocated` - `committed` - `reserved` - `consumed` (decreased)

### State Changes

**Off-Invoice Entry:**
- **State Transition:** None (created with POSTED status in Sprint 1)
- **Final State:** `status = 'POSTED'`

**Ledger Entry:**
- **State Transition:** None (created immediately)
- **Final State:** `status = 'POSTED'` (implicit, no state field)

**Agreement:**
- **State Transition:** None (remains APPROVED or ACTIVE)
- **Final State:** `APPROVED` or `ACTIVE`
- **Computed Change:** `consumed_amount` increases (e.g., 0 → 7,250 TL)

**Budget Envelope:**
- **State Change:** `consumed` increases, `available` decreases (computed values)
- **Example:**
  - Before: `consumed = 30,000 TL`, `available = 35,000 TL`
  - After: `consumed = 37,250 TL` (30,000 + 7,250), `available = 27,750 TL` (35,000 - 7,250)

### Relationships Created

**Off-Invoice Entry → Agreement:**
- `off_invoice_entries.agreement_id` = `agreements.id` (many-to-one link)

**Ledger Entry → Agreement:**
- `ledger_entries.source_id` = `agreements.id` (many-to-one link)
- `ledger_entries.source_type = 'AGREEMENT'`

**Ledger Entry → Budget Envelope:**
- `ledger_entries.budget_envelope_id` = `budget_envelopes.id` (many-to-one link)

**Ledger Entry → CPL/FU:**
- `ledger_entries.cpl_id` = From Agreement (derived)
- `ledger_entries.fu_id` = From Agreement (derived)

### Budget Impact
✅ **Budget Consumed** - Entry amount (7,250 TL) is consumed from Budget Envelope

**Budget State:**
```
Before Entry:
  Envelope.allocated: 100,000 TL
  Envelope.reserved: 35,000 TL (from Step 4)
  Envelope.consumed: 30,000 TL
  Envelope.available: 35,000 TL
  
  Agreement.consumed_amount: 0 TL

After Entry:
  Envelope.allocated: 100,000 TL
  Envelope.reserved: 35,000 TL (unchanged)
  Envelope.consumed: 37,250 TL (30,000 + 7,250)
  Envelope.available: 27,750 TL (35,000 - 7,250)
  
  Agreement.consumed_amount: 7,250 TL
```

### Additional Notes
- Entry validation ensures Agreement status is APPROVED or ACTIVE
- Entry inherits CPL, FU, Channel from Agreement (not user input)
- Idempotency key prevents duplicate invoices
- Ledger entry links to same Budget Envelope as reservation (Step 4)
- Agreement `consumed_amount` is computed from ledger entries (not stored)

---

## Step 6: Data Appears in Report

### Actor
**Finance User** (or any user with report access)

### Action
User views financial report that aggregates data from Agreements, Budget Envelopes, and Ledger Entries.

### Entities Affected

**No entities are modified** - Reporting is read-only aggregation of existing data.

### State Changes

**None** - Reporting does not change entity states.

### Data Aggregation

**Report data is computed from:**

**1. Agreement Data:**
- Agreement details: Code, Type, CPL, FU, Channel, Period
- Agreement status: APPROVED, ACTIVE
- Agreement amounts: `cap_total_amount`, `consumed_amount` (computed)

**2. Budget Envelope Data:**
- Envelope dimensions: Channel, Category, Period
- Envelope amounts: `allocated`, `reserved` (computed), `consumed` (computed), `available` (computed)
- Budget utilization percentage

**3. Ledger Entry Data:**
- Ledger entries linked to Agreement
- Entry amounts, dates, types (OFF_INVOICE)
- Aggregated by Agreement, Period, CPL, FU

**4. Off-Invoice Entry Data:**
- Invoice numbers, dates, amounts
- Linked to Agreement for detail view

### Report Views

**Example Report Queries:**

**By Agreement:**
```
Agreement: STA-2026-025
  - Cap Amount: 15,000 TL
  - Reserved: 15,000 TL (from Budget Transaction)
  - Consumed: 7,250 TL (from Ledger Entries)
  - Remaining: 7,750 TL (15,000 - 7,250)
```

**By Budget Envelope:**
```
Envelope: TRADITIONAL|HAIR_CARE|2026-01
  - Allocated: 100,000 TL
  - Reserved: 35,000 TL (from Budget Transactions)
  - Consumed: 37,250 TL (from Ledger Entries)
  - Available: 27,750 TL (computed)
  - Utilization: 72.25%
```

**By Period:**
```
Period: 2026-01
  - Agreements: 5
  - Total Reserved: 45,000 TL
  - Total Consumed: 37,250 TL
  - Off-Invoice Entries: 3
```

### Relationships Used

**Agreement → Off-Invoice Entry:**
- `off_invoice_entries.agreement_id` = `agreements.id` (to list entries per Agreement)

**Agreement → Ledger Entry:**
- `ledger_entries.source_id` = `agreements.id` (to compute `consumed_amount`)

**Ledger Entry → Budget Envelope:**
- `ledger_entries.budget_envelope_id` = `budget_envelopes.id` (to compute envelope `consumed`)

**Budget Transaction → Budget Envelope:**
- `budget_transactions.envelope_id` = `budget_envelopes.id` (to compute envelope `reserved`)

### Budget Impact
📊 **Reporting Only** - No budget impact, read-only aggregation

### Additional Notes
- Reports compute state from multiple sources (Agreements, Transactions, Ledger Entries)
- No entities are created or updated during reporting
- All computed fields (reserved, consumed, available) are calculated from source data
- Reports can filter by Agreement, Period, CPL, FU, Channel, etc.

---

## Complete State Transition Summary

### Agreement States Through Flow

```
Step 1: DRAFT (created)
  ↓
Step 2: PENDING (submitted)
  ↓
Step 3: APPROVED (approved)
  ↓
Step 4: APPROVED (budget reserved, state unchanged)
  ↓
Step 5: APPROVED or ACTIVE (off-invoice entry posted, state unchanged)
  ↓
Step 6: APPROVED or ACTIVE (reported, state unchanged)
```

### Approval Request States Through Flow

```
Step 2: PENDING (created)
  ↓
Step 3: APPROVED (approved)
  ↓
Steps 4-6: APPROVED (unchanged)
```

### Budget Transaction States Through Flow

```
Step 4: POSTED (RESERVE transaction created)
  ↓
Steps 5-6: POSTED (unchanged)
```

### Off-Invoice Entry States Through Flow

```
Step 5: POSTED (created and posted immediately)
  ↓
Step 6: POSTED (reported, unchanged)
```

---

## Entity Relationship Summary

### Final State After All Steps

**Agreement:**
- Status: `APPROVED` or `ACTIVE`
- `consumed_amount`: 7,250 TL (computed from Ledger Entries)
- Linked to: Approval Request, Budget Transaction (RESERVE), Off-Invoice Entries, Ledger Entries

**Approval Request:**
- Status: `APPROVED`
- Linked to: Agreement (one-to-one)

**Budget Transaction:**
- Type: `RESERVE`
- Status: `POSTED`
- Amount: 15,000 TL
- Linked to: Agreement, Budget Envelope

**Off-Invoice Entry:**
- Status: `POSTED`
- Amount: 7,250 TL
- Linked to: Agreement, Ledger Entry (one-to-one)

**Ledger Entry:**
- Type: `OFF_INVOICE`
- Amount: 7,250 TL
- Linked to: Agreement, Budget Envelope, Off-Invoice Entry

**Budget Envelope:**
- `reserved`: 35,000 TL (computed from Budget Transactions)
- `consumed`: 37,250 TL (computed from Ledger Entries)
- `available`: 27,750 TL (computed)

---

## Open Questions (Sprint 0)

1. **Agreement ACTIVE Transition:** When does Agreement transition from APPROVED to ACTIVE?
   - Current: Automatic on `start_date` or manual trigger
   - Question: Should Step 5 assume ACTIVE state?

2. **Multiple Off-Invoice Entries:** Can multiple entries be created for same Agreement?
   - Current: Yes (many-to-one relationship)
   - Question: Should Step 5 show multiple entries?

3. **Report Timing:** When are reports refreshed (real-time vs scheduled)?
   - Current: Not specified
   - Question: Should reports be real-time or cached?

---

**Document Status:** ✅ Complete  
**Review Status:** Pending  
**Implementation:** Sprint 1

