import prisma from "../../utils/prisma.js";
import { generateSixDigitString } from "../../utils/OTPGenerator.js";
import {
  premblySmsService,
  normalizePhoneNumber,
  maskPhoneNumber,
} from "../sms/premblySms.service.js";
import { getProfileService } from "./profile.service.js";

const OTP_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;

export interface PhoneVerificationResult {
  status: number;
  success: boolean;
  message: string;
  data?: unknown;
}

export async function sendPhoneOtpService(
  userId: number,
  targetPhone?: string
): Promise<PhoneVerificationResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!user) {
    return {
      status: 404,
      success: false,
      message: "User not found",
    };
  }

  // Determine phone number to verify
  const rawPhone = targetPhone?.trim() || user.profile?.phone_no?.trim();

  if (!rawPhone) {
    return {
      status: 400,
      success: false,
      message:
        "No phone number provided. Please supply a phone number to verify.",
    };
  }

  // Basic validation of phone number
  const cleaned = rawPhone.replace(/[\s\-\(\)]/g, "");
  if (!/^\+?\d{7,15}$/.test(cleaned)) {
    return {
      status: 400,
      success: false,
      message:
        "Invalid phone number format. Please provide a valid phone number.",
    };
  }

  const normalizedPhone = normalizePhoneNumber(rawPhone);

  // Check cooldown if an OTP was recently sent
  if (user.profile?.phoneOtpCreatedAt) {
    const elapsedSeconds =
      (Date.now() - new Date(user.profile.phoneOtpCreatedAt).getTime()) / 1000;
    if (elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
      const waitRemaining = Math.ceil(
        RESEND_COOLDOWN_SECONDS - elapsedSeconds
      );
      return {
        status: 429,
        success: false,
        message: `Please wait ${waitRemaining} seconds before requesting a new OTP.`,
      };
    }
  }

  const otp = generateSixDigitString();
  const now = new Date();

  // Save OTP & pending phone to Profile
  if (user.profile) {
    await prisma.profile.update({
      where: { user_id: userId },
      data: {
        phoneOtp: otp,
        phoneOtpCreatedAt: now,
        pendingPhone: normalizedPhone,
      },
    });
  } else {
    await prisma.profile.create({
      data: {
        user_id: userId,
        phoneOtp: otp,
        phoneOtpCreatedAt: now,
        pendingPhone: normalizedPhone,
        phone_no: normalizedPhone,
        phoneVerified: false,
      },
    });
  }

  // Dispatch SMS via Prembly
  const smsMessage = `Your Mimotar phone verification code is: ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`;
  const smsResult = await premblySmsService.sendSms(
    normalizedPhone,
    smsMessage
  );

  if (!smsResult.success) {
    return {
      status: 502,
      success: false,
      message:
        smsResult.message || "Failed to deliver SMS verification code via Prembly.",
    };
  }

  return {
    status: 200,
    success: true,
    message: `Verification code sent successfully to ${maskPhoneNumber(
      normalizedPhone
    )}.`,
    data: {
      phone: maskPhoneNumber(normalizedPhone),
      expiresInMinutes: OTP_EXPIRY_MINUTES,
    },
  };
}

export async function verifyPhoneOtpService(
  userId: number,
  otp: string
): Promise<PhoneVerificationResult> {
  if (!otp || typeof otp !== "string" || otp.trim().length !== 6) {
    return {
      status: 400,
      success: false,
      message: "A valid 6-digit OTP code is required.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!user) {
    return {
      status: 404,
      success: false,
      message: "User not found",
    };
  }

  const profile = user.profile;

  if (!profile || !profile.phoneOtp || !profile.phoneOtpCreatedAt) {
    return {
      status: 400,
      success: false,
      message:
        "No active phone verification code found. Please request a new code.",
    };
  }

  // Check expiration
  const expiryTime = new Date(profile.phoneOtpCreatedAt);
  expiryTime.setMinutes(expiryTime.getMinutes() + OTP_EXPIRY_MINUTES);

  if (new Date() > expiryTime) {
    // Clear expired OTP
    await prisma.profile.update({
      where: { user_id: userId },
      data: {
        phoneOtp: null,
        phoneOtpCreatedAt: null,
      },
    });

    return {
      status: 400,
      success: false,
      message: "Verification code has expired. Please request a new one.",
    };
  }

  // Verify OTP match
  if (profile.phoneOtp !== otp.trim()) {
    return {
      status: 400,
      success: false,
      message: "Invalid verification code.",
    };
  }

  // Successful verification
  const finalPhone = profile.pendingPhone || profile.phone_no;

  await prisma.profile.update({
    where: { user_id: userId },
    data: {
      phoneVerified: true,
      phone_no: finalPhone,
      phoneOtp: null,
      phoneOtpCreatedAt: null,
      pendingPhone: null,
    },
  });

  const updatedProfile = await getProfileService(userId);

  return {
    status: 200,
    success: true,
    message: "Phone number verified successfully.",
    data: updatedProfile,
  };
}
