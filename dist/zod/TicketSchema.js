"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionSchema = exports.StatusEnum = exports.TransactionTypeEnum = exports.RoleEnum = exports.EscrowFeePayerEnum = void 0;
const zod_1 = require("zod");
exports.EscrowFeePayerEnum = zod_1.z.enum(["BUYER", "SELLER", "BOTH"]);
exports.RoleEnum = zod_1.z.enum(["BUYER", "SELLER"]);
exports.TransactionTypeEnum = zod_1.z.enum([
    "PHYSICAL_PRODUCT",
    "ONLINE_PRODUCT",
    "SERVICE",
]);
exports.StatusEnum = zod_1.z.enum(["ONGOING", "DISPUTE", "CANCEL", "COMPLETED"]);
exports.TransactionSchema = zod_1.z.object({
    amount: zod_1.z.number().int(),
    transaction_description: zod_1.z.string().max(200),
    user_id: zod_1.z.number().positive().optional(),
    // status: StatusEnum.default("ONGOING"),
    pay_escrow_fee: exports.EscrowFeePayerEnum,
    additional_agreement: zod_1.z.string().max(200),
    pay_shipping_cost: exports.EscrowFeePayerEnum,
    creator_fullname: zod_1.z.string().min(1),
    creator_email: zod_1.z.string().email(),
    creator_no: zod_1.z.string().min(1),
    creator_address: zod_1.z.string().nullable(),
    creator_role: exports.RoleEnum,
    receiver_fullname: zod_1.z.string().min(1),
    reciever_email: zod_1.z.string().email(),
    receiver_no: zod_1.z.string().min(1),
    receiver_address: zod_1.z.string().nullable(),
    reciever_role: exports.RoleEnum,
    // link_expires: z.boolean().default(false),
    // txn_link: z.string().min(1),
    terms: zod_1.z.string().nullable(),
    transactionType: exports.TransactionTypeEnum,
    // transactionToken: z.string(),
    inspection_duration: zod_1.z.number().int().positive(),
    expiresAt: zod_1.z.number(),
    approveStatus: zod_1.z.boolean().optional(),
    // created_at: z.date().default(new Date()),
});
