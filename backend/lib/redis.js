import Redis from "ioredis"
import dotenv from "dotenv"

dotenv.config();

export const redis = new Redis(process.env.UPSTACK_REDIS_URL);
// key-value store