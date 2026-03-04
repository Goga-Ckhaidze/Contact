import express from "express";
import Contact from "../models/Contact.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { io } from "../server.js";

const router = express.Router();

// SEND FRIEND REQUEST
router.post("/request", authMiddleware, async (req, res) => {
  try {
    const senderId = req.user._id;
    const { receiverId } = req.body;
    

    if (!receiverId)
      return res.status(400).json({ message: "Receiver is required" });

    if (senderId.toString() === receiverId)
      return res.status(400).json({ message: "Cannot add yourself" });

    // 🔥 CHECK IF ALREADY FRIENDS
    const alreadyFriends = await Contact.findOne({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId },
      ],
      status: "accepted",
    });

    if (alreadyFriends)
      return res.status(400).json({ message: "Already friends" });

    // 🔥 CHECK IF REVERSE REQUEST EXISTS (AUTO ACCEPT)
    const reverseRequest = await Contact.findOne({
      sender: receiverId,
      receiver: senderId,
      status: "pending",
    });

if (reverseRequest) {
  reverseRequest.status = "accepted";
  await reverseRequest.save();

  // 🔥 notify both users
  io.to(receiverId.toString()).emit("friend_request_accepted");
  io.to(senderId.toString()).emit("friend_request_accepted");

  return res.json({ message: "Friend request auto-accepted" });
}
    // 🔥 CHECK IF REQUEST ALREADY SENT
    const existingRequest = await Contact.findOne({
      sender: senderId,
      receiver: receiverId,
      status: "pending",
    });

    if (existingRequest)
      return res.status(400).json({ message: "Request already sent" });

    // CREATE NEW REQUEST
const contact = await Contact.create({
  sender: senderId,
  receiver: receiverId,
  status: "pending",
});

// 🔥 EMIT TO RECEIVER
io.to(receiverId.toString()).emit("friend_request_received");

res.json({ message: "Friend request sent", contact });
    res.json({ message: "Friend request sent", contact });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ACCEPT FRIEND REQUEST
router.post("/accept", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const { requestId } = req.body;

    const request = await Contact.findById(requestId);

    if (!request)
      return res.status(404).json({ message: "Request not found" });

    if (request.receiver.toString() !== userId.toString())
      return res.status(403).json({ message: "Not authorized" });

    request.status = "accepted";
    await request.save();

    // 🔥 notify both users
io.to(request.sender.toString()).emit("friend_request_accepted");
io.to(request.receiver.toString()).emit("friend_request_accepted");

    res.json({ message: "Friend request accepted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// REJECT FRIEND REQUEST
router.post("/reject", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const { requestId } = req.body;

    const request = await Contact.findById(requestId);

    if (!request)
      return res.status(404).json({ message: "Request not found" });

    if (request.receiver.toString() !== userId.toString())
      return res.status(403).json({ message: "Not authorized" });

    await request.deleteOne();

    // 🔥 notify sender that request was rejected
    io.to(request.sender.toString()).emit("friend_request_rejected");

    res.json({ message: "Friend request rejected" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET PENDING REQUESTS (requests you received)
router.get("/pending", authMiddleware, async (req, res) => {
  try {
    const requests = await Contact.find({
      receiver: req.user._id,
      status: "pending",
    }).populate("sender", "username");

    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET SENT REQUESTS (requests you sent)
router.get("/sent", authMiddleware, async (req, res) => {
  try {
    const sentRequests = await Contact.find({
      sender: req.user._id,
      status: "pending",
    }).populate("receiver", "username");

    res.json(sentRequests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET FRIENDS
router.get("/friends", authMiddleware, async (req, res) => {
  try {
    const friends = await Contact.find({
      $or: [
        { sender: req.user._id },
        { receiver: req.user._id }
      ],
      status: "accepted"
    }).populate("sender receiver", "username");

    res.json(friends);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;