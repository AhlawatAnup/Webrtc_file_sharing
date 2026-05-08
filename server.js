const express = require("express");
const app = express();

const path = require("path");
const http = require("http");

const server = http.createServer(app);

const socketio = require("socket.io");

const io = socketio(server, {
  cors: {
    origin: "*",
  },
});

app.use(express.static(path.join(process.cwd(), "public")));

const port = process.env.PORT || 5000;

// ================= SOCKET.IO =================

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
  const callId = "12345678";
  const room = io.sockets.adapter.rooms.get(callId);
  const numberOfUsers = room ? room.size : 0;
  if (numberOfUsers >= 2) {
    socket.emit("room-full");
    return;
  }
  socket.join(callId);

  // DISCONNECT
  socket.on("disconnect", () => {
    console.log(`Disconnected: ${socket.id}`);
  });

  // ===========
  socket.on("VIDEO_DATA", (msg) => {
    socket.to(callId).emit("VIDEO_DATA", msg);
  });
});

// ================= ROUTES =================

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

app.get("/send", (req, res) => {
  res.sendFile(__dirname + "/public/send.html");
});

app.get("/recv", (req, res) => {
  res.sendFile(__dirname + "/public/recv.html");
});

// ================= SERVER =================

server.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
