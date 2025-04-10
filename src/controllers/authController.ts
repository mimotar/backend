import { Request, Response , NextFunction, RequestHandler} from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/db";
import { validationResult } from "express-validator";
import { sendEmail } from "../services/emailService";
import { EmailType } from "../emails/templates/emailTypes";
import crypto from "crypto";
import axios from "axios";
import { env } from "../config/env";
import { hashPassword } from "../utils/HashPassword";
import { getALlUsersService, registerUserWithEmailService } from "../services/auth/users.service";
import { verifyOTPService } from "../services/auth/verifyOTP.service";
import { resendOTPToEmail } from "../services/auth/sendOTP";
import { loginWithEmailService } from "../services/auth/loginWithEmail.service";

// export const register = async (req: Request, res: Response): Promise<void> => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     res.status(400).json({ errors: errors.array() });
//     return;
//   }

//   const { email, password } = req.body;

//   try {
//     const existingUser = await prisma.user.findUnique({ where: { email } });
//     if (existingUser) {
//       res.status(400).json({ message: 'Email is already registered' });
//       return;
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);
//     const verificationToken = crypto.randomBytes(32).toString('hex');

//     await prisma.user.create({
//       data: { email, password: hashedPassword, verified: false,
//         verificationToken

//        }
//     });
//     const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
//         console.log(`Fake Verification Link: ${verificationLink}`);
//     await sendEmail(email, EmailType.VERIFY_EMAIL,{ verificationLink }).then(() => {
//       res.status(201).json({ message: 'User registered successfully, please verify your email' });
//     }).catch(err => {
//       console.error("Email sending error:", err);
//       res.status(500).json({ message: 'Failed to send verification email' });
//     });

//   } catch (error) {
//     console.error("Error in registration:", error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const FACEBOOK_TOKEN_URL =
  "https://graph.facebook.com/v12.0/oauth/access_token";
const FACEBOOK_USERINFO_URL =
  "https://graph.facebook.com/me?fields=id,name,email";

export const register = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  let { email, password, oauthProvider, oauthCode } = req.body;

  try {
    let user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      res.status(400).json({ message: "Email is already registered" });
      return;
    }

    let name = "";

    if (oauthProvider && oauthCode) {
      let userData;
      let accessToken;

      if (oauthProvider === "google") {
        const googleResponse = await axios.post(GOOGLE_TOKEN_URL, null, {
          params: {
            client_id: env.GOOGLE_ID,
            client_secret: env.GOOGLE_SECRET,
            code: oauthCode,
            grant_type: "authorization_code",
            // redirect_uri: env.BACKEND_URL + '/auth/google/callback',
          },
        });
        accessToken = googleResponse.data.access_token;
        const response = await axios.get(GOOGLE_USERINFO_URL, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        userData = response.data;
      } else if (oauthProvider === "facebook") {
        const facebookResponse = await axios.get(FACEBOOK_TOKEN_URL, {
          params: {
            client_id: env.FACEBOOK_ID,
            client_secret: env.FACEBOOK_SECRET,
            // redirect_uri: env.BACKEND_URL + '/auth/facebook/callback',
            code: oauthCode,
          },
        });
        accessToken = facebookResponse.data.access_token;
        const response = await axios.get(FACEBOOK_USERINFO_URL, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        userData = response.data;
      } else {
        res.status(400).json({ message: "Invalid OAuth provider" });
        return;
      }

      email = userData.email;
      // name = userData.name;
      user = await prisma.user.create({
        data: {
          email,
          verified: true,
          password: "", // Provide a default or placeholder value
          firstName: "OAuth", // Provide a default or placeholder value
          lastName: "User", // Provide a default or placeholder value
        },
      });
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const verificationToken = crypto.randomBytes(32).toString("hex");

      user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          verified: false,
          verificationToken,
          firstName: "DefaultFirstName",
          lastName: "DefaultLastName",
        },
      });

      const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
      console.log(`Fake Verification Link: ${verificationLink}`);
      await sendEmail(email, EmailType.VERIFY_EMAIL, {
        verificationLink,
      }).catch((err) => {
        console.error("Email sending error:", err);
        res.status(500).json({ message: "Failed to send verification email" });
        return;
      });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" }
    );
    res.json({ message: "User registered successfully", token, user });
  } catch (error) {
    console.error("Error in registration:", error);
    res.status(500).json({ message: "Server error" });
  }
};
export const verifyEmail = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ message: "Email is required" });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(400).json({ message: "User not found" });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      // data: { verified: true }
      data: { verified: true, verificationToken: null },
    });

    res.json({ message: "Email verified successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};


export const login = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    // const isMatch = await bcrypt.compare(password, user?.password);
    // const isMatch = await bcrypt.compare(password, user?.password);
    if (!user.password) {
      res.status(400).json({
        message:
          "User registered via OAuth, please log in with Google/Facebook",
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    if (!isMatch) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    if (!user.verified) {
      res
        .status(403)
        .json({ message: "Please verify your email before logging in" });
      return;
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" }
    );
    // res.json({ token });
    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};



export const registerUserWithEmailController: RequestHandler = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      status: 400,
      message: "Validation errors",
      data: errors.array(),
      success: false
    });
    return;
  }

  const { email, password, firstName, lastName } = req.body;

  const result = await registerUserWithEmailService({
    email,
    password,
    firstName,
    lastName
  });

  res.status(result.status).json({
    status: result.status,
    message: result.message,
    data: result.data,
    success: result.success
  });
  return;
};

