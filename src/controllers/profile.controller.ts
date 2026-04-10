import { Request, Response, NextFunction } from "express";
import { getProfileService, updateProfileService, uploadProfileImageService, UpdateProfileDto } from "../services/profile/profile.service.js";

export const getProfileController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user as any;
    const userId = user?.id || user?.userId;

    if (!userId) {
      res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
      return;
    }

    const profile = await getProfileService(Number(userId));
    res.status(200).json({
      message: "Profile retrieved successfully",
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error("Error in getProfileController:", error);
    res.status(500).json({
      message: error instanceof Error ? error.message : "Internal server error",
      success: false,
    });
  }
};

export const updateProfileController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user as any;
    const userId = user?.id || user?.userId;

    if (!userId) {
      res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
      return;
    }

    const updateData: UpdateProfileDto = {
      fullName: req.body.fullName,
      phone_no: req.body.phone_no,
      address: req.body.address,
      city: req.body.city ?? null,
      country: req.body.country ?? null,
      postal_code: req.body.postal_code ?? null,
      id_number: req.body.id_number ?? null,
    };

    const updatedProfile = await updateProfileService(Number(userId), updateData);
    
    res.status(200).json({
      message: "Profile updated successfully",
      success: true,
      data: updatedProfile,
    });
  } catch (error) {
    console.error("Error in updateProfileController:", error);
    res.status(500).json({
      message: error instanceof Error ? error.message : "Internal server error",
      success: false,
    });
  }
};

export const uploadAvatarController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user as any;
    const userId = user?.id || user?.userId;

    if (!userId) {
      res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        message: "No image file provided",
        success: false,
      });
      return;
    }

    const result = await uploadProfileImageService(Number(userId), req.file);

    res.status(200).json({
      message: "Avatar uploaded successfully",
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error in uploadAvatarController:", error);
    res.status(500).json({
      message: error instanceof Error ? error.message : "Internal server error",
      success: false,
    });
  }
};
