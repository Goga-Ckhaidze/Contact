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

    /* ================= SUBSCRIPTION CHECK ================= */

    if (
      !currentUser.chatbotSubscriptionActive ||
      !currentUser.chatbotSubscriptionExpires ||
      new Date(currentUser.chatbotSubscriptionExpires) < new Date()
    ) {
      return res.status(403).json({
        text: "🔒 Chatbot access requires a subscription."
      });
    }

    const msg = message?.toLowerCase() || "";

    /* allow multiple commands */
    const subMsgs = msg.split(/\s+and\s+|\s+also\s+/i);

    let responses = [];
    let shouldRefreshData = false;

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

    /* ================= COMMAND LOOP ================= */

    for (let sub of subMsgs) {

      sub = sub.trim();

      const commands = {
        sendRequest: sub.match(/(?:send|add)\s+friend\s+requ?e?st\s+to\s+(\w+)/i),
        cancelRequest: sub.match(/cancel.*requ?e?st(?:.*to\s+(\w+))?/i),
        accept: sub.match(/accept\s+(all|\w+)/i),
        reject: sub.match(/reject\s+(all|\w+)/i),
        deleteFriend: sub.match(/(?:delete|remove)\s+(\w+)/i),
        showFriendBio: sub.match(/show\s+(\w+)\s+bio/i),
        showMyBio: sub.match(/my\s+bio/i),
        showFriends: sub.match(/show\s+friends|list\s+friends/i),
        countFriends: sub.match(/how\s+many\s+friends/i)
      };

      /* ================= HELP ================= */

      if (
        sub.includes("help") ||
        sub.includes("what can you do") ||
        sub.includes("commands")
      ) {

        responses.push(`Hello! I am your Contacts Assistant 🤖

I can help you manage friends.

Friends
• show friends
• how many friends do I have
• delete USERNAME
• delete all friends

Friend Requests
• show requests
• show sent requests
• send friend request to USERNAME
• cancel friend request
• cancel friend request to USERNAME
• accept USERNAME
• accept all
• reject USERNAME
• reject all

Profiles
• show USERNAME bio
• show my bio`);
      }

      /* ================= GREETING ================= */

      if (sub === "hi" || sub === "hello") {
        responses.push("Hello! Type 'help' to see what I can do.");
      }

      /* ================= FRIEND COUNT ================= */

      if (commands.countFriends) {
        responses.push(`You currently have ${friends.length} friend${friends.length !== 1 ? "s" : ""}.`);
      }

      /* ================= LIST FRIENDS ================= */

      if (commands.showFriends) {

        if (!friends.length) {
          responses.push("You have no friends.");
        } else {
          responses.push(`Your friends: ${friends.map(f => f.username).join(", ")}`);
        }

      }

      /* ================= MY BIO ================= */

      if (commands.showMyBio) {
        responses.push(`Your bio: ${currentUser.bio || "No bio"}`);
      }

      /* ================= FRIEND BIO ================= */

      if (commands.showFriendBio) {

        const targetName = commands.showFriendBio[1].toLowerCase();

        const friend = friends.find(
          f => f.username.toLowerCase() === targetName
        );

        if (friend) {
          responses.push(`${friend.username}'s bio: ${friend.bio}`);
        } else {
          responses.push(`Friend '${commands.showFriendBio[1]}' not found.`);
        }

      }

      /* ================= SHOW RECEIVED REQUESTS ================= */

      if (sub.includes("show requests")) {

        const pending = await Contact.find({
          receiver: currentUser._id,
          status: "pending"
        }).populate("sender", "username");

        if (!pending.length) {
          responses.push("No pending friend requests.");
        } else {
          responses.push(`Pending requests from: ${pending.map(r => r.sender.username).join(", ")}`);
        }

      }

      /* ================= SHOW SENT REQUESTS ================= */

      if (sub.includes("sent requests")) {

        const sent = await Contact.find({
          sender: currentUser._id,
          status: "pending"
        }).populate("receiver", "username");

        if (!sent.length) {
          responses.push("You have not sent any requests.");
        } else {
          responses.push(`You sent requests to: ${sent.map(r => r.receiver.username).join(", ")}`);
        }

      }

      /* ================= DELETE ALL FRIENDS ================= */

      if (sub.includes("delete all friends")) {

        if (!friends.length) {
          responses.push("You have no friends to delete.");
        } else {

          const ids = friends.map(f => f.id);

          await Contact.deleteMany({ _id: { $in: ids } });

          responses.push("All friends removed.");
          shouldRefreshData = true;
        }

      }

      /* ================= DELETE FRIEND ================= */

      if (commands.deleteFriend) {

        const targetName = commands.deleteFriend[1].toLowerCase();

        const friend = friends.find(
          f => f.username.toLowerCase() === targetName
        );

        if (!friend) {
          responses.push(`Friend '${commands.deleteFriend[1]}' not found.`);
        } else {

          await Contact.findByIdAndDelete(friend.id);

          responses.push(`${friend.username} removed from your friends.`);
          shouldRefreshData = true;

        }

      }

      /* ================= ACCEPT REQUEST ================= */

      if (commands.accept) {

        const target = commands.accept[1].toLowerCase();

        const pending = await Contact.find({
          receiver: currentUser._id,
          status: "pending"
        }).populate("sender", "username");

        if (target === "all") {

          if (!pending.length) {
            responses.push("You have no pending friend requests.");
          } else {

            for (const reqDoc of pending) {
              reqDoc.status = "accepted";
              await reqDoc.save();

              if (req.io) {
                req.io.to(reqDoc.sender._id.toString()).emit("friend_request_accepted");
              }
            }

            responses.push(`Accepted ${pending.length} friend request${pending.length > 1 ? "s" : ""}.`);
            shouldRefreshData = true;

          }

        } else {

          const reqDoc = pending.find(
            r => r.sender.username.toLowerCase() === target
          );

          if (!reqDoc) {
            responses.push(`Pending request from '${target}' not found.`);
          } else {

            reqDoc.status = "accepted";
            await reqDoc.save();

            responses.push(`You are now friends with ${reqDoc.sender.username}.`);
            shouldRefreshData = true;

          }

        }

      }

      /* ================= REJECT REQUEST ================= */

      if (commands.reject) {

        const target = commands.reject[1].toLowerCase();

        const pending = await Contact.find({
          receiver: currentUser._id,
          status: "pending"
        }).populate("sender", "username");

        if (target === "all") {

          if (!pending.length) {
            responses.push("You have no pending friend requests.");
          } else {

            for (const reqDoc of pending) {
              await Contact.findByIdAndDelete(reqDoc._id);
            }

            responses.push(`Rejected ${pending.length} friend request${pending.length > 1 ? "s" : ""}.`);
            shouldRefreshData = true;

          }

        } else {

          const reqDoc = pending.find(
            r => r.sender.username.toLowerCase() === target
          );

          if (!reqDoc) {
            responses.push(`Pending request from '${target}' not found.`);
          } else {

            await Contact.findByIdAndDelete(reqDoc._id);

            responses.push(`Friend request from ${reqDoc.sender.username} rejected.`);
            shouldRefreshData = true;

          }

        }

      }

      /* ================= SEND REQUEST ================= */

      if (commands.sendRequest) {

        const targetName = commands.sendRequest[1];

        const targetUser = await User.findOne({
          username: new RegExp(`^${targetName}$`, "i")
        });

        if (!targetUser) {
          responses.push(`User '${targetName}' not found.`);
        }

        else if (targetUser._id.equals(currentUser._id)) {
          responses.push("You cannot add yourself.");
        }

        else {

          const existing = await Contact.findOne({
            $or: [
              { sender: currentUser._id, receiver: targetUser._id },
              { sender: targetUser._id, receiver: currentUser._id }
            ]
          });

          if (existing) {
            responses.push(`A request or friendship already exists with ${targetUser.username}.`);
          }

          else {

            await Contact.create({
              sender: currentUser._id,
              receiver: targetUser._id,
              status: "pending"
            });

            if (req.io) {
              req.io.to(targetUser._id.toString()).emit("friend_request_received");
            }

            responses.push(`Friend request sent to ${targetUser.username}.`);
            shouldRefreshData = true;

          }

        }

      }

      /* ================= CANCEL REQUEST ================= */

      if (commands.cancelRequest) {

        const targetName = commands.cancelRequest[1];

        let requestDoc;

        if (targetName) {

          const targetUser = await User.findOne({
            username: new RegExp(`^${targetName}$`, "i")
          });

          if (targetUser) {

            requestDoc = await Contact.findOne({
              sender: currentUser._id,
              receiver: targetUser._id,
              status: "pending"
            });

          }

        } else {

          requestDoc = await Contact.findOne({
            sender: currentUser._id,
            status: "pending"
          }).populate("receiver", "username");

        }

        if (!requestDoc) {

          responses.push("You have no pending friend requests to cancel.");

        } else {

          const receiver = requestDoc.receiver?.username || "that user";

          await Contact.findByIdAndDelete(requestDoc._id);

          responses.push(`Friend request to ${receiver} canceled.`);
          shouldRefreshData = true;

        }

      }

    }

    /* ================= FALLBACK ================= */

    if (responses.length === 0) {

      responses.push(
        "I didn't understand that command. Type 'help' to see what I can do."
      );

    }

    return res.json({
      text: responses.join("\n\n"),
      refreshData: shouldRefreshData
    });

  } catch (error) {

    console.error("AI Error:", error);

    res.status(500).json({
      text: "AI service unavailable."
    });

  }

};