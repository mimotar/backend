import { PrismaClient } from '@prisma/client';
import {env} from './env'; 

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: env.DATABASE_URL, 
    },
  },
});

async function connectDB() {
  try {
    await prisma.$connect();
    console.log('Connected to remote PostgreSQL database');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

export { prisma, connectDB };
