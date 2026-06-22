import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

// PrismaPg adapter configuration with connection string
// The adapter manages its own connection pool internally
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

export const prisma = new PrismaClient({
  adapter,
  transactionOptions: {
    maxWait: 15000, // Increased from 10000ms - time to wait for a connection slot
    timeout: 30000, // Time allowed for transaction to complete
  },
});

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
