# S0-04 – Budget Reservation Concept
## Conceptual Design for Actuals-First TPM Budget Reservation

**Sprint:** 0  
**Date:** 2026-01  
**Status:** Architectural Definition  
**Purpose:** Define budget reservation concept, timing, relationship to Agreement, and approval/rejection handling

---

## Overview

Budget Reservation is the mechanism by which budget is **reserved** (locked) for an Agreement when it is approved, ensuring that the required budget remains available for the Agreement's execution period. Reservation prevents double-booking of budget across multiple Agreements.

**Key Principle:** Budget is reserved at Agreement approval, not at creation or submission.

---

## Constraints (Sprint 0)

### Current Scope
- **Budget reserved at Agreement approval** (PENDING → APPROVED)
- **No concurrency handling** (assumed single-threaded/sequential)
- **No budget overrun logic** (assumes sufficient budget at reservation time)

### Out of Scope (Future)
- Concurrent reservation handling (optimistic locking, transactions)
- Budget overrun prevention (check before reservation)
- Partial reservation (multi-period agreements)
- Reservation expiration (time-based release)

---

## What Is Reserved

### Reserved Amount

**What:** `Agreement.cap_total_amount` (Budget ceiling for the Agreement)

**Description:**  
The total maximum amount that the Agreement can consume during its execution period. This is the **budget ceiling** set by the Planner when creating the Agreement.

**Example:**
```
Agreement STA-2026-025
  cap_total_amount: 15,000 TL
  Reserved: 15,000 TL (full cap amount)
```

### Reserved Dimensions

**Envelope Determination:**  
Budget is reserved in a **specific Budget Envelope** determined by Agreement attributes:

```
Envelope Dimensions:
  - Channel: Agreement.channel (e.g., 'TRADITIONAL')
  - Category: Derived from Agreement.fu_id → Category (e.g., 'HAIR_CARE')
  - Period: Agreement.period_month (e.g., '2026-01')

Example:
  Agreement.channel = 'TRADITIONAL'
  Agreement.fu_id = 'FU-123' → Category = 'HAIR_CARE'
  Agreement.period_month = '2026-01'
  
  → Reserve in Envelope: 'TRADITIONAL|HAIR_CARE|2026-01'
```

**Mapping Logic:**
1. Channel: Direct from Agreement (required)
2. Category: Derived from FU via product hierarchy (FU → GU → Category)
3. Period: From Agreement start_date (YYYY-MM format)

### Reserved Currency

**Currency:** `Agreement.currency` (default: 'TRY')

**Description:**  
Reserved amount is in the same currency as the Agreement. Multi-currency support is out of scope for Sprint 0.

---

## When Reservation Occurs

### Reservation Trigger

**When:** Agreement transitions from **PENDING** → **APPROVED**

**Trigger Point:**  
All approval levels have approved the Agreement. Reservation happens **immediately** upon approval completion, before Agreement transitions to ACTIVE.

### Reservation Timing Flow

```
Agreement State: DRAFT
  → No reservation (no budget impact)

Agreement State: PENDING (Submitted)
  → No reservation yet (budget checked but not reserved)
  → Budget availability validated (informational)
  → Approval workflow active

Agreement State: APPROVED (All levels approved)
  → ✅ RESERVATION TRIGGERED
  → Budget Transaction created (tx_type='RESERVE')
  → Envelope.reserved increases
  → Envelope.available decreases
  → Agreement ready for execution

Agreement State: ACTIVE (Execution)
  → Reservation remains (not released)
  → Budget consumed as transactions post
  → Envelope.available = Allocated - Reserved - Consumed

Agreement State: CLOSED (Completion)
  → ✅ RESERVATION RELEASED
  → Budget Transaction created (tx_type='RELEASE')
  → Envelope.reserved decreases
  → Envelope.available increases

Agreement State: REJECTED (Approval denied)
  → ❌ No reservation (budget not reserved)
  → No budget impact
```

### Reservation Event Sequence

**Approval Success (RESERVE):**
```
1. Approval Request status: PENDING → APPROVED
2. Agreement status: PENDING → APPROVED (trigger)
3. Create Budget Transaction:
   - tx_type: 'RESERVE'
   - source_type: 'AGREEMENT'
   - source_id: <agreement_id>
   - envelope_id: <determined by channel/category/period>
   - amount: <cap_total_amount>
   - tx_status: 'POSTED' (immediate)
4. Envelope state updated (reserved computed from transactions)
5. Agreement ready for execution
```

**Approval Rejection (NO RESERVE):**
```
1. Approval Request status: PENDING → REJECTED
2. Agreement status: PENDING → REJECTED
3. ❌ No Budget Transaction created
4. ❌ No budget impact
5. Agreement blocked from execution
```

