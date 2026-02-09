import { PrismaClient } from "../generated/prisma/client.js";
import { mockDeep, mockReset, DeepMockProxy } from "jest-mock-extended";
// import prisma from "./utils/prisma";
import prisma from "./prisma.js";

jest.mock("./prisma.js", () => ({
  __esModule: true,
  default: mockDeep<PrismaClient>(),
}));

beforeEach(() => {
  mockReset(prismaMock);
});

export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;
