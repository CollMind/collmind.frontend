# S0-03 – Approval Model (Architectural)
## Approval System Design for Actuals-First TPM

**Sprint:** 0  
**Date:** 2026-01  
**Status:** Architectural Definition  
**Purpose:** Define approval model architecture, entity relationships, decision outcomes, and logic placement

---

## Overview

Approval is **mandatory** for all Agreements in Actuals-First mode. The approval model ensures:
- Governance compliance (all spend requires authorization)
- Audit trail (all approval decisions logged)
- Flexibility (single-level in Sprint 1, extensible to multi-level)
- Separation of concerns (approval logic vs. agreement logic)

**Key Principle:** No agreement can transition from DRAFT to ACTIVE without approval.

---

## Constraints

### Sprint 1 (Current)
- **Single-level approval only**
- One approver required
- Approval role determined by policy
- Simple approve/reject decision

### Future (Post-Sprint 1)
- **Multi-level sequential approval**
- Multiple approval levels
- Sequential workflow (Level 1 → Level 2 → ...)
- Conditional levels (e.g., Finance approval if amount > threshold)
- Delegation (approver can delegate)

**Architectural Note:** Design must support future multi-level approval without breaking Sprint 1 implementation.

---

## Approval Entity

### Purpose

Approval Request represents a single approval workflow instance for an Agreement. It captures:
- Request context (what is being approved)
- Approval decision (approve/reject)
- Decision maker and timestamp
- Optional comments

### Key Fields (Sprint 1)

**Identification:**
- `approval_request_id` (UUID, primary key)
- `tenant_id` (UUID, partition key)

**Context:**
- `entity_type` ('AGREEMENT' | 'BUDGET_TRANSFER' | 'IMPORT_BATCH')
- `entity_id` (UUID, reference to Agreement)
- `requested_by` (UUID, user ID who created the agreement)
- `requested_at` (TIMESTAMPTZ)

**Approval Decision (Sprint 1 - Single Level):**
- `status` ('PENDING' | 'APPROVED' | 'REJECTED')
- `approved_by` (UUID, nullable, user ID of approver)
- `approved_at` (TIMESTAMPTZ, nullable)
- `rejected_by` (UUID, nullable, user ID of rejector)
- `rejected_at` (TIMESTAMPTZ, nullable)
- `comments` (TEXT, nullable, optional justification/notes)

**Approver Assignment:**
- `approver_role` ('APPROVER' | 'FINANCE' | 'ADMIN' | 'REGIONAL_MANAGER')
- `assigned_to` (UUID, nullable, specific user ID if assigned)
- `assigned_at` (TIMESTAMPTZ, nullable)

**Metadata:**
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### Future Fields (Multi-Level Support)

**Note:** These fields are **architectural placeholders** for future multi-level support. Not implemented in Sprint 1.

**Approval Levels (Future):**
- `approval_levels` (JSONB array, nullable)
  - `level` (INT, 1, 2, 3...)
  - `role` (VARCHAR, required role for this level)
  - `status` ('PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED')
  - `approved_by` (UUID, nullable)
  - `approved_at` (TIMESTAMPTZ, nullable)
  - `comments` (TEXT, nullable)

**Current Level Tracking:**
- `current_level` (INT, nullable, which level is currently pending)
- `completed_levels` (INT, default 0)

### Entity Schema (Conceptual)

```sql
-- Sprint 1 Schema (Simplified)
CREATE TABLE approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  
  -- Context
  entity_type VARCHAR(30) NOT NULL, -- 'AGREEMENT'
  entity_id UUID NOT NULL,
  requested_by UUID NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Approval Decision (Single Level - Sprint 1)
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- 'PENDING' | 'APPROVED' | 'REJECTED'
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejected_by UUID,
  rejected_at TIMESTAMPTZ,
  comments TEXT,
  
  -- Approver Assignment
  approver_role VARCHAR(30) NOT NULL,
  assigned_to UUID, -- Optional: specific user, or NULL (any user with role)
  assigned_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT chk_status_valid CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  CONSTRAINT chk_approved_fields CHECK (
    (status = 'APPROVED' AND approved_by IS NOT NULL AND approved_at IS NOT NULL) OR
    (status != 'APPROVED')
  ),
  CONSTRAINT chk_rejected_fields CHECK (
    (status = 'REJECTED' AND rejected_by IS NOT NULL AND rejected_at IS NOT NULL) OR
    (status != 'REJECTED')
  )
);

-- Indexes
CREATE INDEX idx_approval_requests_entity ON approval_requests(entity_type, entity_id);
CREATE INDEX idx_approval_requests_status ON approval_requests(tenant_id, status);
CREATE INDEX idx_approval_requests_assigned ON approval_requests(assigned_to) WHERE status = 'PENDING';
CREATE INDEX idx_approval_requests_role ON approval_requests(approver_role, status) WHERE status = 'PENDING';
```

