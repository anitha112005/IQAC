// backend/src/routes/aiRoutes.js

import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  generatePDF,
  studentIntervention,
  departmentRanking,
  naturalLanguageSearch,
  placementForecast
} from "../controllers/aiController.js";

const router = express.Router();

router.use(protect);

router.post("/generate-pdf", generatePDF);
router.get("/student-intervention/:id", studentIntervention);
router.get("/department-ranking", departmentRanking);
router.post("/search", naturalLanguageSearch);
router.post("/placement-forecast", placementForecast);

export default router;
