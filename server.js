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

  // JOIN ROOM
  socket.on("join-room", (callId) => {
    const room = io.sockets.adapter.rooms.get(callId);

    const numberOfUsers = room ? room.size : 0;

    // Only allow 2 users
    if (numberOfUsers >= 2) {
      socket.emit("room-full");
      return;
    }

    socket.join(callId);

    console.log(`${socket.id} joined room ${callId}`);

    // Notify others
    socket.to(callId).emit("user-joined", socket.id);

    socket.emit("joined-successfully", callId);
  });

  // OFFER
  socket.on("offer", ({ callId, offer }) => {
    socket.to(callId).emit("offer", offer);
  });

  // ANSWER
  socket.on("answer", ({ callId, answer }) => {
    socket.to(callId).emit("answer", answer);
  });

  // ICE CANDIDATE
  socket.on("ice-candidate", ({ callId, candidate }) => {
    socket.to(callId).emit("ice-candidate", candidate);
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    console.log(`Disconnected: ${socket.id}`);
  });
});

// ================= ROUTES =================

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// ================= SERVER =================

server.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});