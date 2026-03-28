import Stripe from "stripe";
import User from "../models/User.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createSubscriptionSession = async (req, res) => {
  const { priceId } = req.body;
  if (!priceId) return res.status(400).json({ error: "Missing priceId" });

  try {
    const isActive = req.user.chatbotSubscriptionActive || false;
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
    console.error("Stripe Session Error:", err.message);
    res.status(500).json({ error: "Failed to create subscription" });
  }
};

export const getSubscriptionStatus = async (req, res) => {
  try {
    // Fetch fresh from DB to ensure UI is in sync
    const user = await User.findById(req.user._id);
    let active = user.chatbotSubscriptionActive || false;
    const expiresAt = user.chatbotSubscriptionExpires || null;

    if (active && expiresAt && new Date(expiresAt) < new Date()) {
      active = false;
    }

    res.json({ active, expiresAt });
  } catch (err) {
    console.error("Status Fetch Error:", err.message);
    res.status(500).json({ message: "Failed to fetch status" });
  }
};

export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook Signature Verification Failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    
    try {
      const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['line_items'],
      });

      const userId = session.client_reference_id;
      const interval = fullSession.line_items.data[0].price.recurring.interval;

      let expiresAt = new Date();
      if (interval === "week") expiresAt.setDate(expiresAt.getDate() + 7);
      else if (interval === "month") expiresAt.setMonth(expiresAt.getMonth() + 1);
      else if (interval === "year") expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      await User.findByIdAndUpdate(userId, {
        chatbotSubscriptionActive: true,
        chatbotSubscriptionExpires: expiresAt
      });
      
      console.log(`Subscription activated for User: ${userId}`);
    } catch (err) {
      console.error("Webhook DB Update Error:", err.message);
    }
  }

  res.json({ received: true });
};

export const verifySubscriptionSession = async (req, res) => {
  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: "Missing session_id" });

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status === "paid") {
      const userId = session.client_reference_id;
      
      // Default to 1 month for instant verification
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      await User.findByIdAndUpdate(userId, {
        chatbotSubscriptionActive: true,
        chatbotSubscriptionExpires: expiresAt,
      });

      return res.json({ success: true });
    } 
    res.status(400).json({ success: false });
  } catch (err) {
    console.error("Session Verification Error:", err.message);
    res.status(500).json({ error: "Verification failed" });
  }
};