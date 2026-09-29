import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mysql from "mysql2/promise";
import Redis from "ioredis";
import { Queue } from "bullmq";
import { randomInt } from "node:crypto";

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
});

const redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
redis.on("error", (err) => console.error("Redis error:", err.message));

const clickQueue = new Queue("click-analytics", { connection: redis });

const BASE62_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function generateCode() {
    let code = "";
    for (let i = 0; i < 7; i++) {
        code += BASE62_CHARS[randomInt(BASE62_CHARS.length)];
    }
    return code;
}

function isValidCode(code) {
    return /^[a-zA-Z0-9]{1,16}$/.test(code);
}

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.post("/api/urls", async (req, res) => {
    try {
        const { originalUrl } = req.body;

        if (!originalUrl || typeof originalUrl !== "string") {
            return res.status(400).json({ error: { message: "Missing URL" } });
        }

        let parsed;
        try {
            parsed = new URL(originalUrl);
        } catch {
            return res.status(400).json({ error: { message: "Invalid URL" } });
        }

        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            return res.status(400).json({ error: { message: "Invalid URL" } });
        }

        let code;
        let inserted = false;

        for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
            code = generateCode();
            try {
                await pool.execute(
                    "INSERT INTO short_links (code, original_url) VALUES (?, ?)",
                    [code, originalUrl.trim()]
                );
                inserted = true;
            } catch (err) {
                if (err.code !== "ER_DUP_ENTRY") throw err;
            }
        }

        if (!inserted) {
            return res.status(500).json({ error: { message: "Could not generate a unique code" } });
        }

        res.status(201).json({ code, shortUrl: `${BASE_URL}/${code}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: { message: "Internal server error" } });
    }
});

app.get("/:code", async (req, res) => {
    try {
        const { code } = req.params;

        if (!isValidCode(code)) {
            return res.status(404).json({ error: { message: "Short link not found" } });
        }

        let originalUrl = null;

        try {
            originalUrl = await redis.get(`url:${code}`);
        } catch (err) {
            console.error("Redis read failed:", err.message);
        }

        if (!originalUrl) {
            const [rows] = await pool.execute(
                "SELECT original_url FROM short_links WHERE code = ? LIMIT 1",
                [code]
            );

            if (rows.length === 0) {
                return res.status(404).json({ error: { message: "Short link not found" } });
            }

            originalUrl = rows[0].original_url;

            redis.set(`url:${code}`, originalUrl, "EX", 86400).catch((err) =>
                console.error("Redis write failed:", err.message)
            );
        }

        const referrer = req.get("referer") || "Direct";

        clickQueue
            .add("record-click", { shortCode: code, referrer, clickedAt: new Date().toISOString() })
            .catch((err) => console.error("Failed to queue click:", err.message));

        res.redirect(302, originalUrl);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: { message: "Internal server error" } });
    }
});

app.get("/api/analytics/:code", async (req, res) => {
    try {
        const { code } = req.params;

        if (!isValidCode(code)) {
            return res.status(400).json({ error: { message: "Invalid short code" } });
        }

        const [linkRows] = await pool.execute(
            "SELECT code, original_url FROM short_links WHERE code = ? LIMIT 1",
            [code]
        );

        if (linkRows.length === 0) {
            return res.status(404).json({ error: { message: "Short link not found" } });
        }

        const [[{ total_clicks }]] = await pool.execute(
            "SELECT COUNT(*) AS total_clicks FROM clicks WHERE short_code = ?",
            [code]
        );

        const [referrerRows] = await pool.execute(
            `SELECT referrer, COUNT(*) AS click_count FROM clicks
             WHERE short_code = ? GROUP BY referrer ORDER BY click_count DESC LIMIT 20`,
            [code]
        );

        const [dailyRows] = await pool.execute(
            `SELECT DATE_FORMAT(clicked_at, '%Y-%m-%d') AS click_date, COUNT(*) AS click_count
             FROM clicks WHERE short_code = ? GROUP BY click_date ORDER BY click_date ASC`,
            [code]
        );

        res.json({
            code: linkRows[0].code,
            shortUrl: `${BASE_URL}/${linkRows[0].code}`,
            originalUrl: linkRows[0].original_url,
            totalClicks: Number(total_clicks),
            referrers: referrerRows.map((r) => ({ referrer: r.referrer, count: Number(r.click_count) })),
            clicksOverTime: dailyRows.map((r) => ({ date: r.click_date, count: Number(r.click_count) })),
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: { message: "Internal server error" } });
    }
});

app.get("/api/health", async (req, res) => {
    let mysqlStatus = "down";
    let redisStatus = "down";

    try {
        await pool.query("SELECT 1");
        mysqlStatus = "up";
    } catch (err) {
        console.error("MySQL health check failed:", err.message);
    }

    try {
        await redis.ping();
        redisStatus = "up";
    } catch (err) {
        console.error("Redis health check failed:", err.message);
    }

    const healthy = mysqlStatus === "up" && redisStatus === "up";
    res.status(healthy ? 200 : 503).json({ status: healthy ? "ok" : "degraded", mysql: mysqlStatus, redis: redisStatus });
});

async function start() {
    try {
        await pool.query("SELECT 1");
        console.log("Connected to MySQL");
    } catch (err) {
        console.error("Could not connect to MySQL:", err.message);
        process.exit(1);
    }

    app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
}

start();