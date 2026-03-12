import React, { useEffect, useState } from "react";
import axios from "../axiosInstance.js";
import "./BuyChatbot.css";

const BuyChatbot = () => {
const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  const priceIds = {
    weekly: "price_1T9Te2EHZEyafrxdgQG1euZ6",
    monthly: "price_1T9TekEHZEyafrxdNEm5O2IJ",
    yearly: "price_1T9TexEHZEyafrxdyaOg7Qxi"
  };

  // Fetch subscription status
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        // Use the dedicated status endpoint
        const { data } = await axios.get("/api/subscription/status", { withCredentials: true });
        
        // Only set true if active AND the expiration date is in the future
        const isActiveAndValid = data.active && (!data.expiresAt || new Date(data.expiresAt) > new Date());
        setIsSubscribed(isActiveAndValid);
      } catch (err) {
        console.error("Failed to fetch subscription status:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  const handleBuy = async (plan) => {
    if (isSubscribed) {
      alert("You already have an active subscription!");
      return;
    }

    try {
      const { data } = await axios.post(
        "/api/subscription/create-subscription",
        { priceId: priceIds[plan] },
        { withCredentials: true }
      );

      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      // Show backend error message if they try to bypass the UI block
      alert(err.response?.data?.error || "Payment failed. Try again.");
    }
  };

  if (loading) return <p>Loading subscription status...</p>;
  return (
    <div className="pricing-container">
      <h1 className="pricing-title">Unlock AI Assistant</h1>
      <p className="pricing-subtitle">
        Choose a plan to activate the chatbot assistant
      </p>

      <div className="pricing-grid">

        {/* WEEKLY */}
        <div className="pricing-card">
          <h2>Weekly</h2>
          <div className="price">$5</div>
          <p className="period">per week</p>
          <ul>
            <li>AI Assistant access</li>
            <li>Friend management commands</li>
            <li>Basic AI responses</li>
          </ul>
          <button 
            onClick={() => handleBuy("weekly")}
            disabled={isSubscribed}
          >
            {isSubscribed ? "Subscribed" : "Start Weekly"}
          </button>
        </div>

        {/* MONTHLY */}
        <div className="pricing-card featured">
          <div className="badge1">Most Popular</div>
          <h2>Monthly</h2>
          <div className="price">$15</div>
          <p className="period">per month</p>
          <ul>
            <li>Full AI assistant</li>
            <li>Unlimited friend commands</li>
            <li>Faster responses</li>
            <li>Priority support</li>
          </ul>
          <button 
            onClick={() => handleBuy("monthly")}
            disabled={isSubscribed}
          >
            {isSubscribed ? "Subscribed" : "Start Monthly"}
          </button>
        </div>

        {/* YEARLY */}
        <div className="pricing-card">
          <h2>Yearly</h2>
          <div className="price">$150</div>
          <p className="period">per year</p>
          <ul>
            <li>Everything in monthly</li>
            <li>Best value plan</li>
            <li>Long term access</li>
          </ul>
          <button 
            onClick={() => handleBuy("yearly")}
            disabled={isSubscribed}
          >
            {isSubscribed ? "Subscribed" : "Start Yearly"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default BuyChatbot;