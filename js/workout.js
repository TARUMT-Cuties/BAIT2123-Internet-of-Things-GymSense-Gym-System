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

function updateWorkout() {

    if (paused) return

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
    }
}

function startWorkout() {

    workoutInterval = setInterval(updateWorkout,2000)
    stopwatchInterval = setInterval(updateStopwatch,1000)

}

pauseBtn.addEventListener("click", () => {

    paused = true

    clearInterval(stopwatchInterval)

    pauseBtn.textContent = "Paused"
    pauseBtn.style.background = "#666"

})

resumeBtn.addEventListener("click", () => {

    paused = false

    stopwatchInterval = setInterval(updateStopwatch,1000)

    pauseBtn.textContent = "Pause"
    pauseBtn.style.background = "#3436a8"

})

endBtn.addEventListener("click", finishWorkout)

function finishWorkout() {

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