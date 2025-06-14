import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import { env } from "../config/env";
import multer from "multer";


cloudinary.config({
  cloud_name: env.CLOUD_NAME!,
  api_key: env.API_KEY!,
  api_secret: env.API_SECRET!,
});

export const uploadToCloudinary = async (file: Express.Multer.File) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "transactions",
        resource_type: "auto",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result?.secure_url,
          public_id: result?.public_id,
        });
      }
    );

    Readable.from(file.buffer).pipe(stream);
  });
};




const storage = multer.memoryStorage();

export const upload = multer({ storage });



// Deleting files with their ids
export async function deleteCloudinaryFiles(publicIds: string[]) {
  const deletions = publicIds.map(id => 
    cloudinary.uploader.destroy(id)
  );
  await Promise.all(deletions);
}
