import { Request, Response, NextFunction } from "express";
import VerifyToken from "../../utils/verifyToken.js";

export async function verifyTokenController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(401).json({
        status: 401,
        message: "Authorization token required",
        data: null,
        success: false,
      });
    }
 
    const decoded = await VerifyToken(token);
    return res.status(200).json({
      status: 200,
      message: "Token verified",
      data: decoded,
      success: true,
    });
  } catch (error) {
    next(error);
    return;
  }
}
