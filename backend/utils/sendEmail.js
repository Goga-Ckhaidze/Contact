import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export const sendEmail = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.MAIL_USER,
      to,
      subject,
      html,
    });
    console.log("Email sent: ", info.messageId); // Optional: good for debugging
  } catch (err) {
    console.error("Email send error:", err);
    throw err; // <-- ADD THIS: This tells your authController that it failed
  }
};