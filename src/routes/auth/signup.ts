import { Router } from "express";
import passport from "passport";
import { env } from "../../config/env";
// import { socialAuthCallback } from "../../config/Passport";
import socialAuth from "../../controllers/test/socialAuth";

const signupRouter = Router();

signupRouter.get("/", socialAuth.googleAuth);
signupRouter.get("/home", socialAuth.home);
signupRouter.get("/login", socialAuth.loginAuth);
signupRouter.get("/dashboard", socialAuth.dashboard);




// Google signup
signupRouter.get(
  "/signup/google",
  passport.authenticate("google", { scope: ["email", "profile"] , state: 'signup'})
);


//Google Login
signupRouter.get(
  "/login/google",
  passport.authenticate("google", { scope: ["email", "profile"] , state: 'login'})
);                    

signupRouter.get(
  "/google/verify",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    console.log("REQ", req.query.state)
    if(req.query.state === 'login'){
      res.redirect("/auth/dashboard");
    }
    else {  
      res.redirect("/auth/home");
    }
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
