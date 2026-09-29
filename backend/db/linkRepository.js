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