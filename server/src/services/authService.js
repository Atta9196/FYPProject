const { admin, getDb, initializeFirebaseAdmin } = require('../config/firebase');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

initializeFirebaseAdmin();
const auth = admin.auth();
const db = getDb();

function getMailTransporter() {
	const host = process.env.SMTP_HOST;
	const user = process.env.SMTP_USER;
	const pass = process.env.SMTP_PASS;
	if (!host || !user || !pass) return null;
	const port = parseInt(process.env.SMTP_PORT || '587', 10);
	const secure = process.env.SMTP_SECURE === 'true';
	return nodemailer.createTransport({
		host,
		port,
		secure,
		auth: { user, pass },
	});
}

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
	const trimmed = (email || '').trim().toLowerCase();
	if (!trimmed) throw new Error('Email is required');

	let userRecord;
	try {
		userRecord = await auth.getUserByEmail(trimmed);
	} catch (e) {
		if (e.code === 'auth/user-not-found') {
			const err = new Error('No account found with this email.');
			err.status = 404;
			throw err;
		}
		throw e;
	}

	const transporter = getMailTransporter();
	if (!transporter) {
		return { success: true, useClientFallback: true, message: 'Use client to send reset email.' };
	}

	const link = await auth.generatePasswordResetLink(trimmed);
	const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@example.com';
	const appName = process.env.APP_NAME || 'IELTS Coach';
	await transporter.sendMail({
		from: typeof from === 'string' && from.includes('<') ? from : `${appName} <${from}>`,
		to: trimmed,
		subject: `Reset your password - ${appName}`,
		text: `You requested a password reset. Click the link below to set a new password (valid for 1 hour):\n\n${link}\n\nIf you didn't request this, you can ignore this email.`,
		html: `
			<p>You requested a password reset for your account.</p>
			<p><a href="${link}" style="display:inline-block; padding:10px 20px; background:#7c3aed; color:#fff; text-decoration:none; border-radius:6px;">Reset password</a></p>
			<p>Or copy this link into your browser:</p>
			<p style="word-break:break-all;">${link}</p>
			<p style="color:#666; font-size:12px;">This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
		`,
	});
	return { success: true, message: 'Password reset email sent. Check your inbox and spam folder.' };
}

async function changePassword({ email, currentPassword, newPassword }) {
	const trimmed = (email || '').trim().toLowerCase();
	if (!trimmed || !currentPassword || !newPassword) {
		const err = new Error('Email, current password, and new password are required.');
		err.status = 400;
		throw err;
	}
	if (newPassword.length < 6) {
		const err = new Error('New password must be at least 6 characters.');
		err.status = 400;
		throw err;
	}

	const apiKey = process.env.FIREBASE_WEB_API_KEY;
	if (!apiKey) {
		const err = new Error('Server configuration error.');
		err.status = 500;
		throw err;
	}

	const signInRes = await fetch(
		`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				email: trimmed,
				password: currentPassword,
				returnSecureToken: true,
			}),
		}
	);

	if (!signInRes.ok) {
		const errorData = await signInRes.json().catch(() => ({}));
		const message = errorData?.error?.message || 'Invalid credentials';
		if (message.includes('INVALID_LOGIN_CREDENTIALS') || message.includes('EMAIL_NOT_FOUND') || message.includes('INVALID_PASSWORD')) {
			const err = new Error('Current password is incorrect.');
			err.status = 401;
			throw err;
		}
		const err = new Error(message);
		err.status = 401;
		throw err;
	}

	const signInData = await signInRes.json();
	const uid = signInData.localId;
	await auth.updateUser(uid, { password: newPassword });
	return { success: true, message: 'Password updated successfully.' };
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
	changePassword,
};


