import { Routes, Route } from "react-router-dom";
import MainPage from "./pages/MainPage";
import RegisterPage from "./pages/RegisterPage";
import VerifyPage from "./pages/VerifyPage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import BuyChatbot from "./pages/BuyChatbot";
import PaymentSuccess from "./pages/PaymentSuccess";
import ViewProfilePage from "./pages/ViewProfilePage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute><MainPage /></ProtectedRoute>} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/verify" element={<VerifyPage />} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} /> 
      <Route path="/buy-chatbot" element={<ProtectedRoute><BuyChatbot /></ProtectedRoute>} />
      <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
      <Route path="/profile/:id" element={<ProtectedRoute><ViewProfilePage /></ProtectedRoute >} />
      <Route path="*" element={<h1>Page Not Found</h1>} />
    </Routes>
  );
}

export default App;