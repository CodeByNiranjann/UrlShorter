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