import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";
import "./ProfilePage.css";
import { User, Users, FileText, Key } from "lucide-react";

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

  const API_BASE_URL = "http://localhost:5000";

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
      hideMessage();
    }
  };

  const hideMessage = (timeout = 3000) => {
    setTimeout(() => setMessage(""), timeout);
  };

  const updateProfile = async () => {
    if (!username.trim()) {
      setMessage("Username cannot be empty");
      setMessageType("error");
      hideMessage();
      return;
    }

    try {
      const res = await axios.put("/api/users/update", { username, bio });
      setUser(res.data.user);
      setEditMode(false);
      setMessage("Profile updated successfully");
      setMessageType("success");
      hideMessage();
    } catch (err) {
      setMessage(err.response?.data?.message || "Error updating profile");
      setMessageType("error");
      hideMessage();
    }
  };

  const changePassword = async () => {
    if (!oldPassword || !newPassword) {
      setMessage("Both password fields are required");
      setMessageType("error");
      hideMessage();
      return;
    }

    try {
      const res = await axios.put("/api/users/change-password", {
        oldPassword,
        newPassword,
      });
      setMessage(res.data.message || "Password changed successfully");
      setMessageType("success");
      setOldPassword("");
      setNewPassword("");
      hideMessage();
    } catch (err) {
      setMessage(err.response?.data?.message || "Error changing password");
      setMessageType("error");
      hideMessage();
    }
  };

  const uploadAvatar = async (e) => {
    if (!e.target.files[0]) return;

    try {
      const formData = new FormData();
      formData.append("avatar", e.target.files[0]);

      const res = await axios.post("/api/users/upload-avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setUser({ ...user, avatar: res.data.avatar });
      setMessage("Avatar updated successfully");
      setMessageType("success");
      hideMessage();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to upload avatar");
      setMessageType("error");
      hideMessage();
    }
  };

  if (!user) return null;

  return (
    <div className="profile-container">
      <div className="profile-card">

        {message && (
          <div className={`profile-message ${messageType}`}>
            {message}
          </div>
        )}

        <div className="profile-avatar-section">
          <img
            src={user.avatar || "/default-avatar.png"}
            alt="avatar"
            className="profile-avatar"
          />

          <label className="custom-file-upload">
            Choose Avatar
            <input type="file" onChange={uploadAvatar} />
          </label>
        </div>

        {editMode ? (
          <>
            <input
              className="profile-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <textarea
  className="profile-textarea"
  value={bio}
  maxLength={150}
  onChange={(e) => {
    const value = e.target.value;

    if (value.length >= 150) {
      setMessage("Too many letters (max 150)");
      setMessageType("error");
      hideMessage();
    }

    setBio(value);
  }}
/>

<div className="bio-counter">
  {bio.length}/150
</div>

            <button className="profile-btn save-btn" onClick={updateProfile}>
              Save
            </button>
          </>
        ) : (
          <div className="profile-info">

            <div className="info-box">
              <User size={18} />
              <span>{user.username}</span>
            </div>

            <div className="info-box">
              <Users size={18} />
              <span>
                {friendCount} {friendCount === 1 ? "friend" : "friends"}
              </span>
            </div>

            <div className="info-box bio-box">
              <FileText size={18} />
              <span>{user.bio || "No bio yet."}</span>
            </div>

          </div>
        )}

        <button
          className="profile-btn edit-btn"
          onClick={() => setEditMode(!editMode)}
        >
          {editMode ? "Cancel" : "Edit Profile"}
        </button>

        <div className="password-section">
          <h3>
            <Key size={16} /> Change Password
          </h3>

          <input
            type="password"
            placeholder="Old password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            className="profile-input"
          />

          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="profile-input"
          />

          <button
            className="profile-btn password-btn"
            onClick={changePassword}
          >
            Change
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;