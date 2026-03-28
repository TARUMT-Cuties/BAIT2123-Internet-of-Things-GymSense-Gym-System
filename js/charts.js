document.addEventListener("DOMContentLoaded", () => {

    fetch('http://localhost:3000/workout')
        .then(res => res.json())
        .then(data => {
            const exerciseTotals = {}
            const weeklyData = [0,0,0,0,0,0,0]

            if (!data || data.length === 0) {
                console.log('No workout data from server yet')
            } else {
                data.forEach(entry => {
                    const date = new Date(entry.time)
                    const day = date.getDay()
                    const name = entry.exercise || 'Unknown'
                    const reps = entry.reps || 0

                    weeklyData[day] += reps
                    exerciseTotals[name] = (exerciseTotals[name] || 0) + reps
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
                        plugins: {
                            legend: {
                                position: "bottom"
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