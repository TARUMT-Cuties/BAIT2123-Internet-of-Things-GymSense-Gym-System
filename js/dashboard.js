const repsElement = document.getElementById("repsStat")
const caloriesElement = document.getElementById("caloriesStat")
const streakElement = document.getElementById("streakStat")

// ── Muscle group mappings per exercise ────────────────────────────────────
const MUSCLE_MAPPINGS = {
    'squat':  { quadriceps: 1.0, glutes: 0.9, hamstrings: 0.6, calves: 0.4, core: 0.3 },
    'pushup': { chest: 1.0, triceps: 0.8, frontDeltoids: 0.7, core: 0.4 },
    'curl':   { biceps: 1.0, forearms: 0.6 }
}

const DISPLAY_TO_KEY = { 'Squat': 'squat', 'Push-up': 'pushup', 'Arm Curl': 'curl' }

function calculateMuscleIntensity(historyData) {
    const repsByExercise = {}
    historyData.forEach(item => {
        const key = DISPLAY_TO_KEY[item.exercise] || item.exercise.toLowerCase()
        repsByExercise[key] = (repsByExercise[key] || 0) + (parseInt(item.reps) || 0)
    })
    const maxReps = Math.max(...Object.values(repsByExercise), 1)
    const muscleIntensity = {}
    Object.entries(repsByExercise).forEach(([exercise, reps]) => {
        const mapping = MUSCLE_MAPPINGS[exercise]
        if (!mapping) return
        const normalized = reps / maxReps
        Object.entries(mapping).forEach(([muscle, factor]) => {
            muscleIntensity[muscle] = Math.min(1, (muscleIntensity[muscle] || 0) + normalized * factor)
        })
    })
    const maxI = Math.max(...Object.values(muscleIntensity), 1)
    Object.keys(muscleIntensity).forEach(m => { muscleIntensity[m] /= maxI })
    return muscleIntensity
}

function getMuscleColor(intensity) {
    if (!intensity || intensity === 0) return '#2e2e4a'
    if (intensity < 0.25) return '#1a5276'
    if (intensity < 0.5)  return '#117a65'
    if (intensity < 0.75) return '#d35400'
    return '#c0392b'
}

