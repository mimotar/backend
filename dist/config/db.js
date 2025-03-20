"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.connectDB = connectDB;
const client_1 = require("@prisma/client");
const env_1 = require("./env");
const prisma = new client_1.PrismaClient({
    datasources: {
        db: {
            url: env_1.env.DATABASE_URL,
        },
    },
});
exports.prisma = prisma;
async function connectDB() {
    try {
        await prisma.$connect();
        console.log('Connected to remote PostgreSQL database');
    }
    catch (error) {
        console.error('Database connection failed:', error);
        process.exit(1);
    }
}
