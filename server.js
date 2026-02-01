require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const { Resend } = require('resend');

const http = require('http');
const { Server } = require('socket.io');
const webpush = require('web-push');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Session config ---
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'change_this_secret_peakdispatch',
    resave: false,
    saveUninitialized: false
  })
);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// --- Data files ---
const DATA_DIR = path.join(__dirname, 'data');
const CONTENT_FILE = path.join(DATA_DIR, 'content.json');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');
const DRIVERS_FILE = path.join(DATA_DIR, 'drivers.json');
const COMMENTS_FILE = path.join(DATA_DIR, 'comments.json');
const TOPDAILY_FILE = path.join(DATA_DIR, 'topdaily.json');
const TOPDAILY_HISTORY_FILE = path.join(DATA_DIR, 'topdaily_history.json');
const PUSH_SUBS_FILE = path.join(DATA_DIR, 'push-subs.json');
const CALLBACK_FILE = path.join(DATA_DIR, 'callback_requests.json');

// --- Helpers ---
function readJsonSafe(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    // If file doesn't exist yet, create it with fallback to avoid noisy errors on first run.
    if (err && err.code === 'ENOENT') {
      try {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), 'utf8');
      } catch (e) {
        // ignore secondary errors, we'll just return fallback
      }
      return fallback;
    }
    console.error(`Error reading ${filePath}`, err);
    return fallback;
  }
}

function writeJsonSafe(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function loadContent() {
  return readJsonSafe(CONTENT_FILE, {});
}
function saveContent(content) {
  writeJsonSafe(CONTENT_FILE, content);
}

function loadSubmissions() {
  return readJsonSafe(SUBMISSIONS_FILE, []);
}
function saveSubmissions(subs) {
  writeJsonSafe(SUBMISSIONS_FILE, subs);
}

function loadBookings() {
  return readJsonSafe(BOOKINGS_FILE, []);
}
function saveBookings(bookings) {
  writeJsonSafe(BOOKINGS_FILE, bookings);
}

function loadDrivers() {
  return readJsonSafe(DRIVERS_FILE, []);
}
function saveDrivers(drivers) {
  writeJsonSafe(DRIVERS_FILE, drivers);
}

function loadComments() {
  return readJsonSafe(COMMENTS_FILE, []);
}
function saveComments(comments) {
  writeJsonSafe(COMMENTS_FILE, comments);

function loadCallbackRequests() {
  return readJsonSafe(CALLBACK_FILE, []);
}
function saveCallbackRequests(items) {
  writeJsonSafe(CALLBACK_FILE, items);
}

}

function loadTopDaily() {
  return readJsonSafe(TOPDAILY_FILE, { date: '', byType: {} });
}
function saveTopDaily(topDaily) {
  writeJsonSafe(TOPDAILY_FILE, topDaily);
}


function loadTopDailyHistory() {
  const h = readJsonSafe(TOPDAILY_HISTORY_FILE, []);
  if (Array.isArray(h)) return h;
  // ако некојпат е зачувано како { records: [...] }
  if (h && Array.isArray(h.records)) return h.records;
  return [];
}

function saveTopDailyHistory(items) {
  writeJsonSafe(TOPDAILY_HISTORY_FILE, items);
}

function snapshotDriverById(driverId, drivers) {
  const d = (drivers || []).find(x => x.id === driverId);
  if (!d) return { id: driverId || '', name: '—' };
  return { id: d.id, name: d.name, miles: d.miles, rpm: d.rpm, route: d.route, type: d.type };
}

// Upsert (create or replace) a daily record for the given date label.
function upsertTopDailyHistoryRecord(dateLabel, byType) {
  const drivers = loadDrivers();
  const history = loadTopDailyHistory();

  const record = {
    date: dateLabel,
    dateLabel,
    byType: byType || {},
    snapshot: {
      Van: snapshotDriverById(byType?.Van || '', drivers),
      Reefer: snapshotDriverById(byType?.Reefer || '', drivers),
      Flatbed: snapshotDriverById(byType?.Flatbed || '', drivers)
    }
  };

  const idx = history.findIndex(x => x.date === dateLabel);
  if (idx >= 0) history[idx] = record;
  else history.push(record);

  // keep sorted desc by date (string YYYY-MM-DD sorts lexicographically)
  history.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  saveTopDailyHistory(history);
}

// Ensure there is a record for today's date (once per day).
function ensureTodayHistoryRecord() {
  const dateLabel = todayLabel();
  const history = loadTopDailyHistory();
  if (history.some(x => x.date === dateLabel)) return;

  const topDaily = loadTopDaily();
  upsertTopDailyHistoryRecord(dateLabel, topDaily.byType || {});
}


function loadPushSubs() {
  return readJsonSafe(PUSH_SUBS_FILE, []);
}
function savePushSubs(subs) {
  writeJsonSafe(PUSH_SUBS_FILE, subs);
}

function todayLabel() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// --- Email (Resend preferred) ---
let resendClient = null;
if (process.env.RESEND_API_KEY) {
  resendClient = new Resend(process.env.RESEND_API_KEY);
} else {
  console.warn('RESEND_API_KEY not configured. Emails will not be sent.');
}

async function sendNewSubmissionEmail(submission, booking) {
  if (!resendClient) return;

  const lines = [
    `New onboarding submission received:`,
    '',
    `Name: ${submission.firstName} ${submission.lastName}`,
    `Company: ${submission.company}`,
    `Email: ${submission.email}`,
    `Phone: ${submission.phone}`,
    `Country/State: ${submission.country}`,
    `Fleet size: ${submission.fleetSize}`,
    `Equipment type: ${submission.equipmentType}`,
    `Source: ${submission.hearAbout}`,
    '',
    booking && (booking.meetingDate || booking.timeSlot) ? 'Requested meeting:' : '',
    booking && booking.meetingDate ? `  Date: ${booking.meetingDate}` : '',
    booking && booking.timeSlot ? `  Time slot: ${booking.timeSlot}` : '',
    '',
    'Notes:',
    submission.notes || '(none)'
  ].filter(Boolean);

  try {
    await resendClient.emails.send({
      from: process.env.MAIL_FROM || 'PeakDispatch <no-reply@peakdispatch.test>',
      to: (process.env.MAIL_TO || 'websolution.mn@gmail.com').split(',').map(s => s.trim()).filter(Boolean),
      subject: 'New PeakDispatch onboarding submission',
      text: lines.join('\n')
    });

    console.log('Notification email sent via Resend for submission', submission.id);
  } catch (err) {
    console.error('Error sending notification email via Resend', err);
  }
}

// --- Optional phone lead email via Gmail SMTP (env only; no hardcoded secrets) ---
async function sendPhoneLeadEmail(number) {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  const phoneLeadTo = process.env.PHONE_LEAD_TO;

  if (!gmailUser || !gmailPass || !phoneLeadTo) return;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailUser, pass: gmailPass }
  });

  await transporter.sendMail({
    from: '"PeakDispatch Lead" <no-reply@peakdispatch.test>',
    to: phoneLeadTo,
    subject: 'New Phone Lead',
    text: `Phone number: ${number}`
  });
}

