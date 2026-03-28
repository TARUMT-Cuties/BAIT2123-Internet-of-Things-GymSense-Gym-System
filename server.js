const express = require('express');
const app = express();
const port = 3000;
const cors = require('cors');
app.use(cors());

app.use(express.json());

// store workout data
let workouts = [];

// ESP32 control state
let control = { running: false, target: 12, sets: 1 };

app.post('/workout', (req, res) => {
  const { exercise, reps } = req.body;

  const data = {
    exercise,
    reps,
    time: new Date()
  };

  workouts.push(data);

  console.log("Received:", data);

  res.send("OK");
});

// allow website to fetch data
app.get('/workout', (req, res) => {
  res.json(workouts);
});

// ESP32 control routes
app.get('/control', (req, res) => {
  res.json(control);
});

app.post('/control', (req, res) => {
  control = { ...control, ...req.body };
  console.log("Control updated:", control);
  res.json(control);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});