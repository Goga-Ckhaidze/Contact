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
    const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/register`, {
      ...form,
      captchaToken
    });
    setMessage(res.data.message);

    navigate("/verify", { state: { email: form.email, previewURL: res.data.previewURL } });
  } catch (err) {
    setMessage(err.response?.data?.message || "Error occurred");
  }

  setLoading(false);
};
  return (
    <div className="register-container">
      <form className="register-form" onSubmit={handleSubmit}>
        <h2>Create Account</h2>
        <input type="text" name="username" placeholder="Username" value={form.username} onChange={handleChange} required />
        <input type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} required />
        <input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} required />
        <ReCAPTCHA
        sitekey="6Ld8EHosAAAAAIGPfQIeXXqGt5oKLxZpbzymCDQ8"
        onChange={token => {
          setCaptchaToken(token);
        }}
        onExpired={() => setCaptchaToken("")}
        />
        <button style={{ marginTop: "10px" }} type="submit" disabled={loading}>{loading ? "Sending OTP..." : "Register"}</button>
        {message && <p className="message">{message}</p>}
                <p className="auth-switch" onClick={handleNavigate}>
  Have an account? Login
</p>
      </form>
    </div>
  );
}