import { z } from 'zod';

export const DisputeSchema = z.object({
  id: z.number().optional(),
  transactionId: z.coerce.number(),
  reason: z.string().min(2).max(100),
  description: z.string().min(2).max(500),
  resolutionOption: z.enum([
    "REFUND_ONLY",
    "REPLACEMENT_ONLY",
    "REFUND_OR_REPLACEMENT",
    "PARTIAL_REPAYMENT",
    "RESEND_PRODUCT",
    "REPEAT_SERVICE",
    "CANCEL_TRANSACTION",
    "OTHERS",
  ]),
  evidenceUrl: z.array(z.string().url()).optional(),
  evidenceId: z.array(z.string()).optional(),
  status: z.enum(["ongoing", "closed", "cancel"]).default("ongoing"),

  elapsesAt: z.date().optional(),
  // creatorId: z.number(),
  // buyerId: z.number(),
  // sellerId: z.number(),
}).superRefine((data, ctx) => {
  if (data.evidenceUrl && data.evidenceUrl.length > 0) {
    if (!data.evidenceId || data.evidenceId.length !== data.evidenceUrl.length) {
      ctx.addIssue({
        path: ['evidenceId'],
        code: z.ZodIssueCode.custom,
        message: 'evidenceId must be provided for each evidenceUrl.',
      });
    }
  } else if (data.evidenceId && data.evidenceId.length > 0) {
    ctx.addIssue({
      path: ['evidenceId'],
      code: z.ZodIssueCode.custom,
      message: 'evidenceId should not be provided when evidenceUrl is empty or missing.',
    });
  }
});

export type DisputeType = z.infer<typeof DisputeSchema>;
