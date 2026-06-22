# Transaction, Milestone, Escrow, and Dispute Lifecycle

This document describes how Mimotar transactions move from creation to escrow release. It covers ordinary transactions, milestone projects, disputes, delayed closure, authorization, and the records created when money is released.

## Core concepts

A `Transaction` is the escrow agreement between a buyer and a seller. The transaction records the full agreed amount, currency, fee payer, participants, payment, and overall status.

A `Milestone` is one ordered portion of a `MILESTONE_BASED_PROJECT`. The full project is funded through the transaction payment flow, but escrow is released to the seller one milestone at a time.

A `Dispute` always belongs to a transaction. For a milestone project it also belongs to one specific milestone. A dispute without a `milestoneId` is a transaction-level dispute.

An `Earnings` row is the release ledger. Its unique `releaseKey` is either `transaction:<transactionId>` or `milestone:<milestoneId>`. This prevents the same escrow scope from being credited twice.

## Roles and authorization

- Only the transaction buyer or seller can open a dispute.
- A milestone dispute must identify the active milestone.
- Only the dispute creator can cancel an ongoing dispute.
- Only the buyer can approve release of disputed escrow to the seller.
- Both participants can view their disputes.
- There is currently no administrator role in the `User` model. If administrator arbitration is introduced, the dispute resolution authorization should be changed from buyer-only to an explicit administrator permission.

## Transaction status meanings

| Status | Meaning |
| --- | --- |
| `CREATED` | The transaction exists and awaits agreement. |
| `APPROVED` | The counterparty accepted the agreement; payment can be initialized. |
| `ONGOING` | Escrow is funded and work or inspection is active. |
| `PENDING_CLOSURE` | Completion was requested and the buyer can accept or reject it. |
| `DISPUTE` | The transaction or active milestone is disputed. Escrow release is paused. |
| `COMPLETED` | All required escrow has been released and the transaction is finished. |
| `REJECTED`, `CANCELED`, `EXPIRED` | The agreement did not enter or remain in the active escrow lifecycle. |

Milestones use the same status enum, principally `CREATED`, `ONGOING`, `PENDING_CLOSURE`, `DISPUTE`, and `COMPLETED`.

## Transaction without milestones

### Normal lifecycle

```text
CREATED -> APPROVED -> ONGOING -> PENDING_CLOSURE -> COMPLETED
                                      |
                                      +-> DISPUTE
```

1. The creator creates a transaction.
2. The counterparty approves it using the transaction approval flow.
3. Payment is initialized for the complete transaction amount plus any buyer-paid escrow fee.
4. After confirmed funding, `PUT /api/ticket/:id/update-status-to-ongoing` changes the transaction to `ONGOING`.
5. A participant requests closure with `PUT /api/ticket/:id/resolve`.
6. The transaction becomes `PENDING_CLOSURE`, and a delayed 24-hour closure job is scheduled.
7. The buyer accepts through `PUT /api/ticket/:id/accept-resolution`, or the delayed job completes the transaction if it is still pending.
8. Settlement creates one earnings record with `releaseKey = transaction:<id>`, creates one wallet inflow, credits the seller, and marks the transaction `COMPLETED`.

If the buyer rejects closure through `PUT /api/ticket/:id/reject-resolution`, the transaction becomes `DISPUTE`. A participant then supplies the reason, desired outcome, and evidence through the dispute endpoint.

### Opening a transaction-level dispute

Request:

```http
POST /api/dispute
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

Fields:

```json
{
  "transactionId": 120,
  "reason": "The delivered service does not match the agreement",
  "description": "A detailed explanation of the problem",
  "resolutionOption": "REPEAT_SERVICE"
}
```

`milestoneId` must be omitted. Evidence can be attached using up to five `evidence` files.

Creation verifies that the transaction exists, the caller is the buyer or seller, both parties have registered accounts, the transaction is in a disputable state, and no ongoing transaction-level dispute already exists. The transaction then moves to `DISPUTE`.

### Resolving a transaction-level dispute

```http
PATCH /api/dispute/:disputeId/resolve
Authorization: Bearer <buyer-token>
```

The operation runs in one database transaction:

1. Verify that the dispute exists and remains `ongoing`.
2. Verify that the caller is the buyer.
3. Check for the unique `transaction:<id>` release record.
4. Credit the seller only if that record does not already exist.
5. Mark the dispute `closed` with resolution `RELEASE_TO_SELLER`.
6. Record `resolvedAt` and `resolvedById`.
7. Mark the transaction `COMPLETED`.

If the same release is retried, database uniqueness prevents a second earning or wallet credit.

## Milestone-based transaction

### Creation and funding

Milestones are stored in the order supplied by the client. Each receives a one-based `sequence` value. The transaction amount is the sum of all milestone amounts.

Example:

```json
{
  "transactionType": "MILESTONE_BASED_PROJECT",
  "milestones": [
    { "name": "Design", "amount": 100000, "deadline": "2026-07-01" },
    { "name": "Implementation", "amount": 250000, "deadline": "2026-08-01" },
    { "name": "Launch", "amount": 50000, "deadline": "2026-08-15" }
  ]
}
```

All milestones initially have `CREATED` status. When funding is confirmed and the transaction becomes `ONGOING`, milestone sequence 1 becomes `ONGOING` and receives `activatedAt`. Later milestones remain `CREATED`. Only one milestone is intended to be active at a time.

### Completing a milestone normally

The milestone-specific closure routes are:

```text
PUT /api/ticket/:transactionId/milestones/:milestoneId/resolve
PUT /api/ticket/:transactionId/milestones/:milestoneId/accept-resolution
PUT /api/ticket/:transactionId/milestones/:milestoneId/reject-resolution
```

1. A participant requests completion of the active milestone using `/resolve`.
2. The milestone and parent transaction become `PENDING_CLOSURE`.
3. A 24-hour job is scheduled specifically for that milestone.
4. The buyer accepts, or the job settles the milestone if it remains pending.
5. Only the milestone amount, less the seller's applicable fee share, is released.
6. The milestone becomes `COMPLETED` and records `completedAt` and `releasedAt`.
7. The next incomplete milestone by sequence becomes `ONGOING` and records `activatedAt`.
8. The parent transaction returns to `ONGOING`.
9. When the last milestone completes, the parent transaction becomes `COMPLETED`.

### Opening a milestone dispute

```http
POST /api/dispute
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

