import Redis from "ioredis";

import env from "../config/env.js";

const redisConnection = new Redis(env.redisUrl, {
    maxRetriesPerRequest: null,
});

redisConnection.on("error", (error) => {
    console.error("Redis connection error:", error.message);
});

export default redisConnection;