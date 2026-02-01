# S0-02 – Agreement Lifecycle & States
## State Machine Definition for STA and LTA Agreements

**Sprint:** 0  
**Date:** 2026-01  
**Status:** Architectural Definition  
**Purpose:** Define complete state machine, transitions, and budget impact for Agreement entities

---

## Overview

Agreement lifecycle applies to both **STA (Short-Term Agreement)** and **LTA (Long-Term Agreement)** types. The state machine ensures:
- Governance compliance (approval required)
- Budget integrity (reservation on approval, release on cancellation)
- Audit trail (all state changes logged)
- Operational clarity (clear state semantics)

**Key Principle:** All spend-affecting state transitions require approval and affect budget.

---

## State Definitions

### 1. DRAFT

**Description:**  
Agreement is created but not yet submitted for approval. Planner can edit all fields, validate business rules, and prepare the agreement for submission.

**Characteristics:**
- Agreement exists in system but not visible to approvers
- All fields editable
- No budget impact
- No approval request created
- Can be deleted without audit trail requirement

**Allowed Actions:**
- Edit all fields
- Delete agreement
- Submit for approval (transitions to PENDING)

**Budget Impact:**  
❌ **No budget impact** - Agreement does not reserve or consume budget

**Business Rules:**
- Must have valid CPL, FU, tactic, mechanic
- Must have justification (mandatory)
- Budget availability check is **informational only** (does not block creation)
- Validation errors prevent submission but not draft creation

---

### 2. PENDING (Submitted)

**Description:**  
Agreement has been submitted for approval. Approval workflow is active, awaiting one or more approval levels. Agreement is locked for editing by creator but visible to approvers.

**Note:** "PENDING" is the system state name. From user perspective, this is the "Submitted" state.

**Characteristics:**
- Approval request created and linked
- Agreement locked for editing (read-only for creator)
- Visible to approvers in their approval queue
- Budget not yet reserved (reservation happens on approval)
- Cannot be deleted (must reject to remove)

**Allowed Actions:**
- **Creator:** View only, cannot edit
- **Approvers:** Approve or Reject (based on approval level)
- **System:** Auto-transition to APPROVED when all levels approve, or to REJECTED if any level rejects

**Budget Impact:**  
❌ **No budget impact** - Budget is checked during submission validation but not reserved until approval

**Business Rules:**
- Budget availability must be sufficient (validated at submission)
- All required fields must be valid
- Approval policy determines required approval levels
- If budget becomes insufficient while pending, approval workflow continues (budget check was at submission time)

**Approval Workflow:**
- Sequential multi-level approval
- Each level must approve before next level is notified
- Any rejection at any level → REJECTED state
- All levels approve → APPROVED state

---

### 3. APPROVED

**Description:**  
All approval levels have approved the agreement. Budget is reserved, agreement is ready for execution. Can transition to ACTIVE automatically (on start_date) or manually.

**Characteristics:**
- All approval levels completed
- Budget reservation created (RESERVE transaction)
- Agreement ready for execution
- Can transition to ACTIVE (automatic on start_date or manual trigger)
- Cannot be edited (would require new approval)

**Allowed Actions:**
- **Creator/Planner:** View, Execute (manually trigger ACTIVE), or Cancel (transitions to CANCELLED)
- **System:** Auto-transition to ACTIVE when `start_date` is reached

**Budget Impact:**  
✅ **Budget Reserved** - Creates RESERVE transaction:
- Transaction type: `RESERVE`
- Source type: `AGREEMENT`
- Amount: `cap_total_amount`
- Envelope: Determined by channel × category × period
- Idempotency: `RESERVE|AGREEMENT|{agreement_id}|{envelope_id}`

**Business Rules:**
- Budget reservation is **idempotent** (duplicate reservation attempts are rejected)
- If budget becomes insufficient between approval and execution, agreement remains APPROVED (budget was reserved)
- Budget reservation cannot be reversed except via CANCELLED state

