import { Router } from "express";

import { createUrl } from "../controllers/urlController.js";

const router = Router();

router.post("/", createUrl);

export default router;