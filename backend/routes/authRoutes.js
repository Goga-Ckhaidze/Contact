import express from "express";
import { body } from "express-validator";
import { registerUser, verifyUser, loginUser, getMe, logoutUser } from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// REGISTER
router.post(
  "/register",
  [
    body("username").isLength({ min: 3 }).withMessage("Username too short"),
    body("email").isEmail().withMessage("Invalid email"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters")
      .matches(/[A-Z]/)
      .withMessage("Password must contain at least one uppercase letter")
      .matches(/[0-9]/)
      .withMessage("Password must contain at least one number"),
  ],
  registerUser
);

// VERIFY
router.post(
  "/verify2fa",
  [
    body("email").isEmail().withMessage("Invalid email"),
    body("code").isLength({ min: 6, max: 6 }).withMessage("Code must be 6 digits"),
  ],
  verifyUser
);

// LOGIN
router.post("/login", loginUser);

// ✅ LOGOUT
router.post("/logout", authMiddleware, (req, res) => {
  // Clear the cookie
  res.clearCookie("token", { httpOnly: true, sameSite: "none", secure: true });
  res.json({ message: "Logged out successfully" });
});

// ✅ GET CURRENT USER
router.get("/me", authMiddleware, getMe);

export default router;