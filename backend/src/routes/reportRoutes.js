import { Router } from "express";
import {
	departmentReport,
	facultyReport,
	generateReport,
	reportHistory,
	studentReport
} from "../controllers/reportController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/generate", protect, authorize("admin", "hod"), generateReport);
router.get("/history", protect, authorize("admin", "hod"), reportHistory);
router.get("/faculty", protect, authorize("admin", "hod"), facultyReport);
router.get("/department", protect, authorize("admin", "hod"), departmentReport);
router.get("/student", protect, authorize("admin", "hod"), studentReport);

export default router;
