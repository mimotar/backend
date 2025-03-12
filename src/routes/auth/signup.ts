import { Router } from "express";
import passport from "passport";
import { env } from "../../config/env";
import { socialAuthCallback } from "../../config/Passport";

const signupRouter = Router();

signupRouter.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

signupRouter.get('/google/callback', 
    passport.authenticate('google', {session: false, failureRedirect: `${env.FRONTEND_URL}/login`}, socialAuthCallback )
)

signupRouter.get('/facebook', passport.authenticate('facebook', {
    scope: ['email', 'public_profile']
}) )

signupRouter.get('/facebook/callback', passport.authenticate('facebook', {
    session: false,
    failureRedirect: `${env.FRONTEND_URL}/login`,
}))

export default signupRouter;