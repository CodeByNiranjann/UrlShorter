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