// --- Middleware ---
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) next();
  else res.redirect('/admin/login');
}

// --- Admin creds (env override recommended) ---
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@peakdispatch.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';

// --- Web Push (optional) ---
let vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
let vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';

if (!vapidPublicKey || !vapidPrivateKey) {
  // Auto-generate ephemeral keys for local dev (regenerate each restart)
  const keys = webpush.generateVAPIDKeys();
  vapidPublicKey = keys.publicKey;
  vapidPrivateKey = keys.privateKey;
  console.warn('VAPID keys not set in env; generated temporary keys for this session.');
}

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@peakdispatch.com',
  vapidPublicKey,
  vapidPrivateKey
);

// --- Routes ---
app.get('/', (req, res) => {
  const content = loadContent();
  const year = new Date().getFullYear();
  const footerText = (content.footerText || '').replace('{year}', year.toString());

  const drivers = loadDrivers();
  const topDaily = loadTopDaily();
  const dateLabel = topDaily.date || todayLabel();

  // Map type -> driver
  const topByType = {};
  const types = ['Van', 'Reefer', 'Flatbed'];
  for (const t of types) {
    const id = (topDaily.byType || {})[t];
    topByType[t] = drivers.find(d => d.id === id) || null;
  }

  res.render('index', { content, footerText, topDailyDate: dateLabel, topByType });
});

app.get('/join', (req, res) => res.render('join'));

app.post('/join', async (req, res) => {
  const submissions = loadSubmissions();
  const bookings = loadBookings();

  const submissionId = uuidv4();
  const submission = {
    id: submissionId,
    createdAt: new Date().toISOString(),
    firstName: req.body.firstName || '',
    lastName: req.body.lastName || '',
    email: req.body.email || '',
    phone: req.body.phone || '',
    company: req.body.company || '',
    country: req.body.country || '',
    fleetSize: req.body.fleetSize || '',
    equipmentType: req.body.equipmentType || '',
    hearAbout: req.body.hearAbout || '',
    notes: req.body.notes || ''
  };

  submissions.push(submission);
  saveSubmissions(submissions);

  let booking = null;
  if (req.body.meetingDate || req.body.timeSlot) {
    booking = {
      id: uuidv4(),
      submissionId,
      createdAt: new Date().toISOString(),
      meetingDate: req.body.meetingDate || '',
      timeSlot: req.body.timeSlot || '',
      status: 'pending'
    };
    bookings.push(booking);
    saveBookings(bookings);
  }

  try {
    await sendNewSubmissionEmail(submission, booking);
  } catch (err) {
    console.error('Email sending failed', err);
  }

  res.render('join-success', { submission });
});

