// routes/subscriptionRoutes.js
import express from "express";
import { createSubscriptionSession, stripeWebhook, getSubscriptionStatus, verifySubscriptionSession } from "../controllers/subscriptionController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// This specific route needs the raw body for Stripe signature verification
router.post("/webhook", express.raw({ type: "application/json" }), stripeWebhook);

// These need JSON, so we add the middleware specifically here or after the webhook
router.post("/create-subscription", express.json(), authMiddleware, createSubscriptionSession);


router.get("/verify-session", authMiddleware, verifySubscriptionSession);

router.get("/status", authMiddleware, getSubscriptionStatus);

export default router;