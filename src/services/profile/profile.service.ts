import prisma from "../../utils/prisma.js";

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
    city: user.profile?.city || null,
    country: user.profile?.country || null,
    postal_code: user.profile?.postal_code || null,
    id_number: user.profile?.id_number || null,
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
    city: data.city !== undefined ? data.city : user.profile?.city,
    country: data.country !== undefined ? data.country : user.profile?.country,
    postal_code: data.postal_code !== undefined ? data.postal_code : user.profile?.postal_code,
    id_number: data.id_number !== undefined ? data.id_number : user.profile?.id_number,
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