export const verifyOTPController: RequestHandler = async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      status: 400,
      message: "Validation errors",
      data: errors.array(),
      success: false
    });
    return;
  }

  try {
    const result = await verifyOTPService(email, otp);
    if (result) {
      if (result) {
        res.status(result.status).json({
          status: result.status,
          message: result.message,
          data: null,
          success: true
        });
      } else {
        res.status(500).json({
          status: 500,
          message: "Unexpected error occurred",
          data: null,
          success: false
        });
      }
    } else {
      res.status(500).json({
        status: 500,
        message: "Unexpected error occurred",
        data: null,
        success: false
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 500,
      message: "Server error",
      data: null,
      success: false
    });
  }
}

export const resendOTPController: RequestHandler = async (req: Request, res: Response) => {
const { email } = req.body;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      status: 400,
      message: "Validation errors",
      data: errors.array(),
      success: false
    });
    return;
  }

  try {
    const result = await resendOTPToEmail(email);
    if(result){
      res.status(result.status).json({
        status: result.status,
        message: result.message,
        data: null,
        success: true
      });
    }
    return;
  } catch (error) {
    res.status(500).json({
      status: 500,
      message: "Server error",
      data: null,
      success: false
    });
  }
  return;
}



export const loginWithEmailController: RequestHandler = async (req: Request, res: Response) => {

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
     res.status(400).json({
      status: 400,
      message: "Validation errors",
      data: errors.array(),
      success: false
    });
    return;
  }

  const { email, password } = req.body;

  try {
    const result = await loginWithEmailService(email, password);

     res.status(result.status).json({
      status: result.status,
      message: result.message,
      data: {
        token: result.token,
        user: result.user
      },
      success: result.success || false 
    });
    return;

  } catch (error) {
    console.error('Login controller error:', error);
     res.status(500).json({
      status: 500,
      message: "An unexpected error occurred during login",
      data: null,
      success: false
    });
    return;
  }
};


export const getAllUsersController = async(req: Request,res: Response) => {

 const response = await getALlUsersService()
 res.status(response.status).json({
  message: response.message,
  data: response.users,
  success: response.status
 })
 return;
}

export const testMiddleware = async(req: Request, res: Response) => {
  res.status(200).json({
    message: "I can now access this route",
    data: "I got no data",
    succes: true
  })
}