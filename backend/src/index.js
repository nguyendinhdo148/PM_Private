import "dotenv/config";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";
import path from "path";
import connectDB from "./utils/db.js";
import routes from "./routes/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);
app.use(morgan("dev"));
app.use(express.json());

// Attach io to app for access in controllers
app.set("io", io);

const PORT = process.env.PORT || 5000;
// API Routes
app.use("/api-v1", routes);

app.get("/", (req, res) => {
  res.status(200).json({ 
    status: "success",
    message: "Backend API is running successfully!" 
  });
});

// Socket.IO authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication error"));
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    console.error("Socket auth error:", err.message);
    next(new Error("Authentication error"));
  }
});

// Socket.IO connection handler
io.on("connection", (socket) => {
  console.log("User connected:", socket.userId);
  
  socket.join(`user:${socket.userId}`);
  
  socket.on("join-conversation", (conversationId) => {
    socket.join(`conversation:${conversationId}`);
    console.log(`User ${socket.userId} joined conversation ${conversationId}`);
  });
  
  socket.on("leave-conversation", (conversationId) => {
    socket.leave(`conversation:${conversationId}`);
  });
  
  socket.on("send-message", (data) => {
    const { conversationId, messageData } = data;
    io.to(`conversation:${conversationId}`).emit("new-message", messageData);
  });
  
  socket.on("typing", (data) => {
    const { conversationId, isTyping } = data;
    socket.to(`conversation:${conversationId}`).emit("user-typing", {
      userId: socket.userId,
      isTyping,
    });
  });
  
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.userId);
  });
});

// error middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal Server Error" });
});

server.listen(PORT, () => {
  connectDB();
  console.log(`Server is running on port ${PORT}`);
  console.log(`Socket.IO server ready at http://localhost:${PORT}`);
});