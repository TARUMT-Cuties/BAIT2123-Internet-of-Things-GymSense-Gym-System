// ── Exercise display name mapping ──────────────────────────────────────────
function getExerciseDisplayName(exerciseName) {
    const mapping = {
        'squat': 'Squat',
        'pushup': 'Push-up',
        'curl': 'Arm Curl'
    }
    return mapping[exerciseName] || exerciseName
}

document.addEventListener("DOMContentLoaded", () => {

    fetch(`${SERVER}/workout`)
        .then(res => res.json())
        .then(data => {
            const exerciseTotals = {}
            const weeklyData = [0,0,0,0,0,0,0]

            if (!data || data.length === 0) {
                console.log('No workout data from server yet')
            } else {
                const now = new Date()
                const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

                data.forEach(entry => {
                    // Only include final records (isFinal: true) - both Completed and Stopped
                    if (entry.isFinal !== true) return

                    const date = new Date(Number(entry.timestamp))
                    if (isNaN(date.getTime())) return // Invalid timestamp
                    
                    // Only include records from last 7 days
                    if (date < sevenDaysAgo || date > now) return

                    const day = date.getDay()
                    const name = entry.exercise || 'Unknown'
                    const reps = entry.reps || 0

                    weeklyData[day] += reps
                    // Map exercise name for display
                    const displayName = getExerciseDisplayName(name)
                    exerciseTotals[displayName] = (exerciseTotals[displayName] || 0) + reps
                })
            }

            new Chart(
                document.getElementById("weeklyChart"),
                {
                    type: "line",
                    data: {
                        labels: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],
                        datasets: [
                            {
                                data: weeklyData,
                                borderColor: "#ff8bd6",
                                backgroundColor: "rgba(255,139,214,0.2)",
                                tension: 0.4
                            }
                        ]
                    },
                    options: {
                        plugins: {
                            legend: { display: false }
                        }
                    }
                }
            )

            const exerciseLabels = Object.keys(exerciseTotals)
            const exerciseValues = Object.values(exerciseTotals)

            new Chart(
                document.getElementById("exerciseChart"),
                {
                    type: "doughnut",
                    data: {
                        labels: exerciseLabels.length > 0 ? exerciseLabels : ["No data"],
                        datasets: [
                            {
                                data: exerciseValues.length > 0 ? exerciseValues : [1],
                                backgroundColor: [
                                    "#ff8bd6",
                                    "#8aa2ff",
                                    "#6ef3c5"
                                ]
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: {
                                position: "bottom",
                                labels: {
                                    boxWidth: 10,
                                    boxHeight: 10,
                                    font: { size: 10 },
                                    padding: 8
                                }
                            }
                        }
                    }
                }
            )
        })
        .catch(err => {
            console.error('Failed to load chart data:', err)
        })

})