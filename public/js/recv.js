import { iDronam_WebRTC_Recv } from "./webrtc.cloud.receiver.js";

const socket = io();
const receiver = new iDronam_WebRTC_Recv({
  socket: socket,
  videoEl: document.querySelector("video"),
  stream_type: "main",
  topic_name: "VIDEO_DATA",
  debug: true,
});
