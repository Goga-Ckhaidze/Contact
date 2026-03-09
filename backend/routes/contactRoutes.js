import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";

import {
  sendFriendRequest,
  acceptRequest,
  rejectRequest,
  cancelRequest,
  getPendingRequests,
  getSentRequests,
  getFriends,
  deleteFriend,    // Added this
  getFriendCount   // Added this
} from "../controllers/contactController.js";

const router = express.Router();

router.post("/request", authMiddleware, sendFriendRequest);
router.post("/accept", authMiddleware, acceptRequest);
router.post("/reject", authMiddleware, rejectRequest);
router.post("/cancel", authMiddleware, cancelRequest);
router.get("/pending", authMiddleware, getPendingRequests);
router.get("/sent", authMiddleware, getSentRequests);
router.get("/friends", authMiddleware, getFriends);

/* === New Routes === */
router.delete("/delete/:contactId", authMiddleware, deleteFriend);
router.get("/count", authMiddleware, getFriendCount);

export default router;