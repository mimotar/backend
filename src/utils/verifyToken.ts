import jwt, { JwtPayload } from "jsonwebtoken";
import { GlobalError } from "../middlewares/error/GlobalErrorHandler";
import { env } from "../config/env";

export default async function VerifyToken<T extends JwtPayload = JwtPayload>(
  token: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, env.JWT_SECRET as string, (err, decoded) => {
      if (err) {
        console.log(err);
        reject(new GlobalError(err.name, err.message, 401, true));
      } else {
        resolve(decoded as T);
      }
    });
  });
}
