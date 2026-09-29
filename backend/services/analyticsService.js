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