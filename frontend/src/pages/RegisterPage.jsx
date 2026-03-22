import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./RegisterPage.css";
import ReCAPTCHA from "react-google-recaptcha";


export default function RegisterPage() {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");

  const API_BASE = import.meta.env.VITE_API_URL || "https://contact-qia9.onrender.com";

  const navigate = useNavigate();

  const handleNavigate = () => navigate("/login");

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });
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
    const res = await axios.post(`${API_BASE}/api/auth/register`, {
      ...form,
      captchaToken
    });
    
    setMessage(res.data.message);

    // ✅ This will now work because /verify is NOT protected in App.js
    navigate("/verify", { 
      state: { email: form.email },
      replace: true 
    });
  } catch (err) {
    setMessage(err.response?.data?.message || "Error occurred");
  }

  setLoading(false);
};

const RECAPTCHA_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LdFVYosAAAAADgLaH0avabN4PT0FS5HFm-n5mgX";



  return (
    <div className="register-container">
      <form className="register-form" onSubmit={handleSubmit}>
        <h2>Create Account</h2>
        <input type="text" name="username" placeholder="Username" value={form.username} onChange={handleChange} required />
        <input type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} required />
        <input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} required />
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
        <button style={{ marginTop: "10px" }} type="submit" disabled={loading}>{loading ? "Sending OTP..." : "Register"}</button>
        {message && <p className="message">{message}</p>}
                <p className="auth-switch" onClick={handleNavigate}>
  Have an account? Login
</p>
      </form>
    </div>
  );
}