function drawMuscleBodyDiagram(muscleIntensity) {
    const canvas = document.createElement('canvas')
    const W = 800, H = 610
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = '#12122a'
    ctx.fillRect(0, 0, W, H)

    const BASE = '#2a2a48'
    const OUTLINE = 'rgba(255,255,255,0.1)'

    function fillEllipse(x, y, rx, ry, color) {
        ctx.beginPath()
        ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
        ctx.strokeStyle = OUTLINE
        ctx.lineWidth = 1
        ctx.stroke()
    }

    function fillRect(x, y, w, h, color, r = 6) {
        ctx.beginPath()
        ctx.moveTo(x + r, y)
        ctx.lineTo(x + w - r, y)
        ctx.quadraticCurveTo(x + w, y, x + w, y + r)
        ctx.lineTo(x + w, y + h - r)
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
        ctx.lineTo(x + r, y + h)
        ctx.quadraticCurveTo(x, y + h, x, y + h - r)
        ctx.lineTo(x, y + r)
        ctx.quadraticCurveTo(x, y, x + r, y)
        ctx.closePath()
        ctx.fillStyle = color
        ctx.fill()
        ctx.strokeStyle = OUTLINE
        ctx.lineWidth = 1
        ctx.stroke()
    }

    function muscle(name) { return getMuscleColor(muscleIntensity[name] || 0) }

    // Section labels
    ctx.fillStyle = '#8888aa'
    ctx.font = 'bold 15px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('FRONT', 200, 22)
    ctx.fillText('BACK',  600, 22)

    // ── FRONT VIEW (center x=200) ─────────────────────────────────────────
    const FX = 200, OY = 35

    // Base silhouette shapes first (drawn back-to-front)
    // Torso base
    ctx.beginPath()
    ctx.moveTo(FX - 70, OY + 98)
    ctx.lineTo(FX + 70, OY + 98)
    ctx.lineTo(FX + 52, OY + 255)
    ctx.lineTo(FX - 52, OY + 255)
    ctx.closePath()
    ctx.fillStyle = BASE; ctx.fill()

    // Arms base
    fillEllipse(FX - 98, OY + 160, 21, 55, BASE)
    fillEllipse(FX + 98, OY + 160, 21, 55, BASE)
    fillEllipse(FX - 100, OY + 250, 17, 40, BASE)
    fillEllipse(FX + 100, OY + 250, 17, 40, BASE)

    // Legs base
    fillEllipse(FX - 32, OY + 330, 30, 70, BASE)
    fillEllipse(FX + 32, OY + 330, 30, 70, BASE)
    fillEllipse(FX - 29, OY + 445, 22, 52, BASE)
    fillEllipse(FX + 29, OY + 445, 22, 52, BASE)

    // Head + neck
    fillEllipse(FX, OY + 50, 38, 46, '#3a3a5e')
    fillRect(FX - 14, OY + 93, 28, 22, '#3a3a5e', 4)

    // Muscle overlays — FRONT
    // Chest (two pecs)
    fillEllipse(FX - 27, OY + 140, 35, 40, muscle('chest'))
    fillEllipse(FX + 27, OY + 140, 35, 40, muscle('chest'))
    // Front deltoids
    fillEllipse(FX - 72, OY + 110, 26, 20, muscle('frontDeltoids'))
    fillEllipse(FX + 72, OY + 110, 26, 20, muscle('frontDeltoids'))
    // Core/abs
    fillRect(FX - 28, OY + 178, 56, 68, muscle('core'), 8)
    // Biceps
    fillEllipse(FX - 97, OY + 153, 17, 42, muscle('biceps'))
    fillEllipse(FX + 97, OY + 153, 17, 42, muscle('biceps'))
    // Forearms
    fillEllipse(FX - 100, OY + 248, 14, 37, muscle('forearms'))
    fillEllipse(FX + 100, OY + 248, 14, 37, muscle('forearms'))
    // Glutes (visible front as hip flex area)
    fillRect(FX - 50, OY + 245, 100, 30, muscle('glutes'), 6)
    // Quads
    fillEllipse(FX - 31, OY + 327, 26, 65, muscle('quadriceps'))
    fillEllipse(FX + 31, OY + 327, 26, 65, muscle('quadriceps'))
    // Calves
    fillEllipse(FX - 28, OY + 443, 19, 48, muscle('calves'))
    fillEllipse(FX + 28, OY + 443, 19, 48, muscle('calves'))

    // ── BACK VIEW (center x=600) ──────────────────────────────────────────
    const BX = 600

    // Torso base
    ctx.beginPath()
    ctx.moveTo(BX - 70, OY + 98)
    ctx.lineTo(BX + 70, OY + 98)
    ctx.lineTo(BX + 52, OY + 255)
    ctx.lineTo(BX - 52, OY + 255)
    ctx.closePath()
    ctx.fillStyle = BASE; ctx.fill()

    // Arms base
    fillEllipse(BX - 98, OY + 160, 21, 55, BASE)
    fillEllipse(BX + 98, OY + 160, 21, 55, BASE)
    fillEllipse(BX - 100, OY + 250, 17, 40, BASE)
    fillEllipse(BX + 100, OY + 250, 17, 40, BASE)

    // Legs base
    fillEllipse(BX - 32, OY + 330, 30, 70, BASE)
    fillEllipse(BX + 32, OY + 330, 30, 70, BASE)
    fillEllipse(BX - 29, OY + 445, 22, 52, BASE)
    fillEllipse(BX + 29, OY + 445, 22, 52, BASE)

    // Head + neck
    fillEllipse(BX, OY + 50, 38, 46, '#3a3a5e')
    fillRect(BX - 14, OY + 93, 28, 22, '#3a3a5e', 4)

    // Muscle overlays — BACK
    // Traps (upper back, neutral — not tracked)
    fillRect(BX - 38, OY + 100, 76, 45, BASE, 8)
    // Rear deltoids
    fillEllipse(BX - 72, OY + 110, 26, 20, muscle('frontDeltoids'))
    fillEllipse(BX + 72, OY + 110, 26, 20, muscle('frontDeltoids'))
    // Lats / mid back (neutral)
    fillRect(BX - 42, OY + 143, 84, 85, BASE, 8)
    // Triceps
    fillEllipse(BX - 97, OY + 153, 17, 42, muscle('triceps'))
    fillEllipse(BX + 97, OY + 153, 17, 42, muscle('triceps'))
    // Forearms (back)
    fillEllipse(BX - 100, OY + 248, 14, 37, muscle('forearms'))
    fillEllipse(BX + 100, OY + 248, 14, 37, muscle('forearms'))
    // Glutes (back — prominent)
    fillEllipse(BX - 30, OY + 270, 30, 35, muscle('glutes'))
    fillEllipse(BX + 30, OY + 270, 30, 35, muscle('glutes'))
    // Hamstrings
    fillEllipse(BX - 31, OY + 335, 26, 62, muscle('hamstrings'))
    fillEllipse(BX + 31, OY + 335, 26, 62, muscle('hamstrings'))
    // Calves (back)
    fillEllipse(BX - 28, OY + 443, 19, 48, muscle('calves'))
    fillEllipse(BX + 28, OY + 443, 19, 48, muscle('calves'))

    // ── Divider line ──────────────────────────────────────────────────────
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(W/2, 30); ctx.lineTo(W/2, H - 70); ctx.stroke()

    // ── Legend ────────────────────────────────────────────────────────────
    const legend = [
        { color: '#2e2e4a', label: 'Inactive' },
        { color: '#1a5276', label: 'Low' },
        { color: '#117a65', label: 'Moderate' },
        { color: '#d35400', label: 'High' },
        { color: '#c0392b', label: 'Intense' }
    ]
    let lx = 55
    const ly = H - 38
    ctx.font = '13px Arial'
    legend.forEach(({ color, label }) => {
        ctx.fillStyle = color
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'
        ctx.lineWidth = 1
        ctx.beginPath(); ctx.rect(lx, ly, 16, 16); ctx.fill(); ctx.stroke()
        ctx.fillStyle = '#aaaacc'
        ctx.textAlign = 'left'
        ctx.fillText(label, lx + 22, ly + 13)
        lx += 140
    })

    return canvas.toDataURL('image/png')
}

