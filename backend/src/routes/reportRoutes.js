import { Router } from "express";
import { generateReport, reportHistory } from "../controllers/reportController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/generate", protect, authorize("admin", "hod"), generateReport);
router.get("/history", protect, authorize("admin", "hod"), reportHistory);

export default router;
