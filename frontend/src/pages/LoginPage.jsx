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
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/auth/login`,
        {
          ...form,
          captchaToken
        },
        { withCredentials: true }
      );

      setMessage("Login successful!");
      navigate("/profile");

    } catch (err) {
      setMessage(err.response?.data?.message || "Login failed");
    }

    setLoading(false);
  };

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

        <ReCAPTCHA
          className="g-recaptcha"
          sitekey="6LdFVYosAAAAADgLaH0avabN4PT0FS5HFm-n5mgX"
          onChange={token => setCaptchaToken(token)}
          onExpired={() => setCaptchaToken("")}
        />

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