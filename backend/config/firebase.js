const { applicationDefault, getApps, initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const firebaseOptions = {
  credential: applicationDefault()
};

if (process.env.FIREBASE_PROJECT_ID) {
  firebaseOptions.projectId = process.env.FIREBASE_PROJECT_ID;
}

const firebaseApp = getApps()[0] || initializeApp(firebaseOptions);
const db = getFirestore(firebaseApp);

module.exports = { db };