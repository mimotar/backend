import { z } from "zod";

export const EscrowFeePayerEnum = z.enum(["BUYER", "SELLER", "BOTH"]);
export const RoleEnum = z.enum(["BUYER", "SELLER"]);
export const TransactionTypeEnum = z.enum([
  "PHYSICAL_PRODUCT",
  "ONLINE_PRODUCT",
  "SERVICE",
]);
export const StatusEnum = z.enum(["ONGOING", "DISPUTE", "CANCEL", "COMPLETED"]);

export const TransactionSchema = z.object({
  amount: z.number().int(),
  transaction_description: z.string().max(200),
  user_id: z.number().positive().optional(),
  // status: StatusEnum.default("ONGOING"),
  pay_escrow_fee: EscrowFeePayerEnum,
  additional_agreement: z.string().max(200),
  pay_shipping_cost: EscrowFeePayerEnum,
  creator_fullname: z.string().min(1),
  creator_email: z.string().email(),
  creator_no: z.string().min(1),
  creator_address: z.string().nullable(),
  creator_role: RoleEnum,
  receiver_fullname: z.string().min(1),
  reciever_email: z.string().email(),
  receiver_no: z.string().min(1),
  receiver_address: z.string().nullable(),
  reciever_role: RoleEnum,
  // link_expires: z.boolean().default(false),
  // txn_link: z.string().min(1),
  terms: z.string().nullable(),
  transactionType: TransactionTypeEnum,
  // transactionToken: z.string(),
  inspection_duration: z.number().int().positive(),
  expiresAt: z.number(),
  approveStatus: z.boolean().optional(),
  // created_at: z.date().default(new Date()),
});

export type TransactionType = z.infer<typeof TransactionSchema>;