function drawMuscleBarChart(muscleIntensity) {
    const canvas = document.createElement('canvas')
    const W = 780, H = 200
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = '#12122a'
    ctx.fillRect(0, 0, W, H)

    const muscles = [
        { key: 'chest',         label: 'Chest' },
        { key: 'biceps',        label: 'Biceps' },
        { key: 'triceps',       label: 'Triceps' },
        { key: 'frontDeltoids', label: 'Deltoids' },
        { key: 'core',          label: 'Core' },
        { key: 'forearms',      label: 'Forearms' },
        { key: 'quadriceps',    label: 'Quads' },
        { key: 'hamstrings',    label: 'Hamstrings' },
        { key: 'glutes',        label: 'Glutes' },
        { key: 'calves',        label: 'Calves' }
    ]

    const barW = 60, gap = 18, startX = 28, maxBarH = 120, baseY = 160

    muscles.forEach((m, i) => {
        const intensity = muscleIntensity[m.key] || 0
        const barH = Math.max(4, intensity * maxBarH)
        const x = startX + i * (barW + gap)

        // Background bar
        ctx.fillStyle = '#2a2a48'
        ctx.beginPath(); ctx.rect(x, baseY - maxBarH, barW, maxBarH); ctx.fill()

        // Filled bar
        ctx.fillStyle = getMuscleColor(intensity)
        ctx.beginPath(); ctx.rect(x, baseY - barH, barW, barH); ctx.fill()

        // Percentage label
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 12px Arial'
        ctx.textAlign = 'center'
        if (intensity > 0) ctx.fillText(Math.round(intensity * 100) + '%', x + barW / 2, baseY - barH - 6)

        // Muscle label
        ctx.fillStyle = '#8888aa'
        ctx.font = '11px Arial'
        ctx.fillText(m.label, x + barW / 2, baseY + 16)
    })

    return canvas.toDataURL('image/png')
}

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
        .then(res => {
            if (!res.ok) throw new Error('Server error')
            return res.json()
        })
        .then(data => {
            let totalReps = 0
            let totalCalories = 0
            let workoutCount = 0

            if (data && Array.isArray(data)) {
                const finalRecords = data.filter(record => record.isFinal === true)

                finalRecords.forEach(record => {
                    const reps = record.reps || 0
                    const exercise = record.exercise || 'unknown'
                    totalReps += reps
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
            if (repsElement) repsElement.textContent = '--'
            if (caloriesElement) caloriesElement.textContent = '--'
            if (streakElement) streakElement.textContent = '--'
        })
}

loadSummaryStats()
setInterval(loadSummaryStats, 3000)

const sensorExercise = document.getElementById("sensorExercise")
const sensorReps = document.getElementById("sensorReps")
const sensorStatus = document.getElementById("sensorStatus")

function fetchSensorData() {
    fetch('http://localhost:3000/workout')
        .then(res => {
            if (!res.ok) throw new Error('Server error')
            return res.json()
        })
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
        .catch((err) => {
            console.log('Error loading sensor data:', err)
            sensorExercise.textContent = '--'
            sensorReps.textContent = 'Reps: --'
            sensorStatus.textContent = 'Connection error'
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
        .then(res => {
            if (!res.ok) throw new Error('Server error')
            return res.json()
        })
        .then(data => {
            const tableBody = document.getElementById('historyTableBody')

            if (!data || data.length === 0) {
                tableBody.innerHTML = '<tr class="empty-state"><td colspan="5">No workout history yet</td></tr>'
                return
            }

            const sorted = [...data].sort((a, b) => new Date(Number(b.timestamp)) - new Date(Number(a.timestamp)))
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

    // 3. MUSCLE DISTRIBUTION PAGE
    doc.addPage()
    doc.setFontSize(20)
    doc.setTextColor(74, 144, 226)
    doc.text('Muscle Distribution', 14, 20)
    doc.setFontSize(10)
    doc.setTextColor(130)
    doc.text('Muscle groups activated based on your workout history', 14, 28)

    const muscleIntensity = calculateMuscleIntensity(historyData)
    const bodyImg = drawMuscleBodyDiagram(muscleIntensity)
    const barImg  = drawMuscleBarChart(muscleIntensity)

    // Body diagram: fit to page width with margins
    doc.addImage(bodyImg, 'PNG', 10, 33, 190, 143)

    // Bar chart below the diagram
    doc.setFontSize(12)
    doc.setTextColor(40)
    doc.text('Activation by Muscle Group', 14, 183)
    doc.addImage(barImg, 'PNG', 10, 187, 190, 47)

    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(`GymSense Report - Page ${doc.internal.getNumberOfPages()}`, 105, 285, { align: 'center' })

    // 4. GENERATE EXERCISE-SPECIFIC PAGES
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