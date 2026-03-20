import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465, 
  secure: true, // Use SSL
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS, // Verify this is the 16-character App Password
  },
  connectionTimeout: 15000, // Wait max 15 seconds for connection
});

export const sendEmail = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.MAIL_USER,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("Email send error:", err);
    throw err; // <-- ADD THIS: This tells your authController that it failed
  }
};