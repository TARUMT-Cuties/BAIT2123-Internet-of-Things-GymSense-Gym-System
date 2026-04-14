// ────────────────────────────────────────────────────────────────────────────
// firebase.js
// Initializes Firebase Admin SDK for Realtime Database
// ────────────────────────────────────────────────────────────────────────────

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// This uses the GOOGLE_APPLICATION_CREDENTIALS environment variable
// which should point to your Firebase service account JSON file
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

// Get reference to the Realtime Database
const database = admin.database();

// ────────────────────────────────────────────────────────────────────────────
// Function to save a single workout entry to Firebase
// ────────────────────────────────────────────────────────────────────────────
async function saveWorkoutToFirebase(workoutData) {
  try {
    // Create a new entry in the 'workouts' node with an auto-generated ID
    const newWorkoutRef = database.ref('workouts').push();
    
    // Add timestamp if not already present
    const dataToSave = {
      ...workoutData,
      timestamp: workoutData.timestamp || new Date().getTime()
    };
    
    // Write the data to Firebase
    await newWorkoutRef.set(dataToSave);
    
    console.log('✓ Workout saved to Firebase:', dataToSave);
    return true;
  } catch (error) {
    console.error('✗ Error saving workout to Firebase:', error);
    return false;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Function to fetch all workout entries from Firebase
// ────────────────────────────────────────────────────────────────────────────
async function fetchAllWorkoutsFromFirebase() {
  try {
    const snapshot = await database.ref('workouts').once('value');
    
    if (!snapshot.exists()) {
      console.log('No workouts found in Firebase');
      return [];
    }
    
    // Convert Firebase object to array format
    const workoutsObj = snapshot.val();
    const workoutsArray = Object.values(workoutsObj);
    
    console.log('✓ Fetched workouts from Firebase:', workoutsArray.length, 'records');
    return workoutsArray;
  } catch (error) {
    console.error('✗ Error fetching workouts from Firebase:', error);
    return [];
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Function to clear all workouts from Firebase (use for testing/reset)
// ────────────────────────────────────────────────────────────────────────────
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

// Export functions so they can be used in server.js
module.exports = {
  saveWorkoutToFirebase,
  fetchAllWorkoutsFromFirebase,
  clearAllWorkoutsFromFirebase,
  database
};
