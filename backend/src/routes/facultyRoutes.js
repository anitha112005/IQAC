import { Router } from "express";
import {
	addFacultyAchievement,
	addResearch,
	assignFacultySections,
	facultyAnalytics,
	getFacultyProfile,
	getSectionAttendanceReport,
	listFacultyAchievements,
	markSectionAttendance,
	updateFacultyProfile,
	uploadAttendance,
	uploadMarks
} from "../controllers/facultyController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/students/:studentId/marks", protect, authorize("faculty", "hod", "admin"), uploadMarks);
router.post("/students/:studentId/attendance", protect, authorize("faculty", "hod", "admin"), uploadAttendance);
router.post("/research", protect, authorize("faculty", "hod", "admin"), addResearch);
router.get("/profile", protect, authorize("faculty", "hod", "admin"), getFacultyProfile);
router.put("/profile", protect, authorize("faculty", "hod", "admin"), updateFacultyProfile);
router.post("/achievements", protect, authorize("faculty", "hod", "admin"), addFacultyAchievement);
router.get("/achievements", protect, authorize("faculty", "hod", "admin"), listFacultyAchievements);
router.put("/sections", protect, authorize("faculty", "hod", "admin"), assignFacultySections);
router.post("/sections/:sectionId/attendance", protect, authorize("faculty", "hod", "admin"), markSectionAttendance);
router.get("/sections/:sectionId/attendance-report", protect, authorize("faculty", "hod", "admin"), getSectionAttendanceReport);
router.get("/analytics", protect, authorize("faculty", "hod", "admin"), facultyAnalytics);

export default router;
