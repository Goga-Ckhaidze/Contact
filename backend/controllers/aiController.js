import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import Contact from "../models/Contact.js";
import User from "../models/User.js";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const handleChat = async (req, res) => {
  try {
    const { message, userId } = req.body;

    const currentUser = req.user || await User.findById(userId);
    if (!currentUser) {
      return res.status(400).json({ text: "User not found." });
    }

    const msg = message?.toLowerCase().trim() || "";

    /* ================= GREETING ================= */

    if (!msg) {
      return res.json({
        text: `Hello! I am your app assistant 🤖

This is a portfolio chatbot, so it can answer only limited questions because it uses a free AI plan.

I can help you with:
• Showing your friends
• Checking friend bios
• Deleting friends
• Accepting friend requests

Example commands:
- show friends
- how many friends do I have
- delete Trox
- show Trox bio`
      });
    }

    if (msg === "hello" || msg === "hi") {
      return res.json({
        text: "Hello! How can I help you manage your contacts today?"
      });
    }

    /* ================= GET FRIENDS ================= */

    const friendsSent = await Contact.find({
      sender: currentUser._id,
      status: "accepted"
    }).populate("receiver", "username bio");

    const friendsReceived = await Contact.find({
      receiver: currentUser._id,
      status: "accepted"
    }).populate("sender", "username bio");

    const friends = [
      ...friendsSent.map(c => ({
        id: c._id,
        username: c.receiver.username,
        bio: c.receiver.bio || "No bio"
      })),
      ...friendsReceived.map(c => ({
        id: c._id,
        username: c.sender.username,
        bio: c.sender.bio || "No bio"
      }))
    ];

    /* ================= COUNT FRIENDS ================= */

    if (msg.includes("how many friends")) {
      return res.json({
        text: `You currently have ${friends.length} friend${friends.length !== 1 ? "s" : ""}.`
      });
    }

    /* ================= LIST FRIENDS ================= */

    if (msg.includes("show friends") || msg.includes("list friends")) {

      if (friends.length === 0) {
        return res.json({
          text: "You currently have no friends."
        });
      }

      const list = friends.map(f => f.username).join(", ");

      return res.json({
        text: `Your friends are: ${list}.`
      });
    }

    /* ================= MY BIO ================= */

    if (msg.includes("my bio")) {
      return res.json({
        text: `Your bio: ${currentUser.bio || "No bio available."}`
      });
    }

    /* ================= FRIEND BIO ================= */

    if (msg.includes("bio")) {

      const friend = friends.find(f =>
        msg.includes(f.username.toLowerCase())
      );

      if (friend) {
        return res.json({
          text: `${friend.username}'s bio: ${friend.bio}`
        });
      }
    }

    /* ================= DELETE ALL FRIENDS ================= */

    if (msg.includes("delete all friends")) {

      if (friends.length === 0) {
        return res.json({
          text: "You don't have any friends to delete."
        });
      }

      const ids = friends.map(f => f.id);

      await Contact.deleteMany({
        _id: { $in: ids }
      });

      return res.json({
        text: "All friends have been removed from your list.",
        refreshData: true
      });
    }

    /* ================= DELETE SINGLE FRIEND ================= */

    if (msg.includes("delete") || msg.includes("remove")) {

      const friend = friends.find(f =>
        msg.includes(f.username.toLowerCase())
      );

      if (!friend) {
        return res.json({
          text: "I couldn't find that friend in your list."
        });
      }

      await Contact.findByIdAndDelete(friend.id);

      return res.json({
        text: `${friend.username} has been removed from your friends.`,
        refreshData: true
      });
    }

    /* ================= ACCEPT REQUEST ================= */

    const pending = await Contact.find({
      receiver: currentUser._id,
      status: "pending"
    }).populate("sender", "username");

    if (msg.includes("accept")) {

      const req = pending.find(r =>
        msg.includes(r.sender.username.toLowerCase())
      );

      if (!req) {
        return res.json({
          text: "I couldn't find that friend request."
        });
      }

      req.status = "accepted";
      await req.save();

      return res.json({
        text: `You are now friends with ${req.sender.username}.`,
        refreshData: true
      });
    }

    /* ================= GEMINI AI RESPONSE ================= */

    const systemInstruction = `
You are an AI assistant for a Contacts portfolio web application.

Important rules:
- This chatbot runs on a free AI plan.
- You should answer briefly and professionally.
- Only help with friend management features.
- If the question is unrelated, politely say you cannot help.
`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction
    });

    const chat = model.startChat();

    const result = await chat.sendMessage(message);
    const text = result.response.text();

    res.json({ text });

  } catch (error) {

    console.error("Gemini Controller Error:", error);

    if (error.status === 429) {
      return res.status(200).json({
        text: "All free AI requests for today have been used. Basic commands like 'show friends' or 'delete friend' will still work."
      });
    }

    res.status(500).json({
      text: "AI service is currently unavailable."
    });

  }
};