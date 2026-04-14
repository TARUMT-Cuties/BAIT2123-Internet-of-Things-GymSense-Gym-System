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

// ── Workout History ─────────────────────────────────────────────────────────────
function formatDate(timestamp) {
    if (!timestamp) return 'Invalid time'
    const date = new Date(Number(timestamp))
    if (isNaN(date.getTime())) return 'Invalid time'
    
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    const hh = String(date.getHours()).padStart(2, '0')
    const min = String(date.getMinutes()).padStart(2, '0')
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}

function loadWorkoutHistory() {
    fetch('http://localhost:3000/workout')
        .then(res => res.json())
        .then(data => {
            const tableBody = document.getElementById('historyTableBody')
            
            if (!data || data.length === 0) {
                tableBody.innerHTML = '<tr class="empty-state"><td colspan="5">No workout history yet</td></tr>'
                return
            }

            // Sort by timestamp newest first
            const sorted = [...data].sort((a, b) => new Date(Number(b.timestamp)) - new Date(Number(a.timestamp)))
            
            // Filter to show only final results: new format (isFinal: true) or old format (done: true)
            const finalResults = sorted.filter(record => record.isFinal === true || record.done === true)

            if (finalResults.length === 0) {
                tableBody.innerHTML = '<tr class="empty-state"><td colspan="5">No workout history yet</td></tr>'
                return
            }

            const rows = finalResults.map(record => {
                const time = formatDate(record.timestamp)
                const exercise = record.exercise || '--'
                const reps = record.reps ?? '--'
                const set = record.set ?? '--'
                // Use new status field if available, otherwise infer from old done field
                let status = record.status || (record.done === true ? 'Completed' : 'Unknown')
                let statusClass = 'status-in-progress'
                if (record.status === 'Completed' || record.done === true) {
                    statusClass = 'status-completed'
                } else if (record.status === 'Stopped') {
                    statusClass = 'status-stopped'
                }

                return `
                    <tr>
                        <td>${time}</td>
                        <td>${exercise}</td>
                        <td>${reps}</td>
                        <td>${set}</td>
                        <td class="${statusClass}">${status}</td>
                    </tr>
                `
            }).join('')

            tableBody.innerHTML = rows
        })
        .catch(err => {
            console.log('Error loading workout history:', err)
            const tableBody = document.getElementById('historyTableBody')
            tableBody.innerHTML = '<tr class="empty-state"><td colspan="5">Unable to load history</td></tr>'
        })
}

loadWorkoutHistory()
setInterval(loadWorkoutHistory, 3000)