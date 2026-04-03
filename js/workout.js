const exerciseText = document.getElementById("exercise")
const repsText = document.getElementById("reps")
const setText = document.getElementById("set")
const caloriesText = document.getElementById("calories")
const rirText = document.getElementById("rir")
const stopwatchText = document.getElementById("stopwatch")

const pauseBtn = document.getElementById("pauseBtn")
const resumeBtn = document.getElementById("resumeBtn")
const endBtn = document.getElementById("endButton")
const endingText = document.getElementById("endingText")

const exerciseReps = {}

const savedWorkoutRaw = localStorage.getItem("lastWorkout")
const savedWorkout = savedWorkoutRaw ? JSON.parse(savedWorkoutRaw) : null

if (!savedWorkout || savedWorkout.length === 0) {
    window.location.href = "setup.html"
}

const exercises = savedWorkout.map(ex => ex.exercise)

let currentExerciseIndex = 0
let exerciseName = exercises[currentExerciseIndex]

let currentSet = 1
let currentReps = 0
let calories = 0

let elapsedSeconds = 0

let workoutInterval = null
let stopwatchInterval = null

let paused = false

let lastSensorReps = 0
let sessionStartIndex = 0  // index in /workout array when this session started

function getTargetSets() {
    return savedWorkout[currentExerciseIndex].sets.length
}

function getTargetReps() {
    return savedWorkout[currentExerciseIndex].sets[currentSet - 1].reps
}

let targetSets = getTargetSets()
let targetReps = getTargetReps()
let rir = targetReps

exerciseText.textContent = exerciseName
setText.textContent = `${currentSet} / ${targetSets}`
repsText.textContent = currentReps
caloriesText.textContent = calories
rirText.textContent = rir

exercises.forEach(ex => {
    exerciseReps[ex] = 0
})

function updateStopwatch() {

    elapsedSeconds += 1

    const minutes = Math.floor(elapsedSeconds / 60)
    const seconds = elapsedSeconds % 60

    const formatted =
        String(minutes).padStart(2,"0") +
        ":" +
        String(seconds).padStart(2,"0")

    stopwatchText.textContent = formatted
}

function addRep() {

    currentReps += 1
    exerciseReps[exerciseName] += 1
    calories += 2

    rir = Math.max(0, targetReps - currentReps)

    repsText.textContent = currentReps
    caloriesText.textContent = calories
    rirText.textContent = rir

    if (currentReps >= targetReps) {

        currentSet++
        currentReps = 0

        if (currentSet > targetSets) {

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

        setText.textContent = `${currentSet} / ${targetSets}`
        sendControl(true, targetReps, targetSets)
    }
}

function sendControl(running, target, sets) {
    const body = running
        ? { running, target, sets, exercise: exerciseName }
        : { running: false }
    fetch('http://localhost:3000/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    }).catch(err => console.error('Control error:', err))
}

function fetchESP32Data() {

    if (paused) return

    fetch('http://localhost:3000/workout')
        .then(res => res.json())
        .then(data => {
            if (!data) return

            // Each new POST from ESP32 = 1 rep
            const sessionEntries = data.slice(sessionStartIndex)
            const totalEntries = sessionEntries.length

            if (totalEntries > lastSensorReps) {
                const newReps = totalEntries - lastSensorReps
                console.log("New reps from ESP32:", newReps)
                for (let i = 0; i < newReps; i++) {
                    addRep()
                }
                lastSensorReps = totalEntries
            }
        })
        .catch(err => console.error('ESP32 fetch error:', err))
}

function startWorkout() {

    if (!targetReps || targetReps <= 0) {
        console.error("Invalid targetReps:", targetReps)
        return
    }
    if (!targetSets || targetSets <= 0) {
        console.error("Invalid targetSets:", targetSets)
        return
    }

    // Record how many entries exist now so we only count NEW entries from this session
    fetch('http://localhost:3000/workout')
        .then(res => res.json())
        .then(data => {
            sessionStartIndex = data ? data.length : 0
            lastSensorReps = 0
            console.log("Workout started — target:", targetReps, "sets:", targetSets, "sessionStartIndex:", sessionStartIndex)
            sendControl(true, targetReps, targetSets)
            workoutInterval = setInterval(fetchESP32Data, 1000)
            stopwatchInterval = setInterval(updateStopwatch, 1000)
        })
        .catch(() => {
            sessionStartIndex = 0
            lastSensorReps = 0
            console.log("Workout started (offline) — target:", targetReps, "sets:", targetSets)
            sendControl(true, targetReps, targetSets)
            workoutInterval = setInterval(fetchESP32Data, 1000)
            stopwatchInterval = setInterval(updateStopwatch, 1000)
        })

}


pauseBtn.addEventListener("click", () => {

    paused = true
    sendControl(false)

    clearInterval(stopwatchInterval)

    pauseBtn.textContent = "Paused"
    pauseBtn.style.background = "#666"

})

resumeBtn.addEventListener("click", () => {

    paused = false
    sendControl(true, targetReps, targetSets)

    stopwatchInterval = setInterval(updateStopwatch,1000)

    pauseBtn.textContent = "Pause"
    pauseBtn.style.background = "#3436a8"

})

endBtn.addEventListener("click", finishWorkout)

function finishWorkout() {

    sendControl(false, 0)
    clearInterval(workoutInterval)
    clearInterval(stopwatchInterval)

    const workoutData = {
        exercises: exerciseReps,
        calories: calories,
        duration: elapsedSeconds,
        date: new Date().toISOString()
    }

    let workouts = JSON.parse(localStorage.getItem("workouts")) || []

    workouts.push(workoutData)

    localStorage.setItem("workouts", JSON.stringify(workouts))

    endBtn.disabled = true
    endBtn.textContent = "Saving Workout"
    endingText.textContent = "Workout saved"

    setTimeout(()=>{

        window.location.href = "index.html"

    },1000)

}

startWorkout()