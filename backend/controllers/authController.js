import axios from "axios";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Contact from "../models/Contact.js"; // ✅ Added missing import for the DemoBot fix
import { sendEmail } from "../utils/sendEmail.js";

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

/* ------------------- REGISTER ------------------- */
export const registerUser = async (req, res) => {
  try {
    const { username, email, password, captchaToken } = req.body;

    // 1. Check Captcha Token
    if (!captchaToken) {
      return res.status(400).json({ message: "Captcha token missing" });
    }

    // 2. Verify Captcha with Google
    const secretKey = process.env.RECAPTCHA_SECRET;
    const captchaVerification = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify`,
      null,
      {
        params: {
          secret: secretKey,
          response: captchaToken,
        },
      }
    );

    if (!captchaVerification.data.success) {
      return res.status(400).json({ message: "Captcha verification failed" });
    }

    // 3. Check if User Exists
    let user = await User.findOne({ email });
    if (user && user.isVerified) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // 4. Generate OTP & Hash Password
    const otp = generateOTP();
    const hashedPassword = await bcrypt.hash(password, 12);

    // 5. Update unverified user OR create new user
    if (user) {
      user.username = username;
      user.password = hashedPassword;
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

    // 6. Send Email
    await sendEmail(
      email,
      "Verify your account",
      `<p>Hello ${username}, your verification code is <strong style="font-size: 20px;">${otp}</strong></p>`
    );

    res.status(200).json({ message: "Verification code sent to email" });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ message: "Server error during registration" });
  }
};

/* ------------------- VERIFY ------------------- */
export const verifyUser = async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "User not found" });
    if (user.isVerified) return res.status(400).json({ message: "User already verified" });

    if (user.verificationCode !== code || user.verificationCodeExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    // Mark user as verified
    user.isVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpires = null;
    await user.save();

    // === DEMO BOT AUTO-FRIEND FIX ===
    const demoBot = await User.findOne({ username: "DemoBot" });
    if (demoBot) {
      // Check if already friends to avoid duplicates
      const alreadyFriend = await Contact.findOne({
        $or: [
          { sender: user._id, receiver: demoBot._id },
          { sender: demoBot._id, receiver: user._id }
        ]
      });

      if (!alreadyFriend) {
        // Create an accepted contact automatically
        await Contact.create({
          sender: user._id,
          receiver: demoBot._id,
          status: "accepted"
        });
      }
    }
    // ================================

    res.json({ message: "User verified successfully!" });
  } catch (err) {
    console.error("Verify Error:", err);
    res.status(500).json({ message: "Server error during verification" });
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