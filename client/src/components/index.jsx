import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function Navbar() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3 group">
          <img
            src="/IeltsCoach logo.jpeg"
            alt="IELTS Coach Logo"
            className="h-9 w-auto transition-transform duration-300 group-hover:scale-110"
          />
          <span className="text-xl font-extrabold bg-gradient-to-r from-purple-700 to-sky-600 bg-clip-text text-transparent">
            IELTSCoach
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <Link to="/" className="transition-all duration-200 hover:text-purple-700 hover:scale-105">
            Home
          </Link>
          <a href="#features" className="transition-all duration-200 hover:text-purple-700 hover:scale-105">
            Features
          </a>
          <Link to="/services" className="transition-all duration-200 hover:text-purple-700 hover:scale-105">
            Services
          </Link>
          <Link to="/about" className="transition-all duration-200 hover:text-purple-700 hover:scale-105">
            About
          </Link>
          <Link to="/contact" className="transition-all duration-200 hover:text-purple-700 hover:scale-105">
            Contact
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {!user ? (
            <>
              <Link
                to="/login"
                className="rounded-lg border border-purple-600 px-4 py-1.5 text-sm font-semibold text-purple-600 transition-all hover:bg-purple-50"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-purple-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-purple-700 hover:shadow-md"
              >
                Register
              </Link>
            </>
          ) : (
            <Link
              to="/dashboard"
              className="rounded-lg bg-purple-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-purple-700 hover:shadow-md"
            >
              Go to Dashboard
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="text-lg font-extrabold bg-gradient-to-r from-purple-700 to-sky-600 bg-clip-text text-transparent">
                IELTSCoach
              </span>
            </div>
            <p className="text-sm text-slate-600">
              Smart, AI-powered practice to help you reach your dream IELTS band with confidence.
            </p>
          </div>

          <div className="space-y-2 text-sm">
            <p className="font-semibold text-slate-800">Quick Links</p>
            <div className="flex flex-col gap-1 text-slate-600">
              <Link to="/dashboard" className="hover:text-purple-700">
                Dashboard
              </Link>
              <Link to="/tests" className="hover:text-purple-700">
                Full Test Simulator
              </Link>
              <Link to="/mcq" className="hover:text-purple-700">
                MCQ Practice
              </Link>
              <Link to="/chatbot" className="hover:text-purple-700">
                IELTS Chatbot
              </Link>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <p className="font-semibold text-slate-800">Support</p>
            <div className="flex flex-col gap-1 text-slate-600">
              <Link to="/support" className="hover:text-purple-700">
                Help Center
              </Link>
              <Link to="/contact" className="hover:text-purple-700">
                Contact Us
              </Link>
              <span className="cursor-default text-slate-400">Privacy &amp; Terms</span>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-4 text-xs text-slate-500 sm:flex-row">
          <span>© {new Date().getFullYear()} IELTS Coach. All rights reserved.</span>
          <span className="text-slate-400">Built by Software Engineering Students</span>
        </div>
      </div>
    </footer>
  );
}

export function ProtectedRoute({ requireAuth, children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (requireAuth && !user) return <Navigate to="/login" replace />;
  if (requireAuth === false && user) return <Navigate to="/dashboard" replace />;
  return children;
}

