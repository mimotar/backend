import prisma from "../../utils/prisma";
import { comparePassword } from "../../utils/comparePassword";
import { createToken } from "../../utils/createToken";

export const loginWithEmailService = async (email: string, password: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      return {
        status: 404,
        message: "User not found",
      };
    }
    const isEmailVerified = user.verified;
    if (!isEmailVerified) {
      return {
        status: 401,
        message: "Email not verified, verify email before login",
      };
    }
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return {
        status: 401,
        message: "Invalid password",
      };
    }

    const token = await createToken(60 * 60, {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    });
    return {
        status: 200,
        message: "Login successful",
        token,
        success: true,
        user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            verified: user.verified,
        }}
  } catch (error) {
    console.error("Error in login with email:", error);
    return {
      status: 500,
      message: "Server error",
    };
  }
};
