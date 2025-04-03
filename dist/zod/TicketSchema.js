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
    //   id: z.number().int().positive(),
    amount: zod_1.z.number().int().positive(),
    transaction_description: zod_1.z.string().max(200),
    user_id: zod_1.z.number().int().positive().optional(),
    status: exports.StatusEnum.default("ONGOING"),
    pay_escrow_fee: exports.EscrowFeePayerEnum,
    additional_agreement: zod_1.z.string().max(200),
    pay_shipping_cost: exports.EscrowFeePayerEnum,
    creator_fullname: zod_1.z.string().min(1),
    creator_email: zod_1.z.string().email(),
    creator_no: zod_1.z.string().min(1),
    creator_address: zod_1.z.string().nullable(),
    creator_role: exports.RoleEnum,
    dispute: zod_1.z.any().nullable(), // Adjust this based on the Dispute model
    receiver_fullname: zod_1.z.string().min(1),
    receiver_no: zod_1.z.string().min(1),
    receiver_address: zod_1.z.string().nullable(),
    reciever_role: exports.RoleEnum,
    link_expires: zod_1.z.boolean().default(false),
    txn_link: zod_1.z.string().min(1),
    terms: zod_1.z.string().nullable(),
    transactionType: exports.TransactionTypeEnum,
    inspection_duration: zod_1.z.number().int().positive(),
    created_at: zod_1.z.date().default(new Date()),
});
