"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.socialAuthCallback = exports.PassportConfig = exports.HandleSocialAuth = void 0;
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const prisma_1 = __importDefault(require("../utils/prisma"));
const JWTService_1 = __importDefault(require("../utils/JWTService"));
const env_1 = require("../config/env");
const HandleSocialAuth = async (profile, provider, isLogin) => {
    try {
        const subject = profile.id;
        const email = profile.emails[0].value;
        console.log('PROFILE MAIL', profile.emails[0].value);
        if (!email) {
            throw new Error(`Email not found from ${provider} profile`);
        }
        let user = await prisma_1.default.user.findFirst({
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
        // If login mode and no user found, throw error
        if (isLogin && !user) {
            throw new Error(`No account found with this ${provider} account. Please sign up first.`);
        }
        // If user exists, check if we need to update the provider details
        if (user) {
            if (!user.provider ||
                user.provider !== provider ||
                user.subject !== subject) {
                user = await prisma_1.default.user.update({
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
        }
        // If no user exists and not in login mode, create new user
        else {
            const name = profile.displayName || '';
            const firstName = profile.name?.givenName || name.split(' ')[0] || '';
            const lastName = profile.name?.familyName || name.split(' ').slice(1).join(' ') || '';
            const picture = provider === 'google'
                ? profile.photos?.[0]?.value
                : `https://graph.facebook.com/${subject}/picture?type=large`;
            user = await prisma_1.default.user.create({
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
        const token = JWTService_1.default.signToken(user?.id, user?.email);
        const response = {
            user,
            token,
        };
        console.log("RESPONSE", response);
        return response;
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Error while authenticating user: ${error.message}`);
        }
        else {
            throw new Error("An error occurred while authenticating user");
        }
    }
};
exports.HandleSocialAuth = HandleSocialAuth;
const PassportConfig = () => {
    passport_1.default.use('google', new passport_google_oauth20_1.Strategy({
        clientID: env_1.env.GOOGLE_CLIENT_ID || '',
        clientSecret: env_1.env.GOOGLE_CLIENT_SECRET || '',
        callbackURL: env_1.env.GOOGLE_CALLBACK_URL,
        passReqToCallback: true,
    }, async (req, accessToken, refreshToken, profile, done) => {
        const isLogin = req.query.state === 'login';
        // console.log("IS LOGIN", isLogin)
        try {
            const result = await (0, exports.HandleSocialAuth)(profile, 'google', isLogin);
            return done(null, result);
        }
        catch (error) {
            if (error instanceof Error) {
                console.log(error.message);
                return done(error.message, undefined);
            }
            else {
                console.log("An error occured", error);
                return done(error, undefined);
            }
        }
    }));
    passport_1.default.serializeUser((user, done) => {
        done(null, user);
    });
    passport_1.default.deserializeUser((user, done) => {
        done(null, user);
    });
    // passport.use('facebook', new FacebookStrategy(
    //     {
    //         clientID: env.FACEBOOK_APP_ID || '',
    //         clientSecret: env.FACEBOOK_APP_SECRET || '',
    //         callbackURL: 'http://localhost:5000/auth/home',
    //         // profileFields: ['id', 'displayName', 'email', 'name', 'photos']
    //     },
    //     async( accessToken, refreshToken, profile, done ) => {
    //         try {
    //             const result = await HandleSocialAuth(profile, 'facebook', false)
    //             return done(null, result)
    //         } catch (error) {
    //             return done(error, undefined)
    //         }
    //     }
    // ))
};
exports.PassportConfig = PassportConfig;
const socialAuthCallback = (req, res) => {
    const { user, token } = req.user;
    res.redirect(`${process.env.FRONTEND_URL}/auth-success?token=${token}`);
};
exports.socialAuthCallback = socialAuthCallback;
