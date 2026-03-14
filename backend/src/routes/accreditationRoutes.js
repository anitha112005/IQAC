import { Router } from "express";
import {
  addAccreditationItem,
  listAccreditationItems,
  readinessScore
} from "../controllers/accreditationController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/items", protect, authorize("admin", "hod", "faculty"), addAccreditationItem);
router.get("/items", protect, authorize("admin", "hod", "faculty"), listAccreditationItems);
router.get("/readiness", protect, authorize("admin", "hod"), readinessScore);

export default router;
