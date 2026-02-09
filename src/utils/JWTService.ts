import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

class JWTService {
  private secretKey: string;

  constructor() {
    const secretKey = env.JWT_SECRET;

    if (!secretKey) {
      throw new Error('JWT_SECRET is not defined in .env');
    }

    this.secretKey = secretKey;
  }

  signToken(userId: number | undefined , email: string | undefined) {
    const payload = {
      userId: userId,
      email: email,
    };

    return  jwt.sign(payload,  this.secretKey, { expiresIn: "12M" });
  }

  verifyToken(token: string): jwt.JwtPayload | string | null {
    try {
      const decoded = jwt.verify(token, this.secretKey);
      return decoded as jwt.JwtPayload;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }
}


export default new JWTService();