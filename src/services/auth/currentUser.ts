import prisma from "../../utils/prisma.js";
import { GlobalError } from "../../middlewares/error/GlobalErrorHandler.js";

export interface CurrentUserDetail {
  id: string;
  email: string;
  name: string;
  phone_no: string | null;
  phoneVerified: boolean;
  avatar: string | null;
  isLoggedIn: true;
}

interface AuthenticationPrincipal {
  id?: unknown;
  userId?: unknown;
}

/**
 * Returns the database-backed details for the authenticated user.
 *
 * Both `id` and the legacy `userId` claim are supported because both token
 * shapes are currently issued by the application.
 */
export async function getCurrentUserDetail(
  principal: AuthenticationPrincipal | null | undefined
): Promise<CurrentUserDetail> {
  const principalId = principal?.id ?? principal?.userId;
  const userId = Number(principalId);

  if (
    principalId === undefined ||
    principalId === null ||
    !Number.isInteger(userId) ||
    userId < 1
  ) {
    throw new GlobalError(
      "UnauthorizedError",
      "You must be logged in to access the current user",
      401,
      true
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      profile: {
        select: {
          phone_no: true,
          phoneVerified: true,
          avatar: true,
        },
      },
    },
  });

  if (!user) {
    throw new GlobalError(
      "UnauthorizedError",
      "The authenticated user account no longer exists",
      401,
      true
    );
  }

  return {
    id: String(user.id),
    email: user.email,
    name: `${user.firstName} ${user.lastName}`.trim(),
    phone_no: user.profile?.phone_no ?? null,
    phoneVerified: user.profile?.phoneVerified ?? false,
    avatar: user.profile?.avatar ?? null,
    isLoggedIn: true,
  };
}
