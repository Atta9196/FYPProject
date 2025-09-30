import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const handleAbout = () => {
        navigate('/about');
    };

    return (
        <nav className="bg-white shadow-lg border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <div className="flex items-center">
                        <h1 className="text-2xl font-bold text-blue-600">IELTS Coach</h1>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-8">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                            Dashboard
                        </button>
                        <button
                            onClick={() => navigate('/practice')}
                            className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                            Practice
                        </button>
                        <button
                            onClick={() => navigate('/tests')}
                            className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                            Tests
                        </button>
                        <button
                            onClick={handleAbout}
                            className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                            About IELTS Coach
                        </button>
                    </div>

                    {/* User Menu */}
                    <div className="hidden md:flex items-center space-x-4">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm font-medium">
                                    {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                                </span>
                            </div>
                            <span className="text-gray-700 text-sm font-medium">
                                {user?.firstName || user?.email || 'User'}
                            </span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                            Logout
                        </button>
                    </div>

                    {/* Mobile menu button */}
                    <div className="md:hidden">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="text-gray-700 hover:text-blue-600 focus:outline-none focus:text-blue-600"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation */}
                {isMenuOpen && (
                    <div className="md:hidden">
                        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50 rounded-lg mt-2">
                            <button
                                onClick={() => {
                                    navigate('/dashboard');
                                    setIsMenuOpen(false);
                                }}
                                className="text-gray-700 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium w-full text-left"
                            >
                                Dashboard
                            </button>
                            <button
                                onClick={() => {
                                    navigate('/practice');
                                    setIsMenuOpen(false);
                                }}
                                className="text-gray-700 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium w-full text-left"
                            >
                                Practice
                            </button>
                            <button
                                onClick={() => {
                                    navigate('/tests');
                                    setIsMenuOpen(false);
                                }}
                                className="text-gray-700 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium w-full text-left"
                            >
                                Tests
                            </button>
                            <button
                                onClick={() => {
                                    handleAbout();
                                    setIsMenuOpen(false);
                                }}
                                className="text-gray-700 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium w-full text-left"
                            >
                                About IELTS Coach
                            </button>
                            <div className="border-t border-gray-200 pt-3">
                                <div className="flex items-center px-3 py-2">
                                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                                        <span className="text-white text-sm font-medium">
                                            {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                                        </span>
                                    </div>
                                    <span className="text-gray-700 text-sm font-medium">
                                        {user?.firstName || user?.email || 'User'}
                                    </span>
                                </div>
                                <button
                                    onClick={() => {
                                        handleLogout();
                                        setIsMenuOpen(false);
                                    }}
                                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium w-full text-left transition-colors"
                                >
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}
