require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const multer = require('multer');

const store = require('./lib/store');
const { transcribeAudio } = require('./lib/openai');
const { buildMeetingDocx } = require('./lib/docx');

const REQUIRED_ENV = ['OPENAI_API_KEY', 'VAR_APP_PASSWORD', 'SESSION_SECRET'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Ontbrekende environment variabelen: ${missing.join(', ')}`);
  console.error('Kopieer server/.env.example naar server/.env en vul de waarden in.');
  process.exit(1);
}

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });

app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    name: 'var_notulen_sid',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 12 * 60 * 60 * 1000, // 12 uur
    },
  })
);

function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next();
  return res.status(401).json({ error: 'Niet ingelogd' });
}

// ── Auth ─────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { password } = req.body || {};
  if (password && password === process.env.VAR_APP_PASSWORD) {
    req.session.authenticated = true;
    return res.json({ ok: true });
  }
  return res.status(401).json({ error: 'Onjuist wachtwoord' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/session', (req, res) => {
  res.json({ authenticated: Boolean(req.session && req.session.authenticated) });
});

// ── Vergaderingen ────────────────────────────────────
app.get('/api/meetings', requireAuth, (req, res) => {
  res.json(store.listMeetings());
});

app.post('/api/meetings', requireAuth, (req, res) => {
  const { title } = req.body || {};
  const meeting = store.createMeeting(title);
  res.status(201).json(meeting);
});

app.get('/api/meetings/:id', requireAuth, (req, res) => {
  const meeting = store.getMeeting(req.params.id);
  if (!meeting) return res.status(404).json({ error: 'Vergadering niet gevonden' });
  res.json({ ...meeting, fullText: store.fullText(meeting) });
});

app.patch('/api/meetings/:id', requireAuth, (req, res) => {
  const meeting = store.getMeeting(req.params.id);
  if (!meeting) return res.status(404).json({ error: 'Vergadering niet gevonden' });

  const { title, status, fullText } = req.body || {};
  if (typeof title === 'string' && title.trim()) meeting.title = title.trim();
  if (typeof status === 'string') meeting.status = status;
  if (typeof fullText === 'string') {
    // Handmatige bewerking overschrijft het transcript als één enkel segment.
    meeting.segments = [{ index: 0, text: fullText, createdAt: new Date().toISOString(), edited: true }];
  }
  store.saveMeeting(meeting);
  res.json({ ...meeting, fullText: store.fullText(meeting) });
});

app.delete('/api/meetings/:id', requireAuth, (req, res) => {
  store.deleteMeeting(req.params.id);
  res.json({ ok: true });
});

// ── Audio-segment opnemen + transcriberen ───────────
app.post('/api/meetings/:id/segments', requireAuth, upload.single('audio'), async (req, res) => {
  const meeting = store.getMeeting(req.params.id);
  if (!meeting) return res.status(404).json({ error: 'Vergadering niet gevonden' });
  if (!req.file) return res.status(400).json({ error: 'Geen audiobestand ontvangen' });

  try {
    const text = await transcribeAudio(req.file.buffer, req.file.originalname, req.file.mimetype);
    const segment = {
      index: meeting.segments.length,
      text,
      createdAt: new Date().toISOString(),
    };
    meeting.segments.push(segment);
    store.saveMeeting(meeting);
    res.json({ segment, fullText: store.fullText(meeting) });
  } catch (err) {
    console.error('Transcriptiefout:', err.message);
    res.status(502).json({ error: 'Transcriptie mislukt: ' + err.message });
  }
});

// ── Export ───────────────────────────────────────────
app.get('/api/meetings/:id/export', requireAuth, async (req, res) => {
  const meeting = store.getMeeting(req.params.id);
  if (!meeting) return res.status(404).json({ error: 'Vergadering niet gevonden' });
  const format = req.query.format === 'docx' ? 'docx' : 'txt';
  const text = store.fullText(meeting);
  const safeName = meeting.title.replace(/[^a-z0-9\-_ ]/gi, '').trim() || 'notulen';

  if (format === 'txt') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.txt"`);
    return res.send(`${meeting.title}\n${meeting.createdAt}\n\n${text}`);
  }

  try {
    const buffer = await buildMeetingDocx(meeting, text);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.docx"`);
    res.send(buffer);
  } catch (err) {
    console.error('Docx-export mislukt:', err.message);
    res.status(500).json({ error: 'Export mislukt' });
  }
});

// ── Statische frontend ───────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Niet gevonden' });
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`VAR-notulen server draait op http://localhost:${PORT}`);
});
