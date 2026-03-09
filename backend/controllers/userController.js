import bcrypt from "bcryptjs";
import User from "../models/User.js";

/* ================= SEARCH USERS ================= */
export const searchUsers = async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) return res.status(400).json({ message: "Search name required" });

    const users = await User.find({
      username: { $regex: name, $options: "i" },
    }).select("_id username avatar");

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= GET PROFILE ================= */
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    // Note: We'll fetch friend count from the contact controller or a separate API call now
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= UPDATE PROFILE ================= */
export const updateProfile = async (req, res) => {
  try {
    const { username, bio } = req.body;
    const user = await User.findById(req.user._id);

    if (username) user.username = username;
    if (bio !== undefined) user.bio = bio;

    await user.save();
    res.json({ message: "Profile updated", user });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= CHANGE PASSWORD ================= */
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: "Wrong old password" });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= UPLOAD AVATAR ================= */
export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const user = await User.findById(req.user._id);

    user.avatar = `${process.env.SERVER_URL || "http://localhost:5000"}/uploads/${req.file.filename}`;
    await user.save();

    res.json({ avatar: user.avatar });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};