import { prisma } from "../config/db.js";
import { transactionClosureQueue } from "../config/bullmq.js";
import { sendEmail } from "../services/emailService.js";
import { EmailType } from "../emails/templates/emailTypes.brevo.js";
import {
  rejectResolutionService,
  resolveTransactionService,
} from "../services/ticket.service.js";
import { getTransactionParticipants } from "../utils/payment/getTransactionParticipants.js";
import { RejectDeliverySchema } from "../zod/TicketSchema.js";

jest.mock("../config/db.js", () => ({
  prisma: {
    transaction: { findUnique: jest.fn(), update: jest.fn() },
    milestone: { findUnique: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock("../config/bullmq.js", () => ({
  transactionClosureQueue: { add: jest.fn(), remove: jest.fn() },
  TRANSACTION_CLOSURE_DELAY_MS: 48 * 60 * 60 * 1000,
}));

jest.mock("../services/emailService.js", () => ({
  sendEmail: jest.fn(),
  sendEmailWithTemplate: jest.fn(),
}));

jest.mock("../utils/payment/getTransactionParticipants.js", () => ({
  getTransactionParticipants: jest.fn(),
}));

const deliveryFile = {
  fileName: "delivery.zip",
  fileType: "other" as const,
  fileUrl: "https://res.cloudinary.com/demo/delivery.zip",
  fileId: "transactions/deliveries/abc",
};

const pendingTransaction = {
  id: 7,
  status: "PENDING_CLOSURE",
  transactionType: "SERVICE",
  creator_email: "buyer@example.com",
  reciever_email: "seller@example.com",
  creator_fullname: "Buyer",
  receiver_fullname: "Seller",
  transactionToken: "tok_abc",
  files: [{ fileName: "brief.pdf", fileType: "pdf", fileUrl: "https://res.cloudinary.com/demo/brief.pdf" }],
  delivery_note: "First delivery",
  delivery_file: deliveryFile,
  delivery_submitted_at: new Date("2026-09-18T10:00:00.000Z"),
};

const participants = {
  buyer: { userId: 1, email: "buyer@example.com", fullname: "Buyer" },
  seller: { userId: 2, email: "seller@example.com", fullname: "Seller" },
  creatorId: 1,
};

describe("RejectDeliverySchema", () => {
  it("rejects a missing or empty reason", () => {
    expect(RejectDeliverySchema.safeParse({}).success).toBe(false);
    expect(RejectDeliverySchema.safeParse({ reason: "   " }).success).toBe(false);
  });

  it("accepts a trimmed reason", () => {
    const result = RejectDeliverySchema.safeParse({
      reason: "  Logo files are missing.  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reason).toBe("Logo files are missing.");
    }
  });
});

describe("rejectResolutionService revision loop", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getTransactionParticipants as jest.Mock).mockResolvedValue(participants);
    (transactionClosureQueue.remove as jest.Mock).mockResolvedValue(1);
    (sendEmail as jest.Mock).mockResolvedValue(undefined);
    (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(
      pendingTransaction
    );
    (prisma.$transaction as jest.Mock).mockImplementation((callback) =>
      callback({
        milestone: {
          findUnique: prisma.milestone.findUnique,
          update: prisma.milestone.update,
        },
        transaction: {
          update: prisma.transaction.update,
        },
      })
    );
  });

  it("sends work back to ONGOING with a reason and does not open a dispute", async () => {
    const reason = "The logo files are missing from the zip.";
    (prisma.transaction.update as jest.Mock).mockImplementation(({ data }) =>
      Promise.resolve({
        ...pendingTransaction,
        ...data,
        files: pendingTransaction.files,
        delivery_note: pendingTransaction.delivery_note,
        delivery_file: pendingTransaction.delivery_file,
      })
    );

    const result = await rejectResolutionService(7, 1, reason);

    expect(prisma.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "ONGOING",
          inspection_completed_at: null,
          delivery_rejection_reason: reason,
        }),
      })
    );
    const updateData = (prisma.transaction.update as jest.Mock).mock.calls[0][0]
      .data;
    expect(updateData).not.toHaveProperty("files");
    expect(updateData.status).not.toBe("DISPUTE");
    expect(result.status).toBe("ONGOING");
    expect(result.delivery_file).toEqual(deliveryFile);
    expect(transactionClosureQueue.remove).toHaveBeenCalledWith("closure-7");
    expect(sendEmail).toHaveBeenCalledWith(
      "seller@example.com",
      EmailType.TRANSACTION_DELIVERY_REJECTED_FREELANCER,
      expect.objectContaining({ reason })
    );
    expect(sendEmail).not.toHaveBeenCalledWith(
      expect.anything(),
      EmailType.TRANSACTION_DISPUTED,
      expect.anything()
    );
  });

  it("rejects an empty reason without changing status", async () => {
    await expect(rejectResolutionService(7, 1, "   ")).rejects.toMatchObject({
      name: "DELIVERY_REJECTION_REASON_REQUIRED",
      statusCode: 400,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("forbids the freelancer from sending delivery back", async () => {
    await expect(
      rejectResolutionService(7, 2, "Please redo this.")
    ).rejects.toMatchObject({
      name: "FORBIDDEN",
      statusCode: 403,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("stores milestone rejection on the milestone, not the parent delivery fields", async () => {
    const milestone = {
      id: 21,
      transaction_id: 7,
      status: "PENDING_CLOSURE",
      files: [{ fileName: "scope.pdf" }],
      delivery_note: "Milestone 1 zip",
      delivery_file: deliveryFile,
    };
    (prisma.transaction.findUnique as jest.Mock).mockResolvedValue({
      ...pendingTransaction,
      transactionType: "MILESTONE_BASED_PROJECT",
    });
    (prisma.milestone.findUnique as jest.Mock).mockResolvedValue(milestone);
    (prisma.milestone.update as jest.Mock).mockResolvedValue({
      ...milestone,
      status: "ONGOING",
    });
    (prisma.transaction.update as jest.Mock).mockImplementation(({ data }) =>
      Promise.resolve({
        ...pendingTransaction,
        transactionType: "MILESTONE_BASED_PROJECT",
        ...data,
      })
    );

    await rejectResolutionService(7, 1, "Need source files.", 21);

    expect(prisma.milestone.update).toHaveBeenCalledWith({
      where: { id: 21 },
      data: expect.objectContaining({
        status: "ONGOING",
        delivery_rejection_reason: "Need source files.",
      }),
    });
    const parentUpdate = (prisma.transaction.update as jest.Mock).mock.calls[0][0]
      .data;
    expect(parentUpdate).toEqual({
      status: "ONGOING",
      inspection_completed_at: null,
    });
    expect(transactionClosureQueue.remove).toHaveBeenCalledWith(
      "closure-7-milestone-21"
    );
  });

  it("lets the freelancer resubmit after a rejection and clears the reason", async () => {
    (prisma.transaction.findUnique as jest.Mock).mockResolvedValue({
      ...pendingTransaction,
      status: "ONGOING",
      delivery_rejection_reason: "The logo files are missing from the zip.",
      delivery_rejected_at: new Date(),
    });
    (prisma.transaction.update as jest.Mock).mockImplementation(({ data }) =>
      Promise.resolve({ ...pendingTransaction, ...data })
    );

    await resolveTransactionService(7, "seller@example.com", undefined, {
      note: "Updated zip with logos.",
      file: deliveryFile,
    });

    const updateData = (prisma.transaction.update as jest.Mock).mock.calls[0][0]
      .data;
    expect(updateData.status).toBe("PENDING_CLOSURE");
    expect(updateData.delivery_note).toBe("Updated zip with logos.");
    expect(updateData.delivery_rejection_reason).toBeNull();
    expect(updateData.delivery_rejected_at).toBeNull();
  });

  it("rejects a milestoneId on a non-milestone ticket", async () => {
    await expect(
      rejectResolutionService(7, 1, "Please redo this.", 21)
    ).rejects.toMatchObject({
      name: "INVALID_MILESTONE",
      statusCode: 400,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
