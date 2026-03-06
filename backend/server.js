import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import Message from "./models/Message.js";
import messageRoutes from "./routes/messageRoutes.js";
import path from "path";

dotenv.config();

console.log("MAIL_USER:", process.env.MAIL_USER);
console.log("MAIL_PASS:", process.env.MAIL_PASS);

const app = express();

/* ================= DATABASE ================= */
connectDB();

/* ================= SECURITY ================= */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);



/* ================= CORS ================= */
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
}));

/* ================= BODY PARSER ================= */
import cookieParser from "cookie-parser";
app.use(cookieParser());
app.use(express.json());

/* ================= ROUTES ================= */
app.get("/", (req, res) => res.send("Backend running 🚀"));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/messages", messageRoutes);
app.use(
  "/uploads",
  cors({ origin: CLIENT_URL, credentials: true }),
  express.static(path.join(path.resolve(), "uploads"))
);
/* ================= CREATE HTTP SERVER ================= */
const server = http.createServer(app);

/* ================= SOCKET.IO ================= */
export const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

  // ================= ONLINE USERS TRACKING =================
let onlineUsers = new Map(); 
// key = userId
// value = socket.id


io.on("connection", (socket) => {

  console.log("User connected:", socket.id);

  // ================= JOIN USER ROOM =================
  socket.on("join_user_room", (userId) => {
    socket.join(userId);

    // Save user as online
    onlineUsers.set(userId, socket.id);

    // Send updated online users list to everyone
    io.emit("online_users", Array.from(onlineUsers.keys()));
  });

  // ================= JOIN CHAT ROOM =================
  socket.on("join_room", (room) => {
    socket.join(room);
  });

  // ================= SEND MESSAGE =================
  socket.on("send_message", async (data) => {
    try {
      const newMessage = await Message.create({
        chatId: data.chatId,
        sender: data.sender,
        message: data.message,
      });

      io.to(data.chatId).emit("receive_message", newMessage);

    } catch (err) {
      console.error("Message save error:", err);
    }
  });

  // ================= DISCONNECT =================
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }

    io.emit("online_users", Array.from(onlineUsers.keys()));
  });

});
/* ================= ERROR HANDLER ================= */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong" });
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));