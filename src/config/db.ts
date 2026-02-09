import 'dotenv/config';
// import { PrismaClient } from '@prisma/client'
// import { PrismaClient } from '../../prisma/schema/generated/prisma/client';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

export const prisma = new PrismaClient({ adapter });

async function connectDB() {
  try {
    await prisma.$connect();
    console.log("Connected to remote PostgreSQL database");
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
}

export { connectDB };
