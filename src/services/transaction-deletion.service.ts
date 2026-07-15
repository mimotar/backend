import { deleteCloudinaryFiles } from "../config/cloudinary.js";
import { GlobalError } from "../middlewares/error/GlobalErrorHandler.js";
import prisma from "../utils/prisma.js";

function legacyAttachmentPublicIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((attachment) => {
    if (
      typeof attachment === "object" &&
      attachment !== null &&
      "fileId" in attachment &&
      typeof attachment.fileId === "string" &&
      attachment.fileId.length > 0
    ) {
      return [attachment.fileId];
    }
    return [];
  });
}

export async function deleteTransactionService(id: number, userId: number) {
  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      milestones: {
        select: {
          files: true,
          images: { select: { publicId: true } },
        },
      },
    },
  });

  if (!transaction) {
    throw new GlobalError(
      "TRANSACTION_NOT_FOUND",
      "Transaction not found",
      404,
      true
    );
  }

  if (transaction.user_id !== userId) {
    throw new GlobalError(
      "FORBIDDEN",
      "Only the transaction creator can delete this transaction",
      403,
      true
    );
  }

  if (transaction.status !== "CREATED") {
    throw new GlobalError(
      "TRANSACTION_NOT_EDITABLE",
      "Only a CREATED transaction can be deleted",
      409,
      true
    );
  }

  const publicIds = [
    ...legacyAttachmentPublicIds(transaction.files),
    ...transaction.milestones.flatMap((milestone) => [
      ...legacyAttachmentPublicIds(milestone.files),
      ...milestone.images.map((image) => image.publicId),
    ]),
  ];

  // Keep the database record when Cloudinary is unavailable so deletion can
  // be retried without permanently orphaning assets.
  await deleteCloudinaryFiles([...new Set(publicIds)]);

  return prisma.transaction.delete({ where: { id } });
}
