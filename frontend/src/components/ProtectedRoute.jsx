import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";

export default function ProtectedRoute({ children }) {
  const [isAuth, setIsAuth] = useState(null); // 'null' means we are still checking
  const API_BASE = import.meta.env.VITE_API_URL || "https://contact-qia9.onrender.com";

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // We call your "getMe" endpoint to see if the cookie is valid
        await axios.get(`${API_BASE}/api/auth/me`, { withCredentials: true });
        setIsAuth(true);
      } catch (err) {
        setIsAuth(false);
      }
    };
    checkAuth();
  }, [API_BASE]);

  // If we are still waiting for the server, show nothing (or a black screen)
  if (isAuth === null) return <div style={{backgroundColor: '#000', height: '100vh'}}></div>;

  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  return children;
}