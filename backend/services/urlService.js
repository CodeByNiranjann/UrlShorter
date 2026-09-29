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