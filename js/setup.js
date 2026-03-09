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

const repeatBtn = document.getElementById("repeatWorkoutBtn")

if (repeatBtn && lastWorkout) {

    repeatBtn.addEventListener("click", () => {

        exerciseConfig.innerHTML = ""

        lastWorkout.forEach(exercise => {

            const checkbox =
                document.querySelector(`input[value="${exercise.exercise}"]`)

            if (checkbox) checkbox.checked = true

            const container = document.createElement("div")
            container.className = "form-group"
            container.id = `config-${exercise.exercise}`

            const title = document.createElement("h3")
            title.textContent = exercise.exercise

            const setsContainer = document.createElement("div")
            setsContainer.className = "sets"

            const headerRow = document.createElement("div")
            headerRow.className = "setHeader"

            headerRow.innerHTML = `
                <span></span>
                <span>Reps</span>
                <span>Weight</span>
                <span></span>
            `

            setsContainer.appendChild(headerRow)

            exercise.sets.forEach(set => {
                addSetRow(setsContainer, set.reps, set.weight)
            })

            const addButton = document.createElement("button")
            addButton.textContent = "Add Set"
            addButton.className = "addSet"

            addButton.onclick = () => addSetRow(setsContainer)

            container.appendChild(title)
            container.appendChild(setsContainer)
            container.appendChild(addButton)

            exerciseConfig.appendChild(container)

        })

        setTimeout(() => {

            const startBtn = document.getElementById("startWorkoutBtn")

            startBtn.scrollIntoView({
                behavior: "smooth",
                block: "center"
            })

        }, 100)

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

        const headerRow = document.createElement("div")
        headerRow.className = "setHeader"

        const setLabel = document.createElement("span")
        setLabel.textContent = ""

        const spacer = document.createElement("span")
        spacer.textContent = ""

        const repsLabel = document.createElement("span")
        repsLabel.textContent = "Reps"

        const weightLabel = document.createElement("span")
        weightLabel.textContent = "Weight"

        const deleteSpacer = document.createElement("span")
        deleteSpacer.textContent = ""

        headerRow.appendChild(setLabel)
        headerRow.appendChild(repsLabel)
        headerRow.appendChild(weightLabel)
        headerRow.appendChild(deleteSpacer)

        setsContainer.appendChild(headerRow)

        const addButton = document.createElement("button")
        addButton.textContent = "Add Set"
        addButton.className = "addSet"

        container.appendChild(title)
        container.appendChild(setsContainer)
        container.appendChild(addButton)

        exerciseConfig.appendChild(container)

        const previousExercise =
            lastWorkout?.find(ex => ex.exercise === exerciseName)

        if (previousExercise) {
            previousExercise.sets.forEach(set => {
                addSetRow(setsContainer, set.reps, set.weight)
            })
        }

        if (setsContainer.querySelectorAll(".setRow").length === 0) {
            addSetRow(setsContainer)
        }
               
        addButton.onclick = () => addSetRow(setsContainer)
        container.scrollIntoView({behavior:"smooth",block:"center"})
    })

})

function addSetRow(parent, repsValue = "", weightValue = ""){

    const rows = parent.querySelectorAll(".setRow")
    const previousRow = rows[rows.length - 1]

    if (previousRow && repsValue === "" && weightValue === "") {

        const prevReps = previousRow.querySelector(".repInput")
        const prevWeight = previousRow.querySelector(".weightInput")

        repsValue = prevReps.value
        weightValue = prevWeight.value
    }

    const setNumber = rows.length + 1

    const row = document.createElement("div")
    row.className = "setRow"

    const label = document.createElement("span")
    label.textContent = `Set ${setNumber}:`

    const repsInput = document.createElement("input")
    repsInput.type = "number"
    repsInput.className = "repInput"
    repsInput.min = "0"
    repsInput.placeholder = "Reps"
    repsInput.value = repsValue

    const weightInput = document.createElement("input")
    weightInput.type = "number"
    weightInput.className = "weightInput"
    weightInput.min = "0"
    weightInput.placeholder = "Weight"
    weightInput.value = weightValue

    const deleteBtn = document.createElement("button")
    deleteBtn.className = "deleteSet"
    deleteBtn.textContent = "X"

    deleteBtn.onclick = () => {

        const allRows = parent.querySelectorAll(".setRow")
        const exerciseBlock = parent.parentElement

        if (allRows.length === 1) {

            const exerciseName = exerciseBlock.querySelector("h3").textContent
            exerciseBlock.remove()

            const checkbox =
                document.querySelector(`input[value="${exerciseName}"]`)

            if (checkbox) checkbox.checked = false

            return
        }

        row.remove()

        const updatedRows = parent.querySelectorAll(".setRow")

        updatedRows.forEach((r,index)=>{
            const label = r.querySelector("span")
            label.textContent = `Set ${index + 1}:`
        })

    }

    row.appendChild(label)
    row.appendChild(repsInput)
    row.appendChild(weightInput)
    row.appendChild(deleteBtn)

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
        const rows = block.querySelectorAll(".setRow")

        const sets = []

        rows.forEach(row => {

            const repsInput = row.querySelector(".repInput")
            const weightInput = row.querySelector(".weightInput")

            const repsValue = repsInput.value
            const weightValue = weightInput.value

            if (repsValue === "" || weightValue === "") {

                alert("Please enter reps and weight for every set")
                throw new Error("Missing values")

            }

            const reps = Number(repsValue)
            const weight = Number(weightValue)

            sets.push({ reps, weight })

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