
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

require("dotenv").config();

const connectDB = require("./config/db");
const tradeRoutes = require("./routes/tradeRoutes");

const app = express();
const server = http.createServer(app);

// Configure Socket.IO to use WebSocket only
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ["websocket"]
});

// Middleware
app.use(cors());
app.use(express.json());

// Make Socket.IO available to controllers
app.set("io", io);

// REST API routes
app.use("/api", tradeRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "BSE Trades Dashboard Backend is running"
  });
});

// WebSocket connection
io.on("connection", (socket) => {
  console.log("Dashboard connected:", socket.id);

  socket.emit("connectionStatus", {
    connected: true,
    message: "Connected to live trade updates"
  });

  socket.on("disconnect", () => {
    console.log("Dashboard disconnected:", socket.id);
  });
});

// Start server
const startServer = async () => {
  await connectDB();

  const PORT = process.env.PORT || 5000;

  server.listen(PORT, () => {
    console.log("=================================");
    console.log("BSE Dashboard Backend Started");
    console.log(`URL: http://localhost:${PORT}`);
    console.log("WebSocket: Enabled");
    console.log("=================================");
  });
};

startServer();