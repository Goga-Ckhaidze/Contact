import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import http from "http";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";
import path from "path";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import Message from "./models/Message.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";

dotenv.config();


const app = express();
/* ================= CREATE HTTP SERVER FIRST ================= */
const server = http.createServer(app);
const CLIENT_URL = process.env.CLIENT_URL || "https://contact-rho-hazel.vercel.app";

/* ================= SOCKET.IO ================= */
export const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

/* ================= DATABASE ================= */
connectDB();

/* ================= SECURITY & MIDDLEWARE ================= */
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
}));

app.use(cookieParser());

app.use("/api/subscription", subscriptionRoutes);

app.use(express.json());

/* ================= ATTACH IO TO REQ (THE FIX) ================= */
// This stops the circular dependency error. Now any controller can use req.io
app.use((req, res, next) => {
  req.io = io;
  next();
});

/* ================= ROUTES ================= */
app.get("/", (req, res) => res.send("Backend running 🚀"));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/ai", aiRoutes);


app.use(
  "/uploads",
  cors({ origin: CLIENT_URL, credentials: true }),
  express.static(path.join(path.resolve(), "uploads"))
);

/* ================= ONLINE USERS TRACKING ================= */
let onlineUsers = new Map(); // key = userId, value = socket.id

io.on("connection", (socket) => {

  // Join User Room
  socket.on("join_user_room", (userId) => {
    socket.join(userId.toString());
    onlineUsers.set(userId.toString(), socket.id);
    io.emit("online_users", Array.from(onlineUsers.keys()));
  });

  // Join Chat Room
  socket.on("join_room", (room) => {
    socket.join(room.toString());
  });

  // Send Message
  socket.on("send_message", async (data) => {
    try {
      const newMessage = await Message.create({
        chatId: data.chatId,
        sender: data.sender,
        message: data.message,
      });
      io.to(data.chatId.toString()).emit("receive_message", newMessage);
    } catch (err) {
      console.error("Message save error:", err);
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
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