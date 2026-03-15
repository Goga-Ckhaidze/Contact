// ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token"); // or your auth logic

  if (!token) {
    // User is not logged in
    return <Navigate to="/login" replace />;
  }

  return children;
}