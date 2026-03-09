const params = new URLSearchParams(window.location.search)

const exerciseName = params.get("exercise") || "Squats"
const targetSets = parseInt(params.get("sets")) || 4
const targetReps = parseInt(params.get("reps")) || 12


let currentReps = 0
let currentSet = 1
let calories = 0
let rir = targetReps

let elapsedSeconds = 0

let workoutInterval = null
let stopwatchInterval = null

let paused = false


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


exerciseText.textContent = exerciseName
setText.textContent = `${currentSet} / ${targetSets}`
repsText.textContent = currentReps
caloriesText.textContent = calories
rirText.textContent = rir



function updateStopwatch() {

    elapsedSeconds += 1

    const minutes = Math.floor(elapsedSeconds / 60)
    const seconds = elapsedSeconds % 60

    const formatted =
        String(minutes).padStart(2, "0") +
        ":" +
        String(seconds).padStart(2, "0")

    stopwatchText.textContent = formatted
}



function updateWorkout() {

    if (paused) {
        return
    }

    currentReps += 1
    calories += 2

    rir = Math.max(0, targetReps - currentReps)

    repsText.textContent = currentReps
    caloriesText.textContent = calories
    rirText.textContent = rir

    if (currentReps >= targetReps) {

        currentSet += 1
        currentReps = 0
        rir = targetReps

        if (currentSet > targetSets) {
            finishWorkout()
            return
        }

        setText.textContent = `${currentSet} / ${targetSets}`
    }

}



function startWorkout() {

    workoutInterval = setInterval(updateWorkout, 2000)
    stopwatchInterval = setInterval(updateStopwatch, 1000)

}



pauseBtn.addEventListener("click", () => {

    paused = true

    clearInterval(stopwatchInterval)

    pauseBtn.textContent = "Paused"
    pauseBtn.style.background = "#666"

})



resumeBtn.addEventListener("click", () => {

    paused = false

    stopwatchInterval = setInterval(updateStopwatch, 1000)

    pauseBtn.textContent = "Pause"
    pauseBtn.style.background = "#3436a8"

})



endBtn.addEventListener("click", finishWorkout)



function finishWorkout() {

    clearInterval(workoutInterval)
    clearInterval(stopwatchInterval)

    const workoutData = {

        exercise: exerciseName,
        totalReps: (currentSet - 1) * targetReps + currentReps,
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

    setTimeout(() => {

        window.location.href = "index.html"

    }, 1000)

}


startWorkout()