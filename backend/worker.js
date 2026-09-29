import dotenv from "dotenv";
import mysql from "mysql2/promise";
import Redis from "ioredis";
import { Worker } from "bullmq";

dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

const redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null });

const worker = new Worker(
    "click-analytics",
    async (job) => {
        const { shortCode, referrer, clickedAt } = job.data;
        await pool.execute(
            "INSERT INTO clicks (short_code, referrer, clicked_at) VALUES (?, ?, ?)",
            [shortCode, (referrer || "Direct").slice(0, 2048), new Date(clickedAt)]
        );
    },
    { connection: redis }
);

worker.on("completed", (job) => console.log(`Recorded click for ${job.data.shortCode}`));
worker.on("failed", (job, err) => console.error(`Click failed for ${job?.data?.shortCode}:`, err.message));

console.log("Worker listening on queue \"click-analytics\"");