import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./RegisterPage.css";
import ReCAPTCHA from "react-google-recaptcha";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");

  const API_BASE = import.meta.env.VITE_API_URL || "https://contact-qia9.onrender.com";

  const navigate = useNavigate();

  const handleNavigate = () => navigate("/register");

  const handleChange = e =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (!captchaToken) {
      setMessage("Please verify that you are not a robot.");
      setLoading(false);
      return;
    }

    try {
      await axios.post(
        `${API_BASE}/api/auth/login`,
        { ...form, captchaToken },
        { withCredentials: true }
      );

      setMessage("Login successful!");
      // ✅ Use replace so they can't click "back" into the login page
      navigate("/", { replace: true }); 
      
      // Force a quick refresh if you aren't using a Global Auth State
      // window.location.reload(); 
    } catch (err) {
      setMessage(err.response?.data?.message || "Login failed");
    }

    setLoading(false);
  };

  const RECAPTCHA_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LdFVYosAAAAADgLaH0avabN4PT0FS5HFm-n5mgX";
console.log("DEBUG - Sitekey value:", import.meta.env.VITE_RECAPTCHA_SITE_KEY);
  return (
    <div className="register-container">
      <form className="register-form" onSubmit={handleSubmit}>
        <h2>Login</h2>

        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          required
        />

{RECAPTCHA_KEY ? (
  <ReCAPTCHA
    key="login-captcha" 
    className="g-recaptcha"
    sitekey={RECAPTCHA_KEY}
    onChange={token => setCaptchaToken(token)}
    onExpired={() => setCaptchaToken("")}
  />
) : (
  <p style={{ color: "red" }}>Recaptcha Key Missing!</p>
)}

        <button style={{ marginTop: "10px" }} type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>

        {message && <p className="message">{message}</p>}

        <p className="auth-switch" onClick={handleNavigate}>
          Don't have an account? Register
        </p>
      </form>
    </div>
  );
}