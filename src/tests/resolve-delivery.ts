import { prisma } from "../config/db.js";
import {
  isAllowedDeliveryMime,
  mapDeliveryFileType,
} from "../config/cloudinary.js";
import { resolveTransactionController } from "../controllers/ticket.controller.js";
import { transactionClosureQueue } from "../config/bullmq.js";
import { sendEmail } from "../services/emailService.js";
import { resolveTransactionService } from "../services/ticket.service.js";
import prismaUser from "../utils/prisma.js";
import { ResolveDeliverySchema } from "../zod/TicketSchema.js";
import { uploadToCloudinary } from "../config/cloudinary.js";

jest.mock("../config/db.js", () => ({
  prisma: {
    transaction: { findUnique: jest.fn(), update: jest.fn() },
    milestone: { update: jest.fn() },
  },
}));

jest.mock("../config/bullmq.js", () => ({
  transactionClosureQueue: { add: jest.fn() },
  TRANSACTION_CLOSURE_DELAY_MS: 48 * 60 * 60 * 1000,
}));

jest.mock("../services/emailService.js", () => ({
  sendEmail: jest.fn(),
  sendEmailWithTemplate: jest.fn(),
}));

jest.mock("../utils/prisma.js", () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn() },
  },
}));

jest.mock("../config/cloudinary.js", () => {
  const actual = jest.requireActual("../config/cloudinary.js");
  return {
    ...actual,
    uploadToCloudinary: jest.fn(),
  };
});

const agreementFiles = [
  {
    fileName: "brief.pdf",
    fileType: "pdf",
    fileUrl: "https://res.cloudinary.com/demo/brief.pdf",
  },
];

const delivery = {
  note: "Source files and a short handoff note.",
  file: {
    fileName: "delivery.zip",
    fileType: "other" as const,
    fileUrl: "https://res.cloudinary.com/demo/delivery.zip",
    fileId: "transactions/deliveries/abc",
  },
};

const baseTransaction = {
  id: 7,
  status: "ONGOING",
  transactionType: "SERVICE",
  creator_email: "buyer@example.com",
  reciever_email: "seller@example.com",
  creator_fullname: "Buyer",
  receiver_fullname: "Seller",
  transactionToken: "tok_abc",
  files: agreementFiles,
  milestones: [],
};

describe("resolve delivery validation", () => {
  it("rejects a missing or empty note", () => {
    expect(ResolveDeliverySchema.safeParse({}).success).toBe(false);
    expect(ResolveDeliverySchema.safeParse({ note: "   " }).success).toBe(false);
  });

  it("rejects a note longer than 2000 characters", () => {
    expect(
      ResolveDeliverySchema.safeParse({ note: "a".repeat(2001) }).success
    ).toBe(false);
  });

  it("accepts a trimmed delivery note", () => {
    const result = ResolveDeliverySchema.safeParse({
      note: "  Ready for review.  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.note).toBe("Ready for review.");
    }
  });

  it("maps allowed delivery mime types", () => {
    expect(isAllowedDeliveryMime("image/png")).toBe(true);
    expect(isAllowedDeliveryMime("application/pdf")).toBe(true);
    expect(isAllowedDeliveryMime("application/zip")).toBe(true);
    expect(
      isAllowedDeliveryMime(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      )
    ).toBe(true);
    expect(isAllowedDeliveryMime("text/plain")).toBe(false);

    expect(mapDeliveryFileType("image/jpeg")).toBe("image");
    expect(mapDeliveryFileType("application/pdf")).toBe("pdf");
    expect(mapDeliveryFileType("application/msword")).toBe("doc");
    expect(mapDeliveryFileType("application/zip")).toBe("other");
  });
});

describe("resolveTransactionService delivery persistence", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (transactionClosureQueue.add as jest.Mock).mockResolvedValue({});
    (sendEmail as jest.Mock).mockResolvedValue(undefined);
  });

  it("stores delivery on the transaction without overwriting agreement files", async () => {
    (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(
      baseTransaction
    );
    (prisma.transaction.update as jest.Mock).mockImplementation(({ data }) =>
      Promise.resolve({
        ...baseTransaction,
        ...data,
        files: agreementFiles,
        status: "PENDING_CLOSURE",
      })
    );

    const result = await resolveTransactionService(
      7,
      "seller@example.com",
      undefined,
      delivery
    );

    expect(prisma.milestone.update).not.toHaveBeenCalled();
    expect(prisma.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 7 },
        data: expect.objectContaining({
          status: "PENDING_CLOSURE",
          delivery_note: delivery.note,
          delivery_file: delivery.file,
        }),
      })
    );
    const updateData = (prisma.transaction.update as jest.Mock).mock.calls[0][0]
      .data;
    expect(updateData).not.toHaveProperty("files");
    expect(result.status).toBe("PENDING_CLOSURE");
    expect(result.files).toEqual(agreementFiles);
    expect(result.delivery_note).toBe(delivery.note);
    expect(result.delivery_file).toEqual(delivery.file);
  });

  it("stores milestone delivery on the milestone, not the parent files", async () => {
    const milestone = {
      id: 21,
      status: "ONGOING",
      files: [{ fileName: "scope.pdf", fileType: "pdf", fileUrl: "https://res.cloudinary.com/demo/scope.pdf" }],
    };
    const milestoneTransaction = {
      ...baseTransaction,
      transactionType: "MILESTONE_BASED_PROJECT",
      milestones: [milestone],
    };
    (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(
      milestoneTransaction
    );
    (prisma.milestone.update as jest.Mock).mockResolvedValue({
      ...milestone,
      status: "PENDING_CLOSURE",
      delivery_note: delivery.note,
      delivery_file: delivery.file,
    });
    (prisma.transaction.update as jest.Mock).mockImplementation(({ data }) =>
      Promise.resolve({
        ...milestoneTransaction,
        ...data,
        files: agreementFiles,
        milestones: [
          {
            ...milestone,
            status: "PENDING_CLOSURE",
            delivery_note: delivery.note,
            delivery_file: delivery.file,
          },
        ],
      })
    );

    await resolveTransactionService(7, "seller@example.com", 21, delivery);

    expect(prisma.milestone.update).toHaveBeenCalledWith({
      where: { id: 21 },
      data: expect.objectContaining({
        status: "PENDING_CLOSURE",
        delivery_note: delivery.note,
        delivery_file: delivery.file,
      }),
    });
    const parentUpdate = (prisma.transaction.update as jest.Mock).mock
      .calls[0][0].data;
    expect(parentUpdate).toEqual({
      status: "PENDING_CLOSURE",
      inspection_completed_at: expect.any(Date),
    });
    expect(parentUpdate).not.toHaveProperty("files");
    expect(parentUpdate).not.toHaveProperty("delivery_note");
    expect(parentUpdate).not.toHaveProperty("delivery_file");
  });

  it("rejects resolve without a delivery note or file", async () => {
    await expect(
      resolveTransactionService(7, "seller@example.com")
    ).rejects.toMatchObject({
      name: "DELIVERY_REQUIRED",
      statusCode: 400,
    });
    expect(prisma.transaction.findUnique).not.toHaveBeenCalled();
    expect(prisma.transaction.update).not.toHaveBeenCalled();
  });
});

