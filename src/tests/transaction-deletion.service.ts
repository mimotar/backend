import { deleteCloudinaryFiles } from "../config/cloudinary.js";
import { deleteTransactionService } from "../services/transaction-deletion.service.js";
import prisma from "../utils/prisma.js";

jest.mock("../config/cloudinary.js", () => ({
  deleteCloudinaryFiles: jest.fn(),
}));

jest.mock("../utils/prisma.js", () => ({
  __esModule: true,
  default: {
    transaction: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const transaction = {
  id: 7,
  user_id: 1,
  status: "CREATED",
  files: [
    { fileUrl: "https://cloudinary.test/agreement", fileId: "agreement" },
  ],
  milestones: [
    {
      files: [
        { fileUrl: "https://cloudinary.test/legacy", fileId: "legacy" },
      ],
      images: [{ publicId: "milestone-image" }],
    },
  ],
};

describe("transaction deletion service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(transaction);
    (prisma.transaction.delete as jest.Mock).mockResolvedValue({ id: 7 });
    (deleteCloudinaryFiles as jest.Mock).mockResolvedValue(undefined);
  });

  it("deletes Cloudinary assets before deleting a creator-owned CREATED transaction", async () => {
    await deleteTransactionService(7, 1);

    expect(deleteCloudinaryFiles).toHaveBeenCalledWith([
      "agreement",
      "legacy",
      "milestone-image",
    ]);
    expect(prisma.transaction.delete).toHaveBeenCalledWith({ where: { id: 7 } });
    expect(
      (deleteCloudinaryFiles as jest.Mock).mock.invocationCallOrder[0]
    ).toBeLessThan(
      (prisma.transaction.delete as jest.Mock).mock.invocationCallOrder[0]
    );
  });

  it("rejects deletion by someone other than the transaction creator", async () => {
    await expect(deleteTransactionService(7, 2)).rejects.toMatchObject({
      name: "FORBIDDEN",
      statusCode: 403,
    });
    expect(deleteCloudinaryFiles).not.toHaveBeenCalled();
    expect(prisma.transaction.delete).not.toHaveBeenCalled();
  });

  it("rejects deletion after the transaction leaves CREATED", async () => {
    (prisma.transaction.findUnique as jest.Mock).mockResolvedValue({
      ...transaction,
      status: "APPROVED",
    });

    await expect(deleteTransactionService(7, 1)).rejects.toMatchObject({
      name: "TRANSACTION_NOT_EDITABLE",
      statusCode: 409,
    });
    expect(deleteCloudinaryFiles).not.toHaveBeenCalled();
  });

  it("preserves the database record if Cloudinary cleanup fails", async () => {
    (deleteCloudinaryFiles as jest.Mock).mockRejectedValue(
      new Error("Cloudinary unavailable")
    );

    await expect(deleteTransactionService(7, 1)).rejects.toThrow(
      "Cloudinary unavailable"
    );
    expect(prisma.transaction.delete).not.toHaveBeenCalled();
  });
});
