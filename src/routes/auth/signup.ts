import { Router } from "express";
import passport from "passport";
import { env } from "../../config/env";
// import { socialAuthCallback } from "../../config/Passport";
import socialAuth from "../../controllers/test/socialAuth";

const signupRouter = Router();

signupRouter.get("/", socialAuth.googleAuth);
signupRouter.get("/home", socialAuth.home);
signupRouter.get("/login", socialAuth.loginAuth);



// Google signup
signupRouter.get(
  "/google",
  // socialAuth.demo
  passport.authenticate("google-signup", { scope: ["email", "profile"] })
);

signupRouter.get(
  "/google/verify",
  passport.authenticate("google-signup", { failureRedirect: "/login" }),
  (req, res) => {
    res.redirect("/auth/home");
  }
);



//Google Login
signupRouter.get(
  "/google",
  passport.authenticate("google-login", { scope: ["email", "profile"] })
);

signupRouter.get(
  "/google/callback",
  passport.authenticate("google-login", { failureRedirect: "/login" }),
  (req, res) => {
    console.log("Google login successful");
    res.redirect("/dashboard");
  }
);


// Facebook signup
signupRouter.get('/facebook', passport.authenticate('facebook', {
    scope: ['email', 'public_profile']
}) )



signupRouter.get('/facebook/callback', 
  passport.authenticate('facebook', {
      session: false,
      failureRedirect: `/login`
  }),
  (req, res) => {
      console.log("Facebook auth successful, user:", req.user);
      res.redirect("/auth/home");
  }
);

export default signupRouter;
