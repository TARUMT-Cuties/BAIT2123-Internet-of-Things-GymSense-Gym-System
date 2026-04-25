const SERVER    = `http://${window.location.hostname}:3000`
const WS_SERVER = `ws://${window.location.hostname}:3000`

const exerciseText  = document.getElementById("exercise")
const repsText      = document.getElementById("reps")
const setText       = document.getElementById("set")
const caloriesText  = document.getElementById("calories")
const rirText       = document.getElementById("rir")
const stopwatchText = document.getElementById("stopwatch")

const pauseBtn   = document.getElementById("pauseBtn")
const resumeBtn  = document.getElementById("resumeBtn")
const endBtn     = document.getElementById("endButton")
const endingText = document.getElementById("endingText")

const placementOverlay     = document.getElementById("placementOverlay")
const placementExerciseEl  = document.getElementById("placementExercise")
const placementWhereEl     = document.getElementById("placementWhere")
const placementHowEl       = document.getElementById("placementHow")
const readyBtn             = document.getElementById("readyBtn")

// ── Saved workout plan ────────────────────────────────────────────────────────
const savedWorkoutRaw = localStorage.getItem("lastWorkout")
const savedWorkout    = savedWorkoutRaw ? JSON.parse(savedWorkoutRaw) : null

if (!savedWorkout || savedWorkout.length === 0) {
    window.location.href = "setup.html"
}

const exercises = savedWorkout.map(ex => ex.exercise)

// ── Workout state ─────────────────────────────────────────────────────────────
const exerciseReps = {}
exercises.forEach(ex => { exerciseReps[ex] = 0 })

let currentExerciseIndex = 0
let exerciseName = exercises[currentExerciseIndex]

let currentSet  = 1
let currentReps = 0
let calories    = 0
let paused      = false
let workoutFinished = false
let elapsedSeconds  = 0

// ── Placement instructions per exercise ──────────────────────────────────────
const PLACEMENT = {
    squat:  { where: 'On the floor between your feet',       how: 'Point the sensor upward toward your legs' },
    pushup: { where: 'On the floor directly under your chest', how: 'Point the sensor upward, facing your chest' },
    curl:   { where: 'Strapped to your forearm',             how: 'Secure the MPU sensor firmly on your arm' }
}

// ── Placement state ───────────────────────────────────────────────────────────
let awaitingPlacement = false

// ── Connection state ──────────────────────────────────────────────────────────
let ws            = null
let wsConnected   = false
// sessionStartIndex: number of existing /workout entries before this session,
// used by the poll fallback so we don't replay old data.
let sessionStartIndex = 0
// lastPollIndex: how many session entries have already been processed by polling
let lastPollIndex     = 0
let pollIntervalId    = null
let stopwatchInterval = null

function getTargetSets() {
    return savedWorkout[currentExerciseIndex].sets.length
}

function getTargetReps() {
    return savedWorkout[currentExerciseIndex].sets[currentSet - 1].reps
}

let targetSets = getTargetSets()
let targetReps = getTargetReps()
let rir        = targetReps

// ── Initial UI ────────────────────────────────────────────────────────────────
exerciseText.textContent = exerciseName
setText.textContent      = `${currentSet} / ${targetSets}`
repsText.textContent     = currentReps
caloriesText.textContent = calories
rirText.textContent      = rir

// ── Stopwatch ─────────────────────────────────────────────────────────────────
function updateStopwatch() {
    elapsedSeconds += 1
    const m = Math.floor(elapsedSeconds / 60)
    const s = elapsedSeconds % 60
    stopwatchText.textContent = String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0")
}

// ── ESP32 exercise name mapper ────────────────────────────────────────────────
function getESP32Exercise(name) {
    const n = name.toLowerCase()
    if (n.includes('squat'))  return 'squat'
    if (n.includes('curl'))   return 'curl'
    if (n.includes('push'))   return 'pushup'
    console.warn(`Unknown exercise "${name}" — defaulting to squat`)
    return 'squat'
}

