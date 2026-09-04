import { activateTransactionAfterPayment } from "../services/payment/activate-after-payment.service.js";

const baseTransaction = {
  id: 7,
  status: "APPROVED",
  transactionType: "PROJECT",
  milestones: [] as { id: number; status: string }[],
};

const createClient = () => ({
  transaction: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  milestone: {
    update: jest.fn(),
  },
});

describe("activateTransactionAfterPayment", () => {
  let client: ReturnType<typeof createClient>;

  beforeEach(() => {
    client = createClient();
    jest.clearAllMocks();
  });

  it("moves APPROVED to ONGOING", async () => {
    client.transaction.findUnique.mockResolvedValue(baseTransaction);
    client.transaction.update.mockImplementation(({ data }: { data: object }) =>
      Promise.resolve({ ...baseTransaction, ...data })
    );

    const updated = await activateTransactionAfterPayment(7, client as any);

    expect(updated.status).toBe("ONGOING");
    expect(client.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "ONGOING" }),
      })
    );
  });

  it("moves EXPIRED to ONGOING after a successful charge", async () => {
    client.transaction.findUnique.mockResolvedValue({
      ...baseTransaction,
      status: "EXPIRED",
    });
    client.transaction.update.mockImplementation(({ data }: { data: object }) =>
      Promise.resolve({ ...baseTransaction, ...data, status: "ONGOING" })
    );

    const updated = await activateTransactionAfterPayment(7, client as any);

    expect(updated.status).toBe("ONGOING");
    expect(client.transaction.update).toHaveBeenCalled();
  });

  it("is idempotent when already ONGOING", async () => {
    client.transaction.findUnique.mockResolvedValue({
      ...baseTransaction,
      status: "ONGOING",
    });

    const result = await activateTransactionAfterPayment(7, client as any);

    expect(result.status).toBe("ONGOING");
    expect(client.transaction.update).not.toHaveBeenCalled();
  });

  it("rejects CANCELED", async () => {
    client.transaction.findUnique.mockResolvedValue({
      ...baseTransaction,
      status: "CANCELED",
    });

    await expect(
      activateTransactionAfterPayment(7, client as any)
    ).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it("activates the first CREATED milestone on a milestone project", async () => {
    const withMilestones = {
      ...baseTransaction,
      transactionType: "MILESTONE_BASED_PROJECT",
      milestones: [{ id: 21, status: "CREATED" }],
    };
    client.transaction.findUnique.mockResolvedValue(withMilestones);
    client.transaction.update.mockResolvedValue({
      ...withMilestones,
      status: "ONGOING",
    });
    client.milestone.update.mockResolvedValue({ id: 21, status: "ONGOING" });

    await activateTransactionAfterPayment(7, client as any);

    expect(client.milestone.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 21 },
        data: expect.objectContaining({ status: "ONGOING" }),
      })
    );
  });
});
