import Contact from "../models/Contact.js";
// NO MORE SOCKET IMPORT HERE - We use req.io instead to prevent crashing!

/* ================= SEND FRIEND REQUEST (Bulletproof Version) ================= */
export const sendFriendRequest = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { receiverId } = req.body;

    if (!receiverId) return res.status(400).json({ message: "Receiver is required" });
    if (senderId.toString() === receiverId) 
      return res.status(400).json({ message: "Cannot add yourself" });

    const existing = await Contact.findOne({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId }
      ]
    });

    if (existing) {
      if (existing.status === "accepted") {
        return res.status(400).json({ message: "Already friends" });
      }
      
      if (existing.sender.toString() === receiverId && existing.status === "pending") {
        existing.status = "accepted";
        await existing.save();
        // USING req.io
        req.io.to(receiverId.toString()).emit("friend_request_accepted");
        req.io.to(senderId.toString()).emit("friend_request_accepted");
        return res.json({ message: "Friend request auto-accepted" });
      }

      return res.status(400).json({ message: "Request already pending" });
    }

    const contact = await Contact.create({
      sender: senderId,
      receiver: receiverId,
      status: "pending"
    });

    req.io.to(receiverId.toString()).emit("friend_request_received");
    res.json({ message: "Friend request sent", contact });

  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Request already exists" });
    }
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= ACCEPT REQUEST ================= */
export const acceptRequest = async (req, res) => {
  try {
    const userId = req.user._id;
    const { requestId } = req.body;
    const request = await Contact.findById(requestId);

    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.receiver.toString() !== userId.toString()) return res.status(403).json({ message: "Not authorized" });

    request.status = "accepted";
    await request.save();

    req.io.to(request.sender.toString()).emit("friend_request_accepted");
    req.io.to(request.receiver.toString()).emit("friend_request_accepted");

    res.json({ message: "Friend request accepted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= REJECT REQUEST ================= */
export const rejectRequest = async (req, res) => {
  try {
    const userId = req.user._id;
    const { requestId } = req.body;
    const request = await Contact.findById(requestId);

    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.receiver.toString() !== userId.toString()) return res.status(403).json({ message: "Not authorized" });

    await request.deleteOne();
    req.io.to(request.sender.toString()).emit("friend_request_rejected");
    res.json({ message: "Friend request rejected" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= CANCEL REQUEST ================= */
export const cancelRequest = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { receiverId } = req.body;
    const request = await Contact.findOne({ sender: senderId, receiver: receiverId, status: "pending" });

    if (!request) return res.status(404).json({ message: "Request not found" });

    await request.deleteOne();
    req.io.to(receiverId.toString()).emit("friend_request_canceled");
    res.json({ message: "Friend request canceled" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= DELETE FRIEND ================= */
export const deleteFriend = async (req, res) => {
  try {
    const { contactId } = req.params;
    const currentUserId = req.user._id.toString();

    // 1. Fetch the contact BEFORE deleting so we know who the other person is
    const contact = await Contact.findById(contactId);

    if (!contact) return res.status(404).json({ message: "Contact not found" });

    // 2. Determine who needs to receive the socket event
    const recipientId = contact.sender.toString() === currentUserId 
      ? contact.receiver.toString() 
      : contact.sender.toString();

    // 3. Perform the deletion
    await Contact.findByIdAndDelete(contactId);

    // 4. Emit the event to the other person's specific room
    if (req.io) {
      req.io.to(recipientId).emit("friend_deleted");
      console.log(`Socket: Notifying user ${recipientId} of deletion`);
    }

    res.json({ message: "Friend removed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= GET PENDING ================= */
export const getPendingRequests = async (req, res) => {
  try {
    const requests = await Contact.find({ receiver: req.user._id, status: "pending" }).populate("sender", "username avatar");
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= GET SENT ================= */
export const getSentRequests = async (req, res) => {
  try {
    const sentRequests = await Contact.find({ sender: req.user._id, status: "pending" }).populate("receiver", "username avatar");
    res.json(sentRequests);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= GET FRIENDS ================= */
export const getFriends = async (req, res) => {
  try {
    const friends = await Contact.find({
      $or: [{ sender: req.user._id }, { receiver: req.user._id }],
      status: "accepted"
    }).populate("sender receiver", "username avatar");
    res.json(friends);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= GET FRIEND COUNT ================= */
export const getFriendCount = async (req, res) => {
  try {
    const count = await Contact.countDocuments({
      status: "accepted",
      $or: [{ sender: req.user._id }, { receiver: req.user._id }],
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};