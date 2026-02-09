import bcrypt from "bcrypt";
import { GlobalError } from "../middlewares/error/GlobalErrorHandler.js";

export function comparePassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    bcrypt.compare(plainPassword, hashedPassword, (err, result) => {
      if (err) {
        reject(
          new GlobalError(
            err.name || "CompareHashError",
            err.message,
            500,
            true
          )
        );
      } else {
        resolve(result);
      }
    });
  });
}
