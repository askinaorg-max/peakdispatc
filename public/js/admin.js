(() => {
  const socket = io();

  const statusEl = document.getElementById('adminSocketStatus');
  const incomingWrap = document.getElementById('incomingCalls');
  const ringtone = document.getElementById('ringtone');

  function setStatus(text, kind) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = 'pill ' + (kind ? `pill-${kind}` : '');
  }

  socket.on('connect', () => {
    setStatus('Online', 'approved');
    socket.emit('admin-online');
  });

  socket.on('disconnect', () => {
    setStatus('Offline', 'rejected');
  });

  function playRingtone() {
    if (!ringtone) return;
    ringtone.currentTime = 0;
    ringtone.play().catch(() => {});
  }

  function stopRingtone() {
    if (!ringtone) return;
    ringtone.pause();
    ringtone.currentTime = 0;
  }

  function showIncoming({ roomId, at }) {
    if (!incomingWrap) return;

    playRingtone();

    // Desktop notification if allowed
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('Incoming video call', { body: 'Open admin to accept', tag: roomId });
      }
    }

    const card = document.createElement('div');
    card.className = 'incoming-card';
    card.innerHTML = `
      <div class="incoming-meta">
        <div style="font-weight:800;">Incoming call</div>
        <div style="font-size:0.85rem; opacity:0.85;">Room: ${roomId}</div>
      </div>
      <div class="incoming-actions">
        <button class="btn btn-primary btn-sm">Accept</button>
        <button class="btn btn-outline btn-sm">Dismiss</button>
      </div>
    `;

    const [acceptBtn, dismissBtn] = card.querySelectorAll('button');

    acceptBtn.addEventListener('click', () => {
      stopRingtone();
      window.location.href = `/call?admin=1&room=${encodeURIComponent(roomId)}`;
    });

    dismissBtn.addEventListener('click', () => {
      stopRingtone();
      card.remove();
    });

    incomingWrap.prepend(card);
  }

  socket.on('incoming-call', showIncoming);


  // --- Callback requests (missed calls) ---
  const callbackWrap = document.getElementById('callbackRequests');
  const refreshCallbacksBtn = document.getElementById('refreshCallbacksBtn');

  async function fetchCallbacks() {
    if (!callbackWrap) return;
    callbackWrap.innerHTML = '<div style="opacity:0.85;">Loading…</div>';
    try {
      const res = await fetch('/api/callback-requests');
      const data = await res.json();
      if (!data || !data.ok) {
        callbackWrap.innerHTML = '<div style="opacity:0.85;">No access or error.</div>';
        return;
      }

      const items = data.items || [];
      if (!items.length) {
        callbackWrap.innerHTML = '<div style="opacity:0.85;">No callback requests.</div>';
        return;
      }

      const list = document.createElement('div');
      list.className = 'incoming-calls';

      items.forEach((it) => {
        const card = document.createElement('div');
        card.className = 'incoming-card';
        const when = (it.createdAt || '').replace('T',' ').replace('Z','');
        const status = it.status === 'closed' ? 'Closed' : 'New';
        card.innerHTML = `
          <div class="incoming-meta">
            <div style="font-weight:800;">${it.name} <span style="font-weight:600; opacity:0.8;">(${status})</span></div>
            <div style="font-size:0.85rem; opacity:0.85;">${it.phone}</div>
            <div style="font-size:0.8rem; opacity:0.7;">${when}</div>
          </div>
          <div class="incoming-actions">
            ${it.status === 'closed' ? '' : '<button class="btn btn-outline btn-sm">Mark closed</button>'}
          </div>
        `;

        const btn = card.querySelector('button');
        if (btn) {
          btn.addEventListener('click', async () => {
            try {
              const r = await fetch(`/api/callback-requests/${it.id}/close`, { method: 'POST' });
              const d = await r.json();
              if (d && d.ok) fetchCallbacks();
            } catch {}
          });
        }

        list.appendChild(card);
      });

      callbackWrap.innerHTML = '';
      callbackWrap.appendChild(list);
    } catch {
      callbackWrap.innerHTML = '<div style="opacity:0.85;">Network error.</div>';
    }
  }

  if (refreshCallbacksBtn) refreshCallbacksBtn.addEventListener('click', fetchCallbacks);
  socket.on('new-callback', () => {
    // refresh list + subtle audio hint
    playRingtone();
    setTimeout(() => stopRingtone(), 900);
    fetchCallbacks();
  });

  // initial load (after connect)
  setTimeout(fetchCallbacks, 900);


  socket.on('new-comment', () => {
    // subtle hint only; admin can refresh comments section
    const hint = document.createElement('div');
    hint.className = 'toast';
    hint.textContent = 'New comment submitted (pending approval).';
    document.body.appendChild(hint);
    setTimeout(() => hint.remove(), 3500);
  });

  // --- Push notifications setup (optional) ---
  const enablePushBtn = document.getElementById('enablePushBtn');
  const pushHint = document.getElementById('pushHint');

  function setPushHint(text) {
    if (pushHint) pushHint.textContent = text || '';
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }

  async function enablePush() {
    if (!('serviceWorker' in navigator)) {
      setPushHint('Service Worker not supported in this browser.');
      return;
    }
    if (!('PushManager' in window)) {
      setPushHint('Push not supported in this browser.');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      setPushHint('Permission denied.');
      return;
    }

    const reg = await navigator.serviceWorker.register('/sw.js');

    const vapidKey = window.__VAPID_PUBLIC_KEY__ || '';
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey)
    });

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub)
    });

    setPushHint('Push enabled for this device.');
  }

  if (enablePushBtn) {
    enablePushBtn.addEventListener('click', () => {
      enablePush().catch((e) => setPushHint('Failed to enable push.'));
    });
  }
})();
