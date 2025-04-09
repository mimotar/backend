import prisma from "../../utils/prisma";
import { sendEmailWithTemplate } from "../emailService";


export const resendOTPToEmail = async (email: string, firstName: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });
    if (!user) {
      return {
        status: 404,
        message: "User not found",
      };
    } else {
      const otp = generateSixDigitString();
      await prisma.user.update({
        where: {
          email: email,
        },
        data: {
          otp: otp,
          otpCreatedAt: new Date(),
        },
      });
      sendEmailWithTemplate(email, { otp, firstName }, 3);
    }
  } catch (error) {
    console.error("Error in verifying email:", error);
    return {
      status: 500,
      message: "Failed to send OTP to email",
    };
  }
};
