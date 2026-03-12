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
      <Route path="/" element={<MainPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/verify" element={<VerifyPage />} />
      <Route path="/profile" element={<ProfilePage />} /> 
      <Route path="/buy-chatbot" element={<BuyChatbot />} />
      <Route path="/payment-success" element={<PaymentSuccess />} />
      <Route path="/profile/:id" element={<ViewProfilePage />} />
      <Route path="*" element={<h1>Page Not Found</h1>} />
    </Routes>
  );
}

export default App;