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
  pay_escrow_fee: "CLIENT",
  additional_agreement: "Standard agreement",
  creator_fullname: "Buyer Name",
  creator_email: "buyer@example.com",
  creator_no: "123",
  creator_address: null,
  creator_role: "CLIENT",
  receiver_fullname: "Seller Name",
  reciever_email: "seller@example.com",
  receiver_no: "456",
  receiver_address: null,
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
    if (result.success) {
      expect(result.data.reciever_role).toBe("FREELANCER");
    }
  });

  it("assigns CLIENT to the receiver when the creator is FREELANCER", () => {
    const result = TransactionSchema.safeParse({
      ...baseTransaction,
      creator_role: "FREELANCER",
      transactionType: "SERVICE",
      deadline: futureDate(30),
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reciever_role).toBe("CLIENT");
    }
  });

  it("treats blank swagger milestone fields as omitted for non-milestone tickets", () => {
    const payload = {
      ...baseTransaction,
      transactionType: "SERVICE",
      deadline: futureDate(30),
    };

    for (const milestones of ["", "[]", []]) {
      const result = TransactionSchema.safeParse({ ...payload, milestones });
      expect(result.success).toBe(true);
    }
  });

  it("accepts omitted nullable transaction fields", () => {
    const {
      additional_agreement,
      creator_address,
      receiver_address,
      terms,
      ...requiredTransaction
    } = baseTransaction;

    const result = TransactionSchema.safeParse({
      ...requiredTransaction,
      transactionType: "SERVICE",
      deadline: futureDate(30),
    });

    expect(result.success).toBe(true);
  });

  it("strips server-managed and removed create fields", () => {
    const result = TransactionSchema.safeParse({
      ...baseTransaction,
      transactionType: "SERVICE",
      deadline: futureDate(30),
      reciever_role: "CLIENT",
      pay_shipping_cost: "CLIENT",
      user_id: 999,
      isApproved: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reciever_role).toBe("FREELANCER");
      expect(result.data).not.toHaveProperty("pay_shipping_cost");
      expect(result.data).not.toHaveProperty("user_id");
      expect(result.data).not.toHaveProperty("isApproved");
    }
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
