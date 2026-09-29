import { Router } from "express";

import { redirectToOriginalUrl } from "../controllers/redirectController.js";

const router = Router();

router.get("/:code", redirectToOriginalUrl);

export default router;