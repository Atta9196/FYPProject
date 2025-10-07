import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { loadGooglePlatformScript, renderGoogleButton, signInWithGoogleAndGetIdToken } from '../../services/firebase/googleAuth';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function LoginForm() {
    const { login, loginWithGoogle, forgotPassword } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

	function handleChange(e) {
		setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
	}

	async function handleSubmit(e) {
		e.preventDefault();
		setError('');
		setSubmitting(true);
		try {
			await login({ email: form.email.trim(), password: form.password });
			navigate('/dashboard');
		} catch (e) {
			setError(e.message || 'Login failed');
		} finally {
			setSubmitting(false);
		}
	}

	useEffect(() => {
		if (!GOOGLE_CLIENT_ID) return;
		loadGooglePlatformScript().then(() => {
			renderGoogleButton({
				containerId: 'google-btn',
				clientId: GOOGLE_CLIENT_ID,
				callback: async () => {
					try {
						const idToken = await signInWithGoogleAndGetIdToken();
						await loginWithGoogle(idToken);
						navigate('/dashboard');
					} catch (e) {
						setError(e.message || 'Google sign-in failed');
					}
				},
			});
		});
	}, []);

    function ForgotPasswordLink() {
        const [open, setOpen] = useState(false);
        const [email, setEmail] = useState('');
        const [sending, setSending] = useState(false);
        const [msg, setMsg] = useState('');
        async function submitReset(e) {
            e.preventDefault();
            setMsg('');
            setSending(true);
            try {
                const targetEmail = (email || form.email).trim();
                if (!targetEmail) throw new Error('Email is required');
                await forgotPassword(targetEmail);
                setMsg('Password reset email sent.');
            } catch (e) {
                setMsg(e.message || 'Could not send reset email');
            } finally {
                setSending(false);
            }
        }
        return (
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <button type="button" onClick={() => setOpen((v) => !v)} className="text-sm text-blue-600 hover:underline">
                        {open ? 'Hide reset form' : 'Forgot password?'}
                    </button>
                    {msg && <p className="text-xs text-gray-500">{msg}</p>}
                </div>
                {open && (
                    <form onSubmit={submitReset} className="grid grid-cols-1 gap-2 p-3 border rounded-lg bg-gray-50">
                        <label className="text-xs text-gray-600">Email for reset link</label>
                        <input
                            type="email"
                            placeholder="you@example.com"
                            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <button
                            type="submit"
                            disabled={sending}
                            className="justify-self-end px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-60"
                        >
                            {sending ? 'Sending…' : 'Send reset link'}
                </button>
                    </form>
                )}
            </div>
        );
    }

    return (
        <div className="max-w-md w-full bg-white/80 backdrop-blur-xl border border-white/60 shadow-[0_12px_40px_rgba(2,6,23,0.12)] rounded-3xl p-8 animate-fade-in">
            <div className="text-center mb-6">
                <h2 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Welcome back</h2>
                <p className="text-gray-500 text-sm">Sign in to continue your IELTS journey</p>
            </div>
            {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input type="email" name="email" placeholder="you@example.com" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={form.email} onChange={handleChange} required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            placeholder="••••••••"
                            className="w-full p-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={form.password}
                            onChange={handleChange}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                        >
                            {showPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M3.94 4.94a1.5 1.5 0 012.12 0l9 9a1.5 1.5 0 11-2.12 2.12l-1.7-1.7A8.8 8.8 0 0110 15.5C5.5 15.5 2.17 12.6 1 10c.44-.98 1.3-2.15 2.57-3.24l.37-.32z"/><path d="M13.94 11.82l-1.94-1.94a3 3 0 01-4.24-4.24l-1.3-1.3A8.86 8.86 0 0110 4.5c4.5 0 7.83 2.9 9 5.5-.38.84-1.08 1.87-2.06 2.82-.7.68-1.53 1.28-2.53 1.73l-.47-.73z"/></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 4.5c4.5 0 7.83 2.9 9 5.5-1.17 2.6-4.5 5.5-9 5.5S2.17 12.6 1 10c1.17-2.6 4.5-5.5 9-5.5zm0 2a3.5 3.5 0 100 7 3.5 3.5 0 000-7z"/></svg>
                            )}
                        </button>
                    </div>
                </div>
                <ForgotPasswordLink />
                <button type="submit" disabled={submitting} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition text-white py-3 rounded-xl font-medium disabled:opacity-60 shadow hover:shadow-lg">
                    {submitting ? 'Signing in...' : 'Sign in'}
                </button>
            </form>
            <div className="flex items-center my-6">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="px-3 text-gray-400 text-sm">or</span>
                <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="flex justify-center">
                <button
                    type="button"
                    onClick={() => {
                        // Use Firebase popup directly; no dependency on Google Identity script
                        signInWithGoogleAndGetIdToken()
                            .then(async (idToken) => {
                                await loginWithGoogle(idToken);
                                navigate('/dashboard');
                            })
                            .catch((e) => setError(e.message || 'Google sign-in failed'));
                    }}
                    className="flex items-center justify-center w-full px-4 py-3 border border-slate-200 rounded-xl hover:bg-white transition-colors shadow-sm"
                >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                </button>
            </div>
            <div id="google-btn" className="hidden" />
            <div className="mt-6 text-center text-xs text-gray-500">
                <p>If you signed up with Google, you can also set a password via "Forgot password" to log in with email next time.</p>
            </div>
            <div className="mt-4 text-center text-sm text-slate-600">
                Don't have an account?{' '}
                <button
                    type="button"
                    onClick={() => navigate('/register')}
                    className="text-blue-600 hover:underline"
                >
                    Sign up
                </button>
            </div>
        </div>
    );
}