describe("resolveTransactionController delivery requirements", () => {
  const mockRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (prismaUser.user.findUnique as jest.Mock).mockResolvedValue({
      id: 2,
      email: "seller@example.com",
    });
  });

  it("returns 400 and does not upload when the note is missing", async () => {
    const req: any = {
      params: { id: "7" },
      user: { id: 2 },
      body: {},
      file: {
        originalname: "delivery.zip",
        mimetype: "application/zip",
        buffer: Buffer.from("zip"),
      },
    };
    const res = mockRes();

    await resolveTransactionController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(uploadToCloudinary).not.toHaveBeenCalled();
    expect(prisma.transaction.update).not.toHaveBeenCalled();
  });

  it("returns 400 and does not upload when the file is missing", async () => {
    const req: any = {
      params: { id: "7" },
      user: { id: 2 },
      body: { note: "Work is ready." },
    };
    const res = mockRes();

    await resolveTransactionController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Delivery file is required",
    });
    expect(uploadToCloudinary).not.toHaveBeenCalled();
    expect(prisma.transaction.update).not.toHaveBeenCalled();
  });

  it("uploads the delivery file and resolves the transaction", async () => {
    (uploadToCloudinary as jest.Mock).mockResolvedValue({
      url: delivery.file.fileUrl,
      public_id: delivery.file.fileId,
    });
    (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(
      baseTransaction
    );
    (prisma.transaction.update as jest.Mock).mockImplementation(({ data }) =>
      Promise.resolve({
        ...baseTransaction,
        ...data,
        files: agreementFiles,
      })
    );

    const file = {
      originalname: "delivery.zip",
      mimetype: "application/zip",
      buffer: Buffer.from("zip"),
    };
    const req: any = {
      params: { id: "7" },
      user: { id: 2 },
      body: { note: delivery.note },
      file,
    };
    const res = mockRes();

    await resolveTransactionController(req, res);

    expect(uploadToCloudinary).toHaveBeenCalledWith(
      file,
      "transactions/deliveries",
      "auto"
    );
    expect(prisma.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "PENDING_CLOSURE",
          delivery_note: delivery.note,
          delivery_file: delivery.file,
        }),
      })
    );
    const updateData = (prisma.transaction.update as jest.Mock).mock.calls[0][0]
      .data;
    expect(updateData).not.toHaveProperty("files");
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
