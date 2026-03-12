import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      minlength: 3,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
    },

    bio: {
      type: String,
      maxlength: 160,
      default: "",
    },

    avatar: {
      type: String,
      default: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
    },

    /* ================= CHATBOT SUBSCRIPTION ================= */

    chatbotSubscriptionActive: {
      type: Boolean,
      default: false,
    },

    chatbotSubscriptionExpires: {
      type: Date,
      default: null,
    },

    /* ================= ACCOUNT ================= */

    isVerified: {
      type: Boolean,
      default: false,
    },

    verificationCode: String,
    verificationCodeExpires: Date,
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);