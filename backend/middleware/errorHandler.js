import AppError from "../utils/AppError.js";

export function errorHandler(error, request, response, next) {
    if (error instanceof AppError) {
        response.status(error.statusCode).json({
            error: {
                message: error.message,
            },
        });
        return;
    }

    console.error("Unexpected error:", error);

    response.status(500).json({
        error: {
            message: "Internal server error",
        },
    });
}

export function notFoundHandler(request, response) {
    response.status(404).json({
        error: {
            message: "Route not found",
        },
    });
}