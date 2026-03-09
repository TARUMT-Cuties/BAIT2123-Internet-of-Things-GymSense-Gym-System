const startButton = document.getElementById("startWorkoutBtn")

startButton.addEventListener("click", () => {

    const exercise = document.getElementById("exerciseSelect").value
    const sets = document.getElementById("sets").value
    const reps = document.getElementById("targetReps").value

    const url =
        `workout.html?exercise=${exercise}&sets=${sets}&reps=${reps}`

    startButton.disabled = true
    startButton.textContent = "Starting workout..."

    setTimeout(() => {

        window.location.href = url

    }, 600)

})