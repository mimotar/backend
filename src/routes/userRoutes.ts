import { Router } from "express";
import { checkUserExistsController, getAllUsersController, loginWithEmailController, registerUserWithEmailController, resendOTPController, testMiddleware, verifyOTPController } from "../controllers/authController.js";
import { validateLoginWithEmail, validateOtpResendInput, validateOTPVerifyInput, validateUserRegistrationInput } from "../middlewares/validateRequest.js";
import { authenticateTokenMiddleware } from "../middlewares/authenticateTokenMiddleware.js";
import { requestChangePassword, verifyChangePassword } from "../controllers/changePassword.controller.js";
import { getCurrentUserController } from "../controllers/currentUser.controller.js";
import createRateLimiterMiddleware from "../utils/loginLimiter.js";

const userRouter = Router();


userRouter.post('/', validateUserRegistrationInput, registerUserWithEmailController);
userRouter.post('/verify-otp', validateOTPVerifyInput, verifyOTPController);
userRouter.post('/resend-otp', validateOtpResendInput, resendOTPController)


userRouter.post('/login-with-email', validateLoginWithEmail, loginWithEmailController)

userRouter.get('/exists', checkUserExistsController)
userRouter.get('/current-user', authenticateTokenMiddleware, getCurrentUserController)
userRouter.get('/', getAllUsersController)
userRouter.get('/test', authenticateTokenMiddleware, testMiddleware)

userRouter.post(
  '/change-password/request',
  authenticateTokenMiddleware,
  createRateLimiterMiddleware(15 * 60 * 1000, 5),
  requestChangePassword
);
userRouter.post(
  '/change-password/verify',
  authenticateTokenMiddleware,
  createRateLimiterMiddleware(15 * 60 * 1000, 10),
  verifyChangePassword
);

export default userRouter;