**Budget Reservation Details:**
```
When: Agreement transitions PENDING → APPROVED
Action: POST /budget/reserve
  {
    envelopeId: <determined by channel/category/period>,
    agreementId: <agreement_id>,
    amount: <cap_total_amount>,
    currency: 'TRY'
  }
Result: Budget Transaction created (tx_type='RESERVE', tx_status='POSTED')
Impact: Envelope.available = Envelope.allocated - Envelope.reserved - Envelope.committed - Envelope.consumed
```

---

### 4. ACTIVE

**Description:**  
Agreement is executing. Promotion is running, transactions can be posted (on-invoice or off-invoice), budget is being consumed. Agreement remains active until end_date or manual closure.

**Characteristics:**
- Promotion is live
- Transactions can be posted (on-invoice immediate, off-invoice batch)
- Budget is consumed as transactions post to ledger
- Reserved budget remains (not released until agreement closes)
- Can be manually closed or cancelled

**Allowed Actions:**
- **Creator/Planner:** View transactions, Close (transitions to CLOSED), or Cancel (transitions to CANCELLED)
- **System:** Post transactions (on-invoice or off-invoice batch)
- **System:** Auto-transition to CLOSED when `end_date` is reached

**Budget Impact:**  
✅ **Budget Consumed** - As transactions post:
- Each transaction creates ledger entry
- Ledger entry links to budget envelope
- `consumed_amount` increases (sum of ledger entries)
- Reserved amount remains (not released until CLOSED)
- Available budget = Allocated - Reserved - Consumed

**Business Rules:**
- Transactions can only post if agreement is ACTIVE
- Transaction amount cannot exceed `cap_total_amount` (agreement cap)
- Off-invoice batch import requires approval (separate approval workflow)
- If `consumed_amount` reaches `cap_total_amount`, further transactions are blocked

**Transaction Posting:**
```
When: Transaction occurs (on-invoice or off-invoice)
Action: Create ledger entry
  {
    source_type: 'AGREEMENT',
    source_id: <agreement_id>,
    amount: <transaction_amount>,
    budget_envelope_id: <determined by channel/category/period>,
    ...
  }
Result: agreement.consumed_amount += transaction_amount
Impact: Envelope.consumed increases, envelope.available decreases
```

---

### 5. CLOSED

**Description:**  
Agreement has completed its lifecycle. End date reached or manually closed. No further transactions can be posted. Reserved budget is released. Final state for normal completion.

**Characteristics:**
- Final state (no further transitions)
- No new transactions allowed
- Reserved budget released (RELEASE transaction)
- Read-only (cannot be edited or reopened)
- Historical record preserved

**Allowed Actions:**
- **All Users:** View only (read-only)

**Budget Impact:**  
✅ **Budget Released** - Creates RELEASE transaction:
- Transaction type: `RELEASE`
- Source type: `AGREEMENT`
- Amount: Previously reserved amount
- Envelope: Same envelope as reservation
- Idempotency: `RELEASE|AGREEMENT|{agreement_id}|{envelope_id}`

**Business Rules:**
- Reserved budget is released (available budget increases)
- Consumed budget remains (already posted to ledger)
- Agreement cannot be reopened (would require new agreement)
- Final `consumed_amount` is the actual spend

**Budget Release Details:**
```
When: Agreement transitions ACTIVE → CLOSED
Action: POST /budget/release (or automatic on end_date)
  {
    envelopeId: <same as reservation>,
    agreementId: <agreement_id>,
    amount: <reserved_amount>,
    currency: 'TRY'
  }
Result: Budget Transaction created (tx_type='RELEASE', tx_status='POSTED')
Impact: Envelope.reserved decreases, envelope.available increases
```

---

### 6. REJECTED

**Description:**  
Agreement approval was denied by at least one approval level. Agreement is blocked from execution. No budget impact. Can be used as reference to create a new agreement.

