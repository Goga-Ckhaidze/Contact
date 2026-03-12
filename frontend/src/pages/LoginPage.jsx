import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../axiosInstance";
import "./RegisterPage.css";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleNavigate = () => navigate("/register");

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await axios.post("/api/auth/login", form);
      setMessage(res.data.message);
      navigate("/");
    } catch (err) {
      setMessage(err.response?.data?.message || "Error occurred");
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

       
        <button type="submit" disabled={loading}>
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