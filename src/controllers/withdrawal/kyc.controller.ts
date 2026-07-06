import { Request, Response } from "express";
import { premblyMap } from "../../services/withdrawal/data/premblyMap.js";
import {
  PremblyVerificationError,
  WithdrawalService,
} from "../../services/withdrawal/withdrawal.service.js";

type CountryCode = keyof typeof premblyMap;

const getAuthUserId = (req: Request) => {
  const user = req.user as any;
  return user?.id || user?.userId;
};

export const getKycChannelsController = async (req: Request, res: Response) => {
  try {
    const service = new WithdrawalService(0);

    return res.status(200).json({
      message: "KYC channels fetched successfully",
      success: true,
      data: service.getSupportedIdentityChannels(),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch KYC channels",
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const getKycStatusController = async (req: Request, res: Response) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    const service = new WithdrawalService(Number(userId));
    const kyc = await service.getKycStatus();

    return res.status(200).json({
      message: "KYC status fetched successfully",
      success: true,
      data: kyc,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch KYC status",
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const verifyIdentityController = async (req: Request, res: Response) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
    }

    const { country, channel, data } = req.body;
    if (!country || !channel || !data || typeof data !== "object") {
      return res.status(400).json({
        message: "country, channel, and data are required",
        success: false,
      });
    }

    const service = new WithdrawalService(Number(userId));
    const result = await service.verifyIdentity(
      String(country).toUpperCase() as CountryCode,
      String(channel),
      data,
    );

    return res.status(200).json({
      message: result.isVerified
        ? "Identity verified successfully"
        : "Identity verification completed but was not successful",
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof PremblyVerificationError) {
      return res.status(error.statusCode).json({
        message: error.message,
        success: false,
        error: {
          provider: "prembly",
          status: error.details.status,
          statusText: error.details.statusText,
          data: error.details.data,
        },
      });
    }

    const message = error instanceof Error ? error.message : String(error);
    const status =
      message.includes("Unsupported") ||
      message.includes("Missing required") ||
      message.includes("must be a string")
        ? 400
        : 500;

    return res.status(status).json({
      message,
      success: false,
    });
  }
};
