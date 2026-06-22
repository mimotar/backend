import "dotenv/config";
import { prisma } from "../config/db.js";

// Re-export the singleton Prisma instance from config/db
export default prisma;
