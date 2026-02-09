
import { generateSixDigitString } from "../../utils/OTPGenerator.js";
import prisma from "../../utils/prisma.js";
import { sendEmailWithTemplate } from "../emailService.js";


export const resendOTPToEmail = async (email: string): Promise<{
  status: number;
  message: string;
  success: boolean;
}> => {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return {
        status: 404,
        message: "User not found",
        success: false
      };
    }

    const otp = generateSixDigitString();
    await prisma.user.update({
      where: { email },
      data: {
        otp,
        otpCreatedAt: new Date(),
      },
    });

    await sendEmailWithTemplate(email, { otp, firstName: user.firstName }, 3);

    return {
      status: 200,
      message: "OTP resent successfully",
      success: true
    };

  } catch (error) {
    console.error("Error in verifying email:", error);
    return {
      status: 500,
      message: "Failed to send OTP to email",
      success: false
    };
  }
};