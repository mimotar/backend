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
    "RENTAL",
    "MILESTONE_BASED_PROJECT"
]);
exports.StatusEnum = zod_1.z.enum(["ONGOING", "DISPUTE", "CANCEL", "COMPLETED"]);
exports.TransactionSchema = zod_1.z.object({
    amount: zod_1.z.coerce.number().int(),
    transaction_description: zod_1.z.string().max(200),
    user_id: zod_1.z.coerce.number().positive().optional(),
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
    terms: zod_1.z.string().nullable(),
    transactionType: exports.TransactionTypeEnum,
    inspection_duration: zod_1.z.coerce.number().int().positive(),
    expiresAt: zod_1.z.coerce.number(),
    isApproved: zod_1.z.coerce.boolean().optional(),
    files: zod_1.z
        .array(zod_1.z.object({
        fileName: zod_1.z.string(),
        fileType: zod_1.z.enum(["image", "pdf", "doc", "other"]),
        fileUrl: zod_1.z.string().url(),
    }))
        .max(2)
        .optional(),
});
