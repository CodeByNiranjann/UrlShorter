import app from "./src/app.js";
import env from "./src/config/env.js";
import pool from "./src/db/pool.js";

async function checkDatabaseConnection() {
    try {
        await pool.query("SELECT 1");
        console.log("Connected to MySQL");
    } catch (error) {
        console.error("Could not connect to MySQL:", error.message);
        process.exit(1);
    }
}

async function startServer() {
    await checkDatabaseConnection();

    app.listen(env.port, () => {
        console.log(`Server listening on port ${env.port}`);
        console.log(`Short links will use base URL: ${env.baseUrl}`);
    });
}

startServer();