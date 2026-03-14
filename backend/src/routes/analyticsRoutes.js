import { Router } from "express";
import { departmentComparison, institutionalOverview, riskStudents } from "../controllers/analyticsController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/overview", protect, authorize("admin", "hod", "faculty"), institutionalOverview);
router.get("/department-comparison", protect, authorize("admin", "hod"), departmentComparison);
router.get("/risk-students", protect, authorize("admin", "hod", "faculty"), riskStudents);

export default router;
