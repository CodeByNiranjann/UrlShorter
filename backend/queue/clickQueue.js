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