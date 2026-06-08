import React, { useState, useEffect } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function Navbar() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 sm:gap-3 group min-w-0">
          <img
            src="/IeltsCoach logo.jpeg"
            alt="IELTS Coach Logo"
            className="h-8 sm:h-9 w-auto transition-transform duration-300 group-hover:scale-110 shrink-0"
          />
          <span className="text-lg sm:text-xl font-extrabold bg-gradient-to-r from-purple-700 to-sky-600 bg-clip-text text-transparent truncate">
            IELTSCoach
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <Link to="/" className="transition-all duration-200 hover:text-purple-700 hover:scale-105">
            Home
          </Link>
          <Link to="/#features" className="transition-all duration-200 hover:text-purple-700 hover:scale-105">
            Features
          </Link>
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

        <div className="hidden md:flex items-center gap-3">
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

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-slate-700 hover:bg-slate-100 border border-slate-200"
        >
          {mobileOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          )}
        </button>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <>
          <div className="md:hidden fixed inset-0 top-16 z-30 bg-slate-900/40" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <div className="md:hidden absolute left-0 right-0 top-16 z-40 border-b border-slate-200 bg-white shadow-lg">
            <nav className="flex flex-col px-4 py-3 text-base font-medium text-slate-700">
              <Link to="/" className="py-2.5 hover:text-purple-700">Home</Link>
              <Link to="/#features" className="py-2.5 hover:text-purple-700" onClick={() => setMobileOpen(false)}>Features</Link>
              <Link to="/services" className="py-2.5 hover:text-purple-700">Services</Link>
              <Link to="/about" className="py-2.5 hover:text-purple-700">About</Link>
              <Link to="/contact" className="py-2.5 hover:text-purple-700">Contact</Link>
            </nav>
            <div className="border-t border-slate-200 px-4 py-3 flex flex-col gap-2">
              {!user ? (
                <>
                  <Link to="/login" className="w-full text-center rounded-lg border border-purple-600 px-4 py-2 text-sm font-semibold text-purple-600 hover:bg-purple-50">Login</Link>
                  <Link to="/register" className="w-full text-center rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-700">Register</Link>
                </>
              ) : (
                <Link to="/dashboard" className="w-full text-center rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-700">Go to Dashboard</Link>
              )}
            </div>
          </div>
        </>
      )}
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
              <Link to="/" className="hover:text-purple-700">Home</Link>
              <Link to="/about" className="hover:text-purple-700">About Us</Link>
              <Link to="/services" className="hover:text-purple-700">Services</Link>
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

