import prisma from "../utils/prisma.js";
import { transactionClosureQueue } from "../config/bullmq.js";
import { getTransactionParticipants } from "../utils/payment/getTransactionParticipants.js";
import disputeService from "../services/dispute.service.js";

jest.mock("../utils/prisma.js", () => ({
  __esModule: true,
  default: {
    transaction: { findUnique: jest.fn(), update: jest.fn() },
    milestone: { findUnique: jest.fn(), update: jest.fn() },
    dispute: { findFirst: jest.fn(), create: jest.fn() },
    user: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock("../config/bullmq.js", () => ({
  transactionClosureQueue: { remove: jest.fn() },
}));

jest.mock("../utils/payment/getTransactionParticipants.js", () => ({
  getTransactionParticipants: jest.fn(),
}));

jest.mock("../services/notification/notification.service.js", () => ({
  systemDispatchNotificationByEmail: jest.fn(),
}));

describe("createDispute cancels pending auto-close", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.transaction.findUnique as jest.Mock).mockResolvedValue({
      id: 7,
      status: "PENDING_CLOSURE",
      transactionType: "SERVICE",
    });
    (prisma.dispute.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
    (getTransactionParticipants as jest.Mock).mockResolvedValue({
      buyer: { userId: 1, email: "buyer@example.com" },
      seller: { userId: 2, email: "seller@example.com" },
      creatorId: 1,
    });
    (prisma.$transaction as jest.Mock).mockImplementation((callback) =>
      callback({
        dispute: {
          create: jest.fn().mockResolvedValue({ id: 99, transactionId: 7 }),
        },
        milestone: { update: jest.fn() },
        transaction: { update: jest.fn() },
      })
    );
    (transactionClosureQueue.remove as jest.Mock).mockResolvedValue(1);
  });

  it("opens a formal dispute and cancels the 48-hour closure job", async () => {
    await disputeService.createDispute(
      {
        transactionId: 7,
        reason: "Work does not match the brief",
        description: "We cannot agree on the remaining scope",
        resolutionOption: "REPEAT_SERVICE",
        status: "ongoing",
      },
      1
    );

    expect(transactionClosureQueue.remove).toHaveBeenCalledWith("closure-7");
  });
});
