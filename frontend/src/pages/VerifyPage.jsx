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

const handleVerify = async (e) => {
  e.preventDefault();
  setLoading(true);
  setMessage("");

  try {
    const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/verify2fa`, {
      email,
      code: code.toString(), // always string
    });

    setMessage(res.data.message);
    navigate("/");
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