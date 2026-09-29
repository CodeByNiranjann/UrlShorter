# Run this from E:\UrlShorter\backend
# It creates every backend source file with its correct content in one pass.

$files = @{}

$files["src\config\env.js"] = @'
import dotenv from "dotenv";

dotenv.config();

const requiredVariables = [
    "BASE_URL",
    "DB_HOST",
    "DB_USER",
    "DB_PASSWORD",
    "DB_NAME",
    "REDIS_URL",
];

const missingVariables = requiredVariables.filter(
    (variableName) => !process.env[variableName]
);

if (missingVariables.length > 0) {
    throw new Error(
        `Missing required environment variables: ${missingVariables.join(", ")}`
    );
}

const env = {
    port: Number(process.env.PORT) || 3000,
    baseUrl: process.env.BASE_URL.replace(/\/+$/, ""),
    clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    db: {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        name: process.env.DB_NAME,
    },
    redisUrl: process.env.REDIS_URL,
};

export default env;
'@

$files["src\utils\AppError.js"] = @'
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.name = "AppError";
        this.statusCode = statusCode;
    }
}

export default AppError;
'@

$files["src\utils\base62.js"] = @'
import { randomInt } from "node:crypto";

const BASE62_CHARACTERS =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export const SHORT_CODE_LENGTH = 7;

export function generateShortCode(length = SHORT_CODE_LENGTH) {
    let shortCode = "";

    for (let position = 0; position < length; position++) {
        const randomIndex = randomInt(BASE62_CHARACTERS.length);
        shortCode += BASE62_CHARACTERS[randomIndex];
    }

    return shortCode;
}

export function isValidShortCode(code) {
    return /^[a-zA-Z0-9]{1,16}$/.test(code);
}
'@

$files["src\db\pool.js"] = @'
import mysql from "mysql2/promise";

import env from "../config/env.js";

const pool = mysql.createPool({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.name,
    waitForConnections: true,
    connectionLimit: 10,
    charset: "utf8mb4",
});

export default pool;
'@

$files["src\db\linkRepository.js"] = @'
import pool from "./pool.js";

export async function insertLink(code, originalUrl) {
    await pool.execute(
        `
            INSERT INTO short_links (code, original_url)
            VALUES (?, ?)
        `,
        [code, originalUrl]
    );
}

export async function findLinkByCode(code) {
    const [rows] = await pool.execute(
        `
            SELECT
                code,
                original_url,
                created_at
            FROM short_links
            WHERE code = ?
            LIMIT 1
        `,
        [code]
    );

    return rows[0] || null;
}
'@

$files["src\db\clickRepository.js"] = @'
import pool from "./pool.js";

export async function insertClick(shortCode, referrer, clickedAt) {
    await pool.execute(
        `
            INSERT INTO clicks (short_code, referrer, clicked_at)
            VALUES (?, ?, ?)
        `,
        [shortCode, referrer, clickedAt]
    );
}

export async function countClicksByCode(shortCode) {
    const [rows] = await pool.execute(
        `
            SELECT COUNT(*) AS total_clicks
            FROM clicks
            WHERE short_code = ?
        `,
        [shortCode]
    );

    return Number(rows[0].total_clicks);
}

export async function findReferrerCounts(shortCode) {
    const [rows] = await pool.execute(
        `
            SELECT
                referrer,
                COUNT(*) AS click_count
            FROM clicks
            WHERE short_code = ?
            GROUP BY referrer
            ORDER BY click_count DESC
            LIMIT 20
        `,
        [shortCode]
    );

    return rows.map((row) => ({
        referrer: row.referrer,
        count: Number(row.click_count),
    }));
}

export async function findDailyClickCounts(shortCode) {
    const [rows] = await pool.execute(
        `
            SELECT
                DATE_FORMAT(clicked_at, '%Y-%m-%d') AS click_date,
                COUNT(*) AS click_count
            FROM clicks
            WHERE short_code = ?
            GROUP BY click_date
            ORDER BY click_date ASC
        `,
        [shortCode]
    );

    return rows.map((row) => ({
        date: row.click_date,
        count: Number(row.click_count),
    }));
}
'@

$files["src\queue\redisConnection.js"] = @'
import Redis from "ioredis";

import env from "../config/env.js";

const redisConnection = new Redis(env.redisUrl, {
    maxRetriesPerRequest: null,
});

redisConnection.on("error", (error) => {
    console.error("Redis connection error:", error.message);
});

export default redisConnection;
'@

$files["src\queue\clickQueue.js"] = @'
import { Queue } from "bullmq";

import redisConnection from "./redisConnection.js";

