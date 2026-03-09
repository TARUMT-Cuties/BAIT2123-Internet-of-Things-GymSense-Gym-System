const startButton = document.getElementById("startWorkoutBtn")

startButton.addEventListener("click", () => {

    const selectedExercises = Array.from(
        document.querySelectorAll("input[type='checkbox']:checked")
    ).map(el => el.value)

    const sets = document.getElementById("sets").value
    const reps = document.getElementById("targetReps").value

    if (selectedExercises.length === 0) {
        alert("Select at least one exercise")
        return
    }

    const exercisesParam = encodeURIComponent(JSON.stringify(selectedExercises))

    const url =
        `workout.html?exercises=${exercisesParam}&sets=${sets}&reps=${reps}`

    startButton.disabled = true
    startButton.textContent = "Starting workout..."

    setTimeout(() => {
        window.location.href = url
    }, 500)

})