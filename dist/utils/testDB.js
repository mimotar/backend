"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.teardownTestDatabase = exports.testDB = void 0;
const client_1 = require("@prisma/client");
const child_process_1 = require("child_process");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const testDB = async () => {
    const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
    const schemaName = `test_${TEST_DATABASE_URL?.split('/').pop()}`;
    const prisma = new client_1.PrismaClient({
        datasources: {
            db: {
                url: TEST_DATABASE_URL,
                schema: schemaName,
            },
        },
    });
    try {
        await prisma.$executeRawUnsafe(`CREATE SCHEMA ${schemaName}`);
        (0, child_process_1.execSync)(`npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss`, {
            env: {
                ...process.env,
                DATABASE_URL: prisma.$connect.constructor.prototype.url
            }
        });
        return { prisma, schemaName };
    }
    catch (error) {
        console.error('Error setting up test database:', error);
        throw error;
    }
};
exports.testDB = testDB;
const teardownTestDatabase = async (prisma, schemaName) => {
    try {
        // Drop the schema after tests
        await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
        await prisma.$disconnect();
    }
    catch (error) {
        console.error('Error tearing down test database:', error);
        throw error;
    }
};
exports.teardownTestDatabase = teardownTestDatabase;
