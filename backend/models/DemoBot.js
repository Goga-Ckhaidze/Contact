import User from "./User.js";

async function createDemoBot() {
  try {
    const existing = await User.findOne({ username: "DemoBot" });
    if (existing) {
      console.log("✅ DemoBot already exists in database.");
      return;
    }

    const bot = new User({
      username: "DemoBot",
      email: "demo@portfolio.com",
      password: "Demo1234!", 
      isVerified: true,
    });

    await bot.save();
    console.log("🚀 DemoBot created successfully!");
  } catch (error) {
    console.error("❌ Error creating DemoBot:", error);
  }
}

export default createDemoBot;