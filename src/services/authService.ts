import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../utils/HashPassword";
import { generateSixDigitString } from "../utils/OTPGenerator";
import { sendEmailWithTemplate } from "./emailService";

const prisma = new PrismaClient();

export const registerUserWithEmail = async (data: any) => {
  const {email, password, firstName, lastName} = data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) throw new Error("Email already registered");

  const hashedPassword = await hashPassword(password);
  const otp = generateSixDigitString();

  sendEmailWithTemplate(email, {firstName, lastName}, 3)

  return prisma.user.create({
    data: { email, password: hashedPassword, verified: false, firstName, lastName, otp },
  });
};

export const generateVerificationToken = (email: string) => {
  return jwt.sign({ email }, process.env.JWT_SECRET!, { expiresIn: "1h" });
};


