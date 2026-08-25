import type { Role } from "../generated/prisma/enums.js";

type TransactionRoleFields = {
  creator_email: string;
  creator_role: Role;
  reciever_email: string;
  reciever_role: Role;
  created_at: Date;
  agreement_accepted_at: Date | null;
  payment_sent_to_escrow_at: Date | null;
  inspection_started_at: Date | null;
  inspection_completed_at: Date | null;
  transaction_completed_at: Date | null;
};

export type TransactionLogs = {
  transaction_created_at: string;
  agreement_accepted_at: string | null;
  payment_sent_to_escrow_at: string | null;
  inspection_started_at: string | null;
  inspection_completed_at: string | null;
  transaction_completed_at: string | null;
  role: Role;
  counterpartyRole: Role;
};

/**
 * Builds the `logs` payload for a transaction: lifecycle timestamps plus
 * the authenticated user's role and the counterparty's role.
 */
export function buildTransactionLogs(
  transaction: TransactionRoleFields,
  userEmail: string
): TransactionLogs {
  const email = userEmail.toLowerCase();
  const isCreator = transaction.creator_email.toLowerCase() === email;

  return {
    transaction_created_at: transaction.created_at.toISOString(),
    agreement_accepted_at: transaction.agreement_accepted_at?.toISOString() ?? null,
    payment_sent_to_escrow_at: transaction.payment_sent_to_escrow_at?.toISOString() ?? null,
    inspection_started_at: transaction.inspection_started_at?.toISOString() ?? null,
    inspection_completed_at: transaction.inspection_completed_at?.toISOString() ?? null,
    transaction_completed_at: transaction.transaction_completed_at?.toISOString() ?? null,
    role: isCreator ? transaction.creator_role : transaction.reciever_role,
    counterpartyRole: isCreator ? transaction.reciever_role : transaction.creator_role,
  };
}
