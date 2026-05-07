
    /* ═══════════════════════════════════════════════
       ViewIt — Video Calling Client
    ═══════════════════════════════════════════════ */

    const socket = io();

    let localStream, remoteStream, peerConnection;
    let currentCallId = null;
    let isMuted = false;
    let cameraOff = false;
    let callStartTime = null;
    let timerInterval = null;

    const servers = {
      iceServers: [
        { urls: ["stun:stun1.l.google.com:19302","stun:stun2.l.google.com:19302"] }
      ]
    };

    // ── UI REFS ──
    const webcamVideo     = document.getElementById("webcamVideo");
    const remoteVideo     = document.getElementById("remoteVideo");
    const createCallButton= document.getElementById("createCallButton");
    const joinCallButton  = document.getElementById("joinCallButton");
    const muteButton      = document.getElementById("muteButton");
    const cameraButton    = document.getElementById("cameraButton");
    const hangupButton    = document.getElementById("hangupButton");
    const callInput       = document.getElementById("callInput");
    const currentCallIdEl = document.getElementById("currentCallId");
    const callBadge       = document.getElementById("callBadge");
    const statusEl        = document.getElementById("status");
    const statusTextEl    = document.getElementById("statusText");
    const copyButton      = document.getElementById("copyButton");
    const waitingState    = document.getElementById("waitingState");
    const callTimer       = document.getElementById("callTimer");
    const signalBars      = document.getElementById("signalBars");

    // ── STATUS HELPERS ──
    function setStatus(text, type = '') {
      statusTextEl.textContent = text;
      statusEl.className = 'status-chip' + (type ? ' ' + type : '');
    }

    function showToast(msg, type = '', icon = '✓') {
      const toast = document.getElementById('toast');
      document.getElementById('toastMsg').textContent = msg;
      document.getElementById('toastIcon').textContent = icon;
      toast.className = 'toast' + (type ? ' ' + type : '');
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2800);
    }

    function setBadge(id) {
      currentCallIdEl.textContent = id || 'No Active Call';
      callBadge.classList.toggle('active', !!id);
    }

    function showWaiting(show) {
      waitingState.classList.toggle('hidden', !show);
    }

    function startTimer() {
      callStartTime = Date.now();
      callTimer.classList.add('visible');
      timerInterval = setInterval(() => {
        const s = Math.floor((Date.now() - callStartTime) / 1000);
        const m = Math.floor(s / 60);
        callTimer.textContent = `${String(m).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
      }, 1000);
    }

    function stopTimer() {
      clearInterval(timerInterval);
      callTimer.classList.remove('visible');
    }

    // ── DRAG PiP ──
    const pip = document.getElementById('pipWrapper');
    let dragging = false, ox, oy;
    pip.addEventListener('mousedown', e => {
      dragging = true;
      const r = pip.getBoundingClientRect();
      ox = e.clientX - r.left; oy = e.clientY - r.top;
    });
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      const pw = pip.offsetWidth, ph = pip.offsetHeight;
      const cw = pip.parentElement.offsetWidth, ch = pip.parentElement.offsetHeight;
      let x = e.clientX - pip.parentElement.getBoundingClientRect().left - ox;
      let y = e.clientY - pip.parentElement.getBoundingClientRect().top - oy;
      x = Math.max(0, Math.min(x, cw - pw));
      y = Math.max(0, Math.min(y, ch - ph));
      pip.style.left = x + 'px'; pip.style.top = y + 'px';
      pip.style.right = 'auto'; pip.style.bottom = 'auto';
    });
    document.addEventListener('mouseup', () => dragging = false);

    // ── MEDIA ──
    async function startLocalStream() {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      webcamVideo.srcObject = localStream;
    }

    // ── PEER CONNECTION ──
    function createPeerConnection() {
      peerConnection = new RTCPeerConnection(servers);
      remoteStream = new MediaStream();
      remoteVideo.srcObject = remoteStream;

      localStream.getTracks().forEach(t => peerConnection.addTrack(t, localStream));

      peerConnection.ontrack = e => {
        e.streams[0].getTracks().forEach(t => remoteStream.addTrack(t));
        showWaiting(false);
      };

      peerConnection.onicecandidate = e => {
        if (e.candidate) socket.emit("ice-candidate", { callId: currentCallId, candidate: e.candidate });
      };

      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        const labels = {
          connected: ['Connected', 'connected'],
          connecting: ['Connecting…', ''],
          disconnected: ['Disconnected', ''],
          failed: ['Connection Failed', ''],
          closed: ['Call Ended', ''],
        };
        const [label, cls] = labels[state] || [state, ''];
        setStatus(label, cls);

        if (state === 'connected') {
          startTimer();
          signalBars.className = 'signal-bars good';
        }
        if (state === 'disconnected' || state === 'failed') {
          showWaiting(true);
          stopTimer();
          signalBars.className = 'signal-bars';
        }
      };
    }

    // ── CREATE CALL ──
    createCallButton.addEventListener("click", async () => {
      currentCallId = callInput.value.trim() || Math.random().toString(36).substring(2, 8).toUpperCase();
      callInput.value = currentCallId;
      setBadge(currentCallId);
      setStatus("Waiting for peer…");
      showWaiting(true);
      await startLocalStream();
      socket.emit("join-room", currentCallId);
    });

    // ── JOIN CALL ──
    joinCallButton.addEventListener("click", async () => {
      currentCallId = callInput.value.trim();
      if (!currentCallId) { showToast("Enter a Call ID first", '', '⚠️'); return; }
      setBadge(currentCallId);
      setStatus("Joining call…");
      showWaiting(true);
      await startLocalStream();
      socket.emit("join-room", currentCallId);
    });

    // ── SOCKET EVENTS ──
    socket.on("user-joined", async () => {
      setStatus("Peer joined — creating offer…");
      createPeerConnection();
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.emit("offer", { callId: currentCallId, offer });
    });

    socket.on("offer", async offer => {
      setStatus("Offer received");
      createPeerConnection();
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit("answer", { callId: currentCallId, answer });
    });

    socket.on("answer", async answer => {
      setStatus("Call connected", "connected");
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("ice-candidate", async candidate => {
      try { await peerConnection.addIceCandidate(new RTCIceCandidate(candidate)); }
      catch (err) { console.error("ICE error", err); }
    });

    socket.on("room-full", () => {
      showToast("Room is full", '', '🚫');
      setStatus("Room Full");
      showWaiting(false);
    });

    // ── COPY BUTTON ──
    copyButton.addEventListener("click", async () => {
      if (!currentCallId) { showToast("No call active", '', '⚠️'); return; }
      await navigator.clipboard.writeText(currentCallId);
      showToast("Call ID copied!", 'success', '⧉');
    });

    // ── MUTE ──
    muteButton.addEventListener("click", () => {
      isMuted = !isMuted;
      if (localStream) localStream.getAudioTracks()[0].enabled = !isMuted;
      muteButton.textContent = isMuted ? '🔇' : '🎤';
      muteButton.className = `ctrl-btn ${isMuted ? 'ctrl-btn-muted' : 'ctrl-btn-default'}`;
      muteButton.setAttribute('data-tooltip', isMuted ? 'Unmute mic' : 'Mute mic');
    });

    // ── CAMERA ──
    cameraButton.addEventListener("click", () => {
      cameraOff = !cameraOff;
      if (localStream) localStream.getVideoTracks()[0].enabled = !cameraOff;
      cameraButton.textContent = cameraOff ? '🚫' : '📷';
      cameraButton.className = `ctrl-btn ${cameraOff ? 'ctrl-btn-cam-off' : 'ctrl-btn-default'}`;
      cameraButton.setAttribute('data-tooltip', cameraOff ? 'Turn camera on' : 'Toggle camera');
    });

    // ── HANGUP ──
    hangupButton.addEventListener("click", () => {
      if (peerConnection) peerConnection.close();
      if (localStream) localStream.getTracks().forEach(t => t.stop());
      webcamVideo.srcObject = null;
      remoteVideo.srcObject = null;
      stopTimer();
      showWaiting(true);
      setStatus("Call Ended");
      setBadge(null);
      signalBars.className = 'signal-bars';
      setTimeout(() => location.reload(), 800);
    });

    // ── INIT ──
    showWaiting(true);
  