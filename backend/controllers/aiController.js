import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import Contact from "../models/Contact.js";
import User from "../models/User.js";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const handleChat = async (req, res) => {
  try {
    const { message, userId } = req.body;
    const currentUser = req.user || (await User.findById(userId));
    if (!currentUser) return res.status(400).json({ text: "User not found." });

    // --- Current user info ---
    const userInfo = {
      username: currentUser.username,
      bio: currentUser.bio || "No bio available",
    };

    // --- Friends info ---
    const friendsSent = await Contact.find({ sender: currentUser._id, status: "accepted" })
      .populate("receiver", "username bio");
    const friendsReceived = await Contact.find({ receiver: currentUser._id, status: "accepted" })
      .populate("sender", "username bio");

    const friends = [
      ...friendsSent.map(c => ({ username: c.receiver.username, bio: c.receiver.bio || "No bio" })),
      ...friendsReceived.map(c => ({ username: c.sender.username, bio: c.sender.bio || "No bio" }))
    ];

    // --- Pending friend requests ---
    const pendingRequests = await Contact.find({ receiver: currentUser._id, status: "pending" })
      .populate("sender", "username bio");
    const requests = pendingRequests.map(c => ({ username: c.sender.username, bio: c.sender.bio || "No bio" }));

    // --- System instruction for AI ---
    const systemInstruction = `
You are an AI assistant for ${userInfo.username}'s Contacts Portfolio.
This portfolio chatbot can answer only a few questions because it uses the free tier.

You can ONLY:
- Add or remove friends
- Check if someone is a friend
- List all friends
- Show pending friend requests
- Accept friend requests
- Provide bio info for the current user or their friends

DO NOT:
- Send messages to others
- Change profile details
- Access anything outside the app
- Answer unrelated questions

Current user info:
- Username: ${userInfo.username}
- Bio: ${userInfo.bio}

Friends info:
${friends.length ? friends.map(f => `- ${f.username}: ${f.bio}`).join("\n") : "- None"}

Pending requests info:
${requests.length ? requests.map(r => `- ${r.username}: ${r.bio}`).join("\n") : "- None"}

Always answer clearly and politely.
If a user asks something you cannot do, reply:
"I'm sorry, I can’t help with that. I only manage friends and requests in this app."

When the chat first opens (empty message), send a greeting like:
"Hello! I am your app assistant 🤖. 
This is a portfolio version, so I can answer only a few questions.
I can help you:
- See your friends and friend requests
- Add or remove friends
- Accept or reject requests
- Show your bio or a friend's bio
Just type what you want to do!"
`;

    // --- Initialize AI model ---
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction
    });

    const chat = model.startChat();

    const result = await chat.sendMessage(message || ""); // empty message triggers greeting
    const responseText = result.response.text();

    // --- Refresh trigger if needed ---
    const lowerMsg = message ? message.toLowerCase() : "";
    const triggerRefresh = ["add", "remove", "delete", "accept"].some(word => lowerMsg.includes(word));

    res.status(200).json({
      text: responseText,
      refreshData: triggerRefresh
    });

  } catch (error) {
    console.error("Gemini Controller Error:", error);

    // --- Free-tier exceeded message ---
    if (error.status === 429) {
      return res.status(429).json({
        text: "All free AI requests for today have been used. Please try again tomorrow or upgrade your plan."
      });
    }

    res.status(500).json({
      text: "All AI request credits have been used or there was a connection issue. Please try again later."
    });
  }
};