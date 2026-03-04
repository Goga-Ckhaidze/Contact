import mongoose from "mongoose";

const PendingUserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  verificationCode: { type: String, required: true },
  verificationCodeExpires: { type: Date, required: true },
}, { timestamps: true });

export default mongoose.model("PendingUser", PendingUserSchema);