export const CLICK_QUEUE_NAME = "click-analytics";

const clickQueue = new Queue(CLICK_QUEUE_NAME, {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: 1000,
    },
});

export async function addClickJob(shortCode, referrer) {
    await clickQueue.add("record-click", {
        shortCode,
        referrer,
        clickedAt: new Date().toISOString(),
    });
}
'@

$files["src\services\cacheService.js"] = @'
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
'@

$files["src\services\urlService.js"] = @'
import env from "../config/env.js";
import { insertLink } from "../db/linkRepository.js";
import { generateShortCode } from "../utils/base62.js";
import AppError from "../utils/AppError.js";

const MAX_CODE_ATTEMPTS = 5;
const MAX_URL_LENGTH = 2048;

function validateOriginalUrl(originalUrl) {
    if (typeof originalUrl !== "string" || originalUrl.trim() === "") {
        throw new AppError("Missing URL", 400);
    }

    if (originalUrl.length > MAX_URL_LENGTH) {
        throw new AppError("URL is too long", 400);
    }

    let parsedUrl;

    try {
        parsedUrl = new URL(originalUrl);
    } catch (error) {
        throw new AppError("Invalid URL", 400);
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        throw new AppError("Invalid URL", 400);
    }
}

export function buildShortUrl(code) {
    return `${env.baseUrl}/${code}`;
}

export async function createShortLink(originalUrl) {
    validateOriginalUrl(originalUrl);

    const trimmedUrl = originalUrl.trim();

    for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt++) {
        const code = generateShortCode();

        try {
            await insertLink(code, trimmedUrl);

            return {
                code,
                shortUrl: buildShortUrl(code),
            };
        } catch (error) {
            const isDuplicateCode = error.code === "ER_DUP_ENTRY";

            if (!isDuplicateCode) {
                throw error;
            }
        }
    }

    throw new AppError("Could not generate a unique short code. Please try again.", 500);
}
'@

$files["src\services\analyticsService.js"] = @'
import { findLinkByCode } from "../db/linkRepository.js";
import {
    countClicksByCode,
    findDailyClickCounts,
    findReferrerCounts,
} from "../db/clickRepository.js";
import AppError from "../utils/AppError.js";
import { isValidShortCode } from "../utils/base62.js";
import { buildShortUrl } from "./urlService.js";

export async function getAnalyticsForCode(code) {
    if (!isValidShortCode(code)) {
        throw new AppError("Invalid short code", 400);
    }

    const link = await findLinkByCode(code);

    if (!link) {
        throw new AppError("Short link not found", 404);
    }

    const [totalClicks, referrers, clicksOverTime] = await Promise.all([
        countClicksByCode(code),
        findReferrerCounts(code),
        findDailyClickCounts(code),
    ]);

    return {
        code: link.code,
        shortUrl: buildShortUrl(link.code),
        originalUrl: link.original_url,
        totalClicks,
        referrers,
        clicksOverTime,
    };
}
'@

$files["src\controllers\urlController.js"] = @'
import { createShortLink } from "../services/urlService.js";

export async function createUrl(request, response, next) {
    try {
        const { originalUrl } = request.body;
        const createdLink = await createShortLink(originalUrl);

        response.status(201).json(createdLink);
    } catch (error) {
        next(error);
    }
}
'@

$files["src\controllers\redirectController.js"] = @'
import { findLinkByCode } from "../db/linkRepository.js";
import { addClickJob } from "../queue/clickQueue.js";
import { cacheUrl, getCachedUrl } from "../services/cacheService.js";
import AppError from "../utils/AppError.js";
import { isValidShortCode } from "../utils/base62.js";

async function findOriginalUrl(code) {
    const cachedUrl = await getCachedUrl(code);

    if (cachedUrl) {
        return cachedUrl;
    }

    const link = await findLinkByCode(code);

    if (!link) {
        return null;
    }

    await cacheUrl(code, link.original_url);

    return link.original_url;
}

function queueClick(code, referrer) {
    addClickJob(code, referrer).catch((error) => {
        console.error("Failed to queue click analytics:", error.message);
    });
}

export async function redirectToOriginalUrl(request, response, next) {
    try {
        const { code } = request.params;

        if (!isValidShortCode(code)) {
            throw new AppError("Short link not found", 404);
        }

        const originalUrl = await findOriginalUrl(code);

        if (!originalUrl) {
            throw new AppError("Short link not found", 404);
        }

        const referrer = request.get("referer") || "Direct";
        queueClick(code, referrer);

        response.redirect(302, originalUrl);
    } catch (error) {
        next(error);
    }
}
'@

