import { useState } from "react";
import { Link } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../services/firebase/config";

export default function ForgotPassword() {
	const [email, setEmail] = useState("");
	const [message, setMessage] = useState("");
	const [isError, setIsError] = useState(false);
	const [sending, setSending] = useState(false);

	const handleResetPassword = async (e) => {
		e.preventDefault();
		const trimmed = email.trim();
		if (!trimmed) {
			setMessage("Please enter your email address.");
			setIsError(true);
			return;
		}
		setMessage("");
		setIsError(false);
		setSending(true);
		try {
			await sendPasswordResetEmail(auth, trimmed);
			setMessage("Password reset email sent. Please check your inbox and spam folder.");
			setIsError(false);
		} catch (error) {
			const code = error?.code || "";
			if (code === "auth/user-not-found") {
				setMessage("No account found with this email address.");
			} else if (code === "auth/invalid-email") {
				setMessage("Please enter a valid email address.");
			} else if (code === "auth/too-many-requests") {
				setMessage("Too many attempts. Please try again later.");
			} else {
				setMessage(error?.message || "Could not send reset email. Please try again.");
			}
			setIsError(true);
		} finally {
			setSending(false);
		}
	};

	return (
		<div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-50 via-white to-blue-50">
			<header className="w-full py-6 px-4 sm:px-6 md:px-10">
				<div className="max-w-7xl mx-auto">
					<Link to="/" className="flex items-center gap-3 group">
						<img
							src="/IeltsCoach logo.jpeg"
							alt="IELTS Coach Logo"
							className="h-12 w-auto transition-transform duration-300 group-hover:scale-110"
						/>
						<span className="text-2xl font-extrabold text-purple-700 leading-tight">
							IELTSCoach
						</span>
					</Link>
				</div>
			</header>

			<div className="flex-1 flex items-center justify-center p-6">
				<div className="w-full max-w-md bg-white/90 backdrop-blur-xl border border-purple-200/50 shadow-2xl rounded-3xl p-8">
					<h2 className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600 mb-2 text-center">
						Forgot Password
					</h2>
					<p className="text-slate-600 text-sm text-center mb-6">
						Enter the email address for your account and we&apos;ll send you a link to reset your password.
					</p>

					<form onSubmit={handleResetPassword} className="space-y-5">
						<div>
							<label htmlFor="forgot-email" className="block text-sm font-medium text-slate-700 mb-2">
								Email
							</label>
							<input
								id="forgot-email"
								type="email"
								placeholder="Enter your email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="w-full p-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 hover:border-purple-400"
								autoComplete="email"
								disabled={sending}
							/>
						</div>

						{message && (
							<p
								className={`text-sm p-3 rounded-xl ${
									isError
										? "bg-red-50 text-red-700 border border-red-200"
										: "bg-green-50 text-green-800 border border-green-200"
								}`}
							>
								{message}
							</p>
						)}

						<button
							type="submit"
							disabled={sending}
							className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition-all duration-300 text-white py-3.5 rounded-xl font-semibold disabled:opacity-60 shadow-lg hover:shadow-xl"
						>
							{sending ? "Sending…" : "Send Reset Link"}
						</button>
					</form>

					<div className="mt-6 text-center">
						<Link
							to="/login"
							className="text-purple-600 hover:text-purple-700 font-medium hover:underline text-sm"
						>
							Back to Sign in
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
