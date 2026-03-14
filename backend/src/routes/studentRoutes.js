import { Router } from "express";
import {
  addSemesterMetric,
  createStudent,
  getStudentDashboard,
  listStudents
} from "../controllers/studentController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/", protect, authorize("admin", "hod"), createStudent);
router.get("/", protect, authorize("admin", "hod", "faculty"), listStudents);
router.get("/:studentId/dashboard", protect, authorize("admin", "hod", "faculty", "student"), getStudentDashboard);
router.post("/:studentId/metrics", protect, authorize("admin", "hod", "faculty"), addSemesterMetric);

export default router;