// --- Public: comments API ---
app.get('/api/comments', (req, res) => {
  const driverId = req.query.driverId || '';
  const comments = loadComments().filter(c => c.driverId === driverId && c.status === 'approved');
  res.json({ ok: true, comments });
});

app.post('/api/comments', (req, res) => {
  const { driverId, name, rating, text } = req.body || {};
  if (!driverId || !text) return res.status(400).json({ ok: false, error: 'Missing fields' });

  const drivers = loadDrivers();
  const driverExists = drivers.some(d => d.id === driverId);
  if (!driverExists) return res.status(404).json({ ok: false, error: 'Driver not found' });

  const safeRating = Math.max(1, Math.min(9, Number(rating) || 0));
  const comment = {
    id: uuidv4(),
    driverId,
    createdAt: new Date().toISOString(),
    name: (name || 'Anonymous').slice(0, 50),
    rating: safeRating,
    text: String(text).slice(0, 800),
    status: 'pending',
    source: 'public'
  };

  const comments = loadComments();
  comments.push(comment);
  saveComments(comments);

  // Notify admin via sockets + push
  io.emit('new-comment', { driverId, commentId: comment.id });
  sendPushToAll({ type: 'new-comment', driverId }).catch(() => {});
  res.json({ ok: true });
});

// --- Video call pages ---

app.get('/api/topdaily-history', (req, res) => {
  const type = (req.query.type || '').trim();
  if (!type) return res.json([]);

  const history = loadTopDailyHistory();
  const last15 = history.slice(0, 15).map(h => {
    const snap = (h.snapshot && h.snapshot[type]) ? h.snapshot[type] : null;
    return {
      date: h.date,
      dateLabel: h.dateLabel || h.date,
      driverId: h.byType ? h.byType[type] : '',
      driverName: snap ? snap.name : '—',
      miles: snap && typeof snap.miles !== 'undefined' ? snap.miles : undefined,
      rpm: snap && typeof snap.rpm !== 'undefined' ? snap.rpm : undefined,
      route: snap && typeof snap.route !== 'undefined' ? snap.route : undefined
    };
  });

  res.json(last15);
});

app.get('/call', (req, res) => {
  res.render('call', { vapidPublicKey });
});

// --- Phone lead endpoint (optional SMTP via env) ---
app.post('/api/phone', async (req, res) => {
  const number = req.body.number;
  if (!number) return res.status(400).json({ ok: false });

  try {
    await sendPhoneLeadEmail(number);
  } catch (e) {
    console.error('Phone lead email failed', e);
  }
  res.json({ ok: true });
});

// --- Simple admin auth ---
app.get('/admin/login', (req, res) => res.render('admin-login', { error: null }));

app.post('/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    res.redirect('/admin');
  } else {
    res.render('admin-login', { error: 'Invalid credentials' });
  }
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});


// --- Callback requests (missed calls) ---
app.get('/api/callback-requests', (req, res) => {
  // admin only
  if (!req.session || !req.session.isAdmin) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  const items = loadCallbackRequests().sort((a,b) => (b.createdAt||'').localeCompare(a.createdAt||''));
  res.json({ ok: true, items });
});

app.post('/api/callback-requests', (req, res) => {
  const { name, phone, roomId } = req.body || {};
  const n = String(name || '').trim().slice(0, 80);
  const p = String(phone || '').trim().slice(0, 40);
  if (!n || !p) return res.status(400).json({ ok: false, error: 'Missing fields' });

  const items = loadCallbackRequests();
  const entry = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    name: n,
    phone: p,
    roomId: String(roomId || '').slice(0, 80),
    status: 'new'
  };
  items.push(entry);
  saveCallbackRequests(items);

  // notify admins
  try { io.to('admins').emit('new-callback', entry); } catch {}
  sendPushToAll({ type: 'new-callback', id: entry.id }).catch(() => {});
  res.json({ ok: true });
});

