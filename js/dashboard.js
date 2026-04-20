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

document.getElementById('downloadReport').addEventListener('click', async () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const primaryColor = [74, 144, 226]; // GymSense Blue

    // 1. FRONT PAGE: Overall Summary
    doc.setFontSize(24);
    doc.setTextColor(40, 44, 52);
    doc.text('GymSense Progress Report', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

    // Grab the summary stats from your dashboard cards
    const totalReps = document.getElementById('repsStat').innerText;
    const totalCals = document.getElementById('caloriesStat').innerText;
    const totalWorkouts = document.getElementById('streakStat').innerText;

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Overall Statistics', 14, 45);
    
    doc.setFontSize(12);
    doc.text(`• Total Volume: ${totalReps} Reps`, 20, 55);
    doc.text(`• Estimated Calories: ${totalCals} kcal`, 20, 65);
    doc.text(`• Sessions Completed: ${totalWorkouts}`, 20, 75);

    // 2. DATA PROCESSING: Group rows by exercise
    const historyData = [];
    const rows = document.querySelectorAll('#historyTableBody tr');
    
    rows.forEach(row => {
        if (row.classList.contains('empty-state')) return;
        const cells = row.querySelectorAll('td');
        if (cells.length >= 5) {
            historyData.push({
                time: cells[0].innerText,
                exercise: cells[1].innerText,
                reps: cells[2].innerText,
                set: cells[3].innerText,
                status: cells[4].innerText
            });
        }
    });

    // Get unique list of exercises performed
    const exercises = [...new Set(historyData.map(item => item.exercise))];

    // 3. GENERATE EXERCISE-SPECIFIC PAGES
    exercises.forEach((exName) => {
        doc.addPage(); // Every exercise gets its own page
        
        doc.setFontSize(20);
        doc.setTextColor(74, 144, 226);
        doc.text(`${exName} - Detailed History`, 14, 20);

        // Filter data for just this specific exercise
        const filteredData = historyData
            .filter(item => item.exercise === exName)
            .map(item => [item.time, item.reps, item.set, item.status]);

        doc.autoTable({
            startY: 30,
            head: [['Date/Time', 'Reps', 'Sets', 'Final Status']],
            body: filteredData,
            theme: 'striped',
            headStyles: { fillColor: primaryColor },
            styles: { fontSize: 10, cellPadding: 5 }
        });
        
        // Add footer with Page Number
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`GymSense Report - Page ${pageCount}`, 105, 285, { align: 'center' });
    });

    // 4. SAVE THE REPORT
    doc.save(`GymSense_Log_${new Date().toISOString().slice(0,10)}.pdf`);
}); 

loadWorkoutHistory()
setInterval(loadWorkoutHistory, 3000)