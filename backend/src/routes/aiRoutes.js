// aiRoutes.js — 8 AI-powered routes for IQAC system
import { Router } from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import {
  studentProgressReport,
  departmentPerformanceReport,
  cgpaDistributionAnalysis,
  backlogAnalysisReport,
  placementForecastReport,
  facultyContributionReport,
  accreditationReadinessAssessment,
  naturalLanguageSearch,
  streamingSearch
} from "../controllers/aiController.js";

const router = Router();

// All routes require authentication
router.use(protect);

router.post("/student-progress-report",   authorize("admin", "hod"), studentProgressReport);
router.post("/department-performance",     authorize("admin", "hod"), departmentPerformanceReport);
router.get("/cgpa-distribution",           authorize("admin", "hod", "faculty"), cgpaDistributionAnalysis);
router.post("/backlog-analysis",           authorize("admin", "hod"), backlogAnalysisReport);
router.post("/placement-forecast",         authorize("admin", "hod"), placementForecastReport);
router.post("/faculty-contribution",       authorize("admin", "hod", "faculty"), facultyContributionReport);
router.get("/accreditation-readiness",     authorize("admin", "hod"), accreditationReadinessAssessment);
router.post("/search",                     authorize("admin", "hod", "faculty"), naturalLanguageSearch);
router.post("/search-stream",              authorize("admin", "hod", "faculty"), streamingSearch);

export default router;
