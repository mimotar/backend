import { DisputeSchema } from "../zod/Dispute.zod.js";

const validDispute = {
  transactionId: 10,
  reason: "Work was not delivered",
  description: "The agreed deliverable is missing",
  resolutionOption: "REPEAT_SERVICE" as const,
};

describe("DisputeSchema", () => {
  it("accepts a transaction-level dispute", () => {
    const parsed = DisputeSchema.parse(validDispute);
    expect(parsed.transactionId).toBe(10);
    expect(parsed.milestoneId).toBeUndefined();
  });

  it("coerces a milestone id supplied through multipart form data", () => {
    const parsed = DisputeSchema.parse({
      ...validDispute,
      milestoneId: "42",
    });
    expect(parsed.milestoneId).toBe(42);
  });

  it("requires an evidence id for every evidence URL", () => {
    const result = DisputeSchema.safeParse({
      ...validDispute,
      evidenceUrl: ["https://example.com/evidence.png"],
      evidenceId: [],
    });
    expect(result.success).toBe(false);
  });
});