app.post('/api/callback-requests/:id/close', (req, res) => {
  if (!req.session || !req.session.isAdmin) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  const id = req.params.id;
  const items = loadCallbackRequests();
  const it = items.find(x => x.id === id);
  if (!it) return res.status(404).json({ ok: false, error: 'Not found' });
  it.status = 'closed';
  it.closedAt = new Date().toISOString();
  saveCallbackRequests(items);
  res.json({ ok: true });
});

app.get('/admin', requireAdmin, (req, res) => {
  const content = loadContent();
  const submissions = loadSubmissions().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const bookings = loadBookings().sort((a, b) => new Date(a.meetingDate || a.createdAt) - new Date(b.meetingDate || b.createdAt));

  const drivers = loadDrivers();
  const topDaily = loadTopDaily();
  const comments = loadComments().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.render('admin', {
    content,
    submissions,
    bookings,
    drivers,
    topDaily,
    comments,
    adminEmail: ADMIN_EMAIL,
    vapidPublicKey
  });
});

// Content
app.post('/admin/content', requireAdmin, (req, res) => {
  const content = loadContent();

  content.heroTitle = req.body.heroTitle || content.heroTitle;
  content.heroSubtitle = req.body.heroSubtitle || content.heroSubtitle;
  content.heroPrimaryCta = req.body.heroPrimaryCta || content.heroPrimaryCta;
  content.heroSecondaryCta = req.body.heroSecondaryCta || content.heroSecondaryCta;
  content.aboutTitle = req.body.aboutTitle || content.aboutTitle;
  content.aboutText = req.body.aboutText || content.aboutText;
  content.servicesTitle = req.body.servicesTitle || content.servicesTitle;

  content.services = [
    { title: req.body.service1Title || '', text: req.body.service1Text || '' },
    { title: req.body.service2Title || '', text: req.body.service2Text || '' },
    { title: req.body.service3Title || '', text: req.body.service3Text || '' }
  ];

  content.ctaBannerTitle = req.body.ctaBannerTitle || content.ctaBannerTitle;
  content.ctaBannerText = req.body.ctaBannerText || content.ctaBannerText;
  content.footerText = req.body.footerText || content.footerText;

  saveContent(content);
  res.redirect('/admin#content');
});

// Submissions delete
app.post('/admin/submissions/:id/delete', requireAdmin, (req, res) => {
  const id = req.params.id;
  let submissions = loadSubmissions().filter(s => s.id !== id);
  saveSubmissions(submissions);

  let bookings = loadBookings().filter(b => b.submissionId !== id);
  saveBookings(bookings);

  res.redirect('/admin#submissions');
});

// Booking status
app.post('/admin/bookings/:id/status', requireAdmin, (req, res) => {
  const id = req.params.id;
  const { status } = req.body;
  const bookings = loadBookings();
  const updated = bookings.map(b => (b.id === id ? { ...b, status: status || b.status } : b));
  saveBookings(updated);
  res.redirect('/admin#bookings');
});

// Drivers CRUD
app.post('/admin/drivers/add', requireAdmin, (req, res) => {
  const drivers = loadDrivers();
  const driver = {
    id: uuidv4(),
    type: req.body.type || 'Van',
    name: (req.body.name || '').slice(0, 80),
    miles: Number(req.body.miles) || 0,
    rpm: Number(req.body.rpm) || 0,
    route: (req.body.route || '').slice(0, 120)
  };
  drivers.push(driver);
  saveDrivers(drivers);
  res.redirect('/admin#drivers');
});

app.post('/admin/drivers/:id/delete', requireAdmin, (req, res) => {
  const id = req.params.id;
  const drivers = loadDrivers().filter(d => d.id !== id);
  saveDrivers(drivers);

  // also remove topdaily selection if used
  const topDaily = loadTopDaily();
  if (topDaily.byType) {
    for (const k of Object.keys(topDaily.byType)) {
      if (topDaily.byType[k] === id) topDaily.byType[k] = '';
    }
    saveTopDaily(topDaily);
  }
  res.redirect('/admin#drivers');
});

// TopDaily config
app.post('/admin/topdaily', requireAdmin, (req, res) => {
  const topDaily = loadTopDaily();
  topDaily.date = req.body.date || topDaily.date || '';
  topDaily.byType = topDaily.byType || {};
  topDaily.byType.Van = req.body.topVan || topDaily.byType.Van || '';
  topDaily.byType.Reefer = req.body.topReefer || topDaily.byType.Reefer || '';
  topDaily.byType.Flatbed = req.body.topFlatbed || topDaily.byType.Flatbed || '';
  saveTopDaily(topDaily);
  upsertTopDailyHistoryRecord(topDaily.date || todayLabel(), topDaily.byType || {});
  res.redirect('/admin#drivers');
});

