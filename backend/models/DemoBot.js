import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function createDemoBot() {
  const existing = await User.findOne({ username: "DemoBot" });
  if (existing) return console.log("DemoBot already exists");

  const bot = new User({
    username: "DemoBot",
    email: "demo@portfolio.com",
    password: "demo123", // bot won’t log in
    isVerified: true,
  });

  await bot.save();
  console.log("DemoBot created!");
  mongoose.disconnect();
}

createDemoBot();