---

## How Reservation Relates to Agreement

### Relationship Type

**One-to-One:** Each Agreement has exactly **one RESERVE transaction** (when approved).

### Cardinality

- Agreement (1) ←→ (0..1) RESERVE Transaction
  - Agreement in DRAFT/PENDING: No RESERVE transaction (not yet approved)
  - Agreement in APPROVED/ACTIVE: One RESERVE transaction (reserved)
  - Agreement in CLOSED: One RESERVE + one RELEASE transaction (released)
  - Agreement in REJECTED: No RESERVE transaction (never reserved)

### Link Mechanism

**Agreement → Budget Transaction:**
- `budget_transactions.source_id` = `agreements.id`
- `budget_transactions.source_type` = 'AGREEMENT'
- `budget_transactions.tx_type` = 'RESERVE'

**Budget Transaction → Budget Envelope:**
- `budget_transactions.envelope_id` = `budget_envelopes.id`
- Envelope determined by Agreement dimensions (channel, category, period)

### Idempotency

**Idempotency Key:**  
Prevents duplicate reservations on retry/replay.

```
Format: 'RESERVE|AGREEMENT|{agreement_id}|{envelope_id}'

Example: 'RESERVE|AGREEMENT|sta-2026-025|env-456'

Constraint: Unique per tenant
```

**Behavior:**
- First reservation attempt: Creates RESERVE transaction
- Duplicate attempt: Returns existing transaction (idempotent)
- No double-reservation possible

---

## What Happens on Approval vs Rejection

### On Approval (PENDING → APPROVED)

**What Happens:**

1. **Approval Request:** Status → APPROVED
2. **Agreement:** Status → APPROVED (trigger)
3. **Budget Transaction:** RESERVE transaction created
   - `tx_type`: 'RESERVE'
   - `source_type`: 'AGREEMENT'
   - `source_id`: Agreement ID
   - `envelope_id`: Determined by Agreement dimensions
   - `amount`: Agreement `cap_total_amount`
   - `tx_status`: 'POSTED' (immediate)
   - `idempotency_key`: Generated from Agreement + Envelope
4. **Budget Envelope:** State updated (reserved computed)
   - `reserved` = SUM(RESERVE transactions) - SUM(RELEASE transactions)
   - `available` = `allocated` - `committed` - `reserved` - `consumed`
5. **Agreement:** Ready for execution (can transition to ACTIVE)

**Budget Impact:**
```
Before Approval:
  Envelope.allocated: 100,000 TL
  Envelope.reserved: 20,000 TL (from other agreements)
  Envelope.consumed: 30,000 TL
  Envelope.available: 50,000 TL

Agreement Approval (cap_total_amount: 15,000 TL):
  → RESERVE transaction: +15,000 TL
  → Envelope.reserved: 35,000 TL (20,000 + 15,000)
  → Envelope.available: 35,000 TL (50,000 - 15,000)

After Approval:
  Envelope.allocated: 100,000 TL
  Envelope.reserved: 35,000 TL
  Envelope.consumed: 30,000 TL
  Envelope.available: 35,000 TL
```

**Agreement Impact:**
- Agreement can now execute (status = APPROVED)
- Budget is reserved for Agreement's execution period
- Budget cannot be reserved by other Agreements (within available amount)

---

### On Rejection (PENDING → REJECTED)

**What Happens:**

1. **Approval Request:** Status → REJECTED
2. **Agreement:** Status → REJECTED (trigger)
3. **Budget Transaction:** ❌ **NO TRANSACTION CREATED**
4. **Budget Envelope:** ❌ **NO STATE CHANGE**
5. **Agreement:** Blocked from execution (cannot proceed)

**Budget Impact:**
```
Before Rejection:
  Envelope.allocated: 100,000 TL
  Envelope.reserved: 20,000 TL
  Envelope.consumed: 30,000 TL
  Envelope.available: 50,000 TL

Agreement Rejection:
  → ❌ No RESERVE transaction
  → ❌ No budget impact

After Rejection:
  Envelope.allocated: 100,000 TL
  Envelope.reserved: 20,000 TL (unchanged)
  Envelope.consumed: 30,000 TL (unchanged)
  Envelope.available: 50,000 TL (unchanged)
```

**Agreement Impact:**
- Agreement cannot execute (status = REJECTED)
- Budget is **not** reserved
- Budget remains available for other Agreements
- Agreement cannot be resubmitted (must create new agreement)

---

## Budget State Calculation (Event-Sourced)

### Reservation Is Not Stored

