import prisma from "../utils/prisma.js";
import { getTransactionParticipants } from "../utils/payment/getTransactionParticipants.js";
import {
  extendMilestoneDeadlineService,
  extendTransactionDeadlineService,
} from "../services/deadline.service.js";

jest.mock("../utils/prisma.js", () => ({
  __esModule: true,
  default: {
    transaction: { findUnique: jest.fn() },
    milestone: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock("../utils/payment/getTransactionParticipants.js", () => ({
  getTransactionParticipants: jest.fn(),
}));

const daysFromNow = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000);

describe("deadline extension services", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getTransactionParticipants as jest.Mock).mockResolvedValue({
      buyer: { userId: 1 },
      seller: { userId: 2 },
    });
  });

  it("extends a non-milestone transaction deadline and writes an audit record", async () => {
    const currentDeadline = daysFromNow(10);
    const newDeadline = daysFromNow(20);
    (prisma.transaction.findUnique as jest.Mock).mockResolvedValue({
      id: 7,
      transactionType: "SERVICE",
      status: "ONGOING",
      deadline: currentDeadline,
      milestones: [],
    });

    const tx = {
      transaction: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 7,
          deadline: newDeadline,
        }),
      },
      deadlineExtension: {
        create: jest.fn().mockResolvedValue({ id: 50 }),
      },
    };
    (prisma.$transaction as jest.Mock).mockImplementation((callback) =>
      callback(tx)
    );

    await extendTransactionDeadlineService(
      7,
      1,
      newDeadline,
      "Scope increased"
    );

    expect(tx.transaction.updateMany).toHaveBeenCalledWith({
      where: { id: 7, deadline: currentDeadline },
      data: { deadline: newDeadline },
    });
    expect(tx.deadlineExtension.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        transactionId: 7,
        previousDeadline: currentDeadline,
        newDeadline,
        extendedById: 1,
      }),
    });
  });

  it("rejects a milestone deadline beyond the transaction deadline", async () => {
    (prisma.milestone.findUnique as jest.Mock).mockResolvedValue({
      id: 12,
      transaction_id: 7,
      deadline: daysFromNow(5),
      status: "ONGOING",
      transaction: {
        id: 7,
        transactionType: "MILESTONE_BASED_PROJECT",
        status: "ONGOING",
        deadline: daysFromNow(10),
      },
    });

    await expect(
      extendMilestoneDeadlineService(7, 12, 1, daysFromNow(11))
    ).rejects.toMatchObject({ name: "PROJECT_DEADLINE_EXCEEDED" });
  });
});
