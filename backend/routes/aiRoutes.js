import express from "express";
import { handleChat } from "../controllers/aiController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/chat", authMiddleware, handleChat);

export default router;