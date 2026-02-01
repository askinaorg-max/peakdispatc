(() => {
  const socket = io();

  const startBtn = document.getElementById('startCallBtn');
  const hangupBtn = document.getElementById('hangupBtn');
  const statusEl = document.getElementById('callStatus');

  const localVideo = document.getElementById('localVideo');
  const remoteVideo = document.getElementById('remoteVideo');

  const params = new URLSearchParams(window.location.search);
  const isAdmin = params.get('admin') === '1';
  const fixedRoom = params.get('room') || '';

  let roomId = fixedRoom;
  let pc = null;
  let localStream = null;
  let connected = false;
  let callTimeoutId = null;
  const CALL_TIMEOUT_MS = 3 * 60 * 1000;

  // --- ICE buffering (FIX for "remote description was null") ---
  const pendingIce = [];

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg || '';
  }

  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ];

  async function initMedia() {
    if (localStream) return localStream;

    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    if (localVideo) localVideo.srcObject = localStream;
    return localStream;
  }

  function ensurePC() {
    if (pc) return pc;

    pc = new RTCPeerConnection({ iceServers });

    pc.onicecandidate = (e) => {
      if (e.candidate && roomId) {
        socket.emit('signal', { roomId, message: { type: 'candidate', candidate: e.candidate } });
      }
    };

    pc.ontrack = (e) => {
      // Some browsers deliver streams, some deliver individual tracks
      if (e.streams && e.streams[0]) {
        remoteVideo.srcObject = e.streams[0];
      } else if (remoteVideo) {
        const ms = remoteVideo.srcObject || new MediaStream();
        ms.addTrack(e.track);
        remoteVideo.srcObject = ms;
      }

      // Mark connected when we start receiving media
      connected = true;
      if (callTimeoutId) { clearTimeout(callTimeoutId); callTimeoutId = null; }
      setStatus('Connected.');
    };

    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === 'failed' || st === 'disconnected' || st === 'closed') {
        // do not force close instantly on 'disconnected' (mobile can recover),
        // but if it fails, clean up.
        if (st === 'failed') {
          setStatus('Connection failed. Try again.');
          cleanup();
        }
      }
    };

    return pc;
  }

  async function attachTracks() {
    const stream = await initMedia();
    const peer = ensurePC();

    // Prevent adding tracks multiple times
    const senders = peer.getSenders ? peer.getSenders() : [];
    const alreadyHas = (track) => senders.some(s => s.track && s.track.id === track.id);

    stream.getTracks().forEach(track => {
      if (!alreadyHas(track)) peer.addTrack(track, stream);
    });
  }

  async function flushPendingIce(peer) {
    // Add buffered ICE candidates after remoteDescription exists
    if (!peer || !peer.remoteDescription) return;

    while (pendingIce.length) {
      const c = pendingIce.shift();
      try {
        await peer.addIceCandidate(new RTCIceCandidate(c));
      } catch (e) {
        console.warn('flush addIceCandidate failed:', e);
      }
    }
  }

  function cleanup() {
    try {
      if (pc) pc.close();
    } catch {}
    pc = null;

    pendingIce.length = 0;
    connected = false;

    if (remoteVideo) remoteVideo.srcObject = null;

    setStatus('');
    if (hangupBtn) hangupBtn.disabled = true;
    if (startBtn && !isAdmin) startBtn.disabled = false;
  }

  async function startCall() {
    setStatus('Starting call…');
    if (startBtn) startBtn.disabled = true;
    if (hangupBtn) hangupBtn.disabled = false;

    await attachTracks();

    // Ask server to create room and notify admins
    socket.emit('start-call', { roomId: '' });
  }

  async function joinRoomAs(role) {
    if (!roomId) return;
    socket.emit('join-room', { roomId, role });
  }

  socket.on('call-room', async ({ roomId: id }) => {
    roomId = id;
    await joinRoomAs('caller');
    setStatus('Ringing admin…');

    // Start unanswered timer (3 minutes) for caller only
    if (!isAdmin) {
      if (callTimeoutId) clearTimeout(callTimeoutId);
      callTimeoutId = setTimeout(() => {
        if (connected) return;
        try { if (roomId) socket.emit('end-call', { roomId }); } catch {}
        cleanup();
        setStatus('No answer. Please leave your details.');
        openCallbackModal();
      }, CALL_TIMEOUT_MS);
    }
  });

  socket.on('peer-joined', async () => {
    if (isAdmin) return;

    if (callTimeoutId) { clearTimeout(callTimeoutId); callTimeoutId = null; }

    // Caller makes offer when admin joins
    setStatus('Connecting…');

    const peer = ensurePC();
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socket.emit('signal', { roomId, message: { type: 'offer', sdp: offer } });
  });

  socket.on('signal', async ({ message }) => {
    if (!message) return;
    const peer = ensurePC();

    try {
      if (message.type === 'offer' && isAdmin) {
        setStatus('Connecting…');
        await attachTracks();

        await peer.setRemoteDescription(new RTCSessionDescription(message.sdp));
        await flushPendingIce(peer);

        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socket.emit('signal', { roomId, message: { type: 'answer', sdp: answer } });
      }

      if (message.type === 'answer' && !isAdmin) {
        await peer.setRemoteDescription(new RTCSessionDescription(message.sdp));
        await flushPendingIce(peer);

        connected = true;
        if (callTimeoutId) { clearTimeout(callTimeoutId); callTimeoutId = null; }
        setStatus('Connected.');
      }

      if (message.type === 'candidate') {
        // Candidate can arrive before remoteDescription -> buffer
        const cand = message.candidate;
        if (!cand) return;

        if (!peer.remoteDescription) {
          pendingIce.push(cand);
          return;
        }

        await peer.addIceCandidate(new RTCIceCandidate(cand));
      }
    } catch (e) {
      console.error(e);
      setStatus('Connection error. Try again.');
    }
  });

  socket.on('call-ended', () => {
    setStatus('Call ended.');
    cleanup();
  });

  async function hangup() {
    if (roomId) socket.emit('end-call', { roomId });
    cleanup();
  }

  if (startBtn) startBtn.addEventListener('click', () => startCall().catch(() => setStatus('Could not start call.')));
  if (hangupBtn) hangupBtn.addEventListener('click', () => hangup());

  // Admin flow: join fixed room
  if (isAdmin) {
    startBtn && (startBtn.disabled = true);
    hangupBtn && (hangupBtn.disabled = false);
    setStatus('Ready to accept incoming call…');

    if (!roomId) {
      setStatus('Missing room id.');
    } else {
      joinRoomAs('admin');
      // We wait for the offer
      attachTracks().catch(() => setStatus('Please allow camera/mic.'));
    }
  }

  // --- Callback modal helpers ---
  const callbackModal = document.getElementById('callbackModal');
  const callbackForm = document.getElementById('callbackForm');
  const callbackMsg = document.getElementById('callbackMsg');

  function openCallbackModal() {
    if (!callbackModal) return;
    callbackModal.classList.remove('hidden');
  }

  function closeCallbackModal() {
    if (!callbackModal) return;
    callbackModal.classList.add('hidden');
  }

  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!t) return;
    if (t.matches('[data-close-modal]')) closeCallbackModal();
  });

  if (callbackForm) {
    callbackForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(callbackForm);
      const name = String(fd.get('name') || '').trim();
      const phone = String(fd.get('phone') || '').trim();

      if (!name || !phone) return;

      try {
        const res = await fetch('/api/callback-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, phone, roomId })
        });
        const data = await res.json();
        if (data && data.ok) {
          if (callbackMsg) callbackMsg.textContent = 'Thanks! We will contact you shortly.';
          callbackForm.reset();
        } else {
          if (callbackMsg) callbackMsg.textContent = 'Could not send. Please try again.';
        }
      } catch {
        if (callbackMsg) callbackMsg.textContent = 'Network error. Please try again.';
      }
    });
  }

  // cleanup on unload
  window.addEventListener('beforeunload', () => {
    try { if (roomId) socket.emit('end-call', { roomId }); } catch {}
  });
})();
