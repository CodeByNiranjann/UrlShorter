const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

async function parseResponse(response) {
    let responseBody = null;

    try {
        responseBody = await response.json();
    } catch (error) {
        // The response had no JSON body. The status check below handles it.
    }

    if (!response.ok) {
        const message = responseBody?.error?.message || "Something went wrong. Please try again.";
        throw new Error(message);
    }

    return responseBody;
}

export async function createShortUrl(originalUrl) {
    const response = await fetch(`${API_BASE_URL}/api/urls`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ originalUrl }),
    });

    return parseResponse(response);
}

export async function fetchAnalytics(code) {
    const response = await fetch(
        `${API_BASE_URL}/api/analytics/${encodeURIComponent(code)}`
    );

    return parseResponse(response);
}