import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase/config';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://ielts-coach-backend.onrender.com';

export async function register({ firstName, lastName, email, password }) {
	const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ firstName, lastName, email, password }),
	});
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error(data.message || 'Registration failed');
	}
	return res.json();
}

export async function login({ email, password }) {
	const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email, password }),
	});
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error(data.message || 'Login failed');
	}
	return res.json();
}

export async function googleSignIn({ idToken }) {
	const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ idToken }),
	});
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error(data.message || 'Google sign-in failed');
	}
	return res.json();
}

export async function forgotPassword({ email }) {
	const trimmed = (email || '').trim();
	if (!trimmed) throw new Error('Email is required');

	let res;
	let data = {};
	try {
		res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email: trimmed }),
		});
		data = await res.json().catch(() => ({}));
	} catch (e) {
		res = { ok: false, status: 0 };
	}

	if (!res.ok) {
		if (res.status === 404) {
			throw new Error(data.message || 'No account found with this email.');
		}
		if (res.status === 503 || res.status === 0) {
			try {
				await sendPasswordResetEmail(auth, trimmed);
				return { success: true, message: 'Password reset email sent. Check your inbox and spam folder.' };
			} catch (firebaseErr) {
				const code = firebaseErr?.code || '';
				if (code === 'auth/user-not-found') throw new Error('No account found with this email.');
				if (code === 'auth/invalid-email') throw new Error('Invalid email address.');
				if (code === 'auth/too-many-requests') throw new Error('Too many attempts. Try again later.');
				throw new Error(firebaseErr?.message || 'Could not send reset email');
			}
		}
		throw new Error(data.message || 'Could not send reset email');
	}

	if (data.useClientFallback) {
		try {
			await sendPasswordResetEmail(auth, trimmed);
			return { success: true, message: 'Password reset email sent. Check your inbox and spam folder.' };
		} catch (firebaseErr) {
			const code = firebaseErr?.code || '';
			if (code === 'auth/user-not-found') throw new Error('No account found with this email.');
			if (code === 'auth/invalid-email') throw new Error('Invalid email address.');
			if (code === 'auth/too-many-requests') throw new Error('Too many attempts. Try again later.');
			throw new Error(firebaseErr?.message || 'Could not send reset email');
		}
	}

	return data;
}

export async function changePassword({ email, currentPassword, newPassword }) {
	const res = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email, currentPassword, newPassword }),
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data.message || 'Failed to change password.');
	}
	return data;
}


