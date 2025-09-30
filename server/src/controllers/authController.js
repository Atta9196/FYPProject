const { registerUser, loginUser, verifyGoogleIdToken, sendPasswordReset } = require('../services/authService');

async function handleRegister(req, res) {
	try {
		const { firstName, lastName, email, password } = req.body;
		if (!firstName || !lastName || !email || !password) {
			return res.status(400).json({ message: 'Missing required fields' });
		}
		const result = await registerUser({ firstName, lastName, email, password });
		return res.status(201).json(result);
	} catch (err) {
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
		const result = await verifyGoogleIdToken({ idToken });
		return res.status(200).json(result);
	} catch (err) {
		const status = err.status || 401;
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


