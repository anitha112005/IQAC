import { Router } from "express";
import { login, me, publicRegister, register } from "../controllers/authController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/register", protect, authorize("admin"), register);
router.post("/public-signup", publicRegister);
router.post("/login", login);
router.get("/me", protect, me);

export default router;