$files["src\controllers\analyticsController.js"] = @'
import { getAnalyticsForCode } from "../services/analyticsService.js";

export async function getAnalytics(request, response, next) {
    try {
        const { code } = request.params;
        const analytics = await getAnalyticsForCode(code);

        response.json(analytics);
    } catch (error) {
        next(error);
    }
}
'@

$files["src\routes\urlRoutes.js"] = @'
import { Router } from "express";

import { createUrl } from "../controllers/urlController.js";

const router = Router();

router.post("/", createUrl);

export default router;
'@

$files["src\routes\redirectRoutes.js"] = @'
import { Router } from "express";

import { redirectToOriginalUrl } from "../controllers/redirectController.js";

const router = Router();

router.get("/:code", redirectToOriginalUrl);

export default router;
'@

$files["src\routes\analyticsRoutes.js"] = @'
import { Router } from "express";

import { getAnalytics } from "../controllers/analyticsController.js";

const router = Router();

router.get("/:code", getAnalytics);

export default router;
'@

$files["src\routes\healthRoutes.js"] = @'
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
'@

$files["src\middleware\errorHandler.js"] = @'
import AppError from "../utils/AppError.js";

export function errorHandler(error, request, response, next) {
    if (error instanceof AppError) {
        response.status(error.statusCode).json({
            error: {
                message: error.message,
            },
        });
        return;
    }

    console.error("Unexpected error:", error);

    response.status(500).json({
        error: {
            message: "Internal server error",
        },
    });
}

export function notFoundHandler(request, response) {
    response.status(404).json({
        error: {
            message: "Route not found",
        },
    });
}
'@

$files["src\app.js"] = @'
import cors from "cors";
import express from "express";

import env from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import redirectRoutes from "./routes/redirectRoutes.js";
import urlRoutes from "./routes/urlRoutes.js";

const app = express();

app.use(cors({ origin: env.clientOrigin }));
app.use(express.json());

app.use("/api/urls", urlRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/health", healthRoutes);

// Must stay last: it matches any single-segment path as a short code.
app.use("/", redirectRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
'@

$files["server.js"] = @'
import app from "./src/app.js";
import env from "./src/config/env.js";
import pool from "./src/db/pool.js";

async function checkDatabaseConnection() {
    try {
        await pool.query("SELECT 1");
        console.log("Connected to MySQL");
    } catch (error) {
        console.error("Could not connect to MySQL:", error.message);
        process.exit(1);
    }
}

async function startServer() {
    await checkDatabaseConnection();

    app.listen(env.port, () => {
        console.log(`Server listening on port ${env.port}`);
        console.log(`Short links will use base URL: ${env.baseUrl}`);
    });
}

startServer();
'@

$files["worker.js"] = @'
import { Worker } from "bullmq";

import pool from "./src/db/pool.js";
import { insertClick } from "./src/db/clickRepository.js";
import redisConnection from "./src/queue/redisConnection.js";
import { CLICK_QUEUE_NAME } from "./src/queue/clickQueue.js";

const MAX_REFERRER_LENGTH = 2048;

async function processClickJob(job) {
    const { shortCode, referrer, clickedAt } = job.data;

    const truncatedReferrer = (referrer || "Direct").slice(0, MAX_REFERRER_LENGTH);
    const clickedAtDate = new Date(clickedAt);

    await insertClick(shortCode, truncatedReferrer, clickedAtDate);
}

const clickWorker = new Worker(CLICK_QUEUE_NAME, processClickJob, {
    connection: redisConnection,
    concurrency: 5,
});

clickWorker.on("completed", (job) => {
    console.log(`Recorded click for ${job.data.shortCode}`);
});

clickWorker.on("failed", (job, error) => {
    console.error(
        `Failed to record click for ${job?.data?.shortCode} (attempt ${job?.attemptsMade}):`,
        error.message
    );
});

clickWorker.on("error", (error) => {
    console.error("Worker error:", error.message);
});

async function shutdown() {
    console.log("Shutting down worker...");
    await clickWorker.close();
    await pool.end();
    await redisConnection.quit();
    process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log(`Worker listening on queue "${CLICK_QUEUE_NAME}"`);
'@

foreach ($path in $files.Keys) {
    $fullPath = Join-Path (Get-Location) $path
    $directory = Split-Path $fullPath -Parent

    if (-not (Test-Path $directory)) {
        New-Item -ItemType Directory -Path $directory -Force | Out-Null
    }

    Set-Content -Path $fullPath -Value $files[$path] -Encoding UTF8 -ErrorAction Stop
    Write-Host "Written: $path"
}

Write-Host ""
Write-Host "All backend files created successfully." -ForegroundColor Green
