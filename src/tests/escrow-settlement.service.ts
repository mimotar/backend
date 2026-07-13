import prisma from "../utils/prisma.js";
import { settleEscrowScope } from "../services/escrow-settlement.service.js";

jest.mock("../utils/prisma.js", () => ({
  __esModule: true,
  default: { $transaction: jest.fn() },
}));

const transaction = {
  id: 7,
  amount: 300,
  creator_role: "CLIENT",
  creator_email: "buyer@example.com",
  reciever_email: "seller@example.com",
  pay_escrow_fee: "CLIENT",
  currency: "NGN",
  transaction_completed_at: null,
  inspection_started_at: new Date("2026-01-01"),
  transactionType: "MILESTONE_BASED_PROJECT",
};

const createTx = () => ({
  transaction: {
    findUnique: jest.fn().mockResolvedValue(transaction),
    update: jest.fn().mockImplementation(({ data }) =>
      Promise.resolve({ ...transaction, ...data })
    ),
  },
  milestone: {
    findUnique: jest.fn().mockResolvedValue({
      id: 21,
      transaction_id: 7,
      sequence: 1,
      amount: 100,
      status: "DISPUTE",
      completedAt: null,
      releasedAt: null,
    }),
    update: jest
      .fn()
      .mockResolvedValueOnce({
        id: 21,
        transaction_id: 7,
        sequence: 1,
        amount: 100,
        status: "COMPLETED",
        completedAt: new Date(),
        releasedAt: new Date(),
      })
      .mockResolvedValueOnce({
        id: 22,
        transaction_id: 7,
        sequence: 2,
        amount: 200,
        status: "ONGOING",
      }),
    findFirst: jest.fn().mockResolvedValue({
      id: 22,
      transaction_id: 7,
      sequence: 2,
      amount: 200,
      status: "CREATED",
      activatedAt: null,
    }),
  },
  earnings: {
    findUnique: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: 90 }),
  },
  walletTransaction: { create: jest.fn().mockResolvedValue({ id: 91 }) },
  user: {
    findUnique: jest.fn().mockResolvedValue({ id: 2 }),
    update: jest.fn().mockResolvedValue({ id: 2 }),
  },
  dispute: {
    findUnique: jest.fn().mockResolvedValue({
      id: 55,
      transactionId: 7,
      milestoneId: 21,
      status: "ongoing",
    }),
    update: jest.fn().mockResolvedValue({ id: 55 }),
  },
});

describe("settleEscrowScope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("releases one milestone, closes its dispute, and starts the next milestone", async () => {
    const tx = createTx();
    (prisma.$transaction as jest.Mock).mockImplementation((callback) =>
      callback(tx)
    );

    const result = await settleEscrowScope(7, {
      milestoneId: 21,
      disputeId: 55,
      resolvedById: 1,
    });

    expect(tx.earnings.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        transaction_id: 7,
        milestone_id: 21,
        releaseKey: "milestone:21",
        amount: 100,
      }),
    });
    expect(tx.dispute.update).toHaveBeenCalledWith({
      where: { id: 55 },
      data: expect.objectContaining({
        status: "closed",
        resolution: "RELEASE_TO_SELLER",
        resolvedById: 1,
      }),
    });
    expect(tx.milestone.update).toHaveBeenLastCalledWith({
      where: { id: 22 },
      data: expect.objectContaining({ status: "ONGOING" }),
    });
    expect(result.transaction.status).toBe("ONGOING");
  });

  it("does not credit the wallet again when the release key already exists", async () => {
    const tx = createTx();
    tx.earnings.findUnique.mockResolvedValue({ id: 90 } as never);
    (prisma.$transaction as jest.Mock).mockImplementation((callback) =>
      callback(tx)
    );

    await settleEscrowScope(7, { milestoneId: 21 });

    expect(tx.earnings.create).not.toHaveBeenCalled();
    expect(tx.walletTransaction.create).not.toHaveBeenCalled();
    expect(tx.user.update).not.toHaveBeenCalled();
  });
});
