require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Session config
app.use(
  session({
    secret: 'change_this_secret_peakdispatch',
    resave: false,
    saveUninitialized: false
  })
);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

const CONTENT_FILE = path.join(__dirname, 'data', 'content.json');
const SUBMISSIONS_FILE = path.join(__dirname, 'data', 'submissions.json');
const BOOKINGS_FILE = path.join(__dirname, 'data', 'bookings.json');

// Helpers
function readJsonSafe(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
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

// Email transport (Gmail app password)
let mailTransport = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  mailTransport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
} else {
  console.warn(
    'Email credentials not configured. Set EMAIL_USER and EMAIL_PASS in .env to enable notifications.'
  );
}

async function sendNewSubmissionEmail(submission, booking) {
  if (!mailTransport) return;

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

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: 'websolution.mn@gmail.com',
    subject: 'New PeakDispatch onboarding submission',
    text: lines.join('\n')
  };

  try {
    await mailTransport.sendMail(mailOptions);
    console.log('Notification email sent for submission', submission.id);
  } catch (err) {
    console.error('Error sending notification email', err);
  }
}

// Middleware
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    next();
  } else {
    res.redirect('/admin/login');
  }
}

// Routes
app.get('/', (req, res) => {
  const content = loadContent();
  const year = new Date().getFullYear();
  const footerText = (content.footerText || '').replace('{year}', year.toString());
  res.render('index', { content, footerText });
});

app.get('/join', (req, res) => {
  res.render('join');
});

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

// Simple admin auth
const ADMIN_EMAIL = 'admin@peakdispatch.com';
const ADMIN_PASSWORD = 'Admin@123';

app.get('/admin/login', (req, res) => {
  res.render('admin-login', { error: null });
});

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
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

app.get('/admin', requireAdmin, (req, res) => {
  const content = loadContent();
  const submissions = loadSubmissions().sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  const bookings = loadBookings().sort(
    (a, b) => new Date(a.meetingDate || a.createdAt) - new Date(b.meetingDate || b.createdAt)
  );
  res.render('admin', { content, submissions, bookings });
});

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
    {
      title: req.body.service1Title || '',
      text: req.body.service1Text || ''
    },
    {
      title: req.body.service2Title || '',
      text: req.body.service2Text || ''
    },
    {
      title: req.body.service3Title || '',
      text: req.body.service3Text || ''
    }
  ];

  content.ctaBannerTitle = req.body.ctaBannerTitle || content.ctaBannerTitle;
  content.ctaBannerText = req.body.ctaBannerText || content.ctaBannerText;
  content.footerText = req.body.footerText || content.footerText;

  saveContent(content);
  res.redirect('/admin');
});

app.post('/admin/submissions/:id/delete', requireAdmin, (req, res) => {
  const id = req.params.id;
  let submissions = loadSubmissions();
  submissions = submissions.filter((s) => s.id !== id);
  saveSubmissions(submissions);

  let bookings = loadBookings();
  bookings = bookings.filter((b) => b.submissionId !== id);
  saveBookings(bookings);

  res.redirect('/admin');
});

app.post('/admin/bookings/:id/status', requireAdmin, (req, res) => {
  const id = req.params.id;
  const { status } = req.body;
  const bookings = loadBookings();
  const updated = bookings.map((b) =>
    b.id === id ? { ...b, status: status || b.status } : b
  );
  saveBookings(updated);
  res.redirect('/admin');
});

app.listen(PORT, () => {
  console.log(`PeakDispatch site running on http://localhost:${PORT}`);
});
