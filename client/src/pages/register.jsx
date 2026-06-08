import React from 'react';
import { Link } from 'react-router-dom';
import RegisterForm from '../features/auth/RegisterForm';

export default function Register() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header with Logo */}
      <header className="w-full py-6 px-4 sm:px-6 md:px-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 group">
            <img 
              src="/IeltsCoach logo.jpeg" 
              alt="IELTS Coach Logo" 
              className="h-12 w-auto transition-transform duration-300 group-hover:scale-110"
            />
            <span className="text-2xl font-extrabold text-purple-700 leading-tight transition-colors duration-300 group-hover:text-purple-800">IELTSCoach</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
            <Link to="/" className="hover:text-purple-700">Home</Link>
            <Link to="/#features" className="hover:text-purple-700">Features</Link>
            <Link to="/about" className="hover:text-purple-700">About</Link>
            <Link to="/services" className="hover:text-purple-700">Services</Link>
            <Link to="/contact" className="hover:text-purple-700">Contact</Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <RegisterForm />
      </div>
    </div>
  );
}



