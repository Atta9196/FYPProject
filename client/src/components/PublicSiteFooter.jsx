import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function PublicSiteFooter() {
    const { user } = useAuth();
    const getStartedTo = user ? "/dashboard" : "/register";

    return (
        <footer className="bg-slate-900 text-slate-300">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 py-12">
                <div className="grid gap-10 md:grid-cols-4">
                    <div className="md:col-span-1">
                        <Link to="/" className="inline-flex items-center gap-2 group">
                            <img
                                src="/IeltsCoach logo.jpeg"
                                alt="IELTS Coach Logo"
                                className="h-10 w-auto rounded"
                            />
                            <span className="text-xl font-extrabold text-white group-hover:text-purple-300 transition-colors">
                                IELTSCoach
                            </span>
                        </Link>
                        <p className="mt-4 text-sm text-slate-400 leading-relaxed">
                            AI-powered IELTS preparation with speaking practice, full test simulations, and progress analytics.
                        </p>
                    </div>

                    <div>
                        <p className="text-sm font-semibold text-white mb-3">Explore</p>
                        <div className="flex flex-col gap-2 text-sm">
                            <Link to="/" className="hover:text-purple-300 transition-colors">Home</Link>
                            <Link to="/#features" className="hover:text-purple-300 transition-colors">Features</Link>
                            <Link to="/about" className="hover:text-purple-300 transition-colors">About Us</Link>
                            <Link to="/services" className="hover:text-purple-300 transition-colors">Our Services</Link>
                            <Link to="/contact" className="hover:text-purple-300 transition-colors">Contact</Link>
                        </div>
                    </div>

                    <div>
                        <p className="text-sm font-semibold text-white mb-3">Practice</p>
                        <div className="flex flex-col gap-2 text-sm">
                            <Link to={user ? "/speaking" : "/register"} className="hover:text-purple-300 transition-colors">Speaking</Link>
                            <Link to={user ? "/reading" : "/register"} className="hover:text-purple-300 transition-colors">Reading</Link>
                            <Link to={user ? "/writing" : "/register"} className="hover:text-purple-300 transition-colors">Writing</Link>
                            <Link to={user ? "/listening" : "/register"} className="hover:text-purple-300 transition-colors">Listening</Link>
                            <Link to={user ? "/tests" : "/register"} className="hover:text-purple-300 transition-colors">Full Test Simulator</Link>
                        </div>
                    </div>

                    <div>
                        <p className="text-sm font-semibold text-white mb-3">Get Started</p>
                        <div className="flex flex-col gap-2 text-sm">
                            <Link to={getStartedTo} className="hover:text-purple-300 transition-colors">
                                {user ? "Open Dashboard" : "Create Free Account"}
                            </Link>
                            <Link to="/login" className="hover:text-purple-300 transition-colors">Login</Link>
                            <Link to={user ? "/performance" : "/register"} className="hover:text-purple-300 transition-colors">Performance Dashboard</Link>
                            <Link to={user ? "/support" : "/contact"} className="hover:text-purple-300 transition-colors">Help & Support</Link>
                        </div>
                    </div>
                </div>

                <div className="mt-10 pt-6 border-t border-slate-700 text-center text-sm text-slate-400">
                    © {new Date().getFullYear()} IELTS Coach | Developed by{" "}
                    <span className="text-purple-400 font-semibold">Software Engineering Students</span>
                </div>
            </div>
        </footer>
    );
}
