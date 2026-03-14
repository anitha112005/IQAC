// backend/src/routes/aiRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  accreditationReport,
  studentIntervention,
  departmentRanking,
  naturalLanguageSearch,
  placementForecast,
  generatePDF
} from "../controllers/aiController.js";

const router = express.Router();
router.use(protect); // all AI routes require login

router.post("/accreditation-report", accreditationReport);
router.get("/student-intervention/:id", studentIntervention);
router.get("/department-ranking", departmentRanking);
router.post("/search", naturalLanguageSearch);
router.post("/placement-forecast", placementForecast);
router.post("/generate-pdf", generatePDF);

export default router;
