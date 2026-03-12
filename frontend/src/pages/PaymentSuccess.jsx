import React, { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "../axiosInstance.js";
import "./PaymentSuccess.css";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionId) return;

    const verifySession = async () => {
      try {
        const { data } = await axios.post(
          "/api/subscription/verify-session",
          { sessionId },
          { withCredentials: true }
        );
      } catch (err) {
        console.error("Verification failed:", err);
      }
    };

    verifySession();
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