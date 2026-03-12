import axios from "axios";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import { sendEmail } from "../utils/sendEmail.js";
import jwt from "jsonwebtoken";

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

/* ------------------- REGISTER ------------------- */
export const registerUser = async (req, res) => {
  try {
    const { username, email, password, captchaToken } = req.body;

    if (!captchaToken)
      return res.status(400).json({ message: "Captcha token missing" });

    const secretKey = process.env.RECAPTCHA_SECRET;
    const captchaVerification = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captchaToken}`
    );

    if (!captchaVerification.data.success)
      return res.status(400).json({ message: "Captcha verification failed" });

    let user = await User.findOne({ email });
    if (user && user.isVerified)
      return res.status(400).json({ message: "Email already registered" });

    const otp = generateOTP();
    const hashedPassword = await bcrypt.hash(password, 12);

    if (user) {
      // resend code for unverified user
      user.verificationCode = otp;
      user.verificationCodeExpires = Date.now() + 10 * 60 * 1000;
      await user.save();
    } else {
      user = await User.create({
        username,
        email,
        password: hashedPassword,
        verificationCode: otp,
        verificationCodeExpires: Date.now() + 10 * 60 * 1000,
        isVerified: false,
      });
    }

    await sendEmail(
      email,
      "Verify your account",
      `<p>Hello ${username}, your verification code is <strong>${otp}</strong></p>`
    );

    res.status(200).json({ message: "Verification code sent to email" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ------------------- VERIFY ------------------- */
export const verifyUser = async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "User not found" });
    if (user.isVerified) return res.status(400).json({ message: "User already verified" });

    if (user.verificationCode !== code || user.verificationCodeExpires < Date.now())
      return res.status(400).json({ message: "Invalid or expired code" });

    user.isVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpires = null;
    await user.save();

    res.json({ message: "User verified successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ------------------- LOGIN ------------------- */
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });
    if (!user.isVerified) return res.status(400).json({ message: "User not verified" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

// ✅ Correct settings for Vercel + Render
res.cookie("token", token, {
  httpOnly: true,
  sameSite: "none", // Required for cross-site (Vercel to Render)
  secure: true,      // Must be true if sameSite is "none"
  maxAge: 7 * 24 * 60 * 60 * 1000, 
});

    res.json({ message: "Login successful", user: { id: user._id, username: user.username } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET CURRENT USER
export const getMe = async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// logout route
export const logoutUser = (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out successfully" });
};