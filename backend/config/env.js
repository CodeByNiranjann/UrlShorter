import dotenv from "dotenv";

dotenv.config();

const requiredVariables = [
    "BASE_URL",
    "DB_HOST",
    "DB_USER",
    "DB_PASSWORD",
    "DB_NAME",
    "REDIS_URL",
];

const missingVariables = requiredVariables.filter(
    (variableName) => !process.env[variableName]
);

if (missingVariables.length > 0) {
    throw new Error(
        `Missing required environment variables: ${missingVariables.join(", ")}`
    );
}

const env = {
    port: Number(process.env.PORT) || 3000,
    baseUrl: process.env.BASE_URL.replace(/\/+$/, ""),
    clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    db: {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        name: process.env.DB_NAME,
    },
    redisUrl: process.env.REDIS_URL,
};

export default env;