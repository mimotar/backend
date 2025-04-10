import { Request, Response, NextFunction } from "express";
import { prisma } from "../../config/db";
import bcrypt from "bcrypt";


export const createUser = async (req: Request, res: Response, NextFunction: NextFunction) => {
    const { firstName, lastName, email, password } = req.body;
    
    try {
        // Validate required fields
        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const existingUser = await prisma.user.findUnique({
            where: {
                email,
            },
        });
        
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }
        
        const user = await prisma.user.create({
            data: {
                firstName,
                lastName,
                email,
                password: hashedPassword,
            }
        });
        
       
        const { password: _, ...userWithoutPassword } = user;
        return res.status(201).json(userWithoutPassword);
    } catch(error) {
        console.error("Error creating user:", error);
        return NextFunction(error);
    }
};