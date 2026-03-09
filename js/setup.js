const startButton = document.getElementById("startWorkoutBtn")
const exerciseConfig = document.getElementById("exerciseConfig")
const exerciseCheckboxes = document.querySelectorAll(".exercise-list input")

const lastWorkoutRaw = localStorage.getItem("lastWorkout")
const lastWorkout = lastWorkoutRaw ? JSON.parse(lastWorkoutRaw) : null

if (lastWorkout) {

    const card = document.getElementById("lastWorkoutCard")
    const content = document.getElementById("lastWorkoutContent")

    card.style.display = "block"

    lastWorkout.forEach(exercise => {

        const block = document.createElement("div")
        const title = document.createElement("h3")

        title.textContent = exercise.exercise
        block.appendChild(title)

        exercise.sets.forEach((set,index)=>{

            const line = document.createElement("p")
            const setNumber = index + 1

            line.textContent = `Set ${setNumber} - ${set.reps} reps - ${set.weight}kg`

            block.appendChild(line)

        })

        content.appendChild(block)

    })

}

exerciseCheckboxes.forEach(checkbox => {

    checkbox.addEventListener("change", () => {

        const exerciseName = checkbox.value
        const existing = document.getElementById(`config-${exerciseName}`)

        if (!checkbox.checked) {

            if (existing) existing.remove()
            return

        }

        const container = document.createElement("div")
        container.className = "form-group"
        container.id = `config-${exerciseName}`

        const title = document.createElement("h3")
        title.textContent = exerciseName

        const setsContainer = document.createElement("div")
        setsContainer.className = "sets"

        const addButton = document.createElement("button")
        const removeButton = document.createElement("button")

        addButton.textContent = "Add Set"
        removeButton.textContent = "Remove Set"

        addButton.className = "addSet"
        removeButton.className = "removeSet"

        container.appendChild(title)
        container.appendChild(setsContainer)
        container.appendChild(addButton)
        container.appendChild(removeButton)

        exerciseConfig.appendChild(container)

        const previousExercise =
            lastWorkout?.find(ex => ex.exercise === exerciseName)

        if (previousExercise) {

            previousExercise.sets.forEach(set => {

                const row = document.createElement("div")

                const repsInput = document.createElement("input")
                repsInput.type = "number"
                repsInput.className = "repInput"
                repsInput.min = "0"
                repsInput.value = set.reps

                const weightInput = document.createElement("input")
                weightInput.type = "number"
                weightInput.className = "weightInput"
                weightInput.min = "0"
                weightInput.value = set.weight

                row.append(`Set ${setsContainer.children.length + 1}: `)
                row.appendChild(repsInput)
                row.appendChild(weightInput)

                setsContainer.appendChild(row)

            })

        } else {

            addSetRow(setsContainer)

        }

        addButton.onclick = () => addSetRow(setsContainer)

        removeButton.onclick = () => {

            const totalSets = setsContainer.children.length
            const minimumSets = 1

            if (totalSets > minimumSets)
                setsContainer.removeChild(setsContainer.lastChild)

        }

        container.scrollIntoView({behavior:"smooth",block:"center"})

    })

})

function addSetRow(parent){

    const previousRow = parent.lastElementChild

    let defaultReps = ""
    let defaultWeight = ""

    if (previousRow) {

        const prevReps = previousRow.querySelector(".repInput")
        const prevWeight = previousRow.querySelector(".weightInput")

        defaultReps = prevReps.value
        defaultWeight = prevWeight.value

    }

    const setNumber = parent.children.length + 1

    const row = document.createElement("div")

    const repsInput = document.createElement("input")
    const weightInput = document.createElement("input")

    repsInput.type = "number"
    repsInput.className = "repInput"
    repsInput.placeholder = "Reps"
    repsInput.min = "0"
    repsInput.value = defaultReps

    weightInput.type = "number"
    weightInput.className = "weightInput"
    weightInput.placeholder = "Weight"
    weightInput.min = "0"
    weightInput.value = defaultWeight

    row.append(`Set ${setNumber}: `)
    row.appendChild(repsInput)
    row.appendChild(weightInput)

    parent.appendChild(row)

}

startButton.addEventListener("click", () => {

    const workout = []
    const exerciseBlocks = document.querySelectorAll("#exerciseConfig > div")

    if (exerciseBlocks.length === 0) {

        alert("Select at least one exercise")
        return

    }

    exerciseBlocks.forEach(block => {

        const exerciseName = block.querySelector("h3").innerText
        const rows = block.querySelectorAll(".sets div")

        const sets = []

        rows.forEach(row => {

            const repsValue = row.querySelector(".repInput").value
            const weightValue = row.querySelector(".weightInput").value

            if (repsValue === "" || weightValue === "") {

                alert("Please enter reps and weight for every set")
                throw new Error("Missing values")

            }

            const reps = Number(repsValue)
            const weight = Number(weightValue)

            sets.push({reps,weight})

        })

        workout.push({
            exercise: exerciseName,
            sets: sets
        })

    })

    localStorage.setItem("lastWorkout", JSON.stringify(workout))

    startButton.disabled = true
    startButton.textContent = "Starting workout..."

    setTimeout(()=>{

        window.location.href = "workout.html"

    },500)

})