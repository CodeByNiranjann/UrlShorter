import redisConnection from "../queue/redisConnection.js";

const CACHE_KEY_PREFIX = "url:";
const CACHE_TTL_SECONDS = 60 * 60 * 24;
const REDIS_TIMEOUT_MS = 500;

function buildCacheKey(code) {
    return `${CACHE_KEY_PREFIX}${code}`;
}

function withTimeout(promise) {
    const timeout = new Promise((resolve, reject) => {
        setTimeout(() => reject(new Error("Redis timed out")), REDIS_TIMEOUT_MS);
    });

    return Promise.race([promise, timeout]);
}

export async function getCachedUrl(code) {
    try {
        return await withTimeout(redisConnection.get(buildCacheKey(code)));
    } catch (error) {
        console.error("Cache read failed:", error.message);
        return null;
    }
}

export async function cacheUrl(code, originalUrl) {
    try {
        await withTimeout(
            redisConnection.set(buildCacheKey(code), originalUrl, "EX", CACHE_TTL_SECONDS)
        );
    } catch (error) {
        console.error("Cache write failed:", error.message);
    }
}