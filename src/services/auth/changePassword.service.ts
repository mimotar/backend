import { EmailType } from "../../emails/templates/emailTypes.brevo.js";
import { GlobalError } from "../../middlewares/error/GlobalErrorHandler.js";
import { comparePassword } from "../../utils/comparePassword.js";
import { generateSixDigitString } from "../../utils/OTPGenerator.js";
import { hashPassword } from "../../utils/HashPassword.js";
import prisma from "../../utils/prisma.js";
import type { ChangePasswordRequest } from "../../zod/changePassword.schema.js";
import { sendEmail } from "../emailService.js";

const CHANGE_PASSWORD_OTP_EXPIRY_MS = 15 * 60 * 1000;

export async function requestPasswordChange(
  userId: number,
  data: ChangePasswordRequest
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, password: true },
  });

  if (!user) {
    throw new GlobalError(
      "UnauthorizedError",
      "The authenticated user account no longer exists",
      401,
      true
    );
  }

  if (!user.password) {
    throw new GlobalError(
      "AccountInvalid",
      "OAuth-only accounts do not have a password to change",
      400,
      true
    );
  }

  const currentPasswordMatches = await comparePassword(
    data.currentPassword,
    user.password
  );
  if (!currentPasswordMatches) {
    throw new GlobalError(
      "InvalidCredentials",
      "The current password you entered is incorrect",
      400,
      true
    );
  }

  const reusesCurrentPassword = await comparePassword(
    data.newPassword,
    user.password
  );
  if (reusesCurrentPassword) {
    throw new GlobalError(
      "SamePasswordError",
      "New password cannot match the current password",
      400,
      true
    );
  }

  const [pendingPasswordHash, otp] = await Promise.all([
    hashPassword(data.newPassword),
    Promise.resolve(generateSixDigitString()),
  ]);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      otp,
      otpCreatedAt: new Date(),
      otpPurpose: "CHANGE_PASSWORD",
      pendingPasswordHash,
    },
  });

  const emailResult = await sendEmail(
    user.email,
    EmailType.CHANGE_PASSWORD_OTP,
    { otp }
  );

  if (!emailResult.success) {
    await prisma.user.updateMany({
      where: { id: user.id, otp, otpPurpose: "CHANGE_PASSWORD" },
      data: {
        otp: null,
        otpCreatedAt: null,
        otpPurpose: null,
        pendingPasswordHash: null,
      },
    });

    throw new GlobalError(
      "EmailDeliveryError",
      "Unable to send the password change OTP. Please try again",
      502,
      true
    );
  }
}

export async function completePasswordChange(
  userId: number,
  otp: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      otp: true,
      otpCreatedAt: true,
      otpPurpose: true,
      pendingPasswordHash: true,
    },
  });

  if (!user) {
    throw new GlobalError(
      "UnauthorizedError",
      "The authenticated user account no longer exists",
      401,
      true
    );
  }

  if (
    user.otpPurpose !== "CHANGE_PASSWORD" ||
    !user.otp ||
    !user.otpCreatedAt ||
    !user.pendingPasswordHash
  ) {
    throw new GlobalError(
      "PasswordChangeNotRequested",
      "No active password change request was found",
      400,
      true
    );
  }

  if (Date.now() - user.otpCreatedAt.getTime() > CHANGE_PASSWORD_OTP_EXPIRY_MS) {
    await clearPasswordChangeRequest(user.id);
    throw new GlobalError(
      "ExpiredOTP",
      "The OTP has expired. Please request a new one",
      400,
      true
    );
  }

  if (user.otp !== otp) {
    throw new GlobalError(
      "InvalidOTP",
      "The OTP provided is incorrect",
      400,
      true
    );
  }

  const result = await prisma.user.updateMany({
    where: {
      id: user.id,
      otp,
      otpPurpose: "CHANGE_PASSWORD",
      pendingPasswordHash: user.pendingPasswordHash,
    },
    data: {
      password: user.pendingPasswordHash,
      otp: null,
      otpCreatedAt: null,
      otpPurpose: null,
      pendingPasswordHash: null,
    },
  });

  if (result.count !== 1) {
    throw new GlobalError(
      "InvalidOTP",
      "The OTP is invalid or has already been used",
      400,
      true
    );
  }
}

async function clearPasswordChangeRequest(userId: number): Promise<void> {
  await prisma.user.updateMany({
    where: { id: userId, otpPurpose: "CHANGE_PASSWORD" },
    data: {
      otp: null,
      otpCreatedAt: null,
      otpPurpose: null,
      pendingPasswordHash: null,
    },
  });
}
