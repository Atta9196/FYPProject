const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

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
    const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Could not send reset email');
    }
    return res.json();
}


