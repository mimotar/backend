import RedisModule from "ioredis";
import { env } from "./env.js";

const Redis = (RedisModule as any).default || RedisModule;

const redisUrl = env.REDIS_URL;

export const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

redisConnection.on("connect", () => {
  console.log("Redis Connection Successful");
});

redisConnection.on("error", (error: any) => {
  console.error("Redis Connection Error:", error);
});
