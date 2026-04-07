import { Router } from "express";
import { getAllUsersController, loginWithEmailController, registerUserWithEmailController, resendOTPController, testMiddleware, verifyOTPController } from "../controllers/authController.js";
import { validateLoginWithEmail, validateOtpResendInput, validateOTPVerifyInput, validateUserRegistrationInput } from "../middlewares/validateRequest.js";
import { authenticateTokenMiddleware } from "../middlewares/authenticateTokenMiddleware.js";
import { requestChangePassword, verifyChangePassword } from "../controllers/changePassword.controller.js";

const userRouter = Router();


userRouter.post('/', validateUserRegistrationInput, registerUserWithEmailController);
userRouter.post('/verify-otp', validateOTPVerifyInput, verifyOTPController);
userRouter.post('/resend-otp', validateOtpResendInput, resendOTPController)


userRouter.post('/login-with-email', validateLoginWithEmail, loginWithEmailController)

userRouter.get('/', getAllUsersController)
userRouter.get('/test', authenticateTokenMiddleware, testMiddleware)

userRouter.post('/change-password/request', authenticateTokenMiddleware, requestChangePassword);
userRouter.post('/change-password/verify', authenticateTokenMiddleware, verifyChangePassword);

export default userRouter;