---

## Relationship to Agreement

### Relationship Type
**One-to-One:** Each Agreement has exactly one Approval Request (when submitted).

### Cardinality
- Agreement (1) ←→ (0..1) Approval Request
  - Agreement in DRAFT: No approval request (not yet submitted)
  - Agreement in PENDING: One approval request (created on submit)
  - Agreement in APPROVED/REJECTED: One approval request (decision made)
  - Agreement in ACTIVE/CLOSED/CANCELLED: One approval request (historical)

### Link Mechanism
**Approval Request → Agreement:**
- `approval_requests.entity_id` = `agreements.id`
- `approval_requests.entity_type` = 'AGREEMENT'

**Agreement → Approval Request:**
- `agreements.approval_request_id` = `approval_requests.id` (nullable)

### Relationship Lifecycle

```
Agreement State: DRAFT
  → approval_request_id: NULL (no approval request yet)

Agreement State: PENDING (Submit)
  → Create approval_request
  → Set agreements.approval_request_id = approval_request.id
  → approval_request.status = 'PENDING'

Agreement State: APPROVED (All levels approve)
  → approval_request.status = 'APPROVED'
  → approval_request.approved_by = <approver_user_id>
  → approval_request.approved_at = <timestamp>

Agreement State: REJECTED (Any level rejects)
  → approval_request.status = 'REJECTED'
  → approval_request.rejected_by = <rejector_user_id>
  → approval_request.rejected_at = <timestamp>
```

### Data Integrity

**Cascading Rules:**
- Approval request deletion: **Prevented** if agreement exists (approval is audit trail)
- Agreement deletion: Approval request **retained** (soft delete or archive)

**Constraint:**
- `approval_requests.entity_id` must reference valid Agreement
- `agreements.approval_request_id` must reference valid Approval Request (if not NULL)

---

## Approval Decision Outcomes

### Decision States

| Status | Description | Agreement Impact | Allowed Next Actions |
|--------|-------------|------------------|---------------------|
| **PENDING** | Awaiting approval decision | Agreement remains PENDING | Approve or Reject |
| **APPROVED** | Approval granted | Agreement transitions to APPROVED | Agreement can execute |
| **REJECTED** | Approval denied | Agreement transitions to REJECTED | Cannot resubmit (create new agreement) |

### Decision Outcomes

#### 1. PENDING

**Description:**  
Approval request is created but no decision has been made yet. Waiting for approver to review and decide.

**Characteristics:**
- Created when Agreement transitions DRAFT → PENDING
- Approver not yet assigned (or assigned but not decided)
- Agreement locked (cannot edit)
- Budget not reserved

**Allowed Transitions:**
- PENDING → APPROVED (if approver approves)
- PENDING → REJECTED (if approver rejects)

**Business Rules:**
- Only users with required `approver_role` can approve/reject
- If `assigned_to` is set, only that specific user can decide
- If `assigned_to` is NULL, any user with `approver_role` can decide

---

#### 2. APPROVED

**Description:**  
Approval granted. All required approval levels completed (Sprint 1: single level, Future: all levels). Agreement can proceed to ACTIVE.

**Characteristics:**
- Decision made: `approved_by` and `approved_at` populated
- All required levels completed (Sprint 1: 1 level, Future: N levels)
- Agreement transitions to APPROVED state
- Budget reservation triggered

**Allowed Transitions:**
- None (final decision state)
- Agreement transitions to ACTIVE (execution)

**Business Rules:**
- Cannot change decision (immutable)
- Cannot un-approve (would require new agreement)
- Budget reservation must succeed for agreement to become APPROVED

