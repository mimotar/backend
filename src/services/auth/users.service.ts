import { Prisma } from "@prisma/client";
import { hashPassword } from "../../utils/HashPassword";
import { generateSixDigitString } from "../../utils/OTPGenerator";
import prisma from "../../utils/prisma";
import { sendEmailWithTemplate } from "../emailService";




export const registerUserWithEmailService = async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => {
    const { email, password, firstName, lastName } = data;
  
    try {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return {
          status: 409,
          message: "Email already registered",
          data: null,
          success: false
        };
      }
  
      const hashedPassword = await hashPassword(password);
      
      const otp = generateSixDigitString();
      const otpCreatedAt = new Date();
  
      await sendEmailWithTemplate(email, { firstName, lastName, otp }, 3);
  
      const user = await prisma.user.create({
        data: { 
          email, 
          password: hashedPassword, 
          verified: false, 
          firstName, 
          lastName, 
          otp,
          otpCreatedAt,
        },
        select: { 
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          createdAt: true
        }
      });
  
      return {
        status: 201,
        message: "Registration successful. Please check your email for verification OTP.",
        data: user,
        success: true
      };
  
    } catch (error) {
      console.error("Registration error:", error);
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        return {
          status: 500,
          message: "Database error occurred during registration",
          data: null,
          success: false
        };
      }
  
      return {
        status: 500,
        message: "An unexpected error occurred",
        data: null,
        success: false
      };
    }
  };



export const getALlUsersService = async () => {
    try {
        const users = await prisma.user.findMany({
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            verified: true,
            createdAt: true,
        },
        });
        return {
        status: 200,
        message: "Users fetched successfully",
        users,
        };
    } catch (error) {
        console.error("Error in fetching all users:", error);
        return {
        status: 500,
        message: "Server error",
        };
    }
}


export const deleteAUserService = async (email: string) => {
    try {
        const user = await prisma.user.delete({
            where: {
                email: email
            }
        })
        return {
            status: 200,
            message: "User deleted successfully",
            user
        }
    } catch (error) {
        console.error("Error in deleting a user:", error);
        return {
            status: 500,
            message: "Server error",
        };
    }
}