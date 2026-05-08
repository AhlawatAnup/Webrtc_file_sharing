import { iDronam_WebRTC_Sender } from "./webrtc.cloud_sender.js";

const socket = io();

const sender = new iDronam_WebRTC_Sender({
  socket: socket,
  stream: document.querySelector("video").captureStream(),
  stream_type: "main",
  topic_name: "VIDEO_DATA",
  debug: true,
});
