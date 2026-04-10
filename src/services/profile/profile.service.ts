import prisma from "../../utils/prisma.js";
import { uploadToCloudinary } from "../../config/cloudinary.js";

export interface UpdateProfileDto {
  fullName?: string;
  phone_no?: string;
  address?: string;
  city?: string;
  country?: string;
  postal_code?: string;
  id_number?: string;
}

export const getProfileService = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const fullName = `${user.firstName} ${user.lastName}`.trim();

  return {
    fullName,
    email: user.email,
    phone_no: user.profile?.phone_no || null,
    address: user.profile?.address || null,
    avatar: user.profile?.avatar || null,
  };
};

export const updateProfileService = async (userId: number, data: UpdateProfileDto) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Handle fullName update
  if (data.fullName !== undefined) {
    const parts = data.fullName.trim().split(" ");
    const firstName = parts[0];
    const lastName = parts.slice(1).join(" ");
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName: lastName || "", // Fallback if no last name is provided
      },
    });
  }

  // Clean undefined data for profile
  const profileData = {
    phone_no: data.phone_no !== undefined ? data.phone_no : user.profile?.phone_no,
    address: data.address !== undefined ? data.address : user.profile?.address,
  };

  if (user.profile) {
    await prisma.profile.update({
      where: { user_id: userId },
      data: profileData,
    });
  } else {
    await prisma.profile.create({
      data: {
        user_id: userId,
        ...profileData,
      },
    });
  }

  return getProfileService(userId);
};

export const uploadProfileImageService = async (userId: number, file: Express.Multer.File) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Delete existing avatar from cloudinary if it exists
  // Upload new image
  const uploadResult = await uploadToCloudinary(file, "profiles") as { url: string; public_id: string };

  // Update or create profile
  if (user.profile) {
    await prisma.profile.update({
      where: { user_id: userId },
      data: {
        avatar: uploadResult.url,
      },
    });
  } else {
    await prisma.profile.create({
      data: {
        user_id: userId,
        avatar: uploadResult.url,
      },
    });
  }

  return {
    avatar: uploadResult.url,
  };
};
