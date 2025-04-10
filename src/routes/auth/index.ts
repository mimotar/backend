import { Router } from "express";
import passport from "passport";
import socialAuth from "../../controllers/test/socialAuth";
import { getAllUsersController, loginWithEmailController, registerUserWithEmailController, resendOTPController, verifyOTPController } from "../../controllers/authController";


const userRouter = Router();

userRouter.get("/", socialAuth.googleAuth);
userRouter.get("/home", socialAuth.home);
userRouter.get("/login", socialAuth.loginAuth);
userRouter.get("/dashboard", socialAuth.dashboard);

// Google signup
userRouter.get(
  "/signup/google",
  passport.authenticate("google", {
    scope: ["email", "profile"],
    state: "signup",
  })
);

//Google Login
userRouter.get(
  "/login/google",
  passport.authenticate("google", {
    scope: ["email", "profile"],
    state: "login",
  })
);

userRouter.get(
  "/google/verify",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    if (req.query.state === "login") {
      res.redirect("/auth/dashboard");
    } else {
      res.redirect("/auth/home");
    }
  }
);

//Login with email and password
userRouter.post("/login-with-email", loginWithEmailController);
userRouter.post("/resend-otp", resendOTPController);
userRouter.get("/all-users", getAllUsersController);

//Register with email and password
userRouter.post("/register-with-email", registerUserWithEmailController);
userRouter.post('/register-with-email/verify-otp', verifyOTPController);
// userRouter.delete('/delete-user', )

export default userRouter;
