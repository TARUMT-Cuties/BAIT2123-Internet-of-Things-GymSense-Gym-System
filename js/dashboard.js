const workouts = JSON.parse(localStorage.getItem("workouts")) || []

let totalReps = 0
let totalCalories = 0
const workoutCount = workouts.length

workouts.forEach(workout => {
    const exercises = workout.exercises || {}

    Object.values(exercises).forEach(reps => {
        totalReps += reps
    })

    totalCalories += workout.calories || 0
})

const repsElement = document.getElementById("repsStat")
const caloriesElement = document.getElementById("caloriesStat")
const streakElement = document.getElementById("streakStat")

if (repsElement) {
    repsElement.textContent = totalReps
}

if (caloriesElement) {
    caloriesElement.textContent = totalCalories
}

if (streakElement) {
    streakElement.textContent = workoutCount
}

const sensorExercise = document.getElementById("sensorExercise")
const sensorReps = document.getElementById("sensorReps")
const sensorStatus = document.getElementById("sensorStatus")

function fetchSensorData() {
    fetch('http://localhost:3000/workout')
        .then(res => res.json())
        .then(data => {
            if (!data || data.length === 0) {
                sensorExercise.textContent = 'No workout data yet'
                sensorReps.textContent = 'Reps: --'
                sensorStatus.textContent = 'Connected — waiting for ESP32'
                sensorStatus.style.color = '#4caf50'
                return
            }

            const latest = data[data.length - 1]
            sensorExercise.textContent = latest.exercise || '--'
            sensorReps.textContent = `Reps: ${latest.reps ?? '--'}`
            sensorStatus.textContent = 'Connected'
            sensorStatus.style.color = '#4caf50'

            const totalServerReps = data.reduce((sum, entry) => sum + (entry.reps || 0), 0)
            if (repsElement) repsElement.textContent = totalServerReps
        })
        .catch(() => {
            sensorStatus.textContent = 'Sensor offline'
            sensorStatus.style.color = '#f44336'
        })
}

fetchSensorData()
setInterval(fetchSensorData, 2000)

const startButton = document.getElementById("startButton")
const loadingText = document.getElementById("loadingText")

if (startButton) {

    startButton.addEventListener("click", () => {

        startButton.disabled = true
        startButton.textContent = "Preparing workout..."
        loadingText.textContent = "Opening setup..."

        setTimeout(() => {
            window.location.href = "setup.html"
        }, 500)
    })
}