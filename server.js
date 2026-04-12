const http      = require('http');
const express   = require('express');
const cors      = require('cors');
const WebSocket = require('ws');

const app  = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// ── HTTP server (shared with WebSocket) ──────────────────────────────────────
const server = http.createServer(app);

// ── WebSocket server (same port as HTTP) ─────────────────────────────────────
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('WS client connected');
  ws.on('close', () => console.log('WS client disconnected'));
});

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

// ── Constants ─────────────────────────────────────────────────────────────────
const VALID_EXERCISES = ['squat', 'curl', 'pushup'];

// ── State ────────────────────────────────────────────────────────────────────
let workouts = [];
let control  = { running: false, placement: false, target: 12, sets: 1, exercise: 'squat' };

// ── POST /workout  (ESP32 → backend) ─────────────────────────────────────────
app.post('/workout', (req, res) => {
  const { exercise, reps, set, done } = req.body;

  if (!VALID_EXERCISES.includes(exercise)) {
    return res.status(400).json({ error: 'Invalid exercise. Must be "squat" or "curl".' });
  }
  if (typeof reps !== 'number' || !Number.isFinite(reps) || reps < 0) {
    return res.status(400).json({ error: 'Invalid reps. Must be a non-negative number.' });
  }

  const data = {
    exercise,
    reps,
    set:  typeof set  === 'number'  ? set  : null,
    done: done === true,
    time: new Date()
  };

  workouts.push(data);
  console.log('Received:', data);

  // Push to every connected browser tab instantly
  broadcast(data);

  res.json({ ok: true });
});

// ── GET /workout  (frontend history fetch) ───────────────────────────────────
app.get('/workout', (req, res) => {
  res.json(workouts);
});

// ── GET /control  (ESP32 polls this) ─────────────────────────────────────────
app.get('/control', (req, res) => {
  res.json(control);
});

// ── POST /control  (frontend → backend → ESP32 reads next poll) ──────────────
app.post('/control', (req, res) => {
  const { running } = req.body;

  if (running === false) {
    // Placement mode: tell ESP32 to show sensor-placement screen
    const placement = req.body.placement === true;
    const exercise  = req.body.exercise;
    if (placement && VALID_EXERCISES.includes(exercise)) {
      control = { ...control, running: false, placement: true, exercise };
    } else {
      control = { ...control, running: false, placement: false };
    }
    console.log('Control updated:', control);
    return res.json(control);
  }

  const { target, sets, exercise } = req.body;

  if (!VALID_EXERCISES.includes(exercise)) {
    return res.status(400).json({ error: 'Invalid exercise. Must be "squat", "curl", or "pushup".' });
  }

  const parsedTarget = Number(target);
  if (!Number.isInteger(parsedTarget) || parsedTarget <= 0) {
    return res.status(400).json({ error: 'Invalid target. Must be a positive integer.' });
  }

  const parsedSets = Number(sets);
  if (!Number.isInteger(parsedSets) || parsedSets <= 0) {
    return res.status(400).json({ error: 'Invalid sets. Must be a positive integer.' });
  }

  control  = { running: true, placement: false, target: parsedTarget, sets: parsedSets, exercise };
  workouts = [];   // clear old session data so the new workout starts fresh
  console.log('Control updated:', control);
  res.json(control);
});

// ── Start ─────────────────────────────────────────────────────────────────────
server.listen(port, () => {
  console.log(`Server + WebSocket running at http://localhost:${port}`);
});
