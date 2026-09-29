import { getAnalyticsForCode } from "../services/analyticsService.js";

export async function getAnalytics(request, response, next) {
    try {
        const { code } = request.params;
        const analytics = await getAnalyticsForCode(code);

        response.json(analytics);
    } catch (error) {
        next(error);
    }
}