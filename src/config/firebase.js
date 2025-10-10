const admin = require('firebase-admin');
require('dotenv').config(); // Load environment variables

// Initialize Firebase Admin SDK using environment variables
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Handle newlines
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  })
});

console.log('✅ Firebase initialized with environment variables');
console.log('📊 Project ID:', process.env.FIREBASE_PROJECT_ID);

module.exports = admin;
