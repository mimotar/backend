import { z } from "zod";
export const EscrowFeePayerEnum = z.enum(["BUYER", "SELLER", "BOTH"]);
export const RoleEnum = z.enum(["BUYER", "SELLER"]);
export const TransactionTypeEnum = z.enum([
    "PHYSICAL_PRODUCT",
    "ONLINE_PRODUCT",
    "SERVICE",
    "RENTAL",
    "MILESTONE_BASED_PROJECT"
]);
export const StatusEnum = z.enum(["ONGOING", "DISPUTE", "CANCEL", "COMPLETED"]);
const FutureDeadlineSchema = z.coerce.date().refine((deadline) => deadline.getTime() > Date.now(), "Deadline must be in the future");
export const MilestoneSchema = z.object({
    name: z.string().min(1, "Milestone name is required"),
    amount: z.coerce.number().int().positive("Milestone amount must be positive"),
    deadline: FutureDeadlineSchema,
    files: z
        .array(z.object({
        fileName: z.string(),
        fileType: z.enum(["image", "pdf", "doc", "other"]),
        fileUrl: z.string().url(),
        fileId: z.string().optional(),
    }))
        .optional(),
});
export const CurrencyEnum = z.enum(["NGN", "USD"]);
export const TransactionSchema = z.object({
    title: z.string().min(1, "Title is required").max(200, "Title must be under 200 characters"),
    currency: CurrencyEnum,
    amount: z.coerce.number().int(),
    transaction_description: z.string().max(200),
    user_id: z.coerce.number().positive().optional(),
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
    terms: z.string().nullable(),
    transactionType: TransactionTypeEnum,
    deadline: FutureDeadlineSchema,
    inspection_duration: z.coerce.number().int().positive(),
    expiresAt: z.coerce.number(),
    isApproved: z.coerce.boolean().optional(),
    files: z
        .array(z.object({
        fileName: z.string(),
        fileType: z.enum(["image", "pdf", "doc", "other"]),
        fileUrl: z.string().url(),
    }))
        .max(2)
        .optional(),
    milestones: z.preprocess((val) => {
        if (typeof val === "string") {
            try {
                return JSON.parse(val);
            }
            catch {
                return val;
            }
        }
        return val;
    }, z.array(MilestoneSchema).optional()),
}).superRefine((transaction, ctx) => {
    if (transaction.transactionType !== "MILESTONE_BASED_PROJECT") {
        if (transaction.milestones?.length) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["milestones"],
                message: "Milestones are only valid for milestone-based projects",
            });
        }
        return;
    }
    if (!transaction.milestones?.length) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["milestones"],
            message: "At least one milestone is required for milestone-based projects",
        });
    }
    if (transaction.milestones) {
        transaction.milestones.forEach((milestone, index) => {
            if (milestone.deadline > transaction.deadline) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["milestones", index, "deadline"],
                    message: "Milestone deadline cannot be later than the transaction deadline",
                });
            }
        });
    }
});
export const DeadlineExtensionSchema = z.object({
    deadline: FutureDeadlineSchema,
    reason: z.string().trim().min(2).max(500).optional(),
});
export const RejectTransactionSchema = z.object({
    otp: z.string().min(1, "OTP is required"),
    rejection_reason: z.string().min(1, "Rejection reason is required").max(500, "Rejection reason must be under 500 characters"),
});
