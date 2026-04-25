const SERVER = `http://${window.location.hostname}:3000`

const repsElement = document.getElementById("repsStat")
const caloriesElement = document.getElementById("caloriesStat")
const streakElement = document.getElementById("streakStat")

// ── Muscle group mappings per exercise (biomechanically accurate) ─────────
const MUSCLE_MAPPINGS = {
    squat: {
        quadriceps: 1.00, glutes: 0.85, hamstrings: 0.70,
        core: 0.50, adductors: 0.45, calves: 0.40, erectors: 0.40,
    },
    pushup: {
        chest: 1.00, triceps: 0.75, frontDeltoids: 0.60,
        core: 0.45, lats: 0.30, traps: 0.25, forearms: 0.15,
    },
    curl: {
        biceps: 1.00, forearms: 0.65, frontDeltoids: 0.20,
    },
}

const DISPLAY_TO_KEY = { 'Squat': 'squat', 'Push-up': 'pushup', 'Arm Curl': 'curl' }

function parseHistoryDate(str) {
    const m = str && str.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/)
    return m ? new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]) : null
}

function calculateMuscleIntensity(historyData) {
    const now = Date.now()
    const HALF_LIFE_DAYS = 14  // workouts older than 2 weeks contribute half as much

    const weighted = {}
    historyData.forEach(item => {
        const key = DISPLAY_TO_KEY[item.exercise] || item.exercise.toLowerCase()
        const reps = parseInt(item.reps) || 0
        if (!reps || !MUSCLE_MAPPINGS[key]) return

        const date = parseHistoryDate(item.time)
        const ageDays = date ? Math.max(0, (now - date.getTime()) / 86400000) : 0
        const recencyFactor = Math.exp(-Math.LN2 * ageDays / HALF_LIFE_DAYS)

        weighted[key] = (weighted[key] || 0) + reps * recencyFactor
    })

    if (!Object.keys(weighted).length) return {}

    const maxW = Math.max(...Object.values(weighted), 1)
    const muscleIntensity = {}

    Object.entries(weighted).forEach(([exercise, w]) => {
        const mapping = MUSCLE_MAPPINGS[exercise]
        // Logarithmic scaling: first reps give bigger gains, diminishing returns after that
        const normalized = Math.log1p(w) / Math.log1p(maxW)
        Object.entries(mapping).forEach(([muscle, factor]) => {
            muscleIntensity[muscle] = Math.min(1, (muscleIntensity[muscle] || 0) + normalized * factor)
        })
    })

    const maxI = Math.max(...Object.values(muscleIntensity), 0.01)
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
    // Lats (wide back muscles — left and right flanks, drawn first so traps overlay upper portion)
    fillRect(BX - 45, OY + 143, 32, 85, muscle('lats'), 6)
    fillRect(BX + 13, OY + 143, 32, 85, muscle('lats'), 6)
    // Erectors (two columns running down center spine)
    fillRect(BX - 10, OY + 143, 9, 85, muscle('erectors'), 3)
    fillRect(BX + 1,  OY + 143, 9, 85, muscle('erectors'), 3)
    // Traps (upper back, superficial — overlays upper lats)
    fillRect(BX - 38, OY + 100, 76, 50, muscle('traps'), 8)
    // Rear deltoids (deltoid group is active during push-ups)
    fillEllipse(BX - 72, OY + 110, 26, 20, muscle('frontDeltoids'))
    fillEllipse(BX + 72, OY + 110, 26, 20, muscle('frontDeltoids'))
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
        { key: 'lats',          label: 'Lats' },
        { key: 'traps',         label: 'Traps' },
        { key: 'biceps',        label: 'Biceps' },
        { key: 'triceps',       label: 'Triceps' },
        { key: 'frontDeltoids', label: 'Deltoids' },
        { key: 'forearms',      label: 'Forearms' },
        { key: 'core',          label: 'Core' },
        { key: 'erectors',      label: 'Erectors' },
        { key: 'quadriceps',    label: 'Quads' },
        { key: 'hamstrings',    label: 'Hamstrings' },
        { key: 'adductors',     label: 'Adductors' },
        { key: 'glutes',        label: 'Glutes' },
        { key: 'calves',        label: 'Calves' }
    ]

    const barW = 42, gap = 13, startX = 14, maxBarH = 120, baseY = 160

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
    fetch(`${SERVER}/workout`)
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
    fetch(`${SERVER}/workout`)
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
    fetch(`${SERVER}/workout`)
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
    const btn = document.getElementById('downloadReport')
    btn.disabled = true
    btn.textContent = 'Generating report...'

    await new Promise(r => setTimeout(r, 50)) // let UI update

    try {
        const { jsPDF } = window.jspdf
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

        // ── Preload workout icon ───────────────────────────────────────────────
        const workoutIcon = await new Promise(resolve => {
            const img = new Image()
            img.onload = () => {
                const cv = document.createElement('canvas')
                cv.width = img.width; cv.height = img.height
                cv.getContext('2d').drawImage(img, 0, 0)
                resolve(cv.toDataURL('image/png'))
            }
            img.onerror = () => resolve(null)
            img.src = 'photos/workout.png'
        })

        // ── Palette ───────────────────────────────────────────────────────────
        const C = {
            bg:     [15,  16,  32],
            card:   [27,  28,  59],
            card2:  [37,  39,  96],
            pink:   [255, 139, 214],
            blue:   [138, 162, 255],
            cyan:   [107, 225, 255],
            green:  [110, 243, 197],
            orange: [255, 152, 0],
            red:    [255, 107, 107],
            white:  [255, 255, 255],
            muted:  [150, 150, 185],
            altRow: [22,  23,  50],
        }

        const PW = 210, PH = 297, M = 14

        // ── Drawing helpers ───────────────────────────────────────────────────
        function pageBg() {
            doc.setFillColor(...C.bg)
            doc.rect(0, 0, PW, PH, 'F')
        }

        function card(x, y, w, h, color) {
            color = color || C.card
            doc.setFillColor(...color)
            doc.roundedRect(x, y, w, h, 3, 3, 'F')
        }

        function txt(str, x, y, size, color, align, bold) {
            align = align || 'left'
            doc.setFontSize(size)
            doc.setTextColor(...color)
            doc.setFont('helvetica', bold ? 'bold' : 'normal')
            doc.text(String(str), x, y, { align: align })
        }

        function pageFooter(n) {
            txt('GymSense Smart Report  •  Page ' + n, PW / 2, PH - 8, 7, C.muted, 'center')
        }

        function divider(y, color) {
            doc.setFillColor(...(color || C.blue))
            doc.rect(M, y, PW - M * 2, 0.5, 'F')
        }

        // ── Collect DOM history data ──────────────────────────────────────────
        const historyData = []
        document.querySelectorAll('#historyTableBody tr').forEach(row => {
            if (row.classList.contains('empty-state')) return
            const cells = row.querySelectorAll('td')
            if (cells.length >= 5) {
                historyData.push({
                    time:     cells[0].innerText,
                    exercise: cells[1].innerText,
                    reps:     parseInt(cells[2].innerText) || 0,
                    set:      cells[3].innerText,
                    status:   cells[4].innerText
                })
            }
        })

        const totalRepsRaw  = parseInt(document.getElementById('repsStat').innerText)     || 0
        const totalCalsRaw  = parseInt(document.getElementById('caloriesStat').innerText)  || 0
        const totalSessions = parseInt(document.getElementById('streakStat').innerText)    || 0
        const exercises     = [...new Set(historyData.map(d => d.exercise))]

        // ── Per-exercise stats ────────────────────────────────────────────────
        const exStats = {}
        exercises.forEach(ex => {
            const recs  = historyData.filter(d => d.exercise === ex)
            const rList = recs.map(r => r.reps).filter(r => r > 0)
            exStats[ex] = {
                sessions: recs.length,
                total:    rList.reduce((a, b) => a + b, 0),
                best:     rList.length ? Math.max(...rList) : 0,
                avg:      rList.length ? Math.round(rList.reduce((a, b) => a + b, 0) / rList.length) : 0,
                latest:   rList[0] || 0,              // table is newest-first
                first:    rList[rList.length - 1] || 0
            }
        })

        // ── Weekly reps ───────────────────────────────────────────────────────
        const now = new Date()
        const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        let weeklyReps = 0
        historyData.forEach(d => {
            const m = d.time.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/)
            if (!m) return
            const dt = new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5])
            if (dt >= cutoff && dt <= now) weeklyReps += d.reps
        })

        // ── Improvement % per exercise ────────────────────────────────────────
        const improvements = {}
        exercises.forEach(ex => {
            const s = exStats[ex]
            if (s.first > 0 && s.sessions >= 2) {
                improvements[ex] = Math.round(((s.latest - s.first) / s.first) * 100)
            }
        })

        // ── Muscle analysis ───────────────────────────────────────────────────
        const muscleIntensity = calculateMuscleIntensity(historyData)
        const MNAMES = {
            chest: 'Chest', lats: 'Lats', traps: 'Traps', biceps: 'Biceps',
            triceps: 'Triceps', frontDeltoids: 'Deltoids', forearms: 'Forearms',
            core: 'Core', erectors: 'Erectors', quadriceps: 'Quads',
            hamstrings: 'Hamstrings', adductors: 'Adductors', glutes: 'Glutes', calves: 'Calves'
        }
        const mEntries = Object.entries(muscleIntensity).filter(([k]) => MNAMES[k])
        const sorted   = [...mEntries].sort((a, b) => b[1] - a[1])
        const mostTrainedName  = sorted[0]  ? MNAMES[sorted[0][0]]  : 'N/A'
        const leastTrainedName = sorted.filter(([, v]) => v > 0).slice(-1)[0]
            ? MNAMES[sorted.filter(([, v]) => v > 0).slice(-1)[0][0]] : 'N/A'

        const avgPerSession = totalSessions > 0 ? Math.round(totalRepsRaw / totalSessions) : 0

        // ── Auto-generate insights ────────────────────────────────────────────
        const insights = []

        // Balance: legs vs upper body
        const legReps   = exStats['Squat']?.total || 0
        const upperReps = (exStats['Push-up']?.total || 0) + (exStats['Arm Curl']?.total || 0)
        if (legReps > 0 && upperReps > 0) {
            const ratio = legReps / upperReps
            if (ratio > 2)       insights.push({ icon: '!', text: 'Leg training volume is much higher than upper body. Add more push-ups or curls for balance.', color: C.orange })
            else if (ratio < 0.5) insights.push({ icon: '!', text: 'Upper body dominates your workouts. Include more squats to balance lower body strength.', color: C.orange })
            else                  insights.push({ icon: 'OK', text: 'Upper and lower body training is well-balanced. Keep it up!', color: C.green })
        }

        // Per-exercise progress
        exercises.forEach(ex => {
            const imp = improvements[ex]
            if (imp === undefined) return
            if (imp >= 10)        insights.push({ icon: 'UP', text: ex + ': Improving - up ' + imp + '% from your first session. Excellent progress!', color: C.green })
            else if (imp > 0)     insights.push({ icon: 'UP', text: ex + ': Slight improvement (+' + imp + '%). Stay consistent to keep growing.', color: C.cyan })
            else if (imp < -10)   insights.push({ icon: 'DN', text: ex + ': Performance dipped ' + Math.abs(imp) + '% vs first session. Consider rest or a form check.', color: C.red })
            else                  insights.push({ icon: '=',  text: ex + ': Performance is stable. Try increasing reps to break through the plateau.', color: C.muted })
        })

        // Back muscles
        const backScore = ((muscleIntensity.lats || 0) + (muscleIntensity.traps || 0) + (muscleIntensity.erectors || 0)) / 3
        if (backScore < 0.3) insights.push({ icon: '!', text: 'Back muscles (Lats, Traps, Erectors) are undertrained. Add pulling or rowing movements.', color: C.orange })

        // Consistency
        if (totalSessions >= 10)     insights.push({ icon: 'PR', text: totalSessions + ' sessions completed - outstanding consistency!', color: C.pink })
        else if (totalSessions >= 5)  insights.push({ icon: 'PR', text: totalSessions + ' sessions logged. You\'re building a solid habit.', color: C.cyan })
        else if (totalSessions > 0)   insights.push({ icon: '~',  text: 'Early stage - consistency is everything. Show up 3x per week.', color: C.muted })

        // ── Auto-generate recommendations ────────────────────────────────────
        const recs = []

        exercises.forEach(ex => {
            const s = exStats[ex]
            const next = Math.round(s.best * 1.1)
            recs.push({ dot: C.blue, text: ex + ': Target ' + next + ' reps next session (10% above your best of ' + s.best + ')' })
        })

        if (!exStats['Squat'])                   recs.push({ dot: C.orange, text: 'Add Squats to your plan — legs are currently undertrained' })
        if (!exStats['Push-up'] && !exStats['Arm Curl']) recs.push({ dot: C.orange, text: 'Add upper body exercises (Push-up or Arm Curl) to your plan' })
        if (backScore < 0.25)                    recs.push({ dot: C.orange, text: 'Train back muscles 2× per week to fix the imbalance' })
        if (totalSessions > 0) {
            recs.push({ dot: C.muted, text: 'Aim for 3–4 workout sessions per week for optimal adaptation' })
            recs.push({ dot: C.muted, text: 'Rest 48 hours between sessions that target the same muscle group' })
        }

        const reportDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

        // ════════════════════════════════════════════════════════════════════
        // PAGE 1 — COVER
        // ════════════════════════════════════════════════════════════════════
        pageBg()

        // Top accent strip
        doc.setFillColor(...C.pink);  doc.rect(0, 0, PW, 2.5, 'F')
        doc.setFillColor(...C.blue);  doc.rect(0, 2.5, PW, 1.2, 'F')

        // Hero card
        card(M, 40, PW - M * 2, 75, C.card)
        txt('GymSense', PW / 2, 70, 36, C.pink, 'center', true)
        divider(73, C.blue)
        txt('Smart Fitness Report', PW / 2, 82, 13, C.white, 'center', false)
        txt(reportDate, PW / 2, 91, 9,  C.muted, 'center', false)
        txt(totalSessions + ' Sessions Analyzed', PW / 2, 101, 9, C.cyan, 'center', true)

        // 3 summary stat boxes
        const bW = (PW - M * 2 - 14) / 3
        const bY = 130
        ;[
            [totalRepsRaw, 'Total Reps', C.pink],
            [totalCalsRaw + ' kcal', 'Est. Calories', C.cyan],
            [totalSessions, 'Sessions', C.blue],
        ].forEach(([val, label, col], i) => {
            const bx = M + i * (bW + 7)
            card(bx, bY, bW, 36, C.card2)
            txt(String(val), bx + bW / 2, bY + 15, 17, col, 'center', true)
            txt(label,       bx + bW / 2, bY + 25, 7.5, C.muted, 'center', false)
        })

        txt('Your data. Your progress. Your next move.', PW / 2, 195, 10, C.muted, 'center', false)
        txt('Generated ' + new Date().toLocaleString(), PW / 2, PH - 10, 7, C.muted, 'center', false)

        // ════════════════════════════════════════════════════════════════════
        // PAGE 2 — PERFORMANCE SUMMARY
        // ════════════════════════════════════════════════════════════════════
        doc.addPage(); pageBg()
        doc.setFillColor(...C.pink); doc.rect(0, 0, PW, 2.5, 'F')

        txt('Performance Summary', M, 16, 17, C.white, 'left', true)
        divider(18, C.pink)
        txt('Key metrics from all your recorded workouts', M, 24, 8.5, C.muted, 'left', false)

        // 2×2 metric grid
        let y = 30
        const mW = (PW - M * 2 - 8) / 2
        ;[
            { val: weeklyReps, label: 'Weekly Reps',      sub: 'Last 7 days',    col: C.pink },
            { val: avgPerSession, label: 'Avg Reps / Session', sub: 'Per workout', col: C.blue },
            { val: mostTrainedName, label: 'Most Trained',  sub: 'Muscle group',   col: C.green },
            { val: leastTrainedName, label: 'Needs Work',   sub: 'Least activated', col: C.orange },
        ].forEach((m, i) => {
            const mx = M + (i % 2) * (mW + 8)
            const my = y + Math.floor(i / 2) * 33
            card(mx, my, mW, 28, C.card)
            txt(String(m.val), mx + 7, my + 12, 15, m.col, 'left', true)
            txt(m.label,       mx + 7, my + 20, 7.5, C.white, 'left', false)
            txt(m.sub,         mx + mW - 5, my + 20, 6.5, C.muted, 'right', false)
        })

        y += 72

        // Personal Records
        txt('Personal Records', M, y, 12, C.white, 'left', true)
        doc.setFillColor(...C.blue); doc.rect(M, y + 2, 35, 0.5, 'F')
        y += 10

        if (exercises.length === 0) {
            card(M, y, PW - M * 2, 20, C.card)
            txt('No records yet — complete your first workout!', PW / 2, y + 13, 9.5, C.muted, 'center', false)
            y += 25
        } else {
            exercises.forEach(ex => {
                const s   = exStats[ex]
                const imp = improvements[ex]
                card(M, y, PW - M * 2, 26, C.card)

                // Icon badge
                doc.setFillColor(...C.card2)
                doc.roundedRect(M + 4, y + 4, 18, 18, 2, 2, 'F')
                if (workoutIcon) {
                    doc.addImage(workoutIcon, 'PNG', M + 5, y + 5, 16, 16)
                } else {
                    txt('★', M + 13, y + 16, 11, C.pink, 'center', true)
                }

                txt(ex,            M + 28, y + 11, 10.5, C.white, 'left', true)
                txt('Best: ' + s.best + ' reps  •  Avg: ' + s.avg + ' reps  •  Sessions: ' + s.sessions,
                    M + 28, y + 19, 7.5, C.muted, 'left', false)

                if (imp !== undefined) {
                    const impCol  = imp >= 0 ? C.green : C.red
                    const impSign = imp >= 0 ? '+' : ''
                    txt(impSign + imp + '%', PW - M - 5, y + 12, 13, impCol, 'right', true)
                    txt('vs first session', PW - M - 5, y + 20, 6.5, C.muted, 'right', false)
                }

                y += 30
            })
        }

        pageFooter(2)

        // ════════════════════════════════════════════════════════════════════
        // PAGE 3 — INSIGHTS & RECOMMENDATIONS
        // ════════════════════════════════════════════════════════════════════
        doc.addPage(); pageBg()
        doc.setFillColor(...C.cyan); doc.rect(0, 0, PW, 2.5, 'F')

        txt('Insights & Recommendations', M, 16, 17, C.white, 'left', true)
        divider(18, C.cyan)
        txt('Auto-generated analysis of your workout data', M, 24, 8.5, C.muted, 'left', false)

        y = 30

        // ── Insights ─────────────────────────────────────────────────────────
        txt('What the data says', M, y, 11, C.cyan, 'left', true)
        y += 7

        const showInsights = insights.slice(0, 6)
        if (showInsights.length === 0) {
            card(M, y, PW - M * 2, 20, C.card)
            txt('Complete more workouts to generate insights.', PW / 2, y + 13, 9, C.muted, 'center', false)
            y += 25
        } else {
            showInsights.forEach(ins => {
                doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5)
                const lines  = doc.splitTextToSize(ins.text, PW - M * 2 - 26)
                const cardH  = Math.max(20, lines.length * 5.5 + 12)
                card(M, y, PW - M * 2, cardH, C.card)

                // Coloured icon badge
                doc.setFillColor(...ins.color)
                doc.roundedRect(M + 3, y + (cardH / 2 - 5.5), 13, 11, 1.5, 1.5, 'F')
                txt(ins.icon, M + 9.5, y + (cardH / 2 + 3), 7.5, C.bg, 'center', true)

                doc.setFontSize(8.5); doc.setTextColor(...C.white); doc.setFont('helvetica', 'normal')
                lines.forEach((line, li) => doc.text(line, M + 20, y + 9 + li * 5.5))

                y += cardH + 3
            })
        }

        y += 5

        // ── Recommendations ───────────────────────────────────────────────────
        txt('What to do next', M, y, 11, C.pink, 'left', true)
        y += 7

        const showRecs = recs.slice(0, 6)
        if (showRecs.length === 0) {
            card(M, y, PW - M * 2, 20, C.card)
            txt('Complete more workouts to get recommendations.', PW / 2, y + 13, 9, C.muted, 'center', false)
            y += 25
        } else {
            showRecs.forEach((rec, idx) => {
                doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5)
                const lines = doc.splitTextToSize((idx + 1) + '.  ' + rec.text, PW - M * 2 - 18)
                const cardH = Math.max(18, lines.length * 5.5 + 10)
                card(M, y, PW - M * 2, cardH, C.card)

                doc.setFillColor(...rec.dot)
                doc.circle(M + 8, y + cardH / 2, 2.5, 'F')

                doc.setFontSize(8.5); doc.setTextColor(...C.white); doc.setFont('helvetica', 'normal')
                lines.forEach((line, li) => doc.text(line, M + 16, y + 7.5 + li * 5.5))

                y += cardH + 3
            })
        }

        pageFooter(3)

        // ════════════════════════════════════════════════════════════════════
        // PAGE 4 — MUSCLE DISTRIBUTION
        // ════════════════════════════════════════════════════════════════════
        doc.addPage(); pageBg()
        doc.setFillColor(...C.green); doc.rect(0, 0, PW, 2.5, 'F')

        txt('Muscle Distribution', M, 16, 17, C.white, 'left', true)
        divider(18, C.green)
        txt('Muscle groups activated based on your full workout history', M, 24, 8.5, C.muted, 'left', false)

        const bodyImg   = drawMuscleBodyDiagram(muscleIntensity)
        const barImg    = drawMuscleBarChart(muscleIntensity)
        const bodyW     = PW - M * 2
        const bodyH     = bodyW * 610 / 800

        doc.addImage(bodyImg, 'PNG', M, 28, bodyW, bodyH)
        txt('Activation by Muscle Group', M, 28 + bodyH + 7, 10, C.white, 'left', true)
        doc.addImage(barImg,  'PNG', M, 28 + bodyH + 11, bodyW, bodyW * 200 / 780)

        pageFooter(4)

        // ════════════════════════════════════════════════════════════════════
        // PAGE 5+ — EXERCISE SUMMARIES (one page per exercise)
        // ════════════════════════════════════════════════════════════════════
        exercises.forEach((exName, exIdx) => {
            doc.addPage(); pageBg()
            doc.setFillColor(...C.blue); doc.rect(0, 0, PW, 2.5, 'F')

            const s = exStats[exName]
            const imp = improvements[exName]

            txt(exName, M, 16, 17, C.white, 'left', true)
            divider(18, C.blue)
            txt('Exercise summary and recent session history', M, 24, 8.5, C.muted, 'left', false)

            // 4-stat row
            y = 30
            const sW = (PW - M * 2 - 15) / 4
            const impVal = imp !== undefined ? (imp >= 0 ? '+' : '') + imp + '%' : 'N/A'
            const impCol = (imp !== undefined && imp >= 0) ? C.green : C.red
            ;[
                { val: s.sessions, label: 'Sessions',     col: C.blue },
                { val: s.best,     label: 'Personal Best', col: C.pink },
                { val: s.avg,      label: 'Avg Reps',     col: C.cyan },
                { val: impVal,     label: 'Progress',     col: impCol },
            ].forEach((box, i) => {
                const bx = M + i * (sW + 5)
                card(bx, y, sW, 30, C.card)
                txt(String(box.val), bx + sW / 2, y + 13, 13, box.col, 'center', true)
                txt(box.label,       bx + sW / 2, y + 22, 7,  C.muted, 'center', false)
            })

            y += 38

            // Progress note
            if (imp !== undefined) {
                const noteColor = imp >= 10 ? C.green : imp < 0 ? C.red : C.cyan
                const noteText  = imp >= 10  ? 'Great progress! Reps are trending up.'
                               : imp < -10   ? 'Performance dipped. Consider rest or form review.'
                               : imp < 0     ? 'Slight dip. Stay consistent — it will turn around.'
                               : imp >= 1    ? 'Steady improvement. Keep pushing!'
                                             : 'Plateau detected. Try increasing target reps.'
                card(M, y, PW - M * 2, 16, C.card2)
                txt('>> ' + noteText, M + 6, y + 10.5, 8, noteColor, 'left', false)
                y += 21
            }

            // Session history table
            txt('Recent Sessions', M, y, 10.5, C.white, 'left', true)
            y += 5

            const tableRows = historyData
                .filter(d => d.exercise === exName)
                .slice(0, 12)
                .map(d => [d.time, String(d.reps), d.set, d.status])

            doc.autoTable({
                startY: y,
                head: [['Date / Time', 'Reps', 'Set', 'Status']],
                body: tableRows.length ? tableRows : [['—', '—', '—', 'No records yet']],
                theme: 'plain',
                headStyles: {
                    fillColor: C.card2,
                    textColor: C.muted,
                    fontSize: 7.5,
                    fontStyle: 'bold',
                    cellPadding: { top: 4, right: 5, bottom: 4, left: 5 },
                },
                bodyStyles: {
                    fillColor: C.card,
                    textColor: C.white,
                    fontSize: 8.5,
                    cellPadding: { top: 4.5, right: 5, bottom: 4.5, left: 5 },
                },
                alternateRowStyles: { fillColor: C.altRow },
                columnStyles: {
                    1: { halign: 'center' },
                    2: { halign: 'center' },
                    3: { fontStyle: 'bold', textColor: C.green },
                },
                margin: { left: M, right: M },
                tableWidth: PW - M * 2,
            })

            pageFooter(exIdx + 5)
        })

        doc.save('GymSense_Report_' + new Date().toISOString().slice(0, 10) + '.pdf')
    } finally {
        btn.disabled = false
        btn.textContent = 'Download Progress Report (PDF)'
    }
})

loadWorkoutHistory()
setInterval(loadWorkoutHistory, 3000)