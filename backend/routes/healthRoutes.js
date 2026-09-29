import { Router } from "express";

import pool from "../db/pool.js";
import redisConnection from "../queue/redisConnection.js";

const router = Router();

async function checkMysql() {
    try {
        await pool.query("SELECT 1");
        return "up";
    } catch (error) {
        console.error("Health check: MySQL is down:", error.message);
        return "down";
    }
}

async function checkRedis() {
    try {
        await Promise.race([
            redisConnection.ping(),
            new Promise((resolve, reject) => {
                setTimeout(() => reject(new Error("Redis timed out")), 500);
            }),
        ]);
        return "up";
    } catch (error) {
        console.error("Health check: Redis is down:", error.message);
        return "down";
    }
}

router.get("/", async (request, response) => {
    const [mysqlStatus, redisStatus] = await Promise.all([
        checkMysql(),
        checkRedis(),
    ]);

    const isHealthy = mysqlStatus === "up" && redisStatus === "up";

    response.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? "ok" : "degraded",
        mysql: mysqlStatus,
        redis: redisStatus,
    });
});

export default router;