**Critical Design Decision:**  
Reserved amount is **not stored** in `budget_envelopes` table. Instead, it is **computed** from Budget Transactions.

**Why Event-Sourced:**
- Eliminates dual-write issues (single source of truth)
- Complete audit trail by design (all changes logged)
- Consistency guaranteed (calculated from immutable events)
- No synchronization problems (no stored state to update)

### State Computation

**Reserved Calculation:**
```sql
-- Reserved = SUM(RESERVE) - SUM(RELEASE)
SELECT
  envelope_id,
  COALESCE(SUM(CASE WHEN tx_type = 'RESERVE' THEN amount ELSE 0 END), 0)
  - COALESCE(SUM(CASE WHEN tx_type = 'RELEASE' THEN amount ELSE 0 END), 0) AS reserved
FROM budget_transactions
WHERE envelope_id = ? 
  AND tx_status = 'POSTED'
  AND tx_type IN ('RESERVE', 'RELEASE')
GROUP BY envelope_id
```

**Available Calculation:**
```sql
-- Available = Allocated - Committed - Reserved - Consumed
SELECT
  e.total_allocated AS allocated,
  COALESCE(committed_tx.committed, 0) AS committed,
  COALESCE(reserved_tx.reserved, 0) AS reserved,
  COALESCE(consumed_lg.consumed, 0) AS consumed,
  (e.total_allocated 
   - COALESCE(committed_tx.committed, 0)
   - COALESCE(reserved_tx.reserved, 0)
   - COALESCE(consumed_lg.consumed, 0)) AS available
FROM budget_envelopes e
LEFT JOIN (/* committed calculation */) committed_tx ON ...
LEFT JOIN (/* reserved calculation */) reserved_tx ON ...
LEFT JOIN (/* consumed calculation */) consumed_lg ON ...
WHERE e.id = ?
```

### State Components

| Component | Source | Description |
|-----------|--------|-------------|
| **Allocated** | `budget_envelopes.total_allocated` | Budget ceiling (envelope amount) |
| **Committed** | `budget_transactions` WHERE `tx_type='COMMIT'` | Planning-First: Plan approved |
| **Reserved** | `budget_transactions` WHERE `tx_type='RESERVE'` - `tx_type='RELEASE'` | Actuals-First: Agreement approved |
| **Consumed** | `ledger_entries` WHERE `budget_envelope_id=?` | Actual spend posted |
| **Available** | **Calculated:** Allocated - Committed - Reserved - Consumed | Remaining budget |

---

## Reservation Lifecycle

### Reservation States

**Reservation does not have explicit states.** Instead, it has **lifecycle events** recorded as Budget Transactions:

| Event | Transaction | When | Agreement State |
|-------|-------------|------|-----------------|
| **Reserve** | RESERVE | Approval | PENDING → APPROVED |
| **Release** | RELEASE | Closure/Cancellation | ACTIVE → CLOSED/CANCELLED |
| **Never Reserved** | None | Rejection | PENDING → REJECTED |

### Reservation Timeline

```
Agreement Created (DRAFT)
  ↓
No reservation

Agreement Submitted (PENDING)
  ↓
No reservation yet
(Budget checked but not reserved)

Agreement Approved (APPROVED)
  ↓
✅ RESERVE transaction created
Budget reserved (locked)

Agreement Executing (ACTIVE)
  ↓
Reservation remains (not released)
Budget consumed as transactions post

Agreement Closed (CLOSED)
  ↓
✅ RELEASE transaction created
Reservation released (freed)

OR

Agreement Cancelled (CANCELLED)
  ↓
✅ RELEASE transaction created
Reservation released (freed)
```

---

## Reservation Examples

### Example 1: STA Approval (Reserve)

```
Agreement:
  Code: STA-2026-025
  Type: STA
  Channel: TRADITIONAL
  FU: Wella SP Shampoo 500ml (Category: HAIR_CARE)
  Period: 2026-01
  cap_total_amount: 15,000 TL

Budget Envelope:
  Dimensions: TRADITIONAL|HAIR_CARE|2026-01
  allocated: 100,000 TL
  reserved: 20,000 TL (from other agreements)
  consumed: 30,000 TL
  available: 50,000 TL

Approval Decision: APPROVED

RESERVE Transaction Created:
  tx_type: 'RESERVE'
  source_type: 'AGREEMENT'
  source_id: 'sta-2026-025'
  envelope_id: 'env-456'
  amount: 15,000 TL
  idempotency_key: 'RESERVE|AGREEMENT|sta-2026-025|env-456'

Result:
  Envelope.reserved: 35,000 TL (20,000 + 15,000)
  Envelope.available: 35,000 TL (50,000 - 15,000)
  Agreement.status: APPROVED (ready for execution)
```

