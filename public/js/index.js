const socket = io();

let localStream;
let remoteStream;
let peerConnection;

let currentCallId = null;

const servers = {
  iceServers: [
    {
      urls: [
        "stun:stun1.l.google.com:19302",
        "stun:stun2.l.google.com:19302",
      ],
    },
  ],
};

// ================= UI ELEMENTS =================

const webcamVideo = document.getElementById("webcamVideo");
const remoteVideo = document.getElementById("remoteVideo");

const createCallButton = document.getElementById("createCallButton");
const joinCallButton = document.getElementById("joinCallButton");

const muteButton = document.getElementById("muteButton");
const cameraButton = document.getElementById("cameraButton");
const hangupButton = document.getElementById("hangupButton");

const callInput = document.getElementById("callInput");

const currentCallIdText = document.getElementById("currentCallId");
const statusDiv = document.getElementById("status");

const copyButton = document.getElementById("copyButton");

// ================= MEDIA =================

async function startLocalStream() {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });

  webcamVideo.srcObject = localStream;
}

// ================= PEER CONNECTION =================

function createPeerConnection() {
  peerConnection = new RTCPeerConnection(servers);

  remoteStream = new MediaStream();

  remoteVideo.srcObject = remoteStream;

  // ADD LOCAL TRACKS
  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  // RECEIVE REMOTE TRACKS
  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  // SEND ICE CANDIDATES
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", {
        callId: currentCallId,
        candidate: event.candidate,
      });
    }
  };

  // CONNECTION STATUS
  peerConnection.onconnectionstatechange = () => {
    statusDiv.innerText =
      "Connection: " + peerConnection.connectionState;
  };
}

// ================= CREATE CALL =================

createCallButton.addEventListener("click", async () => {
  currentCallId =
    callInput.value || Math.random().toString(36).substring(2, 8);

  callInput.value = currentCallId;

  currentCallIdText.innerText = currentCallId;

  statusDiv.innerText = "Creating call...";

  await startLocalStream();

  socket.emit("join-room", currentCallId);
});

// ================= JOIN CALL =================

joinCallButton.addEventListener("click", async () => {
  currentCallId = callInput.value;

  if (!currentCallId) {
    alert("Please enter Call ID");
    return;
  }

  currentCallIdText.innerText = currentCallId;

  statusDiv.innerText = "Joining call...";

  await startLocalStream();

  socket.emit("join-room", currentCallId);
});

// ================= WHEN USER JOINS =================

socket.on("user-joined", async () => {
  statusDiv.innerText = "User joined. Creating offer...";

  createPeerConnection();

  const offer = await peerConnection.createOffer();

  await peerConnection.setLocalDescription(offer);

  socket.emit("offer", {
    callId: currentCallId,
    offer,
  });
});

// ================= RECEIVE OFFER =================

socket.on("offer", async (offer) => {
  statusDiv.innerText = "Offer received";

  createPeerConnection();

  await peerConnection.setRemoteDescription(
    new RTCSessionDescription(offer)
  );

  const answer = await peerConnection.createAnswer();

  await peerConnection.setLocalDescription(answer);

  socket.emit("answer", {
    callId: currentCallId,
    answer,
  });
});

// ================= RECEIVE ANSWER =================

socket.on("answer", async (answer) => {
  statusDiv.innerText = "Call connected";

  await peerConnection.setRemoteDescription(
    new RTCSessionDescription(answer)
  );
});

// ================= RECEIVE ICE CANDIDATE =================

socket.on("ice-candidate", async (candidate) => {
  try {
    await peerConnection.addIceCandidate(
      new RTCIceCandidate(candidate)
    );
  } catch (err) {
    console.error("ICE Candidate Error", err);
  }
});

// ================= ROOM FULL =================

socket.on("room-full", () => {
  alert("Room is full");

  statusDiv.innerText = "Room Full";
});

// ================= COPY CALL ID =================

copyButton.addEventListener("click", async () => {
  if (!currentCallId) return;

  await navigator.clipboard.writeText(currentCallId);

  alert("Call ID copied");
});

// ================= MUTE BUTTON =================

let isMuted = false;

muteButton.addEventListener("click", () => {
  isMuted = !isMuted;

  localStream.getAudioTracks()[0].enabled = !isMuted;

  muteButton.innerText = isMuted
    ? "🔇 Unmute"
    : "🎤 Mute";
});

// ================= CAMERA BUTTON =================

let cameraOff = false;

cameraButton.addEventListener("click", () => {
  cameraOff = !cameraOff;

  localStream.getVideoTracks()[0].enabled = !cameraOff;

  cameraButton.innerText = cameraOff
    ? "📷 Camera On"
    : "📷 Camera Off";
});

// ================= HANGUP =================

hangupButton.addEventListener("click", () => {
  // CLOSE PEER CONNECTION
  if (peerConnection) {
    peerConnection.close();
  }

  // STOP LOCAL TRACKS
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
  }

  // CLEAR VIDEOS
  webcamVideo.srcObject = null;
  remoteVideo.srcObject = null;

  statusDiv.innerText = "Call ended";

  location.reload();
});