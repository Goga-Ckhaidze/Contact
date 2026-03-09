import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import upload from "../config/multer.js";

import {
  searchUsers,
  getProfile,
  updateProfile,
  changePassword,
  uploadAvatar,
  // getFriendCount was removed from here
} from "../controllers/userController.js";

const router = express.Router();

router.get("/search", authMiddleware, searchUsers);
router.get("/me", authMiddleware, getProfile);
router.put("/update", authMiddleware, updateProfile);
router.put("/change-password", authMiddleware, changePassword);
router.post(
  "/upload-avatar",
  authMiddleware,
  upload.single("avatar"),
  uploadAvatar
);

// Note: I removed the /friend-count route from here. 
// It is now in contactRoutes.js as /api/contacts/count

export default router;