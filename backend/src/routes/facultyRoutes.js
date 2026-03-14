import { Router } from "express";
import { addResearch, uploadAttendance, uploadMarks } from "../controllers/facultyController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/students/:studentId/marks", protect, authorize("faculty", "hod", "admin"), uploadMarks);
router.post("/students/:studentId/attendance", protect, authorize("faculty", "hod", "admin"), uploadAttendance);
router.post("/research", protect, authorize("faculty", "hod", "admin"), addResearch);

export default router;
