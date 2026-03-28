import axios from "axios";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import PendingUser from "../models/PendingUser.js"; // <-- Staging model
import Contact from "../models/Contact.js"; 
import { sendEmail } from "../utils/sendEmail.js";

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

/* ------------------- REGISTER ------------------- */
export const registerUser = async (req, res) => {
  try {
    const { username, email, password, captchaToken } = req.body;

    if (!captchaToken) {
      return res.status(400).json({ message: "Captcha token missing" });
    }

    const secretKey = process.env.RECAPTCHA_SECRET;
    const captchaVerification = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify`, null,
      { params: { secret: secretKey, response: captchaToken } }
    );

    if (!captchaVerification.data.success) {
      return res.status(400).json({ message: "Captcha verification failed" });
    }

    // Check if they are already a fully verified User
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const otp = generateOTP();
    const hashedPassword = await bcrypt.hash(password, 12);

    // Check if they are already sitting in the Pending database
    let pendingUser = await PendingUser.findOne({ email });
    
    if (pendingUser) {
      // If they are pending and asked for a new code, just update their info
      pendingUser.username = username;
      pendingUser.password = hashedPassword;
      pendingUser.verificationCode = otp;
      pendingUser.verificationCodeExpires = Date.now() + 10 * 60 * 1000;
      await pendingUser.save();
    } else {
      // If they are totally new, create them in the Pending area
      await PendingUser.create({
        username,
        email,
        password: hashedPassword,
        verificationCode: otp,
        verificationCodeExpires: Date.now() + 10 * 60 * 1000,
      });
    }

    await sendEmail({
      toEmail: email,
      toName: username,
      subject: "Verify your account",
      htmlContent: `<p>Hello ${username}, your verification code is <strong style="font-size: 20px;">${otp}</strong></p>`
    });

    res.status(200).json({ message: "Verification code sent to email" });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ message: "Server error during registration" });
  }
};

/* ------------------- VERIFY ------------------- */
/* ------------------- VERIFY ------------------- */
export const verifyUser = async (req, res) => {
  try {
    const { email, code } = req.body;
    
    const pendingUser = await PendingUser.findOne({ email });

    if (!pendingUser) {
      return res.status(400).json({ message: "User not found or code expired" });
    }

    // 🚫 BLOCK CHECK (added)
    if (
      pendingUser.verificationBlockedUntil &&
      pendingUser.verificationBlockedUntil > Date.now()
    ) {
      return res.status(429).json({
        message: "Too many attempts. Try again later.",
      });
    }

    // ❌ WRONG CODE (your logic + attempts added)
    if (
      pendingUser.verificationCode !== code ||
      pendingUser.verificationCodeExpires < Date.now()
    ) {
      // ⬇️ increase attempts
      pendingUser.verificationAttempts =
        (pendingUser.verificationAttempts || 0) + 1;

      // 🚨 if 3 attempts → block
      if (pendingUser.verificationAttempts >= 3) {
        pendingUser.verificationBlockedUntil =
          Date.now() + 10 * 60 * 1000; // 10 min block
        pendingUser.verificationAttempts = 0; // reset after block
      }

      await pendingUser.save();

      return res.status(400).json({
        message:
          pendingUser.verificationAttempts === 0
            ? "Too many attempts. Try again later."
            : `Invalid or expired code. Attempts left: ${3 - pendingUser.verificationAttempts}`,
      });
    }

    // ✅ SUCCESS → reset attempts (added, safe)
    pendingUser.verificationAttempts = 0;
    pendingUser.verificationBlockedUntil = null;

    // ⬇️ YOUR ORIGINAL CODE STARTS HERE (unchanged)
    const newUser = await User.create({
      username: pendingUser.username,
      email: pendingUser.email,
      password: pendingUser.password,
      isVerified: true,
    });

    await PendingUser.deleteOne({ email });

    const demoBot = await User.findOne({ username: "DemoBot" });
    if (demoBot) {
      const alreadyFriend = await Contact.findOne({
        $or: [
          { sender: newUser._id, receiver: demoBot._id },
          { sender: demoBot._id, receiver: newUser._id }
        ]
      });

      if (!alreadyFriend) {
        await Contact.create({
          sender: newUser._id,
          receiver: demoBot._id,
          status: "accepted"
        });
      }
    }

    // Generate token for auto-login
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "none", 
      secure: true,    
      maxAge: 7 * 24 * 60 * 60 * 1000, 
    });

    return res.json({ 
      message: "User verified and logged in successfully!", 
      user: { id: newUser._id, username: newUser.username } 
    });

  } catch (err) {
    console.error("Verify Error:", err);
    return res.status(500).json({ message: "Server error during verification" });
  }
};

/* ------------------- LOGIN ------------------- */
export const loginUser = async (req, res) => {
  try {
    const { email, password, captchaToken } = req.body;

    // 1. Check if token exists
    if (!captchaToken) {
      return res.status(400).json({ message: "Captcha token missing" });
    }

    // 2. Verify with Google
    const secretKey = process.env.RECAPTCHA_SECRET;
    const googleResponse = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify`,
      null, 
      {
        params: {
          secret: secretKey,
          response: captchaToken,
        },
      }
    );

    if (!googleResponse.data.success) {
      return res.status(400).json({ message: "Captcha failed" });
    }

    // 3. Authenticate User
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });
    if (!user.isVerified) return res.status(400).json({ message: "Please verify your email first" });
    
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    // 4. Set Cookie & Token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "none", 
      secure: true,    
      maxAge: 7 * 24 * 60 * 60 * 1000, 
    });

    res.json({ message: "Login successful", user: { id: user._id, username: user.username } });

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ------------------- GET ME ------------------- */
export const getMe = async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ------------------- LOGOUT ------------------- */
export const logoutUser = (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out successfully" });
};