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