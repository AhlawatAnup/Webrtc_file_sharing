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
// const callButton = document.getElementById("callButton");
// const answerButton = document.getElementById("answerButton");
const remoteVideo = document.getElementById("remoteVideo");
const hangupButton = document.getElementById("hangupButton");

const startCall = async (mediaConstraints) => {
  try {
    console.log("Start call function called");
    
    createPeerConnection(); 
    
    // Setup media resources
    localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);

    // Display local stream in the webcam video element
    webcamVideo.srcObject = localStream;
    webcamVideo.muted = true;

    console.log("peer connnection is ", peerConnection);
    // Add tracks from local stream to peer connection
    localStream.getTracks().forEach((track) => {
      console.log(peerConnection)
      peerConnection.addTrack(track, localStream);
      console.log("track added to peer connecton" , track)
    });

    // Setup remote stream handling
    remoteStream = new MediaStream();
    remoteVideo.srcObject = remoteStream;

    // peerConnection.ontrack = (e) => {
    //   e.streams[0].getTracks().forEach((track) => {
    //     remoteStream.addTrack(track);
    //     console.log("Track added to remote stream:", track);
    //   });
    // };

    //  Handling incoming media tracks
     peerConnection.ontrack = (event) => {
      console.log("Ontrack event triggered:", event);
      if (!remoteStream) {
        remoteStream = new MediaStream();
        remoteVideo.srcObject = remoteStream;
      }
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track);
        console.log("Track added to remote stream:", track);
      });
    };

    // Enable/disable buttons based on call state
    // callButton.disabled = false;
    // answerButton.disabled = !userId; // Enable answer button if room is joined
    hangupButton.disabled = false; // Enable hangup button

    await createOffer();

  } catch (error) {
    console.error("Error accessing media devices:", error);
  }
};

startCall(mediaConstraints);

// const callButtonClickHandler = async () => {
//   callButton.disabled = true; // Disable call button after clicked
//   // answerButton.disabled = true; // Disable answer button during call
//   await startCall(mediaConstraints); // Initiate the call by creating an offer
// };

// const answerButtonClickHandler = async () => {
//   const callId = userIdGlobal;
//   socket.emit("answer-button-clicked", callId); // Notify the other peer that the answer button has been clicked
// };

const hangupButtonClickHandler = () => {
  location.reload(); // Reload the page to hang up the call
};

// Event listeners for buttons
// callButton.addEventListener("click", callButtonClickHandler);
// answerButton.addEventListener("click", answerButtonClickHandler);
hangupButton.addEventListener("click", hangupButtonClickHandler);

const createPeerConnection = () => {
  peerConnection = new RTCPeerConnection(servers);
  console.log("Create Peer Connection called");

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


  peerConnection.ontrack = (event) => {
    console.log("Ontrack event triggered:", event);
    if (!remoteStream) {
      remoteStream = new MediaStream();
      remoteVideo.srcObject = remoteStream;
    }
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

// socket.on("answer-button-clicked", async () => {
//   await createOffer();
//   answerButton.disabled = true;
//   console.log("Answer button clicked and createOffer called");
// });
