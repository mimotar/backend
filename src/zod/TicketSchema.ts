import { z } from "zod";

export const EscrowFeePayerEnum = z.enum(["CLIENT", "FREELANCER", "BOTH"]);
export const RoleEnum = z.enum(["CLIENT", "FREELANCER"]);
export const TransactionTypeEnum = z.enum([
  "PHYSICAL_PRODUCT",
  "ONLINE_PRODUCT",
  "SERVICE",
  "RENTAL",
  "MILESTONE_BASED_PROJECT" 
]);

export const StatusEnum = z.enum([
  "CREATED",
  "APPROVED",
  "ONGOING",
  "COMPLETED",
  "DISPUTE",
  "REJECTED",
  "CANCELED",
  "EXPIRED",
  "PENDING_CLOSURE",
  "CHANGES_REQUESTED",
]);

const FutureDeadlineSchema = z.coerce.date().refine(
  (deadline) => deadline.getTime() > Date.now(),
  "Deadline must be in the future"
);

export const MilestoneSchema = z.object({
  name: z.string().min(1, "Milestone name is required"),
  amount: z.coerce.number().int().positive("Milestone amount must be positive"),
  deadline: FutureDeadlineSchema,
  files: z
    .array(
      z.object({
        fileName: z.string(),
        fileType: z.enum(["image", "pdf", "doc", "other"]),
        fileUrl: z.string().url(),
        fileId: z.string().optional(),
      })
    )
    .optional(),
});

// Transaction settlement currently has dedicated wallet handling for NGN and USD only.
export const CurrencyEnum = z.enum(["NGN", "USD"]);

export const TransactionSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be under 200 characters"),
  currency: CurrencyEnum,
  amount: z.coerce.number().int(),
  transaction_description: z.string().max(200),
  pay_escrow_fee: EscrowFeePayerEnum,
  additional_agreement: z.string().max(200).nullable().optional(),
  creator_fullname: z.string().min(1),
  creator_email: z.string().email(),
  creator_no: z.string().min(1),
  creator_address: z.string().nullable().optional(),
  creator_role: RoleEnum,
  receiver_fullname: z.string().min(1),
  reciever_email: z.string().email(),
  receiver_no: z.string().min(1),
  receiver_address: z.string().nullable().optional(),
  terms: z.string().nullable().optional(),
  transactionType: TransactionTypeEnum,
  deadline: FutureDeadlineSchema,
  inspection_duration: z.coerce.number().int().positive(),
  expiresAt: z.coerce.number(),
  files: z
    .array(
      z.object({
        fileName: z.string(),
        fileType: z.enum(["image", "pdf", "doc", "other"]),
        fileUrl: z.string().url(),
      })
    )
    .max(2)
    .optional(),
  milestones: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        try {
          return JSON.parse(val);
        } catch {
          return val;
        }
      }
      return val;
    },
    z.array(MilestoneSchema).optional()
  ),
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
}).transform((transaction) => ({
  ...transaction,
  reciever_role:
    transaction.creator_role === "CLIENT"
      ? ("FREELANCER" as const)
      : ("CLIENT" as const),
}));



export type TransactionType = z.infer<typeof TransactionSchema> & {
  user_id?: number;
};

export const DeadlineExtensionSchema = z.object({
  deadline: FutureDeadlineSchema,
  reason: z.string().trim().min(2).max(500).optional(),
});

export type DeadlineExtensionType = z.infer<typeof DeadlineExtensionSchema>;

export const RejectTransactionSchema = z.object({
  otp: z.string().min(1, "OTP is required"),
  rejection_reason: z.string().min(1, "Rejection reason is required").max(500, "Rejection reason must be under 500 characters"),
});

export type RejectTransactionType = z.infer<typeof RejectTransactionSchema>;

export const RequestChangesSchema = z.object({
  comment: z
    .string()
    .trim()
    .min(1, "Comment is required")
    .max(500, "Comment must be under 500 characters"),
});

export type RequestChangesType = z.infer<typeof RequestChangesSchema>;

const FileAttachmentSchema = z.object({
  fileName: z.string(),
  fileType: z.enum(["image", "pdf", "doc", "other"]),
  fileUrl: z.string().url(),
  fileId: z.string().optional(),
});

export const ReviseTransactionSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    amount: z.coerce.number().int().positive().optional(),
    transaction_description: z.string().max(200).optional(),
    terms: z.string().nullable().optional(),
    additional_agreement: z.string().max(200).nullable().optional(),
    deadline: FutureDeadlineSchema.optional(),
    inspection_duration: z.coerce.number().int().positive().optional(),
    pay_escrow_fee: EscrowFeePayerEnum.optional(),
    pay_shipping_cost: EscrowFeePayerEnum.nullable().optional(),
    files: z.array(FileAttachmentSchema).max(2).optional(),
    milestones: z.preprocess(
      (val) => {
        if (typeof val === "string") {
          try {
            return JSON.parse(val);
          } catch {
            return val;
          }
        }
        return val;
      },
      z.array(MilestoneSchema).optional()
    ),
  })
  .superRefine((data, ctx) => {
    if (data.milestones && data.deadline) {
      data.milestones.forEach((milestone, index) => {
        if (milestone.deadline > data.deadline!) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["milestones", index, "deadline"],
            message: "Milestone deadline cannot be later than the transaction deadline",
          });
        }
      });
    }
  });

export type ReviseTransactionType = z.infer<typeof ReviseTransactionSchema>;

export const ProjectsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  q: z.string().trim().min(1).optional(),
  status: z
    .string()
    .optional()
    .transform((value, ctx) => {
      if (!value || !value.trim()) return undefined;
      const parts = value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const parsed: z.infer<typeof StatusEnum>[] = [];
      for (const part of parts) {
        const result = StatusEnum.safeParse(part);
        if (!result.success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Invalid status: ${part}`,
          });
          return z.NEVER;
        }
        parsed.push(result.data);
      }
      return parsed;
    }),
  amount: z.coerce.number().int().positive().optional(),
  minAmount: z.coerce.number().int().nonnegative().optional(),
  maxAmount: z.coerce.number().int().positive().optional(),
}).superRefine((data, ctx) => {
  if (
    data.minAmount !== undefined &&
    data.maxAmount !== undefined &&
    data.minAmount > data.maxAmount
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["minAmount"],
      message: "minAmount cannot be greater than maxAmount",
    });
  }
});

export type ProjectsQueryType = z.infer<typeof ProjectsQuerySchema>;
