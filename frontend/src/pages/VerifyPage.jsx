import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./VerifyPage.css";

function VerifyPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const emailFromState = location.state?.email || "";

  const [email, setEmail] = useState(emailFromState);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

const API_BASE = import.meta.env.VITE_API_URL;

const handleVerify = async (e) => {
  e.preventDefault();
  setLoading(true);
  setMessage("");

  if (!API_BASE) {
    setMessage("API URL not configured");
    console.error("❌ VITE_API_URL is missing");
    setLoading(false);
    return;
  }

try {
      // ✅ FIXED AXIOS CALL
      const res = await axios.post(
        `${API_BASE}/api/auth/verify2fa`,
        { email, code: code.toString() }, // Data object
        { withCredentials: true }         // Config object (for cookies)
      );

      setMessage(res.data.message);
      // Redirect to home - using replace: true helps clear the "verify" page from history
      navigate("/", { replace: true });
    } catch (err) {
      setMessage(err.response?.data?.message || "Error occurred");
    }

    setLoading(false);
  };

  return (
    <div className="verify-container">
      <form className="verify-form" onSubmit={handleVerify}>
        <h2>2FA Verification</h2>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="text" placeholder="Enter OTP" value={code} onChange={(e) => setCode(e.target.value)} required />
        <button type="submit" disabled={loading}>
          {loading ? "Verifying..." : "Verify"}
        </button>
        {message && <p className="message">{message}</p>}
      </form>
    </div>
  );
}

export default VerifyPage;