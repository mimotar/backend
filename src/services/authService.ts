// src/services/authService.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const registerUser = async (email: string, password: string) => {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) throw new Error("Email already registered");

  const hashedPassword = await bcrypt.hash(password, 10);
  return prisma.user.create({
    data: { email, password: hashedPassword, verified: false, firstName: "DefaultFirstName", lastName: "DefaultLastName" },
  });
};

export const generateVerificationToken = (email: string) => {
  return jwt.sign({ email }, process.env.JWT_SECRET!, { expiresIn: "1h" });
};