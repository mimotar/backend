import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { execSync } from 'child_process';
import dotenv from "dotenv";
dotenv.config();

export const testDB = async () => {

    const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
    const schemaName = `test_${TEST_DATABASE_URL?.split('/').pop()}`;
    
    const adapter = new PrismaPg({
        connectionString: TEST_DATABASE_URL!,
    });
    const prisma = new PrismaClient({ adapter });
  
    try {
        await prisma.$executeRawUnsafe(`CREATE SCHEMA ${schemaName}`);
        execSync(`npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss`, {
            env: {
              ...process.env,
              DATABASE_URL: prisma.$connect.constructor.prototype.url
            }
          });
          return { prisma, schemaName };
    } catch (error) {
        console.error('Error setting up test database:', error);
    throw error;
    }
}


export const teardownTestDatabase = async (prisma: PrismaClient, schemaName: string) => {
    try {
      // Drop the schema after tests
      await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
      await prisma.$disconnect();
    } catch (error) {
      console.error('Error tearing down test database:', error);
      throw error;
    }
  };