### Example 2: LTA Approval (Reserve)

```
Agreement:
  Code: LTA-2026-GS-001
  Type: LTA
  Channel: TRADITIONAL
  FU: All Wella Professional Range (Category: HAIR_CARE)
  Period: 2026-Q1
  cap_total_amount: 50,000 TL

Budget Envelope:
  Dimensions: TRADITIONAL|HAIR_CARE|2026-Q1
  allocated: 300,000 TL
  reserved: 80,000 TL
  consumed: 120,000 TL
  available: 100,000 TL

Approval Decision: APPROVED

RESERVE Transaction Created:
  tx_type: 'RESERVE'
  source_type: 'AGREEMENT'
  source_id: 'lta-2026-gs-001'
  envelope_id: 'env-789'
  amount: 50,000 TL
  idempotency_key: 'RESERVE|AGREEMENT|lta-2026-gs-001|env-789'

Result:
  Envelope.reserved: 130,000 TL (80,000 + 50,000)
  Envelope.available: 50,000 TL (100,000 - 50,000)
  Agreement.status: APPROVED (ready for execution)
```

### Example 3: Agreement Rejection (No Reserve)

```
Agreement:
  Code: STA-2026-026
  Type: STA
  Channel: NKA
  FU: Pantene Shampoo Range (Category: HAIR_CARE)
  Period: 2026-01
  cap_total_amount: 25,000 TL

Budget Envelope:
  Dimensions: NKA|HAIR_CARE|2026-01
  allocated: 200,000 TL
  reserved: 150,000 TL
  consumed: 40,000 TL
  available: 10,000 TL

Approval Decision: REJECTED
(Reason: Budget insufficient or business justification inadequate)

❌ NO RESERVE Transaction Created

Result:
  Envelope.reserved: 150,000 TL (unchanged)
  Envelope.available: 10,000 TL (unchanged)
  Agreement.status: REJECTED (cannot execute)
```

---

## Constraints and Assumptions (Sprint 0)

### Current Assumptions

1. **Sequential Processing:** No concurrent reservation attempts (assumes single-threaded or sequential processing)
2. **Budget Availability:** Budget is assumed sufficient at reservation time (no overrun checks in Sprint 0)
3. **Idempotency:** Reservation is idempotent (duplicate attempts return existing transaction)
4. **Immediate Posting:** RESERVE transaction is posted immediately (no PENDING state for reservations)

### Out of Scope (Future)

1. **Concurrency Handling:**
   - Optimistic locking for concurrent reservations
   - Transaction isolation (ACID properties)
   - Race condition prevention

2. **Budget Overrun Prevention:**
   - Check available budget before reservation
   - Reject reservation if insufficient
   - Threshold warnings before overrun

3. **Partial Reservation:**
   - Multi-period agreements (reserve per period)
   - Proportional reservation (reserve based on expected consumption)

4. **Reservation Expiration:**
   - Time-based release (auto-release if not executed)
   - Reservation timeout (release if approval expires)

---

## Open Questions (Sprint 0)

1. **Budget Overrun Handling:** What happens if budget becomes insufficient between submission and approval?
   - Current: Reservation fails (transaction rejected)
   - Question: Should reservation fail gracefully or allow overrun?

2. **Reservation Release Timing:** Should reservation be released immediately on closure or deferred?
   - Current: Immediate (RELEASE on CLOSED)
   - Question: Is deferred release needed for multi-period agreements?

3. **Partial Consumption:** Can reserved amount be partially consumed?
   - Current: Yes (consumed can be less than reserved)
   - Question: Should we track reservation utilization percentage?

4. **Reservation Validation:** Should we validate envelope exists before reservation?
   - Current: Assumes envelope exists
   - Question: Should reservation create envelope if missing (auto-allocate)?

5. **Currency Mismatch:** What happens if Agreement currency differs from Envelope currency?
   - Current: Assumes same currency (TRY)
   - Question: Do we need currency conversion for multi-currency?

---

## Next Steps

1. **Reservation Service:** Create Budget Reservation Service with reserve/release methods
2. **Event Sourcing:** Implement Budget Transaction creation (RESERVE/RELEASE)
3. **State Calculation:** Implement reserved/available calculation from transactions
4. **Idempotency:** Implement idempotency key generation and validation
5. **Integration Testing:** Test reservation flow with Agreement approval workflow

---

**Document Status:** ✅ Complete  
**Review Status:** Pending  
**Implementation:** Sprint 1+ (after architectural validation)

