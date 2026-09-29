import { Router } from "express";

import { getAnalytics } from "../controllers/analyticsController.js";

const router = Router();

router.get("/:code", getAnalytics);

export default router;