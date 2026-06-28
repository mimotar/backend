import {
  DeadlineExtensionSchema,
  TransactionSchema,
} from "../zod/TicketSchema.js";

const futureDate = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

const baseTransaction = {
  title: "Website project",
  currency: "NGN",
  amount: 1000,
  transaction_description: "Build a website",
  pay_escrow_fee: "BUYER",
  additional_agreement: "Standard agreement",
  pay_shipping_cost: "BUYER",
  creator_fullname: "Buyer Name",
  creator_email: "buyer@example.com",
  creator_no: "123",
  creator_address: null,
  creator_role: "BUYER",
  receiver_fullname: "Seller Name",
  reciever_email: "seller@example.com",
  receiver_no: "456",
  receiver_address: null,
  reciever_role: "SELLER",
  terms: null,
  transactionType: "MILESTONE_BASED_PROJECT",
  inspection_duration: 3,
  expiresAt: 2,
};

describe("project and milestone deadlines", () => {
  it("requires at least one milestone for a milestone project", () => {
    const result = TransactionSchema.safeParse({
      ...baseTransaction,
      deadline: futureDate(30),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      expect(fields.milestones).toBeDefined();
    }
  });

  it("requires a deadline for a non-milestone transaction", () => {
    const result = TransactionSchema.safeParse({
      ...baseTransaction,
      transactionType: "SERVICE",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.deadline).toBeDefined();
    }
  });

  it("accepts milestones that end on or before the transaction deadline", () => {
    const transactionDeadline = futureDate(30);
    const result = TransactionSchema.safeParse({
      ...baseTransaction,
      deadline: transactionDeadline,
      milestones: [
        { name: "Design", amount: 400, deadline: futureDate(10) },
        { name: "Build", amount: 600, deadline: transactionDeadline },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a milestone later than the transaction deadline", () => {
    const result = TransactionSchema.safeParse({
      ...baseTransaction,
      deadline: futureDate(20),
      milestones: [
        { name: "Build", amount: 1000, deadline: futureDate(21) },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("requires a deadline extension to be in the future", () => {
    const result = DeadlineExtensionSchema.safeParse({
      deadline: new Date(Date.now() - 1000).toISOString(),
      reason: "More time needed",
    });
    expect(result.success).toBe(false);
  });
});
