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