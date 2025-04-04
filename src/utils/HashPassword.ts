import bcrypt from "bcrypt";
import { GlobalError } from "../middlewares/error/GlobalErrorHandler";
import { env } from "../config/env";

export function hashPassword(plainPassword: string): Promise<string> {
  const saltRounds = env.saltRounds;
  return new Promise((resolve, reject) => {
    bcrypt.hash(plainPassword, saltRounds, (err, hash) => {
      if (err) {
        reject(
          new GlobalError(err.name || "HashError", err.message, 500, true)
        );
      } else {
        resolve(hash);
      }
    });
  });
}