**Characteristics:**
- Approval workflow rejected
- No budget impact (never reserved)
- Read-only (cannot be edited or resubmitted)
- Can be used as template for new agreement
- Rejection reason stored in approval request

**Allowed Actions:**
- **All Users:** View only (read-only)
- **Creator:** Can create new agreement (copying from rejected one)

**Budget Impact:**  
❌ **No budget impact** - Agreement never reserved budget

**Business Rules:**
- Rejection reason is stored in approval request comments
- Agreement cannot be resubmitted (must create new agreement)
- Rejection does not affect budget availability
- Historical record preserved for audit

**Rejection Scenarios:**
- Any approval level rejects → Overall status REJECTED
- Agreement transitions PENDING → REJECTED
- No budget transaction created
- Agreement remains in system for reference

---

### 7. CANCELLED

**Description:**  
Agreement was terminated early while ACTIVE. Reserved budget is released, consumed budget remains. Used for early termination scenarios (e.g., customer breach, market change).

**Characteristics:**
- Early termination from ACTIVE state
- Reserved budget released (RELEASE transaction)
- Consumed budget remains (already posted)
- Read-only (cannot be reactivated)
- Requires justification/reason for cancellation

**Allowed Actions:**
- **Creator/Planner:** View only (read-only after cancellation)
- **System:** Release reserved budget

**Budget Impact:**  
✅ **Budget Released** - Same as CLOSED:
- Transaction type: `RELEASE`
- Reserved amount released
- Consumed amount remains

**Business Rules:**
- Can only cancel from ACTIVE state
- Cancellation reason should be recorded (audit requirement)
- Reserved budget released immediately
- Consumed budget not reversed (already posted to ledger)
- Agreement cannot be reactivated

**Cancellation Flow:**
```
When: User cancels agreement (from ACTIVE state)
Action: 
  1. Update agreement.status = 'CANCELLED'
  2. Create RELEASE transaction (same as CLOSED)
  3. Record cancellation reason (audit)
Result: Reserved budget released, consumed budget remains
```

---

## State Transition Matrix

| From State | To State | Trigger | Budget Impact | Requires Approval |
|------------|----------|---------|--------------|-------------------|
| **DRAFT** | **PENDING** | User submits | ❌ None | ✅ Yes (creates approval request) |
| **PENDING** | **APPROVED** | All approval levels approve | ✅ Reserve | ✅ Already approved |
| **PENDING** | **REJECTED** | Any approval level rejects | ❌ None | ✅ Rejection recorded |
| **APPROVED** | **ACTIVE** | Manual execute OR start_date reached | ❌ None (already reserved) | ❌ No |
| **APPROVED** | **CANCELLED** | User cancels | ✅ Release | ❌ No (but may require reason) |
| **ACTIVE** | **CLOSED** | End date reached OR manual close | ✅ Release | ❌ No |
| **ACTIVE** | **CANCELLED** | User cancels early | ✅ Release | ❌ No (but may require reason) |

**Invalid Transitions:**
- DRAFT → APPROVED (must go through PENDING)
- PENDING → ACTIVE (must go through APPROVED)
- CLOSED → ACTIVE (final state, cannot reopen)
- REJECTED → PENDING (cannot resubmit, must create new)
- CANCELLED → ACTIVE (cannot reactivate)

---

## Complete State Diagram

