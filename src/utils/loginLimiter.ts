import rateLimit, { ValueDeterminingMiddleware } from "express-rate-limit";

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many login attempts, please try again later",
  headers: true,
});

const createRateLimiterMiddleware = (
  windowMs: number,
  maxRequests: ValueDeterminingMiddleware<number> | number,
  message: string = "Too many requests, please try again later."
) => {
  return rateLimit({
    windowMs,
    limit: maxRequests,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message,
  });
};

export default createRateLimiterMiddleware;