**Trigger Actions:**
1. Agreement status: PENDING → APPROVED
2. Budget reservation: Create RESERVE transaction
3. Notification: Notify creator that agreement approved

---

#### 3. REJECTED

**Description:**  
Approval denied. At least one approval level rejected (Sprint 1: single level, Future: any level). Agreement blocked from execution.

**Characteristics:**
- Decision made: `rejected_by` and `rejected_at` populated
- Agreement transitions to REJECTED state
- No budget impact
- Historical record preserved

**Allowed Transitions:**
- None (final decision state)
- Agreement remains REJECTED (cannot resubmit)

**Business Rules:**
- Cannot change decision (immutable)
- Cannot un-reject (would require new agreement)
- Rejection reason should be provided (optional but recommended)
- Agreement cannot be resubmitted (must create new agreement)

**Trigger Actions:**
1. Agreement status: PENDING → REJECTED
2. Notification: Notify creator that agreement rejected
3. No budget reservation (no budget impact)

---

## Approval Logic Placement

### Architectural Decision: Where Should Approval Logic Live?

**Options:**
1. **Domain Layer (Entity/Value Object)**
2. **Service Layer (Application Service)**
3. **Infrastructure Layer (Repository/ORM)**

**Recommendation: Hybrid Approach**

### 1. Domain Layer (Core Business Logic)

**What belongs here:**
- Approval state machine (valid transitions)
- Approval decision validation (who can approve/reject)
- Approval outcome determination (APPROVED vs REJECTED)

**Examples:**
```typescript
// Domain: Approval Entity (Conceptual)
class ApprovalRequest {
  // State transitions
  approve(approver: User, comments?: string): void {
    // Domain validation
    this.validateCanApprove(approver);
    this.status = 'APPROVED';
    this.approved_by = approver.id;
    this.approved_at = now();
  }
  
  reject(rejector: User, comments?: string): void {
    this.validateCanReject(rejector);
    this.status = 'REJECTED';
    this.rejected_by = rejector.id;
    this.rejected_at = now();
  }
  
  private validateCanApprove(approver: User): void {
    // Domain rule: Only users with required role can approve
    if (!this.hasRequiredRole(approver, this.approver_role)) {
      throw new DomainError('User does not have required role');
    }
    
    // Domain rule: Cannot approve if already decided
    if (this.status !== 'PENDING') {
      throw new DomainError('Cannot approve non-pending request');
    }
  }
}
```

**Rationale:**
- Core business rules (who can approve, valid transitions)
- Independent of infrastructure
- Testable without database

---

### 2. Service Layer (Orchestration)

**What belongs here:**
- Approval workflow orchestration (create request, assign approver)
- Policy resolution (which role/level required)
- Agreement state transition coordination
- Budget reservation trigger (after approval)

**Examples:**
```typescript
// Service: Approval Service (Conceptual)
class ApprovalService {
  // Orchestration: Create approval request when agreement submitted
  async createApprovalRequest(agreement: Agreement): Promise<ApprovalRequest> {
    // 1. Resolve approval policy
    const policy = await this.policyService.resolvePolicy(agreement);
    
    // 2. Create approval request (domain entity)
    const approvalRequest = new ApprovalRequest({
      entity_type: 'AGREEMENT',
      entity_id: agreement.id,
      requested_by: agreement.created_by,
      approver_role: policy.required_role, // Sprint 1: single role
    });
    
    // 3. Persist (infrastructure)
    await this.approvalRepository.save(approvalRequest);
    
    // 4. Link to agreement
    agreement.approval_request_id = approvalRequest.id;
    await this.agreementRepository.save(agreement);
    
    // 5. Notify approver (infrastructure)
    await this.notificationService.notifyApprover(approvalRequest);
    
    return approvalRequest;
  }
  
  // Orchestration: Process approval decision
  async processApprovalDecision(
    approvalRequestId: UUID,
    approver: User,
    decision: 'APPROVE' | 'REJECT',
    comments?: string
  ): Promise<void> {
    // 1. Load approval request (infrastructure)
    const approvalRequest = await this.approvalRepository.findById(approvalRequestId);
    
    // 2. Make decision (domain logic)
    if (decision === 'APPROVE') {
      approvalRequest.approve(approver, comments); // Domain method
    } else {
      approvalRequest.reject(approver, comments); // Domain method
    }
    
    // 3. Persist decision (infrastructure)
    await this.approvalRepository.save(approvalRequest);
    
    // 4. Update agreement state (coordination)
    const agreement = await this.agreementRepository.findById(approvalRequest.entity_id);
    
    if (decision === 'APPROVE') {
      // Coordinate: Agreement status + Budget reservation
      await this.agreementService.approve(agreement, approvalRequest);
    } else {
      await this.agreementService.reject(agreement, approvalRequest);
    }
    
    // 5. Notify creator (infrastructure)
    await this.notificationService.notifyCreator(agreement, decision);
  }
}
```