```
                    ┌─────────┐
                    │  DRAFT  │
                    └────┬────┘
                         │ Submit
                         ↓
                    ┌─────────┐
                    │ PENDING │ ← Submitted (user perspective)
                    └────┬────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        │ All Approve    │ Any Reject     │
        ↓                ↓                │
   ┌──────────┐    ┌──────────┐          │
   │ APPROVED │    │ REJECTED │          │
   └────┬─────┘    └──────────┘          │
        │                                 │
        │ Execute / start_date            │
        ↓                                 │
   ┌────────┐                            │
   │ ACTIVE │                            │
   └────┬───┘                            │
        │                                 │
        │                                 │
   ┌────┴────┐                           │
   │         │                           │
   │ End date│                           │
   │ OR Close│                           │
   │         │                           │
   ↓         ↓                           │
┌────────┐ ┌──────────┐                │
│ CLOSED │ │CANCELLED │                │
└────────┘ └──────────┘                │
   (Final)    (Final)                    │
                                        │
                                        │
                    ┌───────────────────┘
                    │
                    │ (Cannot resubmit)
                    │ (Must create new)
                    │
                    └───────────────────┐
                                        │
                                        ↓
                                 (New Agreement)
```

---

## Budget Impact Summary

### Budget States by Agreement State

| Agreement State | Reserved | Consumed | Available Impact |
|-----------------|----------|----------|------------------|
| **DRAFT** | ❌ 0 | ❌ 0 | ✅ No impact |
| **PENDING** | ❌ 0 | ❌ 0 | ✅ No impact (checked but not reserved) |
| **APPROVED** | ✅ `cap_total_amount` | ❌ 0 | ⬇️ Decreases by reserved amount |
| **ACTIVE** | ✅ `cap_total_amount` | ✅ `consumed_amount` | ⬇️ Decreases by reserved + consumed |
| **CLOSED** | ❌ 0 (released) | ✅ `consumed_amount` (final) | ⬆️ Increases by released amount |
| **REJECTED** | ❌ 0 | ❌ 0 | ✅ No impact |
| **CANCELLED** | ❌ 0 (released) | ✅ `consumed_amount` (remains) | ⬆️ Increases by released amount |

### Budget Transaction Types

| Transaction Type | When | Agreement State | Amount |
|------------------|------|------------------|--------|
| **RESERVE** | PENDING → APPROVED | APPROVED | `cap_total_amount` |
| **RELEASE** | ACTIVE → CLOSED | CLOSED | Previously reserved amount |
| **RELEASE** | ACTIVE → CANCELLED | CANCELLED | Previously reserved amount |
| **Ledger Entry** | Transaction posts | ACTIVE | Transaction amount (consumes budget) |

---

## STA vs LTA Differences

### State Machine
✅ **Same state machine** - Both STA and LTA follow identical lifecycle

### State Transition Timing

| Aspect | STA | LTA |
|--------|-----|-----|
| **Approval Levels** | 1-2 levels (fast-track) | Multi-level (including Finance) |
| **Approval Speed** | <24 hours target | 2-5 days typical |
| **Budget Reservation** | Same (on APPROVED) | Same (on APPROVED) |
| **Transaction Pattern** | Immediate consumption | Periodic settlements |
| **Closure** | Single period | Multi-period |

### Budget Impact
✅ **Same budget impact** - Both reserve on approval, release on closure

---

## Validation Rules by State

### DRAFT State
- ✅ All required fields must be valid
- ✅ Budget availability check (informational)
- ✅ Justification required
- ✅ Date validation (end_date ≥ start_date)
- ✅ STA: Duration ≤ 30 days
- ✅ LTA: Duration > 30 days

### PENDING State
- ✅ Budget availability must be sufficient (validated at submission)
- ✅ All validation rules from DRAFT still apply
- ❌ Cannot edit (locked)

### APPROVED State
- ✅ Budget reservation must succeed (idempotency check)
- ❌ Cannot edit (would require new approval)

### ACTIVE State
- ✅ Transactions must be within agreement period
- ✅ Transaction amount cannot exceed `cap_total_amount`
- ✅ CPL must match agreement CPL (for off-invoice)

### CLOSED / CANCELLED / REJECTED States
- ✅ Read-only (no validation needed)

---

## State Transition Triggers

### Manual Triggers (User Actions)

