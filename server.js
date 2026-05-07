const express = require("express");
const app = express();

const path = require("path");

const fs = require("fs");

const http = require("http");
const server = http.createServer(app);

const socketio = require("socket.io");
const io = socketio(server);

app.use(express.static(path.join(process.cwd(), "public")));
const port = process.env.PORT || 5000;

io.on("connection", (socket) => {
  socket.emit("message", "Welcome!");

  // Creating a room
  let userId = socket.id;
  console.log(`User: ${userId} connected`); 

  socket.join("new_room");
  socket.to("new_room").emit("new_room", userId);
  console.log("User entered a new room");

  // LISTENING OFFER
  socket.on("offer", (data) => {
    console.log("Offer from P1 received: ", data.sdp);
    socket.to("new_room").emit("offer", data);
  });

  // LISTENING ANSWER
  socket.on("answer", (data) => {
    console.log("Answer from P2 received: ", data.sdp);
    socket.to("new_room").emit("answer", data);
  });

  // ADDING THE ICE CANDIDATES TO ROOM
  socket.on("new-ice-candidate", (data) => {
    socket.to("new_room").emit("new-ice-candidate", data);
  });

  socket.on("disconnect", () => {
    console.log(`User: ${socket.id} disconnected`);
  });
});

// Setting server
server.listen(port ,"0.0.0.0",() => {
  console.log("Server listening on the port: ", port);
});

// Serve the HTML file
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});
  