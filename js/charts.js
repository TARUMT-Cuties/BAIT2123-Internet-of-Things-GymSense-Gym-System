document.addEventListener("DOMContentLoaded", () => {
    const workouts = JSON.parse(localStorage.getItem("workouts")) || []
    const weeklyData = [0,0,0,0,0,0,0]
    const exerciseTotals = {}

    workouts.forEach(workout => {

        const exercises = workout.exercises || {}

        Object.keys(exercises).forEach(name => {

            if (!exerciseTotals[name]) {
                exerciseTotals[name] = 0
            }

            exerciseTotals[name] += exercises[name]

        })

    })

    const weeklyChart = new Chart(
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
    const exerciseChart = new Chart(
        document.getElementById("exerciseChart"),
        {
            type: "doughnut",
            data: {
                labels: exerciseLabels,
                datasets: [
                    {
                        data: exerciseValues,
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