// ── Core rep update (shared by both WebSocket and polling paths) ──────────────
// newCount = cumulative rep number for current set sent by the ESP32 (1, 2, 3…)
function updateReps(newCount) {
    if (paused || workoutFinished || awaitingPlacement) return

    const delta = newCount - currentReps
    if (delta <= 0) return

    calories += delta * 2
    exerciseReps[exerciseName] += delta
    currentReps = newCount
    rir = Math.max(0, targetReps - currentReps)

    repsText.textContent     = currentReps
    caloriesText.textContent = calories
    rirText.textContent      = rir

    if (currentReps >= targetReps) {
        completeSet()
    }
}

// ── Sensor placement overlay ──────────────────────────────────────────────────
function showPlacement() {
    awaitingPlacement = true

    const key  = getESP32Exercise(exerciseName)
    const info = PLACEMENT[key] || { where: 'On your body', how: 'Position the sensor correctly' }

    placementExerciseEl.textContent = exerciseName
    placementWhereEl.textContent    = info.where
    placementHowEl.textContent      = info.how
    placementOverlay.classList.add('active')

    // Tell Arduino to show the placement screen on OLED
    fetch(`${SERVER}/control`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ running: false, placement: true, exercise: key })
    }).catch(() => {})
}

// ── Set / exercise advancement ────────────────────────────────────────────────
function completeSet() {
    if (workoutFinished) return

    currentReps = 0
    currentSet++

    const exerciseChanged = currentSet > targetSets

    if (exerciseChanged) {
        currentExerciseIndex++

        if (currentExerciseIndex >= exercises.length) {
            finishWorkout()
            return
        }

        exerciseName = exercises[currentExerciseIndex]
        exerciseText.textContent = exerciseName
        currentSet = 1
        targetSets = getTargetSets()
    }

    targetReps = getTargetReps()
    rir        = targetReps

    repsText.textContent = 0
    rirText.textContent  = rir
    setText.textContent  = `${currentSet} / ${targetSets}`

    if (exerciseChanged) {
        showPlacement()           // different exercise — wait for sensor repositioning
    } else {
        sendControl(true, targetReps, targetSets)  // same exercise, next set — continue immediately
    }
}

// ── WebSocket message handler ─────────────────────────────────────────────────
function handleMessage(msg) {
    if (paused || workoutFinished || awaitingPlacement) return
    if (msg.exercise !== getESP32Exercise(exerciseName)) return

    // For rep updates: skip done:true messages to avoid replaying the old rep
    // count against a freshly-reset currentReps (which would complete the next
    // set immediately).
    if (!msg.done) updateReps(msg.reps)

    // For set completion: use msg.set (the set number the Arduino was on when
    // it fired done:true) to guard against duplicate calls. The Arduino sends
    // currentSet BEFORE incrementing it, so msg.set matches JS's currentSet
    // only if this set hasn't been completed yet.
    if (msg.done && msg.set === currentSet) completeSet()
}

// ── WebSocket (primary real-time path) ───────────────────────────────────────
function connectWS() {
    if (workoutFinished) return

    ws = new WebSocket(WS_SERVER)

    ws.onopen = () => {
        wsConnected = true
        stopPolling()              // WS is up — polling not needed
        console.log('WS connected')
    }

    ws.onmessage = (event) => {
        try { handleMessage(JSON.parse(event.data)) }
        catch (e) { console.error('WS parse error:', e) }
    }

    ws.onerror = () => {}          // onclose fires right after; handle there

    ws.onclose = () => {
        wsConnected = false
        if (!workoutFinished) {
            console.warn('WS disconnected — falling back to polling, will retry WS in 2s')
            startPolling()
            setTimeout(connectWS, 2000)
        }
    }
}

// ── Polling fallback (fires only when WebSocket is down) ─────────────────────
function startPolling() {
    if (pollIntervalId || workoutFinished) return
    pollIntervalId = setInterval(pollForReps, 500)
}

function stopPolling() {
    if (pollIntervalId) {
        clearInterval(pollIntervalId)
        pollIntervalId = null
    }
}

