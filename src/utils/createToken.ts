import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { GlobalError } from "../middlewares/error/GlobalErrorHandler";

export function createToken(
  expires: SignOptions["expiresIn"],
  payload: JwtPayload
) {
  return new Promise<string>((resolve, reject) => {
    jwt.sign(
      payload,
      env.JWT_SECRET as string,
      { expiresIn: expires },
      (err, token) => {
        if (err) {
          return reject(new GlobalError(err.name, err.message, 500, true));
        }
        resolve(token as string);
      }
    );
  });
}