// Comments moderation
app.post('/admin/comments/:id/approve', requireAdmin, (req, res) => {
  const id = req.params.id;
  const comments = loadComments().map(c => (c.id === id ? { ...c, status: 'approved' } : c));
  saveComments(comments);
  res.redirect('/admin#comments');
});

app.post('/admin/comments/:id/reject', requireAdmin, (req, res) => {
  const id = req.params.id;
  const comments = loadComments().map(c => (c.id === id ? { ...c, status: 'rejected' } : c));
  saveComments(comments);
  res.redirect('/admin#comments');
});

// Push subscription (admin registers once)
app.get('/api/push/public-key', (req, res) => res.json({ ok: true, key: vapidPublicKey }));

app.post('/api/push/subscribe', (req, res) => {
  const sub = req.body;
  if (!sub || !sub.endpoint) return res.status(400).json({ ok: false });

  const subs = loadPushSubs();
  const exists = subs.some(s => s.endpoint === sub.endpoint);
  if (!exists) {
    subs.push({ ...sub, createdAt: new Date().toISOString() });
    savePushSubs(subs);
  }
  res.json({ ok: true });
});

async function sendPushToAll(payloadObj) {
  const subs = loadPushSubs();
  const payload = JSON.stringify(payloadObj || {});
  const results = [];

  for (const sub of subs) {
    try {
      await webpush.sendNotification(sub, payload, { TTL: 60 });
      results.push({ ok: true });
    } catch (err) {
      // remove dead subs
      if (err && (err.statusCode === 410 || err.statusCode === 404)) {
        const remaining = loadPushSubs().filter(s => s.endpoint !== sub.endpoint);
        savePushSubs(remaining);
      }
      results.push({ ok: false });
    }
  }
  return results;
}

// --- HTTP + Socket.IO server ---
const server = http.createServer(app);
const io = new Server(server);

// --- Socket signaling ---
io.on('connection', (socket) => {
  socket.on('admin-online', () => {
    socket.join('admins');
  });

  socket.on('start-call', (data) => {
    const roomId = data && data.roomId ? data.roomId : uuidv4();
    socket.join(roomId);
    io.to('admins').emit('incoming-call', { roomId, at: new Date().toISOString() });
    sendPushToAll({ type: 'incoming-call', roomId }).catch(() => {});
    socket.emit('call-room', { roomId });
  });

  socket.on('join-room', ({ roomId, role }) => {
    if (!roomId) return;
    socket.join(roomId);
    socket.to(roomId).emit('peer-joined', { role: role || 'peer' });
  });

  socket.on('signal', ({ roomId, message }) => {
    if (!roomId) return;
    socket.to(roomId).emit('signal', { message });
  });

  socket.on('end-call', ({ roomId }) => {
    if (!roomId) return;
    io.to(roomId).emit('call-ended');
  });
});



// Ensure we always have a TopDaily history record for "today" (last 15 days kept).
function ensureTodayHistoryRecord() {
  const topDaily = readJsonSafe(TOPDAILY_FILE, { date: '', byType: {} });
  const byType = topDaily?.byType || {};

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const drivers = readJsonSafe(DRIVERS_FILE, []);

  function snapshotDriverByIdSafe(driverId) {
    const d = (drivers || []).find(x => x.id === driverId);
    if (!d) return { id: driverId || '', name: '—' };
    return { id: d.id, name: d.name, miles: d.miles, rpm: d.rpm, route: d.route, type: d.type };
  }

  const record = {
    date: today,
    dateLabel: today,
    byType: byType,
    snapshot: {
      Van: snapshotDriverByIdSafe(byType?.Van || ''),
      Reefer: snapshotDriverByIdSafe(byType?.Reefer || ''),
      Flatbed: snapshotDriverByIdSafe(byType?.Flatbed || '')
    }
  };

  let history = readJsonSafe(TOPDAILY_HISTORY_FILE, []);
  const idx = history.findIndex(x => x.date === today);
  if (idx >= 0) history[idx] = record;
  else history.push(record);

  // Sort desc by date
  history.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // Keep only last 15 days (including today)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);
  const cutoffLabel = cutoff.toISOString().slice(0, 10);
  history = history.filter(x => (x.date || '') >= cutoffLabel);

  writeJsonSafe(TOPDAILY_HISTORY_FILE, history);
}

// --- Daily TopDaily history snapshot (updates every 24h) ---
ensureTodayHistoryRecord();
setInterval(ensureTodayHistoryRecord, 24 * 60 * 60 * 1000);

server.listen(PORT, () => {
  console.log(`PeakDispatch site running on http://localhost:${PORT}`);
});