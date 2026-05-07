const socket = io();
let peerConnection;
let userId;
let localStream;
let remoteStream;

console.log("Welcome to Video Chat");
const mediaConstraints = {
  audio: true,
  video: { width: 120, height: 120 },
};

let userIdGlobal = undefined;
socket.on("new_room", async (userId) => {
  console.log("New user: ", userId);
  userIdGlobal = userId;
  });

const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
};

// HTML Elements
const webcamVideo = document.getElementById("webcamVideo");
const remoteVideo = document.getElementById("remoteVideo");
const hangupButton = document.getElementById("hangupButton");

const startCall = async (mediaConstraints) => {
  try {
    console.log("Start call function called");
    
    // Setup media resources
    localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);

   // Display local stream in the webcam video element
    webcamVideo.srcObject = localStream;
    await createOffer();
    console.log("peer connnection is ", peerConnection);
    // Setup remote stream handling
    remoteStream = new MediaStream();
    remoteVideo.srcObject = remoteStream;

    peerConnection.ontrack = (e) => {
      console.log("Ontrack event triggered:", e);
      remoteVideo.srcObject = remoteStream;
      e.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track);
        console.log("Track added to remote stream:", track);
      });
    };

     hangupButton.disabled = false; // Enable hangup button
  } catch (error) {
    console.error("Error accessing media devices:", error);
  }
};

const hangupButtonClickHandler = () => {
  location.reload(); // Reload the page to hang up the call
};

// Event listeners for buttons
hangupButton.addEventListener("click", hangupButtonClickHandler);

const createPeerConnection = () => {
  peerConnection = new RTCPeerConnection(servers);
  console.log("Create Peer Connection called");
  remoteStream = new MediaStream();

  localStream.getTracks().forEach((track) => {
    console.log(peerConnection)
    peerConnection.addTrack(track, localStream);
    console.log("track added to peer connecton" , track)
  });

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


  peerConnection.ontrack=(event) => {
    console.log("Ontrack event triggered:", event);   
      remoteVideo.srcObject = remoteStream;
      event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
      console.log("Track added to remote stream:", track);
    });
  };
  
};

const createOffer = async () => {
  createPeerConnection();
  let offer = await peerConnection.createOffer();
  console.log("Created offer");

  await peerConnection.setLocalDescription(offer);

  socket.emit("offer", {
    type: "offer",
    sdp: offer,
  });
};

const createAnswer = async (offer) => {
  createPeerConnection();
  await peerConnection.setRemoteDescription(offer);
  console.log("Offer received");

  let answer = await peerConnection.createAnswer();
  console.log("Created answer");
  await peerConnection.setLocalDescription(answer);

  socket.emit("answer", {
    type: "answer",
    sdp: answer,
  });
};

const addAnswer = async (answer) => {
  await peerConnection.setRemoteDescription(answer);
  console.log("Accepted answer");
};

socket.on("offer", (data) => {
  createAnswer(data.sdp);
  console.log("Offer listened");
});

socket.on("answer", (data) => {
  addAnswer(data.sdp);
  console.log("Answer listened");
});

const addIceCandidate = (candidate) => {
  peerConnection.addIceCandidate(candidate);
  console.log("Counterpart's ICE candidates added");
};

socket.on("new-ice-candidate", (data) => {
  const candidate = new RTCIceCandidate(data);
  addIceCandidate(candidate);
  console.log("New ICE candidate received and added");
});

startCall(mediaConstraints);