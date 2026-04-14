const repsElement = document.getElementById("repsStat")
const caloriesElement = document.getElementById("caloriesStat")
const streakElement = document.getElementById("streakStat")

// ── Exercise display name mapping ──────────────────────────────────────────
function getExerciseDisplayName(exerciseName) {
    const mapping = {
        'squat': 'Squat',
        'pushup': 'Push-up',
        'curl': 'Arm Curl'
    }
    return mapping[exerciseName] || exerciseName
}

// ── Calories per rep by exercise ───────────────────────────────────────────
function getCaloriesPerRep(exerciseName) {
    const rates = {
        'squat': 0.8,
        'pushup': 0.6,
        'curl': 0.4
    }
    return rates[exerciseName] || 0.5  // default fallback
}

// ── Load summary stats from final workout records ────────────────────────────
function loadSummaryStats() {
    fetch('http://localhost:3000/workout')
        .then(res => res.json())
        .then(data => {
            let totalReps = 0
            let totalCalories = 0
            let workoutCount = 0

            if (data && Array.isArray(data)) {
                // Filter to final records only (isFinal: true)
                const finalRecords = data.filter(record => record.isFinal === true)
                
                finalRecords.forEach(record => {
                    const reps = record.reps || 0
                    const exercise = record.exercise || 'unknown'
                    totalReps += reps
                    // Calculate calories using exercise-specific rates
                    const caloriesPerRep = getCaloriesPerRep(exercise)
                    totalCalories += reps * caloriesPerRep
                    workoutCount++
                })
            }

            if (repsElement) repsElement.textContent = totalReps
            if (caloriesElement) caloriesElement.textContent = Math.round(totalCalories)
            if (streakElement) streakElement.textContent = workoutCount
        })
        .catch(err => {
            console.log('Error loading summary stats:', err)
        })
}

loadSummaryStats()
setInterval(loadSummaryStats, 3000)

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
            sensorExercise.textContent = getExerciseDisplayName(latest.exercise) || '--'
            sensorReps.textContent = `Reps: ${latest.reps ?? '--'}`
            sensorStatus.textContent = 'Connected'
            sensorStatus.style.color = '#4caf50'
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
                const exercise = getExerciseDisplayName(record.exercise) || '--'
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