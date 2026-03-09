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