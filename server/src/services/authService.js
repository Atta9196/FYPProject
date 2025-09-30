const { admin, getDb, initializeFirebaseAdmin } = require('../config/firebase');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

initializeFirebaseAdmin();
const auth = admin.auth();
const db = getDb();

async function createJwtForUser(userRecord) {
	const payload = {
		uid: userRecord.uid,
		email: userRecord.email,
	};
	const secret = process.env.JWT_SECRET;
	const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
	return jwt.sign(payload, secret, { expiresIn });
}

async function registerUser({ firstName, lastName, email, password }) {
	const userRecord = await auth.createUser({
		email,
		password,
		displayName: `${firstName} ${lastName}`.trim(),
		emailVerified: false,
		disabled: false,
	});

	await db.collection('users').doc(userRecord.uid).set({
		firstName,
		lastName,
		email,
		createdAt: admin.firestore.FieldValue.serverTimestamp(),
	});

	const token = await createJwtForUser(userRecord);
	return { user: sanitizeUser(userRecord, { firstName, lastName }), token };
}

async function loginUser({ email, password }) {
	// Firebase Admin SDK cannot verify passwords directly.
	// For server-side password verification with Firebase Auth, use Firebase Auth REST API.
	const apiKey = process.env.FIREBASE_WEB_API_KEY;
	if (!apiKey) {
		throw new Error('FIREBASE_WEB_API_KEY not configured');
	}
	const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password, returnSecureToken: true }),
		});
	if (!res.ok) {
		const error = await res.json().catch(() => ({}));
		const message = error?.error?.message || 'Authentication failed';
		const err = new Error(message);
		err.status = 401;
		throw err;
	}
	const data = await res.json();
	const userRecord = await auth.getUser(data.localId);
	const token = await createJwtForUser(userRecord);
	const profileSnap = await db.collection('users').doc(userRecord.uid).get();
	const profile = profileSnap.exists ? profileSnap.data() : {};
	return { user: sanitizeUser(userRecord, profile), token };
}

async function verifyGoogleIdToken({ idToken }) {
    // Expecting a Firebase Auth ID token from the client
    const ticket = await auth.verifyIdToken(idToken);
    const { uid, email, name } = ticket;
	let userRecord;
	try {
		userRecord = await auth.getUser(uid);
	} catch (e) {
		// Create user if not exists
		userRecord = await auth.createUser({ uid, email, displayName: name });
	}
	const [firstName, ...rest] = (name || '').split(' ');
	const lastName = rest.join(' ');
	await db.collection('users').doc(userRecord.uid).set(
		{
			firstName: firstName || '',
			lastName: lastName || '',
			email,
			updatedAt: admin.firestore.FieldValue.serverTimestamp(),
		},
		{ merge: true }
	);
	const token = await createJwtForUser(userRecord);
	const profileSnap = await db.collection('users').doc(userRecord.uid).get();
	const profile = profileSnap.exists ? profileSnap.data() : {};
	return { user: sanitizeUser(userRecord, profile), token };
}

async function sendPasswordReset({ email }) {
    // Generate a password reset link using Firebase Admin
    const link = await auth.generatePasswordResetLink(email);
    return { resetLink: link };
}

function sanitizeUser(userRecord, profile = {}) {
	return {
		uid: userRecord.uid,
		email: userRecord.email,
		displayName: userRecord.displayName,
		firstName: profile.firstName || undefined,
		lastName: profile.lastName || undefined,
	};
}

module.exports = {
	registerUser,
	loginUser,
    verifyGoogleIdToken,
    sendPasswordReset,
};


