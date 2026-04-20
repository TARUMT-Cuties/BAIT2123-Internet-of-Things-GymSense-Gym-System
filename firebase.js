const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // change filename if yours is different

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://gymsensor-ce1ec-default-rtdb.asia-southeast1.firebasedatabase.app'
});

const database = admin.database();

async function saveWorkoutToFirebase(workoutData) {
  try {
    const newWorkoutRef = database.ref('workouts').push();

    const dataToSave = {
      ...workoutData,
      timestamp: workoutData.timestamp || new Date().getTime()
    };

    await newWorkoutRef.set(dataToSave);

    console.log('✓ Workout saved to Firebase:', dataToSave);
    return true;
  } catch (error) {
    console.error('✗ Error saving workout to Firebase:', error);
    return false;
  }
}

async function fetchAllWorkoutsFromFirebase() {
  try {
    const snapshot = await database.ref('workouts').once('value');

    if (!snapshot.exists()) {
      console.log('No workouts found in Firebase');
      return [];
    }

    const workoutsObj = snapshot.val();
    const workoutsArray = Object.values(workoutsObj);

    console.log('✓ Fetched workouts from Firebase:', workoutsArray.length, 'records');
    return workoutsArray;
  } catch (error) {
    console.error('✗ Error fetching workouts from Firebase:', error);
    return [];
  }
}

async function clearAllWorkoutsFromFirebase() {
  try {
    await database.ref('workouts').remove();
    console.log('✓ All workouts cleared from Firebase');
    return true;
  } catch (error) {
    console.error('✗ Error clearing workouts from Firebase:', error);
    return false;
  }
}

module.exports = {
  saveWorkoutToFirebase,
  fetchAllWorkoutsFromFirebase,
  clearAllWorkoutsFromFirebase,
  database
};