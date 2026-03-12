import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "../axiosInstance";
import { ArrowLeft } from "lucide-react";
import "./ProfilePage.css";

function ViewProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await axios.get(`/api/users/${id}`);
        setUser(res.data);
      } catch (err) {
        setMessage(err.response?.data?.message || "Failed to load profile");
      }
    };
    loadProfile();
  }, [id]);

  if (message) return <div>{message}</div>;
  if (!user) return <div>Loading...</div>;

  return (
    <div className="profile-container">
              <button
        className="home-btn"
        onClick={() => navigate("/")}
      >
        <ArrowLeft size={20} />
  <span>Home</span>
      </button>
      <div className="profile-card">
        <div className="profile-avatar-section">
          <img
            src={user.avatar || "/default-avatar.png"}
            alt="avatar"
            className="profile-avatar"
          />
        </div>

        <div className="profile-info">
          <div className="info-box">
            <span>Username: {user.username}</span>
          </div>
          <div className="info-box">
            <span>{user.friendCount} {user.friendCount === 1 ? "friend" : "friends"}</span>
          </div>
          <div className="info-box bio-box">
            <span>{user.bio || "No bio yet."}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ViewProfilePage;