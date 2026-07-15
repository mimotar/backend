import {
  deleteCloudinaryFiles,
  uploadToCloudinary,
} from "../config/cloudinary.js";
import { GlobalError } from "../middlewares/error/GlobalErrorHandler.js";
import type { Prisma } from "../generated/prisma/client.js";
import prisma from "../utils/prisma.js";

const MAX_IMAGES_PER_MILESTONE = 5;

const publicImageSelect = {
  id: true,
  url: true,
  createdAt: true,
} as const;

async function cleanupUploadedImages(publicIds: string[]) {
  if (publicIds.length === 0) return;
  try {
    await deleteCloudinaryFiles(publicIds);
  } catch (cleanupError) {
    console.error("Failed to clean up milestone images from Cloudinary:", cleanupError);
  }
}

function removeLegacyImageReference(
  value: unknown,
  publicId: string
): Prisma.InputJsonArray | undefined {
  if (!Array.isArray(value)) return undefined;

  const filtered = value.filter(
    (attachment) =>
      !(
        typeof attachment === "object" &&
        attachment !== null &&
        "fileId" in attachment &&
        attachment.fileId === publicId
      )
  );

  return filtered.length === value.length
    ? undefined
    : (filtered as Prisma.InputJsonArray);
}

async function getEditableMilestone(
  transactionId: number,
  milestoneId: number,
  userId: number
) {
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: {
      transaction: {
        select: { id: true, user_id: true, status: true },
      },
      _count: { select: { images: true } },
    },
  });

  if (!milestone || milestone.transaction_id !== transactionId) {
    throw new GlobalError(
      "MILESTONE_NOT_FOUND",
      "Milestone does not belong to this transaction",
      404,
      true
    );
  }

  if (milestone.transaction.user_id !== userId) {
    throw new GlobalError(
      "FORBIDDEN",
      "Only the transaction creator can manage milestone images",
      403,
      true
    );
  }

  if (milestone.transaction.status !== "CREATED") {
    throw new GlobalError(
      "TRANSACTION_NOT_EDITABLE",
      "Milestone images can only be changed while the transaction is CREATED",
      409,
      true
    );
  }

  return milestone;
}

export async function uploadMilestoneImagesService(
  transactionId: number,
  milestoneId: number,
  userId: number,
  files: Express.Multer.File[]
) {
  if (files.length === 0) {
    throw new GlobalError(
      "IMAGE_REQUIRED",
      "At least one milestone image is required",
      400,
      true
    );
  }

  const milestone = await getEditableMilestone(
    transactionId,
    milestoneId,
    userId
  );

  if (milestone._count.images + files.length > MAX_IMAGES_PER_MILESTONE) {
    throw new GlobalError(
      "IMAGE_LIMIT_EXCEEDED",
      `A milestone can have at most ${MAX_IMAGES_PER_MILESTONE} images`,
      400,
      true
    );
  }

  const folder = `transactions/${transactionId}/milestones/${milestoneId}`;
  const uploaded: Array<{ url: string; publicId: string }> = [];

  try {
    for (const file of files) {
      const result = await uploadToCloudinary(file, folder, "image");
      uploaded.push({ url: result.url, publicId: result.public_id });
    }
  } catch (error) {
    await cleanupUploadedImages(uploaded.map((image) => image.publicId));
    throw error;
  }

  try {
    return await prisma.$transaction(async (tx) =>
      Promise.all(
        uploaded.map((image) =>
          tx.milestoneImage.create({
            data: {
              milestoneId,
              url: image.url,
              publicId: image.publicId,
            },
            select: publicImageSelect,
          })
        )
      )
    );
  } catch (error) {
    await cleanupUploadedImages(uploaded.map((image) => image.publicId));
    throw error;
  }
}

export async function deleteMilestoneImageService(
  transactionId: number,
  milestoneId: number,
  imageId: number,
  userId: number
) {
  const milestone = await getEditableMilestone(
    transactionId,
    milestoneId,
    userId
  );

  const image = await prisma.milestoneImage.findUnique({
    where: { id: imageId },
  });

  if (!image || image.milestoneId !== milestoneId) {
    throw new GlobalError(
      "IMAGE_NOT_FOUND",
      "Milestone image was not found",
      404,
      true
    );
  }

  // Cloudinary deletion is idempotent: a missing asset is safe to treat as
  // already deleted. Keeping the database row until this succeeds makes the
  // operation retryable when Cloudinary is temporarily unavailable.
  await deleteCloudinaryFiles([image.publicId]);
  const legacyFiles = removeLegacyImageReference(
    milestone.files,
    image.publicId
  );

  await prisma.$transaction(async (tx) => {
    await tx.milestoneImage.delete({ where: { id: image.id } });
    if (legacyFiles) {
      await tx.milestone.update({
        where: { id: milestoneId },
        data: { files: legacyFiles },
      });
    }
  });
}