Fields:

```json
{
  "transactionId": 130,
  "milestoneId": 402,
  "reason": "The design files are incomplete",
  "description": "Two required screens and the mobile layout are missing",
  "resolutionOption": "REPEAT_SERVICE"
}
```

For `MILESTONE_BASED_PROJECT`, `milestoneId` is mandatory. The service verifies that:

- The milestone belongs to the supplied transaction.
- The milestone is the active, pending-closure, or already dispute-marked milestone.
- The caller is a transaction participant.
- No other ongoing dispute exists for the transaction.
- The same milestone does not already have an ongoing dispute.

The milestone and parent transaction then move to `DISPUTE`. Later milestones remain untouched and cannot start while the dispute is open.

### Resolving a milestone dispute and continuing the project

```http
PATCH /api/dispute/:disputeId/resolve
Authorization: Bearer <buyer-token>
```

The service atomically performs the following:

1. Confirms the dispute is ongoing and the buyer authorized release.
2. Uses `milestone:<milestoneId>` as the unique release key.
3. Calculates the seller's net amount from that milestone's amount only.
4. Creates the milestone earning and wallet inflow exactly once.
5. Marks the milestone `COMPLETED` and records completion/release timestamps.
6. Closes the dispute and records its resolver and resolution.
7. Activates the next milestone and returns the transaction to `ONGOING`.
8. If there is no next milestone, marks the project transaction `COMPLETED`.

The database operation is all-or-nothing: a failure cannot leave a closed dispute without a payout, a payout without a completed milestone, or two active milestones.

### Cancelling a dispute

```http
DELETE /api/dispute/:disputeId
Authorization: Bearer <dispute-creator-token>
```

For backward API compatibility this remains a `DELETE` route, but it does not remove the database record. It changes the dispute status to `cancel`, restores the milestone and transaction to `ONGOING`, and attempts to remove uploaded evidence. This preserves the dispute audit trail.

## Escrow fee and release calculation

The project uses a 3% escrow fee. The fee payer determines the seller deduction:

- `BUYER`: seller receives the full transaction or milestone amount.
- `SELLER`: seller receives the amount minus the full 3% fee.
- `BOTH`: seller receives the amount minus half of the 3% fee.

For milestone projects, the same calculation is applied to each milestone amount. Because the fee is percentage-based, the sum of milestone-level fee shares equals the corresponding fee share for the full project, subject only to the database decimal precision.

## Idempotency and audit records

Every release writes:

- One `Earnings` record.
- One `WalletTransaction` inflow.
- The appropriate currency balance increments.
- Completion and release timestamps.

`Earnings.releaseKey` and `Earnings.milestone_id` are unique. The settlement code checks the release key inside the same database transaction used for the wallet and lifecycle changes. Database constraints provide the final protection against concurrent duplicate requests.

Disputes are retained with `ongoing`, `cancel`, or `closed` status. Closed disputes also contain `resolution`, `resolvedAt`, and `resolvedById`.

## Delayed auto-closure

Closure requests schedule a BullMQ job for 24 hours later. Transaction jobs use `closure-<transactionId>`. Milestone jobs use `closure-<transactionId>-milestone-<milestoneId>`.

When a job runs, it first checks that its exact scope is still `PENDING_CLOSURE`. If it is, the worker calls the same idempotent settlement service used by manual acceptance. If the scope was disputed, cancelled, or already completed, the job performs no release.

## Current resolution boundary

The implemented dispute outcome is `RELEASE_TO_SELLER`. Refund-related values in `resolutionOption` describe what the person opening the dispute requested; they do not execute a payment-provider refund.

A future refund implementation should add explicit resolution outcomes such as `REFUND_TO_BUYER` and `PARTIAL_RELEASE`, call the payment provider's refund API, and store a unique refund ledger record before closing the dispute.

## Database deployment

The migration `20260622120000_add_milestone_disputes_and_releases` must be deployed before starting application code generated from the updated Prisma schema:

```bash
npx prisma migrate deploy --schema=prisma/schema/schema.prisma
npx prisma generate --schema=prisma/schema/schema.prisma
```

The migration assigns sequence numbers to existing milestones by their current IDs and converts existing earnings into transaction release records using `transaction:<transactionId>` keys.
