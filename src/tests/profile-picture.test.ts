import { getProfileService } from "../services/profile/profile.service.js";
import prisma from "../utils/prisma.js";

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

const prismaUser = prisma.user as unknown as {
  findUnique: jest.Mock;
  update: jest.Mock;
};

describe("Profile picture URL in GET profile endpoint", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null for profile picture fields when user has no profile", async () => {
    prismaUser.findUnique.mockResolvedValue({
      id: 1,
      email: "user@example.com",
      firstName: "John",
      lastName: "Doe",
      profile: null,
    });

    const result = await getProfileService(1);

    expect(result.avatar).toBeNull();
    expect(result.avatarUrl).toBeNull();
    expect(result.profilePicture).toBeNull();
    expect(result.profile_picture).toBeNull();
    expect(result.profilePictureUrl).toBeNull();
  });

  it("returns null for profile picture fields when profile has no avatar", async () => {
    prismaUser.findUnique.mockResolvedValue({
      id: 2,
      email: "user@example.com",
      firstName: "Jane",
      lastName: "Doe",
      profile: {
        id: 10,
        avatar: null,
      },
    });

    const result = await getProfileService(2);

    expect(result.avatar).toBeNull();
    expect(result.avatarUrl).toBeNull();
    expect(result.profilePicture).toBeNull();
    expect(result.profile_picture).toBeNull();
    expect(result.profilePictureUrl).toBeNull();
  });

  it("returns profile picture URL in avatar, avatarUrl, profilePicture, profile_picture, and profilePictureUrl", async () => {
    const testAvatarUrl = "https://res.cloudinary.com/demo/image/upload/sample.jpg";

    prismaUser.findUnique.mockResolvedValue({
      id: 3,
      email: "user@example.com",
      firstName: "Jane",
      lastName: "Doe",
      profile: {
        id: 11,
        avatar: testAvatarUrl,
      },
    });

    const result = await getProfileService(3);

    expect(result.avatar).toBe(testAvatarUrl);
    expect(result.avatarUrl).toBe(testAvatarUrl);
    expect(result.profilePicture).toBe(testAvatarUrl);
    expect(result.profile_picture).toBe(testAvatarUrl);
    expect(result.profilePictureUrl).toBe(testAvatarUrl);
  });
});
