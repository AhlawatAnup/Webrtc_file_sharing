const socket = io();
let localStream;
let remoteStream;
let peerConnection;
let userId;

const webcamVideo = document.getElementById("webcamVideo");
const remotecamVideo = document.getElementById("remotecamVideo");
const webcamButton = document.getElementById("webcamButton");
const callButton = document.getElementById("callButton");
const answerButton = document.getElementById("answerButton");
const hangupButton = document.getElementById("hangupButton");

console.log("Welcome to Video Chat");

const mediaConstraints = {
  audio: true,
  video: { width: 120, height: 120 },
};

const hangupButtonClickHandler = () => {
  location.reload(); // Reload the page to hang up the call
};

const callButtonClickHandler = async () => {
  // Setup media resources
  localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);

  // Display local stream in the webcam video element
  webcamVideo.srcObject = localStream;

  console.log("peer connnection is ", peerConnection);

  localStream.getTracks().forEach((track) => {
    console.log(peerConnection)
    peerConnection.addTrack(track, localStream);
    console.log("track added to peer connecton" , track)
  });

  peerConnection.ontrack = (e) => {
    console.log("Ontrack event triggered:", e);
    remotecamVideo.srcObject = remoteStream;
    e.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
      console.log("Track added to remote stream:", track);
    });
  };

};

const answerButtonClickHandler = () => {
  peerConnection.ontrack=(event) => {
    console.log("Ontrack event triggered:", event);
      remotecamVideo.srcObject = remoteStream;
      event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
      console.log("Track added to remote stream:", track);
    });
  };
  createPeerConnection()
  callButtonClickHandler()
};

// Event listeners for buttons
hangupButton.addEventListener("click", hangupButtonClickHandler);
callButton.addEventListener("click", callButtonClickHandler);
answerButton.addEventListener("click", answerButtonClickHandler);

// Setting up the Peer connection
socket.on("new_room", async (userId) => {
  console.log("New user: ", userId);
  generateOffer();
});

const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
};

const generateOffer = async () => {
  createPeerConnection();

  const offer = await peerConnection.createOffer();
  console.log("Created offer");

  await peerConnection.setLocalDescription(offer);

  socket.emit("offer", {
    type: "offer",
    sdp: offer,
  });
};

const generateAnswer = async (offer) => {
  createPeerConnection();
  await peerConnection.setRemoteDescription(offer.sdp);
  console.log("remote description for peer 2 set");

  const answer = await peerConnection.createAnswer();
  console.log("Created answer");
  await peerConnection.setLocalDescription(answer);

  socket.emit("answer", {
    type: "answer",
    sdp: answer,
  });
};

const addAnswer = async (answer) => {
  if (!peerConnection.currentRemoteDescription) {
    await peerConnection.setRemoteDescription(answer.sdp);
    console.log("Accepted answer");
  }
};

socket.on("offer", (data) => {
  generateAnswer(data);
  console.log("Offer listened");
});

socket.on("answer", (data) => {
  addAnswer(data);
  console.log("Answer listened");
});

const createPeerConnection = () => {
  peerConnection = new RTCPeerConnection(servers);
  console.log("Peer connection created");
  remoteStream = new MediaStream();

  // Adding ice candidates
  peerConnection.addEventListener("icecandidate", (e) => {
    console.log("Inside Ice candidate event Listener", e);
    if (e.candidate) {
      socket.emit("new-ice-candidate", e.candidate);
      console.log("Peer connection started");
    } else {
      console.log("NO Ice Candidate", e);
    }
  });
};

socket.on("new-ice-candidate", (data) => {
  const candidate = new RTCIceCandidate(data);
  attachIceCandidate(candidate);
  console.log("New ICE candidate received and added");
});

const attachIceCandidate = (candidate) => {
  peerConnection.addIceCandidate(candidate);
  console.log("Counterpart's ICE candidates added");
};
