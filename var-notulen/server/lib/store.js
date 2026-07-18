const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MEETINGS_DIR = path.join(__dirname, '..', 'data', 'meetings');

function ensureDir() {
  fs.mkdirSync(MEETINGS_DIR, { recursive: true });
}

function meetingPath(id) {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error('Ongeldig vergadering-ID');
  }
  return path.join(MEETINGS_DIR, `${id}.json`);
}

function createMeeting(title) {
  ensureDir();
  const id = crypto.randomBytes(8).toString('hex');
  const now = new Date().toISOString();
  const meeting = {
    id,
    title: title && title.trim() ? title.trim() : 'Naamloze vergadering',
    createdAt: now,
    updatedAt: now,
    status: 'recording',
    segments: [],
  };
  fs.writeFileSync(meetingPath(id), JSON.stringify(meeting, null, 2));
  return meeting;
}

function getMeeting(id) {
  try {
    const raw = fs.readFileSync(meetingPath(id), 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

function saveMeeting(meeting) {
  meeting.updatedAt = new Date().toISOString();
  fs.writeFileSync(meetingPath(meeting.id), JSON.stringify(meeting, null, 2));
  return meeting;
}

function listMeetings() {
  ensureDir();
  return fs
    .readdirSync(MEETINGS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const raw = fs.readFileSync(path.join(MEETINGS_DIR, f), 'utf8');
      const m = JSON.parse(raw);
      return {
        id: m.id,
        title: m.title,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        status: m.status,
        segmentCount: m.segments.length,
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function deleteMeeting(id) {
  const p = meetingPath(id);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

function fullText(meeting) {
  return meeting.segments
    .map((s) => s.text)
    .filter(Boolean)
    .join('\n\n');
}

module.exports = {
  createMeeting,
  getMeeting,
  saveMeeting,
  listMeetings,
  deleteMeeting,
  fullText,
};
