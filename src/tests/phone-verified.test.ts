import prisma from "../utils/prisma.js";
import { comparePassword } from "../utils/comparePassword.js";
import { createToken } from "../utils/createToken.js";
import { loginWithEmailService } from "../services/auth/loginWithEmail.service.js";
import { getProfileService, updateProfileService } from "../services/profile/profile.service.js";

jest.mock("../utils/prisma.js", () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    profile: {
      update: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock("../utils/comparePassword.js", () => ({
  comparePassword: jest.fn(),
}));

jest.mock("../utils/createToken.js", () => ({
  createToken: jest.fn(),
}));

const prismaUser = prisma.user as unknown as {
  findUnique: jest.Mock;
  update: jest.Mock;
};

const prismaProfile = prisma.profile as unknown as {
  update: jest.Mock;
  create: jest.Mock;
};

describe("phoneVerified in Login and Profile Endpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("loginWithEmailService", () => {
    it("returns phoneVerified: false when user has no profile", async () => {
      prismaUser.findUnique.mockResolvedValue({
        id: 1,
        email: "test@example.com",
        password: "hashedPassword",
        verified: true,
        firstName: "Test",
        lastName: "User",
        profile: null,
      });
      (comparePassword as jest.Mock).mockResolvedValue(true);
      (createToken as jest.Mock).mockResolvedValue("mockToken");

      const result = await loginWithEmailService("test@example.com", "password123");

      expect(result.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.phoneVerified).toBe(false);
      expect(result.user?.profile).toBeNull();
    });

    it("returns phoneVerified: false when profile has phoneVerified: false", async () => {
      prismaUser.findUnique.mockResolvedValue({
        id: 2,
        email: "unverified@example.com",
        password: "hashedPassword",
        verified: true,
        firstName: "Unverified",
        lastName: "User",
        profile: {
          id: 10,
          phone_no: "+2348012345678",
          phoneVerified: false,
        },
      });
      (comparePassword as jest.Mock).mockResolvedValue(true);
      (createToken as jest.Mock).mockResolvedValue("mockToken");

      const result = await loginWithEmailService("unverified@example.com", "password123");

      expect(result.status).toBe(200);
      expect(result.user?.phoneVerified).toBe(false);
      expect(result.user?.profile?.phoneVerified).toBe(false);
    });

    it("returns phoneVerified: true when profile has phoneVerified: true", async () => {
      prismaUser.findUnique.mockResolvedValue({
        id: 3,
        email: "verified@example.com",
        password: "hashedPassword",
        verified: true,
        firstName: "Verified",
        lastName: "User",
        profile: {
          id: 11,
          phone_no: "+2348099999999",
          phoneVerified: true,
        },
      });
      (comparePassword as jest.Mock).mockResolvedValue(true);
      (createToken as jest.Mock).mockResolvedValue("mockToken");

      const result = await loginWithEmailService("verified@example.com", "password123");

      expect(result.status).toBe(200);
      expect(result.user?.phoneVerified).toBe(true);
      expect(result.user?.profile?.phoneVerified).toBe(true);
    });
  });

  describe("getProfileService", () => {
    it("returns phoneVerified: false when user has no profile", async () => {
      prismaUser.findUnique.mockResolvedValue({
        id: 1,
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        profile: null,
      });

      const profile = await getProfileService(1);

      expect(profile.phoneVerified).toBe(false);
      expect(profile.phone_no).toBeNull();
    });

    it("returns phoneVerified: false when profile phoneVerified is false", async () => {
      prismaUser.findUnique.mockResolvedValue({
        id: 2,
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        profile: {
          id: 5,
          phone_no: "+1234567890",
          phoneVerified: false,
        },
      });

      const profile = await getProfileService(2);

      expect(profile.phoneVerified).toBe(false);
      expect(profile.phone_no).toBe("+1234567890");
    });

    it("returns phoneVerified: true when profile phoneVerified is true", async () => {
      prismaUser.findUnique.mockResolvedValue({
        id: 3,
        email: "verified@example.com",
        firstName: "Verified",
        lastName: "User",
        profile: {
          id: 6,
          phone_no: "+1234567890",
          phoneVerified: true,
        },
      });

      const profile = await getProfileService(3);

      expect(profile.phoneVerified).toBe(true);
      expect(profile.phone_no).toBe("+1234567890");
    });
  });

  describe("updateProfileService", () => {
    it("resets phoneVerified to false when phone_no changes", async () => {
      prismaUser.findUnique
        .mockResolvedValueOnce({
          id: 4,
          email: "user@example.com",
          firstName: "John",
          lastName: "Doe",
          profile: {
            id: 20,
            user_id: 4,
            phone_no: "+1111111111",
            phoneVerified: true,
          },
        })
        .mockResolvedValueOnce({
          id: 4,
          email: "user@example.com",
          firstName: "John",
          lastName: "Doe",
          profile: {
            id: 20,
            user_id: 4,
            phone_no: "+2222222222",
            phoneVerified: false,
          },
        });

      prismaProfile.update.mockResolvedValue({});

      const updated = await updateProfileService(4, {
        phone_no: "+2222222222",
      });

      expect(prismaProfile.update).toHaveBeenCalledWith({
        where: { user_id: 4 },
        data: expect.objectContaining({
          phone_no: "+2222222222",
          phoneVerified: false,
        }),
      });
      expect(updated.phoneVerified).toBe(false);
    });

    it("preserves phoneVerified when updating other fields without changing phone_no", async () => {
      prismaUser.findUnique
        .mockResolvedValueOnce({
          id: 5,
          email: "user@example.com",
          firstName: "John",
          lastName: "Doe",
          profile: {
            id: 21,
            user_id: 5,
            phone_no: "+1111111111",
            phoneVerified: true,
            city: "Old City",
          },
        })
        .mockResolvedValueOnce({
          id: 5,
          email: "user@example.com",
          firstName: "John",
          lastName: "Doe",
          profile: {
            id: 21,
            user_id: 5,
            phone_no: "+1111111111",
            phoneVerified: true,
            city: "New City",
          },
        });

      prismaProfile.update.mockResolvedValue({});

      const updated = await updateProfileService(5, {
        city: "New City",
      });

      expect(prismaProfile.update).toHaveBeenCalledWith({
        where: { user_id: 5 },
        data: expect.objectContaining({
          phoneVerified: true,
          city: "New City",
        }),
      });
      expect(updated.phoneVerified).toBe(true);
    });
  });
});
