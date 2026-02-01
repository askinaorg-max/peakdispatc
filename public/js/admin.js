(() => {
  const socket = io();

  const statusEl = document.getElementById('adminSocketStatus');
  const incomingWrap = document.getElementById('incomingCalls');
  const ringtone = document.getElementById('ringtone');

  // --- Uncloseable popup elements (resolved lazily; safe even if markup loads later) ---
  function getPopupEls() {
    return {
      popup: document.getElementById('incomingCallPopup'),
      popupText: document.getElementById('incomingCallPopupText'),
      popupAccept: document.getElementById('incomingCallPopupAccept')
    };
  }

  const POPUP_MS = 15000;

  // prevent duplicate incoming-call UI (Render/socket can deliver duplicates)
  const seenRooms = new Map(); // roomId -> lastSeenTs
  const SEEN_TTL_MS = 4000;

  let popupTimer = null;
  let popupShakeTimer = null;
  let activePopupRoom = '';

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
    ringtone.loop = true;
    ringtone.currentTime = 0;
    ringtone.play().catch(() => {});
  }

  function stopRingtone() {
    if (!ringtone) return;
    ringtone.pause();
    ringtone.currentTime = 0;
  }

  function speakIncomingOnce() {
    try {
      if (!('speechSynthesis' in window)) return;
      // stop any previous utterances
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance('Incoming video call');
      u.rate = 1;
      u.pitch = 1;
      window.speechSynthesis.speak(u);
    } catch {}
  }

  function hidePopup() {
    const { popup } = getPopupEls();
    if (!popup) return;

    popup.classList.add('hidden');
    popup.classList.remove('is-shaking');

    if (popupTimer) { clearTimeout(popupTimer); popupTimer = null; }
    if (popupShakeTimer) { clearTimeout(popupShakeTimer); popupShakeTimer = null; }

    activePopupRoom = '';
    try { stopRingtone(); } catch {}
  }

  function showPopupForRoom(roomId) {
    const { popup, popupText, popupAccept } = getPopupEls();
    if (!popup) return;

    activePopupRoom = roomId;

    // show
    popup.classList.remove('hidden');

    if (popupText) popupText.textContent = `Room: ${roomId} — Click Accept to answer now.`;
    if (popupAccept) popupAccept.href = `/call?admin=1&room=${encodeURIComponent(roomId)}`;

    // shake for 15s
    popup.classList.add('is-shaking');
    if (popupShakeTimer) clearTimeout(popupShakeTimer);
    popupShakeTimer = setTimeout(() => {
      popup.classList.remove('is-shaking');
    }, POPUP_MS);

    // auto hide + stop sound after 15s (popup cannot be manually closed)
    if (popupTimer) clearTimeout(popupTimer);
    popupTimer = setTimeout(() => {
      hidePopup();
    }, POPUP_MS);
  }

  function shouldIgnoreRoom(roomId) {
    if (!roomId) return true;
    const now = Date.now();

    // purge old
    for (const [k, ts] of seenRooms.entries()) {
      if (now - ts > SEEN_TTL_MS) seenRooms.delete(k);
    }

    const last = seenRooms.get(roomId);
    if (last && (now - last) < SEEN_TTL_MS) return true;

    seenRooms.set(roomId, now);
    return false;
  }

  function showIncoming({ roomId }) {
    if (!incomingWrap) return;
    if (shouldIgnoreRoom(roomId)) return;

    // start audio for the same duration as popup
    playRingtone();
    speakIncomingOnce();

    // Desktop notification if allowed
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('Incoming video call', { body: 'Open admin to accept', tag: roomId });
      }
    }

    // Popup (auto hides after 15s)
    showPopupForRoom(roomId);

    // Existing incoming list card (stays as it was)
    const card = document.createElement('div');
    card.className = 'incoming-card';
    card.dataset.roomId = roomId;
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
      // stop popup timers + audio
      hidePopup();
      window.location.href = `/call?admin=1&room=${encodeURIComponent(roomId)}`;
    });

    dismissBtn.addEventListener('click', () => {
      // popup cannot be closed manually; list dismiss stays.
      card.remove();
    });

    incomingWrap.prepend(card);
  }

  socket.on('incoming-call', showIncoming);

  // hide popup when call ends
  socket.on('call-ended', () => {
    hidePopup();
  });

  // --- Phone leads ---
  const phoneLeadsWrap = document.getElementById('phoneLeads');
  const refreshPhoneLeadsBtn = document.getElementById('refreshPhoneLeadsBtn');

  function escapeHtml(str) {
    return String(str || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  async function fetchPhoneLeads() {
    if (!phoneLeadsWrap) return;
    phoneLeadsWrap.innerHTML = '<p class="admin-section-desc">Loading…</p>';

    try {
      const res = await fetch('/api/phone-leads');
      const data = await res.json();
      if (!data || !data.ok) {
        phoneLeadsWrap.innerHTML = '<p class="admin-section-desc">No access or error.</p>';
        return;
      }

      const items = data.items || [];
      if (!items.length) {
        phoneLeadsWrap.innerHTML = '<p class="admin-section-desc">No phone leads yet.</p>';
        return;
      }

      const rows = items.slice(0, 200).map((it) => {
        const when = (it.createdAt || '').replace('T', ' ').replace('Z', '');
        return `
          <tr>
            <td>${escapeHtml(when)}</td>
            <td>${escapeHtml(it.name || '—')}</td>
            <td style="font-weight:800;">${escapeHtml(it.number)}</td>
          </tr>`;
      }).join('');

      phoneLeadsWrap.innerHTML = `
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr><th>Created</th><th>Name</th><th>Phone</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    } catch {
      phoneLeadsWrap.innerHTML = '<p class="admin-section-desc">Network error.</p>';
    }
  }

  if (refreshPhoneLeadsBtn) refreshPhoneLeadsBtn.addEventListener('click', fetchPhoneLeads);

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
        const when = (it.createdAt || '').replace('T', ' ').replace('Z', '');
        const status = it.status === 'closed' ? 'Closed' : 'New';
        card.innerHTML = `
          <div class="incoming-meta">
            <div style="font-weight:800;">${escapeHtml(it.name)} <span style="font-weight:600; opacity:0.8;">(${status})</span></div>
            <div style="font-size:0.85rem; opacity:0.85;">${escapeHtml(it.phone)}</div>
            <div style="font-size:0.8rem; opacity:0.7;">${escapeHtml(when)}</div>
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
    try {
      if (ringtone) {
        ringtone.loop = false;
        ringtone.currentTime = 0;
        ringtone.play().catch(() => {});
        setTimeout(() => stopRingtone(), 900);
      }
    } catch {}
    fetchCallbacks();
  });

  // initial load (after connect)
  setTimeout(() => {
    fetchCallbacks();
    fetchPhoneLeads();
  }, 900);

  socket.on('new-comment', () => {
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
      enablePush().catch(() => setPushHint('Failed to enable push.'));
    });
  }
})();