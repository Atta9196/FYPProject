import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as api from '../services/api/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
	const [user, setUser] = useState(null);
	const [token, setToken] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const stored = localStorage.getItem('auth');
		if (stored) {
			try {
				const parsed = JSON.parse(stored);
				setUser(parsed.user || null);
				setToken(parsed.token || null);
			} catch {}
		}
		setLoading(false);
	}, []);

	const persist = useCallback((data) => {
		setUser(data.user);
		setToken(data.token);
		localStorage.setItem('auth', JSON.stringify(data));
	}, []);

	const register = useCallback(async (payload) => {
		const data = await api.register(payload);
		persist(data);
		return data;
	}, [persist]);

	const login = useCallback(async (payload) => {
		const data = await api.login(payload);
		persist(data);
		return data;
	}, [persist]);

	const loginWithGoogle = useCallback(async (idToken) => {
		const data = await api.googleSignIn({ idToken });
		persist(data);
		return data;
	}, [persist]);

	const logout = useCallback(() => {
		setUser(null);
		setToken(null);
		localStorage.removeItem('auth');
	}, []);

	const forgotPassword = useCallback(async (email) => {
		return api.forgotPassword({ email });
	}, []);

	const value = useMemo(
		() => ({ user, token, loading, register, login, loginWithGoogle, logout, forgotPassword }),
		[user, token, loading, register, login, loginWithGoogle, logout, forgotPassword]
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error('useAuth must be used within AuthProvider');
	return ctx;
}


