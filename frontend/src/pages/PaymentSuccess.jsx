import React, { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "../axiosInstance.js";
import "./PaymentSuccess.css";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const navigate = useNavigate();


useEffect(() => {
  const verifySubscription = async () => {
    try {
      if (sessionId) {
        // 1. Tell the backend to verify this specific Stripe session
        await axios.post("/api/subscription/verify-session", 
          { sessionId }, 
          { withCredentials: true }
        );
      }
      
      // 2. Now check the status to confirm it updated
      const { data } = await axios.get("/api/subscription/status", {
        withCredentials: true
      });

      console.log("Subscription status:", data);
    } catch (err) {
      console.error("Verification failed:", err);
    }
  };

  verifySubscription();
}, [sessionId]);

  return (
    <div className="payment-success-container">
      <h1>🎉 Payment Successful!</h1>
      <p>Your subscription is now active.</p>
      <button onClick={() => navigate("/")}>Go to Dashboard</button>
    </div>
  );
};

export default PaymentSuccess;