| Action | From State | To State | Who Can Trigger |
|--------|-----------|----------|-----------------|
| **Submit** | DRAFT | PENDING | Creator (PLANNER) |
| **Approve** | PENDING | APPROVED (if all levels) | Approver (APPROVER, FINANCE) |
| **Reject** | PENDING | REJECTED | Approver (any level) |
| **Execute** | APPROVED | ACTIVE | Creator, Planner |
| **Close** | ACTIVE | CLOSED | Creator, Planner |
| **Cancel** | ACTIVE | CANCELLED | Creator, Planner, Admin |

### Automatic Triggers (System)

| Trigger | From State | To State | When |
|---------|-----------|----------|------|
| **Auto-Execute** | APPROVED | ACTIVE | `start_date` is reached |
| **Auto-Close** | ACTIVE | CLOSED | `end_date` is reached |
| **Approval Complete** | PENDING | APPROVED | All approval levels approve |
| **Approval Rejected** | PENDING | REJECTED | Any approval level rejects |

---

## Error Scenarios

### Budget Insufficient on Approval
**Scenario:** Agreement approved but budget envelope has insufficient available amount.

**Handling:**
- ❌ Budget reservation fails
- ⚠️ Agreement remains in APPROVED state but cannot execute
- 🔧 Requires manual intervention (increase envelope or reduce agreement cap)
- 📝 Error logged for audit

**Prevention:**
- Budget availability checked at PENDING submission
- Budget checked again at APPROVED (reservation time)
- If insufficient, reservation fails, agreement blocked

### Budget Reservation Idempotency Violation
**Scenario:** Duplicate reservation attempt (retry, system error).

**Handling:**
- ✅ Idempotency key prevents duplicate
- ✅ Second attempt returns existing transaction
- ✅ No error, operation is idempotent

### Transaction Exceeds Cap
**Scenario:** Transaction amount would exceed `cap_total_amount`.

**Handling:**
- ❌ Transaction rejected
- ⚠️ Agreement remains ACTIVE
- 📝 Error logged
- 🔧 Requires agreement amendment (new agreement) or transaction correction

---

## Audit Trail Requirements

### State Changes
All state transitions must be logged:
- `from_state`
- `to_state`
- `triggered_by` (user ID)
- `triggered_at` (timestamp)
- `trigger_type` ('MANUAL' | 'AUTOMATIC')
- `reason` (optional, for cancellations)

### Budget Transactions
All budget transactions are immutable:
- Transaction ID
- Transaction type
- Amount
- Envelope ID
- Agreement ID
- Idempotency key
- Created timestamp

---

## Open Questions (Sprint 0)

1. **Agreement Amendments:** Can APPROVED/ACTIVE agreements be amended?
   - Current: No amendments allowed
   - Question: Do we need amendment workflow (creates new agreement version)?

2. **Partial Budget Release:** Can reserved budget be partially released?
   - Current: All-or-nothing release
   - Question: Do we need partial release for multi-period LTAs?

3. **Reopening CLOSED Agreements:** Can closed agreements be reopened?
   - Current: No, final state
   - Question: Do we need reopen capability for corrections?

4. **DRAFT Deletion:** Should DRAFT deletion be soft-delete or hard-delete?
   - Current: Not specified
   - Question: Audit requirement for deleted drafts?

5. **Approval Timeout:** What happens if approval is pending too long?
   - Current: No timeout
   - Question: Auto-reject after X days? Escalation?

---

## Next Steps

1. **State Machine Implementation:** Create state machine class/function (pseudocode)
2. **Transition Validation:** Define validation rules for each transition
3. **Budget Integration:** Define budget reservation/release API contracts
4. **Approval Integration:** Define approval workflow integration points
5. **Error Handling:** Define error scenarios and recovery procedures

---

**Document Status:** ✅ Complete  
**Review Status:** Pending  
**Implementation:** Sprint 1+ (after architectural validation)

