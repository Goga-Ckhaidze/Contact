import Stripe from "stripe";
import User from "../models/User.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create subscription checkout session
export const createSubscriptionSession = async (req, res) => {
  const { priceId } = req.body;
  if (!priceId) return res.status(400).json({ error: "Missing priceId" });

  try {
    // 1. PREVENT DOUBLE BUY: Check if user already has an active, unexpired sub
    let isActive = req.user.chatbotSubscriptionActive || false;
    const expiresAt = req.user.chatbotSubscriptionExpires || null;
    
    if (isActive && expiresAt && new Date(expiresAt) > new Date()) {
      return res.status(400).json({ error: "You already have an active subscription." });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: req.user.email,
      client_reference_id: String(req.user._id),
      success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/payment-cancel`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe session error:", err);
    res.status(500).json({ error: "Failed to create subscription" });
  }
};

export const getSubscriptionStatus = async (req, res) => {
  try {
    const user = req.user;

    let active = user.chatbotSubscriptionActive || false;
    const expiresAt = user.chatbotSubscriptionExpires || null;

    // 2. SERVER-SIDE EXPIRATION CHECK
    if (active && expiresAt && new Date(expiresAt) < new Date()) {
      active = false; // Mark as inactive if the expiration date is in the past
    }

    res.json({ active, expiresAt });
  } catch (err) {
    console.error("Subscription status error:", err);
    res.status(500).json({ message: "Failed to fetch subscription status" });
  }
};

// Stripe webhook to confirm payment
export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  // 1. ADD THIS: This tells you if the endpoint is even being called
  console.log("🔔 Webhook received! Signature head exists:", !!sig);

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    console.log("✅ 2. Event verified:", event.type);
  } catch (err) {
    // If you see this in Render logs, your STRIPE_WEBHOOK_SECRET is wrong
    console.error("❌ X. Verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    console.log("💳 3. Payment Success Session ID:", session.id);
    console.log("👤 4. UserID (client_reference_id):", session.client_reference_id);
    
    try {
      const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['line_items'],
      });

      const userId = session.client_reference_id;
      // ... your expiration logic ...

      const updated = await User.findByIdAndUpdate(userId, {
        chatbotSubscriptionActive: true,
        chatbotSubscriptionExpires: expiresAt
      }, { new: true }); // 'new: true' helps us verify the update worked

      console.log("🚀 5. DB Update Success for user:", updated?.username);

    } catch (err) {
      console.error("❌ DB Update Error:", err);
    }
  }

  res.json({ received: true });
};