**Rationale:**
- Coordinates multiple domain entities (Approval + Agreement + Budget)
- Orchestrates cross-cutting concerns (notification, audit)
- Depends on infrastructure (repository, notification)

---

### 3. Infrastructure Layer (Persistence, External)

**What belongs here:**
- Database operations (CRUD)
- Notification sending (email, in-app)
- Policy storage/retrieval
- Audit logging

**Examples:**
```typescript
// Infrastructure: Approval Repository (Conceptual)
class ApprovalRepository {
  async save(approvalRequest: ApprovalRequest): Promise<void> {
    // Database write
  }
  
  async findById(id: UUID): Promise<ApprovalRequest> {
    // Database read
  }
  
  async findByEntity(entityType: string, entityId: UUID): Promise<ApprovalRequest> {
    // Database query
  }
}

// Infrastructure: Policy Service (Conceptual)
class PolicyService {
  async resolvePolicy(agreement: Agreement): Promise<ApprovalPolicy> {
    // Query policy configuration (database or config)
    // Match policy based on agreement attributes (amount, channel, type)
    return policy;
  }
}
```

**Rationale:**
- Infrastructure concerns (database, external services)
- No business logic
- Swappable implementations (e.g., in-memory for tests)

---

### Architecture Summary

**Layer Responsibilities:**

| Layer | Responsibility | Example |
|-------|---------------|---------|
| **Domain** | Business rules, state machine | `approvalRequest.approve(user)` |
| **Service** | Orchestration, coordination | `approvalService.processDecision(...)` |
| **Infrastructure** | Persistence, external services | `approvalRepository.save(...)` |

**Dependencies:**
```
Service Layer → Domain Layer (uses domain entities)
Service Layer → Infrastructure Layer (uses repositories)
Infrastructure Layer → Domain Layer (persists domain entities)
```

**Domain Layer is Independent:**
- No dependency on Service or Infrastructure
- Can be tested in isolation
- Contains core business rules

---

## Approval Policy (Sprint 1)

### Policy Resolution

**Purpose:**  
Determine which role is required to approve an Agreement.

**Policy Attributes:**
- Agreement type (STA / LTA)
- Amount (`cap_total_amount`)
- Channel (TRADITIONAL, NKA, etc.)
- Tactic (optional)

**Policy Output (Sprint 1):**
- `required_role` ('APPROVER' | 'FINANCE' | 'ADMIN')

**Policy Resolution Logic:**
```
If agreement_type = 'LTA':
  → required_role = 'FINANCE' (multi-level approval in future)
  
Else if amount >= 10000:
  → required_role = 'FINANCE'
  
Else:
  → required_role = 'APPROVER'
```

**Future Extension (Multi-Level):**
```
Policy returns array of levels:
[
  { level: 1, role: 'APPROVER', when: { amount_lt: 10000 } },
  { level: 2, role: 'FINANCE', when: { amount_gte: 10000 } }
]
```

### Policy Storage

**Sprint 1:** Hard-coded logic in Policy Service

**Future:** Policy configuration table or JSON configuration

---

## Approval Workflow (Sprint 1)

### Workflow Steps

**1. Agreement Submission (DRAFT → PENDING)**

```
User submits Agreement
  ↓
ApprovalService.createApprovalRequest(agreement)
  ↓
PolicyService.resolvePolicy(agreement) → required_role
  ↓
Create ApprovalRequest:
  - entity_type = 'AGREEMENT'
  - entity_id = agreement.id
  - approver_role = required_role
  - status = 'PENDING'
  ↓
Link to Agreement: agreement.approval_request_id = approval_request.id
  ↓
Notify approvers (users with approver_role)
  ↓
Agreement.status = 'PENDING'
```

