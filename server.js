const http              = require('http');
const express           = require('express');
const cors              = require('cors');
const WebSocket         = require('ws');
const path              = require('path');
const { 
  saveWorkoutToFirebase, 
  fetchAllWorkoutsFromFirebase 
} = require('./firebase');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '/')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

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
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

// ── Constants ─────────────────────────────────────────────────────────────────
const VALID_EXERCISES = ['squat', 'curl', 'pushup'];

// ── State ────────────────────────────────────────────────────────────────────
let workouts = [];
let control = {
  running: false,
  placement: false,
  target: 12,
  sets: 1,
  exercise: 'squat'
};

// ── POST /workout  (ESP32 → backend) ─────────────────────────────────────────
app.post('/workout', async (req, res) => {
  try {
    const { exercise, reps, set, done, status, isFinal } = req.body;

    if (!VALID_EXERCISES.includes(exercise)) {
      return res.status(400).json({
        error: 'Invalid exercise. Must be "squat", "curl", or "pushup".'
      });
    }

    if (typeof reps !== 'number' || !Number.isFinite(reps) || reps < 0) {
      return res.status(400).json({
        error: 'Invalid reps. Must be a non-negative number.'
      });
    }

    if (set != null && (!Number.isInteger(set) || set <= 0)) {
      return res.status(400).json({
        error: 'Invalid set. Must be a positive integer.'
      });
    }

    const isDone = done === true;
    const finalFlag = isFinal === true || isDone;

    const resolvedStatus =
      typeof status === 'string' && status.trim() !== ''
        ? status
        : (isDone ? 'Completed' : 'in-progress');

    const data = {
      exercise,
      reps,
      set: typeof set === 'number' ? set : null,
      done: isDone,
      isFinal: finalFlag,
      status: resolvedStatus,
      timestamp: Date.now(),
      time: new Date().toISOString()
    };

    workouts.push(data);

    let firebaseSaved = false;
    try {
      firebaseSaved = await saveWorkoutToFirebase(data);
    } catch (firebaseError) {
      console.error('Firebase save failed:', firebaseError);
    }

    broadcast(data);

    return res.json({
      ok: true,
      firebaseSaved
    });
  } catch (error) {
    console.error('POST /workout failed:', error);
    return res.status(500).json({
      error: 'Internal server error while saving workout data.'
    });
  }
});

// ── POST /stopWorkout  (frontend → backend when End Workout is clicked) ──────
app.post('/stopWorkout', async (req, res) => {
  try {
    const { exercise, reps, set } = req.body;

    if (!VALID_EXERCISES.includes(exercise)) {
      return res.status(400).json({ error: 'Invalid exercise.' });
    }

    if (typeof reps !== 'number' || !Number.isFinite(reps) || reps < 0) {
      return res.status(400).json({ error: 'Invalid reps value.' });
    }

    // Only save if user actually did some reps
    if (reps <= 0) {
      return res.status(400).json({
        error: 'No reps completed. Stopped workout not saved.'
      });
    }

    if (set != null && (!Number.isInteger(set) || set <= 0)) {
      return res.status(400).json({ error: 'Invalid set value.' });
    }

    const stoppedRecord = {
      exercise,
      reps,
      set: typeof set === 'number' ? set : null,
      done: false,
      isFinal: true,
      status: 'Stopped',
      timestamp: Date.now(),
      time: new Date().toISOString()
    };

    workouts.push(stoppedRecord);
    console.log('Stopped workout saved:', stoppedRecord);

    let firebaseSaved = false;
    try {
      firebaseSaved = await saveWorkoutToFirebase(stoppedRecord);
    } catch (firebaseError) {
      console.error('Firebase save failed for stopped workout:', firebaseError);
    }

    broadcast(stoppedRecord);

    return res.json({
      ok: true,
      firebaseSaved
    });
  } catch (error) {
    console.error('POST /stopWorkout failed:', error);
    return res.status(500).json({
      error: 'Internal server error while stopping workout.'
    });
  }
});

// ── GET /workout  (frontend history fetch) ───────────────────────────────────
app.get('/workout', async (req, res) => {
  try {
    try {
      const firebaseWorkouts = await fetchAllWorkoutsFromFirebase();
      return res.json(firebaseWorkouts);
    } catch (firebaseError) {
      console.error('Firebase fetch failed, fallback to local memory:', firebaseError);
      return res.json(workouts);
    }
  } catch (error) {
    console.error('GET /workout failed:', error);
    return res.status(500).json({
      error: 'Failed to fetch workout history.'
    });
  }
});

// ── GET /control  (ESP32 polls this) ─────────────────────────────────────────
app.get('http://192.168.137.1:3000/control', (req, res) => {
  return res.json(control);
});

// ── POST /control  (frontend → backend → ESP32 reads next poll) ──────────────
app.post('/control', (req, res) => {
  try {
    const { running } = req.body;

    if (running === false) {
      const placement = req.body.placement === true;
      const exercise = req.body.exercise;

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
      return res.status(400).json({
        error: 'Invalid exercise. Must be "squat", "curl", or "pushup".'
      });
    }

    const parsedTarget = Number(target);
    if (!Number.isInteger(parsedTarget) || parsedTarget <= 0) {
      return res.status(400).json({
        error: 'Invalid target. Must be a positive integer.'
      });
    }

    const parsedSets = Number(sets);
    if (!Number.isInteger(parsedSets) || parsedSets <= 0) {
      return res.status(400).json({
        error: 'Invalid sets. Must be a positive integer.'
      });
    }

    control = {
      running: true,
      placement: false,
      target: parsedTarget,
      sets: parsedSets,
      exercise
    };

    // Clear current in-memory session when a new workout starts
    workouts = [];

    console.log('Control updated:', control);
    return res.json(control);
  } catch (error) {
    console.error('POST /control failed:', error);
    return res.status(500).json({
      error: 'Internal server error while updating workout control.'
    });
  }
});

// ── Optional test route to clear Firebase workouts ───────────────────────────
app.delete('/workout', async (req, res) => {
  try {
    const cleared = await clearAllWorkoutsFromFirebase();
    workouts = [];

    return res.json({
      ok: true,
      firebaseCleared: cleared
    });
  } catch (error) {
    console.error('DELETE /workout failed:', error);
    return res.status(500).json({
      error: 'Failed to clear workout data.'
    });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
server.listen(port, () => {
  console.log(`Server + WebSocket running at http://localhost:${port}`);
});