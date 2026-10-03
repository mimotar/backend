import { ReviseTransactionSchema } from "../zod/TicketSchema.js";
import { reviseTransactionService } from "../services/transaction-change-request.service.js";
import prisma from "../utils/prisma.js";
import { systemDispatchNotificationByEmail } from "../services/notification/notification.service.js";
import { checkAndExpireAllTransactionService } from "../services/ticket.service.js";

jest.mock("../services/notification/notification.service.js", () => ({
  systemDispatchNotificationByEmail: jest.fn(),
}));

jest.mock("../services/ticket.service.js", () => ({
  checkAndExpireAllTransactionService: jest.fn(),
}));

jest.mock("../utils/prisma.js", () => ({
  __esModule: true,
  default: {
    transaction: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    milestone: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe("ReviseTransactionSchema", () => {
  it("defaults resubmit to false when body is empty", () => {
    const parsed = ReviseTransactionSchema.safeParse({});
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual({ resubmit: false });
    }
  });

  it("aliases description to transaction_description if frontend sends description", () => {
    const parsed = ReviseTransactionSchema.safeParse({
      title: "New Title",
      description: "My new description",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.title).toBe("New Title");
      expect(parsed.data.transaction_description).toBe("My new description");
    }
  });

  it("parses valid fields correctly with resubmit flag", () => {
    const parsed = ReviseTransactionSchema.safeParse({
      title: "New Title",
      transaction_description: "My new description",
      amount: "5000",
      resubmit: "true",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.title).toBe("New Title");
      expect(parsed.data.transaction_description).toBe("My new description");
      expect(parsed.data.amount).toBe(5000);
      expect(parsed.data.resubmit).toBe(true);
    }
  });

  it("coerces and normalizes fileType in files array", () => {
    const parsed = ReviseTransactionSchema.safeParse({
      files: [
        {
          fileName: "doc.pdf",
          fileType: "application/pdf",
          fileUrl: "https://example.com/doc.pdf",
        },
      ],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.files?.[0].fileType).toBe("pdf");
    }
  });
});

describe("reviseTransactionService", () => {
  const baseTransaction = {
    id: 10,
    user_id: 1,
    creator_email: "creator@example.com",
    reciever_email: "receiver@example.com",
    status: "CHANGES_REQUESTED",
    transactionType: "MILESTONE_BASED_PROJECT",
    amount: 50000,
    deadline: new Date(Date.now() + 86400000 * 10),
    title: "Old Title",
    transaction_description: "Old Description",
    milestones: [
      {
        id: 1,
        sequence: 1,
        name: "Old M1",
        amount: 50000,
        deadline: new Date(Date.now() + 86400000 * 5),
        files: [],
        images: [],
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(baseTransaction);
  });

  it("recalculates total amount from milestones when revising milestone project", async () => {
    const newDeadline = new Date(Date.now() + 86400000 * 4);
    const mockTx = {
      milestone: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      transaction: {
        update: jest.fn().mockResolvedValue({
          ...baseTransaction,
          amount: 80000,
          title: "Updated Title",
        }),
      },
    };

    (prisma.$transaction as jest.Mock).mockImplementation((cb: any) => cb(mockTx));

    const result = await reviseTransactionService(
      10,
      1,
      "creator@example.com",
      {
        title: "Updated Title",
        milestones: [
          { name: "M1", amount: 30000, deadline: newDeadline },
          { name: "M2", amount: 50000, deadline: newDeadline },
        ],
      } as any
    );

    expect(mockTx.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Updated Title",
          amount: 80000, // 30000 + 50000
        }),
      })
    );
    expect(result.amount).toBe(80000);
    expect(systemDispatchNotificationByEmail).not.toHaveBeenCalled();
  });

  it("atomically resubmits when resubmit flag is true", async () => {
    const mockTx = {
      milestone: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      transaction: {
        update: jest.fn().mockResolvedValue({
          ...baseTransaction,
          title: "Final Title",
          status: "CREATED",
          revision_count: 1,
        }),
      },
    };

    (prisma.$transaction as jest.Mock).mockImplementation((cb: any) => cb(mockTx));

    const result = await reviseTransactionService(
      10,
      1,
      "creator@example.com",
      {
        title: "Final Title",
        resubmit: true,
      } as any
    );

    expect(mockTx.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "CREATED",
          revision_count: { increment: 1 },
        }),
      })
    );
    expect(systemDispatchNotificationByEmail).toHaveBeenCalledWith(
      "receiver@example.com",
      "Transaction Resubmitted",
      expect.stringContaining("submitted it for your approval again")
    );
  });
});
