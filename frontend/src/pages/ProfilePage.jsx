import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";
import "./ProfilePage.css";
import { User, Users, Edit2, Lock, Camera, Save, X, Info } from "lucide-react";

function ProfilePage() {
  const [user, setUser] = useState(null);
  const [friendCount, setFriendCount] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await axios.get("/api/users/me");
      setUser(res.data);
      setUsername(res.data.username);
      setBio(res.data.bio || "");
      setFriendCount(res.data.friendCount || 0);
    } catch (err) {
      setMessage("Failed to load profile");
      setMessageType("error");
    }
  };

  const updateProfile = async () => {
    try {
      const res = await axios.put("/api/users/update", { username, bio });
      setUser(res.data.user);
      setEditMode(false);
      setMessage("Profile updated successfully");
      setMessageType("success");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage(err.response?.data?.message || "Error updating profile");
      setMessageType("error");
    }
  };

  const uploadAvatar = async (e) => {
    if (!e.target.files[0]) return;
    const formData = new FormData();
    formData.append("avatar", e.target.files[0]);
    try {
      const res = await axios.post("/api/users/upload-avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUser({ ...user, avatar: res.data.avatar });
    } catch (err) { console.error(err); }
  };

  if (!user) return null;

  return (
    <div className="chat-container profile-page-wrapper">
      <div className="profile-main-card">
        
        {/* HEADER SECTION - Same style as Chat Header */}
        <div className="chat-header profile-header">
          <User size={20} />
          <h2>My Profile</h2>
          <button className="edit-toggle-btn" onClick={() => setEditMode(!editMode)}>
            {editMode ? <X size={18} /> : <Edit2 size={18} />}
          </button>
        </div>

        <div className="profile-content">
          {message && <div className={`profile-status-msg ${messageType}`}>{message}</div>}

          {/* AVATAR SECTION */}
          <div className="profile-avatar-block">
            <div className="avatar-preview">
              <img src={user.avatar || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} alt="User" />
              <label className="avatar-edit-label">
                <Camera size={16} />
                <input type="file" onChange={uploadAvatar} hidden />
              </label>
            </div>
          </div>

          {/* NAME & BIO SECTION */}
          <div className="profile-data-section">
            <div className="section-title">
              <User size={16} />
              <h2>Identity</h2>
            </div>
            
            {editMode ? (
              <div className="edit-group">
                <input 
                  className="main-input" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  placeholder="Username"
                />
                <textarea 
                  className="main-input profile-bio-input" 
                  value={bio} 
                  onChange={(e) => setBio(e.target.value)} 
                  placeholder="Tell us about yourself..."
                />
                <button className="send-btn save-profile-btn" onClick={updateProfile}>
                  <Save size={16} /> Save Identity
                </button>
              </div>
            ) : (
              <div className="display-group">
                <h1 className="profile-name-display">{user.username}</h1>
                <p className="profile-bio-display">{user.bio || "No bio set yet."}</p>
              </div>
            )}
          </div>

          {/* FRIENDS STATS SECTION */}
          <div className="profile-data-section stats-area">
            <div className="section-title">
              <Users size={16} />
              <h2>Social</h2>
            </div>
            <div className="friend-stat-box">
               <span className="stat-count">{friendCount}</span>
               <span className="stat-label">{friendCount === 1 ? "Friend" : "Friends"} connected</span>
            </div>
          </div>

          {/* SECURITY SECTION */}
          <div className="profile-data-section security-area">
            <div className="section-title">
              <Lock size={16} />
              <h2>Security</h2>
            </div>
            <div className="security-inputs">
              <input 
                type="password" 
                className="main-input" 
                placeholder="Old Password" 
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
              <input 
                type="password" 
                className="main-input" 
                placeholder="New Password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button className="requests-toggle password-update-btn">
                Update Password
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;