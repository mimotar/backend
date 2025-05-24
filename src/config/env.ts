import dotenv from "dotenv";

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT || "3000",
  JWT_SECRET: process.env.JWT_SECRET,
  BREVO_API_KEY: process.env.BREVO_API_KEY as string,
  DATABASE_URL: process.env.DATABASE_URL as string,
  EMAIL: process.env.EMAIL_SENDER,
  FACEBOOK_ID: process.env.FACEBOOK_APP_ID,
  FACEBOOK_SECRET: process.env.FACEBOOK_SECRET as string,
  GOOGLE_ID: process.env.GOOGLE_CLIENT_ID as string,
  GOOGLE_SECRET: process.env.GOOGLE_CLIENT_SECRET as string,

  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,

  FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET,
  FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID,
  FACEBOOK_CALLBACK_URL: process.env.FACEBOOK_CALLBACK_URL,

  SENDER_EMAIL: process.env.SENDER_EMAIL,

  FRONTEND_URL: process.env.FRONTEND_URL,
  saltRounds: Number(process.env.SALTROUNDS),
  CLOUD_NAME: process.env.CLOUD_NAME,
  API_KEY: process.env.API_KEY,
  API_SECRET: process.env.API_SECRET,

  FLW_API_SECRET_KEY: process.env.FLW_API_SECRET,
  FLW_ENCRYPTION_KEY: process.env.FLW_ENCRYPTION_KEY,
  FLW_BASE_URL: process.env.FLW_BASE_URL,
  FLW_PUBLIC_KEY: process.env.FLW_PUBLIC_KEY,
  FLW_WEBHOOK_URL: process.env.FLW_WEBHOOK_URL,
  FLW_WEBHOOK_SECRET: process.env.FLW_WEBHOOK_SECRET,
};


