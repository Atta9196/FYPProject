const admin = require("firebase-admin");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

require("dotenv").config({ path: "./.env" });

let appInitialized = false;

function initializeFirebaseAdmin() {
  if (appInitialized) {
    return admin.app();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
  const privateKey = privateKeyRaw ? privateKeyRaw.replace(/\\n/g, "\n") : undefined;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin credentials are missing. Please check your .env file"
    );
  }

  if (!admin.apps || admin.apps.length === 0) {
    initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
    appInitialized = true;
  }

  return admin.app();
}

function getDb() {
  initializeFirebaseAdmin();
  return getFirestore();
}

module.exports = {
  admin,
  initializeFirebaseAdmin,
  getDb,
};
