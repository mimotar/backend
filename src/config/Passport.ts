import prisma from "../utils/prisma";
import dotenv from "dotenv";
import JWTService from "../utils/JWTService";
dotenv.config();

export const PassportConfig = async (
  profile: any,
  provider: "google" | "facebook"
) => {
  try {
    const subject = profile.id;
    const email = profile.emails[0].value;
    if (!email) {
      throw new Error(`Email not found from ${provider} profile`);
    }

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          {
            provider,
            subject,
          },
          {
            email,
          },
        ],
      },
      include: {
        profile: true,
      },
    });

    if (user) {
      if (
        !user.provider ||
        user.provider !== user.provider ||
        user.subject !== user.subject
      ) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            provider,
            subject,
          },
          include: {
            profile: true,
          },
        });
      }
    } else {
        const name = profile.displayName || '';
        const firstName = profile.name?.givenName || name.split(' ')[0] || '';
        const lastName = profile.name?.familyName || name.split(' ').slice(1).join(' ') || '';
        const picture = 
          provider === 'google' 
            ? profile.photos?.[0]?.value 
            : `https://graph.facebook.com/${subject}/picture?type=large`;
        
        user = await prisma.user.create({
          data: {
            email,
            firstName,
            lastName,
            password: Math.random().toString(36).slice(-10),
            provider,
            subject,
            verified: true, 
            profile: {
              create: {
                avatar: picture
              }
            }
          },
          include: {
            profile: true
          }
        });
    }
    const token = JWTService.signToken(user?.id, user?.email);
    return {
        user,
        token
    }
  } catch (error) {
    if( error instanceof Error){
        throw new Error(`Error while authenticating user: ${error.message}`);
    }
    else {
        throw new Error("An error occurred while authenticating user");
    }
  }
};
