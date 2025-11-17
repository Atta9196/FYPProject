import React from 'react';
import { Link } from 'react-router-dom';
import RegisterForm from '../features/auth/RegisterForm';

export default function Register() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header with Logo */}
      <header className="w-full py-6 px-4 sm:px-6 md:px-10">
        <div className="max-w-7xl mx-auto">
          <Link to="/" className="flex items-center gap-3 group">
            <img 
              src="/IeltsCoach logo.jpeg" 
              alt="IELTS Coach Logo" 
              className="h-12 w-auto transition-transform duration-300 group-hover:scale-110"
            />
            <span className="text-2xl font-extrabold text-purple-700 leading-tight transition-colors duration-300 group-hover:text-purple-800">IELTSCoach</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <RegisterForm />
      </div>
    </div>
  );
}



