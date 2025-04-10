import { Router } from "express";
import { getAllUsersController, loginWithEmailController, registerUserWithEmailController, resendOTPController, testMiddleware, verifyOTPController } from "../controllers/authController";
import { validateLoginWithEmail, validateOtpResendInput, validateOTPVerifyInput, validateUserRegistrationInput } from "../middlewares/validateRequest";
import { authenticateTokenMiddleware } from "../middlewares/authenticateTokenMiddleware";

const userRouter = Router();


userRouter.post('/', validateUserRegistrationInput, registerUserWithEmailController);
userRouter.post('/verify-otp', validateOTPVerifyInput, verifyOTPController);
userRouter.post('/resend-otp', validateOtpResendInput, resendOTPController)


userRouter.post('/login-with-email', validateLoginWithEmail, loginWithEmailController)

userRouter.get('/', getAllUsersController)
userRouter.get('/test', authenticateTokenMiddleware, testMiddleware)


export default userRouter;