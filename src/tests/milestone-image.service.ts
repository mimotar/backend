import {
  deleteCloudinaryFiles,
  uploadToCloudinary,
} from "../config/cloudinary.js";
import {
  deleteMilestoneImageService,
  uploadMilestoneImagesService,
} from "../services/milestone-image.service.js";
import prisma from "../utils/prisma.js";

jest.mock("../config/cloudinary.js", () => ({
  uploadToCloudinary: jest.fn(),
  deleteCloudinaryFiles: jest.fn(),
}));

jest.mock("../utils/prisma.js", () => ({
  __esModule: true,
  default: {
    milestone: { findUnique: jest.fn() },
    milestoneImage: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const file = {
  originalname: "design.png",
  mimetype: "image/png",
  buffer: Buffer.from("image"),
} as Express.Multer.File;

const editableMilestone = {
  id: 12,
  transaction_id: 7,
  transaction: { id: 7, user_id: 1, status: "CREATED" },
  _count: { images: 0 },
  files: [],
};

describe("milestone image service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.milestone.findUnique as jest.Mock).mockResolvedValue(
      editableMilestone
    );
    (deleteCloudinaryFiles as jest.Mock).mockResolvedValue(undefined);
  });

  it("uploads images, stores private public IDs, and returns public fields", async () => {
    (uploadToCloudinary as jest.Mock).mockResolvedValue({
      url: "https://res.cloudinary.com/test/image.png",
      public_id: "transactions/7/milestones/12/image",
    });

    const create = jest.fn().mockResolvedValue({
      id: 25,
      url: "https://res.cloudinary.com/test/image.png",
      createdAt: new Date("2026-07-15T09:00:00.000Z"),
    });
    (prisma.$transaction as jest.Mock).mockImplementation((callback) =>
      callback({ milestoneImage: { create } })
    );

    const result = await uploadMilestoneImagesService(7, 12, 1, [file]);

    expect(uploadToCloudinary).toHaveBeenCalledWith(
      file,
      "transactions/7/milestones/12",
      "image"
    );
    expect(create).toHaveBeenCalledWith({
      data: {
        milestoneId: 12,
        url: "https://res.cloudinary.com/test/image.png",
        publicId: "transactions/7/milestones/12/image",
      },
      select: { id: true, url: true, createdAt: true },
    });
    expect(result[0]).not.toHaveProperty("publicId");
  });

  it("removes uploaded Cloudinary assets if the database write fails", async () => {
    (uploadToCloudinary as jest.Mock).mockResolvedValue({
      url: "https://res.cloudinary.com/test/image.png",
      public_id: "transactions/7/milestones/12/image",
    });
    (prisma.$transaction as jest.Mock).mockRejectedValue(
      new Error("database unavailable")
    );

    await expect(
      uploadMilestoneImagesService(7, 12, 1, [file])
    ).rejects.toThrow("database unavailable");
    expect(deleteCloudinaryFiles).toHaveBeenCalledWith([
      "transactions/7/milestones/12/image",
    ]);
  });

  it("rejects image changes by anyone except the creator", async () => {
    await expect(
      uploadMilestoneImagesService(7, 12, 2, [file])
    ).rejects.toMatchObject({ name: "FORBIDDEN", statusCode: 403 });
    expect(uploadToCloudinary).not.toHaveBeenCalled();
  });

  it("rejects image changes after the transaction leaves CREATED", async () => {
    (prisma.milestone.findUnique as jest.Mock).mockResolvedValue({
      ...editableMilestone,
      transaction: { ...editableMilestone.transaction, status: "APPROVED" },
    });

    await expect(
      uploadMilestoneImagesService(7, 12, 1, [file])
    ).rejects.toMatchObject({
      name: "TRANSACTION_NOT_EDITABLE",
      statusCode: 409,
    });
  });

  it("deletes from Cloudinary before removing the database record", async () => {
    (prisma.milestoneImage.findUnique as jest.Mock).mockResolvedValue({
      id: 25,
      milestoneId: 12,
      publicId: "transactions/7/milestones/12/image",
    });
    const removeImage = jest.fn().mockResolvedValue({ id: 25 });
    (prisma.$transaction as jest.Mock).mockImplementation((callback) =>
      callback({
        milestoneImage: { delete: removeImage },
        milestone: { update: jest.fn() },
      })
    );

    await deleteMilestoneImageService(7, 12, 25, 1);

    expect(deleteCloudinaryFiles).toHaveBeenCalledWith([
      "transactions/7/milestones/12/image",
    ]);
    expect(removeImage).toHaveBeenCalledWith({
      where: { id: 25 },
    });
    expect(
      (deleteCloudinaryFiles as jest.Mock).mock.invocationCallOrder[0]
    ).toBeLessThan(
      removeImage.mock.invocationCallOrder[0]
    );
  });
});
