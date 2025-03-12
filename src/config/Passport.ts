import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import prisma from "../utils/prisma";
import JWTService from "../utils/JWTService";
import { env } from "../config/env";
import { Request, Response } from 'express';


export const HandleSocialAuth = async (
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



export const ConfigPassportStrategy = async() => {

    passport.use(new GoogleStrategy(
        {
            clientID: env.GOOGLE_CLIENT_ID || '',
            clientSecret: env.GOOGLE_CLIENT_SECRET || ' ',
            callbackURL: env.GOOGLE_CALLBACK_URL,
            scope: ['profile', 'email']
        },
        async( accessToken, refreshToken, profile, done ) => {
            try {
                const result = await HandleSocialAuth(profile, 'google')
                return done(null, result)
            } catch (error) {
                return done(error, undefined)
            }
        }
    ));

    passport.use(new FacebookStrategy(
        {
            clientID: env.FACEBOOK_APP_ID || '',
            clientSecret: env.FACEBOOK_APP_SECRET || '',
            callbackURL: env.FACEBOOK_CALLBACK_URL || ' ',
            profileFields: ['id', 'displayName', 'email', 'name', 'photos']
        },
        async( accessToken, refreshToken, profile, done ) => {
            try {
                const result = await HandleSocialAuth(profile, 'facebook')
                return done(null, result)
            } catch (error) {
                return done(error, undefined)
            }
        }
    ))
}


export const socialAuthCallback = (req: Request, res: Response) => {
    const { user, token } = req.user as { user: any, token: string };
    res.redirect(`${process.env.FRONTEND_URL}/auth-success?token=${token}`);
  };