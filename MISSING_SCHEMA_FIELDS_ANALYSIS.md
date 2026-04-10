# Prisma Schema Missing Fields Analysis

## Summary
Found **3 critical issues** where the codebase references fields/values that are missing from the current Prisma schema. These fields are being actively used in controllers, services, and type definitions but were likely lost during the `db push` operation.

---

## Critical Issues

### 1. ❌ PROFILE Model - Missing 4 Fields

**Fields Missing:**
- `city` (String, nullable)
- `country` (String, nullable)
- `postal_code` (String, nullable)
- `id_number` (String, nullable)

**Evidence:**
- **Controller Usage:** [profile.controller.ts](src/controllers/profile.controller.ts#L57-L60)
  ```typescript
  city: req.body.city ?? null,
  country: req.body.country ?? null,
  postal_code: req.body.postal_code ?? null,
  id_number: req.body.id_number ?? null,
  ```

- **Service DTO:** [profile.service.ts](src/services/profile/profile.service.ts#L3-L11)
  ```typescript
  export interface UpdateProfileDto {
    city?: string;
    country?: string;
    postal_code?: string;
    id_number?: string;
  }
  ```

- **Generated Types:** [Profile.ts](src/generated/prisma/models/Profile.ts#L41-L44) (shows these are in Prisma's type system)
  ```typescript
  city: string | null
  country: string | null
  postal_code: string | null
  id_number: string | null
  ```

**Impact:**
- ProfileController will fail when trying to update these fields
- These fields are nullable, so they're optional attributes for user profiles
- Likely need for address information tracking

**Solution:**
Add to `prisma/schema/schema.prisma` in Profile model:
```prisma
model Profile {
  // ... existing fields ...
  city              String?
  country           String?
  postal_code       String?
  id_number         String?
  // ... rest of fields ...
}
```

---

### 2. ❌ TRANSACTION Model - Missing StatusEnum Value

**Missing Value:**
- `PENDING_CLOSURE` in StatusEnum

**Current StatusEnum Values:**
- CREATED, APPROVED, ONGOING, COMPLETED, DISPUTE, REJECTED, CANCELED, EXPIRED

**Evidence:**
- **Service Usage:** [ticket.service.ts](src/services/ticket.service.ts#L332)
  ```typescript
  data: { status: "PENDING_CLOSURE" }
  ```

- **Validation Checks:** [ticket.service.ts](src/services/ticket.service.ts#L362-L395)
  ```typescript
  if (transaction.status !== "PENDING_CLOSURE") 
    throw new GlobalError("Transaction is not pending closure", ...);
  ```

- **Email Notifications:** [ticket.service.ts](src/services/ticket.service.ts#L343-L348)
  ```typescript
  EmailType.TRANSACTION_PENDING_CLOSURE_INITIATOR
  EmailType.TRANSACTION_PENDING_CLOSURE_COUNTERPARTY
  ```

**Impact:**
- Transactions cannot be moved to closure pending state
- Will cause runtime errors when trying to set this status
- Full workflow for transaction closure is broken

**Usage Pattern:**
1. User initiates closing transaction → status = "PENDING_CLOSURE"
2. Other party can accept/reject closure
3. Based on response → status = "COMPLETED" or back to previous state

**Solution:**
Update `prisma/schema/schema.prisma`:
```prisma
enum StatusEnum {
  CREATED
  APPROVED
  ONGOING
  COMPLETED
  DISPUTE
  REJECTED
  CANCELED
  EXPIRED
  PENDING_CLOSURE
}
```

---

### 3. ❌ EARNINGS Model - Missing status Field

**Missing Field:**
- `status` (String, possibly enum with values: "PENDING", "COMPLETED", "PAID")

**Evidence:**
- **Service Creation:** [ticket.service.ts](src/services/ticket.service.ts#L265)
  ```typescript
  await prisma.earnings.upsert({
    // ...
    create: {
      status: "PENDING",  // ← Field not in schema
      amount: transaction.amount,
      transaction_id: transaction.id,
    }
  ```

- **Service Update:** [ticket.service.ts](src/services/ticket.service.ts#L270)
  ```typescript
  update: {
    status: "PENDING",
    amount: transaction.amount,
  }
  ```

- **Dashboard Filter:** [dashboard.service.ts](src/services/dashboard/dashboard.service.ts#L36)
  ```typescript
  const unpaidEarningsAggr = await prisma.earnings.aggregate({
    where: {
      userId: id,
      transaction: {
        payment: {
          is: { status: "PENDING" }  // ← Filtering by payment status
        }
      }
    }
  ```

**Impact:**
- Cannot track earning status (pending vs paid)
- Dashboard metrics for escrow balance may be inaccurate
- Earning state management is broken

**Possible Values:**
- PENDING (awaiting payment)
- COMPLETED (seller completed work)
- PAID (seller has been paid)

**Solution:**
Add to `prisma/schema/schema.prisma` in Earnings model:
```prisma
model Earnings {
  // ... existing fields ...
  status    EarningsStatus  @default(PENDING)
  // ... rest of fields ...
}

enum EarningsStatus {
  PENDING
  COMPLETED
  PAID
}
```

---

## Fields Verified as Present ✅

### User Model
All required fields present and correctly used:
- id, email, password, firstName, lastName, createdAt, verified
- verificationToken, provider, subject, otp, otpCreatedAt
- totalEarnings, walletBalance
- All relationships (profile, setting, notification, transaction, chats, messages, earnings, walletTransactions, disputes)

### Transaction Model
All core fields present:
- amount, user_id, additional_agreement, creator_fullname, creator_email
- creator_no, creator_address, receiver_fullname, receiver_no, receiver_address
- link_expires, txn_link, created_at, inspection_duration, reciever_role
- terms, transactionType, transaction_description, pay_escrow_fee, pay_shipping_cost
- creator_role, currency, expiresAt, transactionToken, reciever_email
- approveStatus, files, otp, otp_created_at, payment_id
- Relationships (user, payment, earnings, dispute)

### Payment Model
All fields present and used correctly

### Dispute Model
All fields present and used correctly

### Chat & Message Models
All fields present and used correctly

### Setting Model
All fields present and used correctly

### Notification & Contact Models
All fields present and used correctly

---

## Recommended Migration Steps

1. **Create a new migration:**
   ```bash
   npx prisma migrate dev --name add_missing_schema_fields
   ```

2. **Update schema.prisma with:**
   - Profile: Add city, country, postal_code, id_number
   - StatusEnum: Add PENDING_CLOSURE
   - Earnings: Add status field with EarningsStatus enum

3. **Test affected endpoints:**
   - Profile update endpoint
   - Transaction closure workflow
   - Dashboard earnings metrics
   - Earnings tracking

4. **Data Migration (if needed):**
   - Set default values for existing earnings records (status = "PENDING")
   - Ensure no existing transactions are in an invalid state

---

## Files Affected

| File | Issue | Line |
|------|-------|------|
| [profile.controller.ts](src/controllers/profile.controller.ts) | Uses 4 missing Profile fields | 57-60 |
| [profile.service.ts](src/services/profile/profile.service.ts) | Expects 4 missing Profile fields | 3-11 |
| [ticket.service.ts](src/services/ticket.service.ts) | Uses PENDING_CLOSURE status | 332, 362, 395 |
| [ticket.service.ts](src/services/ticket.service.ts) | Sets earnings.status field | 265, 270 |
| [dashboard.service.ts](src/services/dashboard/dashboard.service.ts) | Filters by earnings status | 36 |

---

## Severity Assessment

| Issue | Severity | Impact |
|-------|----------|--------|
| Missing Profile fields | HIGH | Profile updates will fail |
| Missing PENDING_CLOSURE status | HIGH | Transaction closure workflow broken |
| Missing earnings.status field | HIGH | Earnings tracking broken |

**Overall:** All three issues are critical and must be fixed for the application to function correctly.
