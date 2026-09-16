import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import { env } from "../config/env.js";
import multer from "multer";
import { GlobalError } from "../middlewares/error/GlobalErrorHandler.js";


cloudinary.config({
  cloud_name: env.CLOUD_NAME!,
  api_key: env.API_KEY!,
  api_secret: env.API_SECRET!,
});

export interface CloudinaryUploadResult {
  url: string;
  public_id: string;
}

export const uploadToCloudinary = async (
  file: Express.Multer.File,
  folderName: string = "transactions",
  resourceType: "auto" | "image" = "auto"
): Promise<CloudinaryUploadResult> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: folderName,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result?.secure_url || !result.public_id) {
          return reject(new Error("Cloudinary upload did not return an asset identifier"));
        }
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
        });
      }
    );

    Readable.from(file.buffer).pipe(stream);
  });
};




const storage = multer.memoryStorage();

export const upload = multer({ storage });

export const milestoneImageUpload = multer({
  storage,
  limits: {
    files: 5,
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      callback(
        new GlobalError(
          "INVALID_IMAGE_TYPE",
          "Only image files can be attached to milestones",
          400,
          true
        )
      );
      return;
    }
    callback(null, true);
  },
});

const DELIVERY_ALLOWED_MIME_TYPES = new Set([
  "application/zip",
  "application/x-zip-compressed",
  "application/x-zip",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export type DeliveryFileType = "image" | "pdf" | "doc" | "other";

export type DeliveryFile = {
  fileName: string;
  fileType: DeliveryFileType;
  fileUrl: string;
  fileId: string;
};

export function mapDeliveryFileType(mimetype: string): DeliveryFileType {
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype === "application/pdf") return "pdf";
  if (
    mimetype === "application/msword" ||
    mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "doc";
  }
  return "other";
}

export function isAllowedDeliveryMime(mimetype: string): boolean {
  return (
    mimetype.startsWith("image/") || DELIVERY_ALLOWED_MIME_TYPES.has(mimetype)
  );
}

export const deliveryUpload = multer({
  storage,
  limits: {
    files: 1,
    fileSize: 25 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (!isAllowedDeliveryMime(file.mimetype)) {
      callback(
        new GlobalError(
          "INVALID_DELIVERY_FILE_TYPE",
          "Delivery file must be a zip, PDF, Word document, or image",
          400,
          true
        )
      );
      return;
    }
    callback(null, true);
  },
});



// Deleting files with their ids
export async function deleteCloudinaryFiles(publicIds: string[]) {
  const resourceTypes = ["image", "raw", "video"] as const;
  const deletions = publicIds.flatMap((id) =>
    resourceTypes.map((resource_type) =>
      cloudinary.uploader.destroy(id, { resource_type })
    )
  );
  await Promise.all(deletions);
}