function pollForReps() {
    if (wsConnected || paused || workoutFinished || awaitingPlacement) return

    fetch(`${SERVER}/workout`)
        .then(r => r.json())
        .then(data => {
            if (!Array.isArray(data)) return

            // Slice to only entries from this session
            const session = data.slice(sessionStartIndex)

            // Process any entries we haven't seen yet
            for (let i = lastPollIndex; i < session.length; i++) {
                const entry = session[i]
                if (entry.exercise === getESP32Exercise(exerciseName)) {
                    if (!entry.done) updateReps(entry.reps)
                    if (entry.done && entry.set === currentSet) completeSet()
                }
            }
            lastPollIndex = session.length
        })
        .catch(() => {})
}

// ── Send control to backend (ESP32 picks it up on next poll) ─────────────────
function sendControl(running, target, sets) {
    const exercise = getESP32Exercise(exerciseName)
    const body = running
        ? { running, target, sets, exercise }
        : { running: false }
    fetch(`${SERVER}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    }).catch(err => console.error('Control error:', err))
}

// ── Ready button (dismisses placement overlay and starts counting) ────────────
readyBtn.addEventListener('click', () => {
    if (!awaitingPlacement) return
    awaitingPlacement = false
    placementOverlay.classList.remove('active')
    sendControl(true, targetReps, targetSets)
    // Start stopwatch only on the very first ready click
    if (!stopwatchInterval) {
        stopwatchInterval = setInterval(updateStopwatch, 1000)
    }
})

// ── Start workout ─────────────────────────────────────────────────────────────
function startWorkout() {
    if (!targetReps || targetReps <= 0) { console.error("Invalid targetReps:", targetReps); return }
    if (!targetSets || targetSets <= 0) { console.error("Invalid targetSets:", targetSets); return }

    sessionStartIndex = 0
    lastPollIndex     = 0
    connectWS()
    showPlacement()   // always show sensor placement before the first exercise
}

// ── Pause / Resume ────────────────────────────────────────────────────────────
pauseBtn.addEventListener("click", () => {
    paused = true
    sendControl(false)
    clearInterval(stopwatchInterval)
    pauseBtn.textContent      = "Paused"
    pauseBtn.style.background = "#666"
})

resumeBtn.addEventListener("click", () => {
    paused = false
    sendControl(true, targetReps, targetSets)
    stopwatchInterval = setInterval(updateStopwatch, 1000)
    pauseBtn.textContent      = "Pause"
    pauseBtn.style.background = "#3436a8"
})

endBtn.addEventListener("click", () => {
    finishWorkout()
})

// ── Finish workout ─────────// wei got added line 325 to 327───────────────────────────────────────────────────
async function finishWorkout() {
    if (workoutFinished) return
    workoutFinished = true

    endBtn.disabled        = true
    endBtn.textContent     = "Saving Workout"
    endingText.textContent = "Saving..."

    sendControl(false)
    clearInterval(stopwatchInterval)
    stopPolling()

    // wei got added line 334 to 340
    if (ws) {
        try {
            ws.close()
        } catch (e) {
            console.warn('WS close warning:', e)
        }
    }

    const workoutData = {
        exercises: exerciseReps,
        calories:  calories,
        duration:  elapsedSeconds,
        date:      new Date().toISOString()
    }

    let workouts = JSON.parse(localStorage.getItem("workouts")) || []
    workouts.push(workoutData)
    localStorage.setItem("workouts", JSON.stringify(workouts))

    // If user has any reps on the current exercise, save as stopped final record
    if (currentReps > 0) {
        const currentExerciseESP32 = getESP32Exercise(exerciseName)
        try {
            const res = await fetch(`${SERVER}/stopWorkout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    exercise: currentExerciseESP32,
                    reps: currentReps,
                    set: currentSet
                }),
                keepalive: true
            })

            if (!res.ok) {
                const text = await res.text()
                console.error('Stop workout save failed:', text)
            } else {
                const result = await res.json()
                console.log('Stopped workout saved:', result)
            }
        } catch (err) {
            console.error('Stop workout error:', err)
        }
    }

    endingText.textContent = "Workout saved"

    setTimeout(() => {
        window.location.href = "index.html"
    }, 1200)
}

startWorkout()