**2. Approval Decision (PENDING → APPROVED/REJECTED)**

```
Approver reviews Agreement
  ↓
Approver makes decision: Approve or Reject
  ↓
ApprovalService.processApprovalDecision(approval_request_id, approver, decision)
  ↓
ApprovalRequest.approve(approver) OR ApprovalRequest.reject(approver) [Domain]
  ↓
ApprovalRequest.status = 'APPROVED' or 'REJECTED'
  ↓
If APPROVED:
  → AgreementService.approve(agreement)
    → Agreement.status = 'APPROVED'
    → BudgetService.reserve(agreement) [Creates RESERVE transaction]
  ↓
If REJECTED:
  → AgreementService.reject(agreement)
    → Agreement.status = 'REJECTED'
  ↓
Notify creator (approved/rejected)
```

### State Synchronization

**Approval Request Status ↔ Agreement Status:**

| Approval Status | Agreement Status | Trigger |
|----------------|------------------|---------|
| PENDING | PENDING | On submission |
| APPROVED | APPROVED | On approval |
| REJECTED | REJECTED | On rejection |

**Rule:** Agreement status must stay in sync with approval status (one-way: approval → agreement).

---

## Future: Multi-Level Approval

### Architectural Extension

**Sprint 1:** Single approval level stored in `approver_role` (simple)

**Future:** Multi-level approval using `approval_levels` JSONB array:

```sql
-- Future schema extension (not implemented in Sprint 1)
ALTER TABLE approval_requests 
ADD COLUMN approval_levels JSONB; -- Nullable in Sprint 1

-- Example JSONB structure:
[
  {
    "level": 1,
    "role": "APPROVER",
    "status": "APPROVED",
    "approved_by": "uuid-123",
    "approved_at": "2026-01-08T10:00:00Z"
  },
  {
    "level": 2,
    "role": "FINANCE",
    "status": "PENDING"
  }
]
```

**Migration Path:**
- Sprint 1: Use `approver_role` (single level)
- Future: Migrate to `approval_levels` array (multi-level)
- Backward compatibility: Can read both formats

---

## Error Scenarios

### Invalid Approval Attempt

**Scenario:** User without required role tries to approve.

**Handling:**
- Domain layer validation fails
- Throws `DomainError: 'User does not have required role'`
- Approval request remains PENDING
- No state change

### Approval Request Not Found

**Scenario:** Attempting to approve non-existent request.

**Handling:**
- Infrastructure layer error
- Throws `NotFoundError: 'Approval request not found'`
- Cannot proceed

### Agreement Already Decided

**Scenario:** Attempting to approve/reject already approved/rejected request.

**Handling:**
- Domain layer validation fails
- Throws `DomainError: 'Cannot approve non-pending request'`
- Approval request unchanged
- Idempotency: Multiple approval attempts safe (returns error)

---

## Open Questions (Sprint 0)

1. **Approval Timeout:** What happens if approval is pending too long?
   - Current: No timeout
   - Question: Auto-reject after X days? Escalation?

2. **Approval Withdrawal:** Can approver withdraw their approval?
   - Current: No (immutable decision)
   - Question: Do we need withdrawal before next level (future)?

3. **Conditional Approval:** Can approver approve with conditions?
   - Current: No (binary approve/reject)
   - Question: Do we need conditional approval (e.g., "Approve if X fixed")?

4. **Approval Delegation:** Can approver delegate to another user?
   - Current: No (future feature)
   - Question: How should delegation be implemented?

5. **Approval Comments:** Are comments mandatory or optional?
   - Current: Optional
   - Question: Should comments be required for rejection?

---

## Next Steps

1. **Domain Model Implementation:** Create ApprovalRequest domain entity with state machine
2. **Service Layer Implementation:** Create ApprovalService with orchestration logic
3. **Policy Resolution:** Implement policy resolution logic (hard-coded for Sprint 1)
4. **Repository Implementation:** Create ApprovalRepository for persistence
5. **Integration Testing:** Test approval workflow end-to-end

---

**Document Status:** ✅ Complete  
**Review Status:** Pending  
**Implementation:** Sprint 1 (Single-level approval), Future (Multi-level approval)

