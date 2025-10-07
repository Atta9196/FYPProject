const { registerUser, loginUser, verifyGoogleIdToken, sendPasswordReset } = require('../services/authService');
const jwt = require('jsonwebtoken');

async function handleRegister(req, res) {
	try {
		const { firstName, lastName, email, password } = req.body;
		if (!firstName || !lastName || !email || !password) {
			return res.status(400).json({ message: 'Missing required fields' });
		}
		const result = await registerUser({ firstName, lastName, email, password });
		return res.status(201).json(result);
	} catch (err) {
		// Normalize duplicate email error from Firebase Admin
		if (err && (err.code === 'auth/email-already-exists' || /already exists/i.test(err.message || ''))) {
			return res.status(409).json({ message: 'Email already registered. Please sign in.' });
		}
		const status = err.status || 500;
		return res.status(status).json({ message: err.message || 'Registration failed' });
	}
}

async function handleLogin(req, res) {
	try {
		const { email, password } = req.body;
		if (!email || !password) {
			return res.status(400).json({ message: 'Email and password are required' });
		}
		const result = await loginUser({ email, password });
		return res.status(200).json(result);
	} catch (err) {
		const status = err.status || 401;
		return res.status(status).json({ message: err.message || 'Login failed' });
	}
}

async function handleGoogle(req, res) {
	try {
		const { idToken } = req.body;
		if (!idToken) {
			return res.status(400).json({ message: 'idToken is required' });
		}
        // Basic debug to help identify token and environment issues
        console.log('[GoogleAuth] Received idToken length:', typeof idToken === 'string' ? idToken.length : 'n/a');
        console.log('[GoogleAuth] Firebase project (server):', process.env.FIREBASE_PROJECT_ID || '<missing>');
        try {
            const decoded = jwt.decode(idToken, { complete: true });
            const payload = decoded && decoded.payload ? decoded.payload : {};
            console.log('[GoogleAuth] Token iss:', payload.iss || '<none>');
            console.log('[GoogleAuth] Token aud:', payload.aud || '<none>');
            console.log('[GoogleAuth] Token sub(uid):', payload.sub || '<none>');
        } catch (e) {
            console.log('[GoogleAuth] Failed to decode token before verify');
        }
		const result = await verifyGoogleIdToken({ idToken });
		return res.status(200).json(result);
	} catch (err) {
        const status = err.status || 401;
        console.error('[GoogleAuth] Verification failed:', err && err.message ? err.message : err);
        return res.status(status).json({ message: err.message || 'Google auth failed' });
	}
}

async function handleForgotPassword(req, res) {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required' });
        const result = await sendPasswordReset({ email });
        return res.status(200).json(result);
    } catch (err) {
        const status = err.status || 400;
        return res.status(status).json({ message: err.message || 'Could not send reset link' });
    }
}

module.exports = {
	handleRegister,
	handleLogin,
    handleGoogle,
    handleForgotPassword,
};


