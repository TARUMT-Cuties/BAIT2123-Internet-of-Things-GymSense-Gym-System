const repsChart = new Chart(
document.getElementById('repsChart'),
{
type:'line',

data:{
labels:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],

datasets:[{
label:'Reps',

data:[20,35,40,28,50,65,45],

borderColor:'#ff8bd6',
backgroundColor:'rgba(255,139,214,0.2)',
tension:0.4
}]
},

options:{
plugins:{legend:{display:false}},
scales:{
y:{beginAtZero:true}
}
}
});


const calorieChart = new Chart(
document.getElementById('calorieChart'),
{
type:'bar',

data:{
labels:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],

datasets:[{
data:[100,120,90,140,180,160,130],
backgroundColor:'#8aa2ff'
}]
},

options:{
plugins:{legend:{display:false}},
scales:{
y:{beginAtZero:true}
}
}
});