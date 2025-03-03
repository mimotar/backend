import dotenv from "dotenv";

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT || "3000",
  JWT_SECRET: process.env.JWT_SECRET,
  brevoApiKey: process.env.BREVO_API_KEY as string,
};
