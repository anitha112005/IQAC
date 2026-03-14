import { Router } from "express";
import {
  addAchievement,
  addPlacement,
  createDepartment,
  departmentAnalytics,
  listDepartments
} from "../controllers/departmentController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/", protect, authorize("admin"), createDepartment);
router.get("/", protect, authorize("admin", "hod", "faculty"), listDepartments);
router.get("/:departmentId/analytics", protect, authorize("admin", "hod", "faculty"), departmentAnalytics);
router.post("/:departmentId/placement", protect, authorize("admin", "hod"), addPlacement);
router.post("/:departmentId/achievement", protect, authorize("admin", "hod", "faculty"), addAchievement);

export default router;
